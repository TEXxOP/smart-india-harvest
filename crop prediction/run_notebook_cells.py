import json
import os
import sys
import time
import traceback
from pathlib import Path


ROOT = Path(__file__).resolve().parent
NOTEBOOK = ROOT / "India_Crop_Pipeline (1).ipynb"
PYDEPS = ROOT / ".pydeps"


def log(message: str) -> None:
    print(message, flush=True)


def main() -> int:
    os.chdir(ROOT)
    os.environ.setdefault("MPLBACKEND", "Agg")
    if PYDEPS.exists():
        sys.path.insert(0, str(PYDEPS))
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    notebook = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
    namespace = {
        "__name__": "__main__",
        "__file__": str(NOTEBOOK),
    }

    code_cells = [
        (idx, cell)
        for idx, cell in enumerate(notebook["cells"])
        if cell.get("cell_type") == "code"
    ]
    log(f"Executing {len(code_cells)} code cells from {NOTEBOOK.name}")
    started = time.time()

    for idx, cell in code_cells:
        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)
        if not source.strip():
            continue

        cell_start = time.time()
        log(f"\n--- cell {idx} start ---")
        try:
            exec(compile(source, f"{NOTEBOOK.name}:cell-{idx}", "exec"), namespace)
            try:
                import matplotlib.pyplot as plt

                plt.close("all")
            except Exception:
                pass
        except Exception:
            log(f"--- cell {idx} failed after {time.time() - cell_start:.1f}s ---")
            traceback.print_exc()
            return 1
        log(f"--- cell {idx} done in {time.time() - cell_start:.1f}s ---")

    log(f"\nNotebook code cells completed in {(time.time() - started) / 60:.1f} minutes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
