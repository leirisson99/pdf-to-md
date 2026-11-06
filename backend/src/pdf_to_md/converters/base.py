from pathlib import Path
from typing import Protocol


class Converter(Protocol):
    def convert(self, pdf_path: Path) -> str: ...
