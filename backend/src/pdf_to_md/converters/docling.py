from functools import lru_cache
from pathlib import Path

from docling.document_converter import DocumentConverter


@lru_cache
def get_docling_converter() -> DocumentConverter:
    # Caro de instanciar (carrega modelos): criado uma única vez e reutilizado.
    return DocumentConverter()


class DoclingConverter:
    """Engine "accurate"; também converte DOCX, CSV e outros formatos de documento."""

    def convert(self, pdf_path: Path) -> str:
        result = get_docling_converter().convert(pdf_path)
        return result.document.export_to_markdown()

    def convert_pages(self, pdf_path: Path) -> list[str]:
        document = get_docling_converter().convert(pdf_path).document
        return [document.export_to_markdown(page_no=n) for n in sorted(document.pages)]
