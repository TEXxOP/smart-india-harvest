"""Parity check: numpy/onnxruntime disease path vs transformers/torch reference.

Dev-only. Confirms that replacing ViTImageProcessor with _preprocess_leaf_image
and torch with onnxruntime does not change what the endpoint predicts.

    venv/Scripts/python.exe verify_onnx_parity.py
"""

import io
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def make_images():
    """A few shapes and content types the mobile camera could realistically send."""
    rng = np.random.default_rng(7)
    out = []
    for name, (w, h) in [
        ("phone_landscape_640x480", (640, 480)),
        ("phone_portrait_1080x1920", (1080, 1920)),
        ("square_224x224", (224, 224)),
        ("tiny_64x64", (64, 64)),
    ]:
        arr = rng.integers(0, 256, size=(h, w, 3), dtype=np.uint8)
        # Add a smooth green-dominant gradient so it is not pure noise.
        yy, xx = np.mgrid[0:h, 0:w]
        arr[..., 1] = np.clip(
            arr[..., 1] // 3 + (170 * yy // max(h - 1, 1)).astype(np.uint8), 0, 255
        )
        arr[..., 0] = arr[..., 0] // 3 + (60 * xx // max(w - 1, 1)).astype(np.uint8)
        out.append((name, Image.fromarray(arr, mode="RGB")))
    return out


def main() -> int:
    import torch
    from transformers import ViTImageProcessor, ViTForImageClassification

    from main import _load_disease_model, _preprocess_leaf_image

    model_id = os.getenv("DISEASE_MODEL_ID", "wambugu71/crop_leaf_diseases_vit")
    print("Loading reference torch pipeline ...")
    processor = ViTImageProcessor.from_pretrained(model_id)
    model = ViTForImageClassification.from_pretrained(
        model_id, ignore_mismatched_sizes=True
    )
    model.eval()

    print("Loading ONNX session ...")
    sess, meta = _load_disease_model()
    labels = meta["labels"]

    ok = True
    for name, img in make_images():
        # Round-trip through JPEG, which is what the endpoint actually receives.
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        img = Image.open(io.BytesIO(buf.getvalue())).convert("RGB")

        ref_px = processor(images=img, return_tensors="pt")["pixel_values"].numpy()
        got_px = _preprocess_leaf_image(img, meta)
        px_delta = float(np.abs(ref_px - got_px).max())

        with torch.no_grad():
            ref_logits = model(torch.from_numpy(ref_px)).logits.numpy()[0]
        got_logits = sess.run(["logits"], {"pixel_values": got_px})[0][0]

        def top5(logits):
            e = np.exp(logits.astype(np.float64) - logits.max())
            p = e / e.sum()
            idx = np.argsort(p)[-5:][::-1]
            return [(labels[int(i)], round(float(p[i]), 4)) for i in idx]

        ref_top, got_top = top5(ref_logits), top5(got_logits)
        labels_match = [l for l, _ in ref_top] == [l for l, _ in got_top]
        score_delta = max(abs(a - b) for (_, a), (_, b) in zip(ref_top, got_top))

        status = "OK " if (labels_match and score_delta <= 0.001) else "FAIL"
        if status == "FAIL":
            ok = False
        print(f"[{status}] {name:26s} pixel_delta={px_delta:.2e} "
              f"score_delta={score_delta:.2e} order_match={labels_match}")
        print(f"         ref: {ref_top[:3]}")
        print(f"         onx: {got_top[:3]}")

    print("\nPARITY OK" if ok else "\nPARITY FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
