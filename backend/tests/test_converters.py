from pathlib import Path

import pytest

from pdf_to_md.converters.factory import get_converter
from pdf_to_md.converters.pymupdf import PyMuPDFConverter


def test_get_converter_fast() -> None:
    assert isinstance(get_converter("fast"), PyMuPDFConverter)


def test_get_converter_invalid() -> None:
    with pytest.raises(ValueError):
        get_converter("nope")


def test_pymupdf_converts(sample_pdf: Path) -> None:
    md = PyMuPDFConverter().convert(sample_pdf)
    assert "PDFTOMD" in md
    assert "Titulo de Teste" in md


@pytest.mark.slow
def test_docling_converts(sample_pdf: Path) -> None:
    from pdf_to_md.converters.docling import DoclingConverter

    md = DoclingConverter().convert(sample_pdf)
    assert "PDFTOMD" in md
