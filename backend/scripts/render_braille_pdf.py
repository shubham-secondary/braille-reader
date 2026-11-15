import os
from pathlib import Path

pdf_path = Path(r"C:\Users\MSUSERSL123\Downloads\3602.pdf")
out_dir = Path(r"C:\Users\MSUSERSL123\braille-reader\backend\sample-output")
out_dir.mkdir(parents=True, exist_ok=True)

try:
    import fitz  # PyMuPDF
    doc = fitz.open(str(pdf_path))
    print(f"PDF pages: {doc.page_count}")
    for idx in range(min(doc.page_count, 3)):
        page = doc[idx]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        path = out_dir / f"page_{idx + 1}.png"
        pix.save(str(path))
        print(f"saved: {path}")
except Exception as exc:
    print(f"ERROR: {exc}")
    raise
