from pathlib import Path

from docling.datamodel.document import TableItem
from docling_core.types.doc import GroupItem

from pdf_to_md.converters.docling import get_docling_converter


class XlsxConverter:
    """Planilhas via Docling, mantendo o nome de cada aba como título."""

    def convert(self, path: Path) -> str:
        doc = get_docling_converter().convert(path).document
        parts: list[str] = []
        for item, _ in doc.iterate_items(with_groups=True):
            if isinstance(item, GroupItem) and item.label.value == "sheet":
                parts.append(f"## {item.name}")
            elif isinstance(item, TableItem):
                parts.append(item.export_to_markdown(doc=doc))
        return "\n\n".join(parts) if parts else doc.export_to_markdown()
