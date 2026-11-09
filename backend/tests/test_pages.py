import io
import zipfile

import pymupdf
import pytest
from fastapi.testclient import TestClient

from pdf_to_md.main import app

client = TestClient(app)


def make_pdf(pages: int = 3, blank_last: bool = True) -> bytes:
    doc = pymupdf.open()
    for i in range(1, pages + 1):
        page = doc.new_page()
        page.insert_text((72, 72), f"Titulo da pagina {i}", fontsize=20)
        page.insert_text((72, 120), f"Conteudo {i}", fontsize=12)
    if blank_last:
        doc.new_page()
    return doc.tobytes()


def post(name: str, content: bytes, **data: str):
    return client.post("/api/convert", files={"file": (name, content)}, data=data)


def open_zip(response) -> zipfile.ZipFile:
    return zipfile.ZipFile(io.BytesIO(response.content))


def test_split_pages_returns_zip_skipping_blank() -> None:
    r = post("relatorio.pdf", make_pdf(3), split_pages="true")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    assert 'filename="relatorio.zip"' in r.headers["content-disposition"]
    zf = open_zip(r)
    assert zf.namelist() == [
        "relatorio_pagina_001.md",
        "relatorio_pagina_002.md",
        "relatorio_pagina_003.md",
    ]
    assert "Conteudo 2" in zf.read("relatorio_pagina_002.md").decode()


def test_blank_page_in_the_middle_keeps_numbering() -> None:
    doc = pymupdf.open()
    for text in ["um", None, "tres"]:
        page = doc.new_page()
        if text:
            page.insert_text((72, 72), text, fontsize=14)
    r = post("a.pdf", doc.tobytes(), split_pages="true")
    assert open_zip(r).namelist() == ["a_pagina_001.md", "a_pagina_003.md"]


def test_default_is_still_single_markdown() -> None:
    r = post("relatorio.pdf", make_pdf(2))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/markdown")
    assert 'filename="relatorio.md"' in r.headers["content-disposition"]


def test_all_blank_pdf_returns_422() -> None:
    doc = pymupdf.open()
    doc.new_page()
    r = post("vazio.pdf", doc.tobytes(), split_pages="true")
    assert r.status_code == 422


def test_split_pages_ignored_for_other_formats() -> None:
    r = post("a.txt", b"oi", split_pages="true")
    assert r.status_code == 200
    assert r.text == "oi"
    assert r.headers["content-type"].startswith("text/markdown")


def test_split_recorded_in_history_as_zip() -> None:
    post("relatorio.pdf", make_pdf(2), split_pages="true")
    item = client.get("/api/history").json()["items"][0]
    assert item["filename"] == "relatorio.pdf"
    assert item["output_filename"] == "relatorio.zip"


def test_page_number_padding_grows_with_total() -> None:
    from pdf_to_md.api.routes import _zip_pages

    zf = zipfile.ZipFile(io.BytesIO(_zip_pages("d", ["x"] * 1000)))
    assert zf.namelist()[0] == "d_pagina_0001.md"
    assert zf.namelist()[-1] == "d_pagina_1000.md"


@pytest.mark.slow
def test_split_pages_with_docling() -> None:
    r = post("relatorio.pdf", make_pdf(2), split_pages="true", engine="accurate")
    assert r.status_code == 200
    assert len(open_zip(r).namelist()) == 2
