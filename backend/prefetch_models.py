"""
Build-time model preflight check.

Run by Render's buildCommand, before the service ever accepts traffic. Two jobs:

1.  Fail the build loudly if the committed model artifacts are missing. Without
    this, a forgotten `git add` produces a service that boots fine and then
    returns "model not loaded" on every prediction - much harder to diagnose.

2.  Actually deserialize each artifact and run one ONNX inference, which catches
    Git LFS pointer files, truncated uploads, and scikit-learn pickle
    incompatibilities at build time instead of on a user's first request.

No network access is required: the disease model is a committed ONNX graph, not
a HuggingFace download.

Safe to run locally too:  python prefetch_models.py
"""
import os
import sys
import warnings

# Same suppression main.py applies: the committed pickles were written by
# sklearn 1.4.2 / 1.8.0 and are loaded under 1.7.2. Both were verified to load
# and predict correctly; without this the build log carries ~30 warning lines.
try:
    from sklearn.exceptions import InconsistentVersionWarning

    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except ImportError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Artifacts that must be committed to the repo for the API to work at all.
REQUIRED_ARTIFACTS = [
    "crop_recommendation_model.joblib",
    os.path.join("yield_model", "best_model.pkl"),
    os.path.join("yield_model", "category_mappings.pkl"),
    os.path.join("yield_model", "model_metadata.pkl"),
    os.path.join("disease_model", "model.onnx"),
    os.path.join("disease_model", "preprocess.json"),
]

# Printed in the failure message so the fix is copy-pasteable.
COMMIT_HINT = (
    "    git add -f backend/crop_recommendation_model.joblib backend/yield_model/ \\\n"
    "               backend/disease_model/\n"
    "    git commit -m 'chore: track ML model artifacts for deploy'\n"
)


def check_artifacts() -> list:
    """Return the list of required model files that are missing from disk."""
    missing = []
    for rel in REQUIRED_ARTIFACTS:
        path = os.path.join(BASE_DIR, rel)
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            print(f"  ok      {rel}  ({size_mb:.1f} MB)")
        else:
            print(f"  MISSING {rel}")
            missing.append(rel)
    return missing


def load_artifacts() -> bool:
    """Deserialize the sklearn models - catches Git LFS pointers and
    scikit-learn version mismatches at build time rather than at runtime."""
    try:
        import joblib

        artifact = joblib.load(os.path.join(BASE_DIR, "crop_recommendation_model.joblib"))
        labels = artifact["crop_labels"]
        print(f"  crop recommender loads: {len(labels)} crop labels")

        joblib.load(os.path.join(BASE_DIR, "yield_model", "best_model.pkl"))
        meta = joblib.load(os.path.join(BASE_DIR, "yield_model", "model_metadata.pkl"))
        print(f"  yield model loads: {meta.get('model_name')}, "
              f"R2={meta.get('metrics', {}).get('R2')}")
        return True
    except Exception as e:
        print(f"  FAILED to deserialize models: {e}")
        return False


def check_disease_model() -> bool:
    """Open the ONNX session and run one inference on a blank image.

    This is a hard gate, not best-effort: the graph is committed to the repo, so
    a failure here means the artifact itself is broken and every
    /api/detect-disease call would fail at runtime.
    """
    try:
        import json

        import numpy as np
        import onnxruntime as ort

        with open(os.path.join(BASE_DIR, "disease_model", "preprocess.json"),
                  "r", encoding="utf-8") as f:
            meta = json.load(f)

        sess = ort.InferenceSession(
            os.path.join(BASE_DIR, "disease_model", "model.onnx"),
            providers=["CPUExecutionProvider"],
        )
        dummy = np.zeros((1, 3, meta["height"], meta["width"]), dtype=np.float32)
        logits = sess.run(["logits"], {"pixel_values": dummy})[0]

        n_labels = len(meta["labels"])
        if logits.shape != (1, n_labels):
            print(f"  FAILED: logits shape {logits.shape} does not match "
                  f"{n_labels} labels in preprocess.json")
            return False

        print(f"  disease model runs: {n_labels} classes, "
              f"{meta['height']}x{meta['width']} input, opset {meta.get('opset')}")
        return True
    except Exception as e:
        print(f"  FAILED to run disease model: {e}")
        return False


def main() -> int:
    print("[1/3] Checking committed model artifacts")
    missing = check_artifacts()
    if missing:
        print(
            "\nBUILD FAILED: the model files above are not in the repository.\n"
            "They are required at runtime and are NOT gitignored - commit them:\n"
            + COMMIT_HINT,
            file=sys.stderr,
        )
        return 1

    print("\n[2/3] Deserializing sklearn models")
    if not load_artifacts():
        print("\nBUILD FAILED: model files exist but cannot be loaded.", file=sys.stderr)
        return 1

    print("\n[3/3] Smoke-testing disease model (ONNX)")
    if not check_disease_model():
        print(
            "\nBUILD FAILED: disease_model/ is present but unusable. If the file is\n"
            "a Git LFS pointer, run `git lfs install && git lfs pull`. To regenerate\n"
            "it, run `python export_disease_onnx.py` on a machine with torch and\n"
            "transformers installed.",
            file=sys.stderr,
        )
        return 1

    print("\nPreflight complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
