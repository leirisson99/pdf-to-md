from functools import lru_cache
from pathlib import Path

from docling.document_converter import DocumentConverter


@lru_cache
def _get_document_converter() -> DocumentConverter:
    # Caro de instanciar (carrega modelos): criado uma única vez e reutilizado.
    return DocumentConverter()


class DoclingConverter:
    """Engine "accurate"."""

    def convert(self, pdf_path: Path) -> str:
        result = _get_document_converter().convert(pdf_path)
        return result.document.export_to_markdown()
