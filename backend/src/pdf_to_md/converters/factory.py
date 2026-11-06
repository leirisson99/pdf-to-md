from typing import Literal, get_args

from pdf_to_md.converters.base import Converter

Engine = Literal["fast", "accurate"]
VALID_ENGINES: tuple[str, ...] = get_args(Engine)


def get_converter(engine: str) -> Converter:
    # Imports tardios: evita carregar docling (pesado) se não for usado.
    if engine == "fast":
        from pdf_to_md.converters.pymupdf import PyMuPDFConverter

        return PyMuPDFConverter()
    if engine == "accurate":
        from pdf_to_md.converters.docling import DoclingConverter

        return DoclingConverter()
    raise ValueError(f"Engine inválida: {engine}")
