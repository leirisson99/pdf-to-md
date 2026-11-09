from pathlib import Path

import pymupdf4llm


class PyMuPDFConverter:
    """Engine "fast"."""

    def convert(self, pdf_path: Path) -> str:
        return pymupdf4llm.to_markdown(str(pdf_path))

    def convert_pages(self, pdf_path: Path) -> list[str]:
        chunks = pymupdf4llm.to_markdown(str(pdf_path), page_chunks=True)
        return [chunk["text"] for chunk in chunks]
