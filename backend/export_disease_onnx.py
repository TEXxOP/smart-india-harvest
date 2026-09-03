"""One-time export of the crop-leaf-disease ViT to ONNX.

Run this on a dev machine (it needs torch + transformers, which the deployed
backend deliberately does NOT install), then commit the two files it writes:

    backend/disease_model/model.onnx        ~22 MB
    backend/disease_model/preprocess.json   labels + normalisation constants

Why: importing torch + transformers costs ~225 MB RSS, which does not fit the
512 MB Render free instance alongside sklearn and the two joblib models. The ViT
itself is only 5.5 M parameters (~22 MB). onnxruntime replaces both imports for
~35 MB, so inference fits with room to spare. See DEPLOYMENT.md.

Usage:
    venv/Scripts/python.exe export_disease_onnx.py
"""

import json
import os
import sys

MODEL_ID = os.getenv("DISEASE_MODEL_ID", "wambugu71/crop_leaf_diseases_vit")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disease_model")
ONNX_PATH = os.path.join(OUT_DIR, "model.onnx")
META_PATH = os.path.join(OUT_DIR, "preprocess.json")

# Opset 17 is the highest onnxruntime 1.23 supports fully for ViT ops and is
# well above the 14 that scaled_dot_product_attention needs.
OPSET = 17


def main() -> int:
    import numpy as np
    import torch
    from transformers import ViTImageProcessor, ViTForImageClassification

    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"[1/4] Loading {MODEL_ID} ...")
    processor = ViTImageProcessor.from_pretrained(MODEL_ID)
    model = ViTForImageClassification.from_pretrained(
        MODEL_ID, ignore_mismatched_sizes=True
    )
    model.eval()

    size = processor.size
    height = size.get("height") or size.get("shortest_edge") or 224
    width = size.get("width") or size.get("shortest_edge") or 224
    print(f"      input {height}x{width}, {len(model.config.id2label)} classes")

    print(f"[2/4] Exporting to {os.path.relpath(ONNX_PATH)} (opset {OPSET}) ...")
    dummy = torch.randn(1, 3, height, width)
    torch.onnx.export(
        model,
        (dummy,),
        ONNX_PATH,
        input_names=["pixel_values"],
        output_names=["logits"],
        # Batch stays dynamic so a future batched endpoint does not need a
        # re-export. Spatial dims are fixed: ViT patch embedding is not
        # resolution-agnostic without interpolate_pos_encoding.
        dynamic_axes={"pixel_values": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=OPSET,
        do_constant_folding=True,
        dynamo=False,
    )

    print("[3/4] Writing preprocessing metadata ...")
    meta = {
        "model_id": MODEL_ID,
        # id2label keys are ints in the config and strings in JSON; the loader
        # re-reads them positionally, so store an ordered list instead of a map.
        "labels": [
            model.config.id2label[i] for i in range(len(model.config.id2label))
        ],
        "height": height,
        "width": width,
        "rescale_factor": float(getattr(processor, "rescale_factor", 1 / 255)),
        "image_mean": [float(v) for v in processor.image_mean],
        "image_std": [float(v) for v in processor.image_std],
        "resample": int(getattr(processor, "resample", 2)),
        "opset": OPSET,
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print("[4/4] Verifying ONNX output against torch ...")
    import onnxruntime as ort

    sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])

    rng = np.random.default_rng(0)
    worst = 0.0
    for trial in range(3):
        x = rng.standard_normal((1, 3, height, width)).astype(np.float32)
        with torch.no_grad():
            ref = model(torch.from_numpy(x)).logits.numpy()
        got = sess.run(["logits"], {"pixel_values": x})[0]
        delta = float(np.abs(ref - got).max())
        worst = max(worst, delta)
        same_top = int(ref.argmax()) == int(got.argmax())
        print(f"      trial {trial + 1}: max|delta|={delta:.2e} top1_match={same_top}")
        if not same_top:
            print("      FAIL: argmax disagrees between torch and onnxruntime")
            return 1

    if worst > 1e-3:
        print(f"      FAIL: max logit deviation {worst:.2e} exceeds 1e-3")
        return 1

    mb = os.path.getsize(ONNX_PATH) / 1e6
    print(f"\nOK. {os.path.relpath(ONNX_PATH)} = {mb:.1f} MB, "
          f"{len(meta['labels'])} labels, max|delta|={worst:.2e}")
    print("Commit both files:")
    print("  git add -f backend/disease_model/model.onnx "
          "backend/disease_model/preprocess.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
