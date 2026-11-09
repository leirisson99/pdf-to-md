from pathlib import Path
from typing import Protocol


class Converter(Protocol):
    def convert(self, pdf_path: Path) -> str: ...


class PageConverter(Converter, Protocol):
    """Engines de PDF: também conseguem devolver um Markdown por página."""

    def convert_pages(self, pdf_path: Path) -> list[str]: ...
