from pathlib import Path

import pymupdf4llm


class PyMuPDFConverter:
    """Engine "fast"."""

    def convert(self, pdf_path: Path) -> str:
        return pymupdf4llm.to_markdown(str(pdf_path))
