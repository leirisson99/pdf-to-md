from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pdf_to_md.api import routes
from pdf_to_md.main import app

client = TestClient(app)
MINIMAL_PDF = b"%PDF-1.4\n%fake\n"


class FakeConverter:
    def convert(self, pdf_path: Path) -> str:
        return "# ok"


@pytest.fixture(autouse=True)
def fake_converter(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(routes, "get_converter", lambda engine: FakeConverter())


def test_health() -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_convert_ok() -> None:
    r = client.post("/api/convert", files={"file": ("doc.pdf", MINIMAL_PDF)})
    assert r.status_code == 200
    assert r.text == "# ok"
    assert 'filename="doc.md"' in r.headers["content-disposition"]


def test_missing_file() -> None:
    assert client.post("/api/convert").status_code == 400


def test_not_pdf() -> None:
    r = client.post("/api/convert", files={"file": ("a.pdf", b"hello")})
    assert r.status_code == 400


def test_invalid_engine() -> None:
    r = client.post(
        "/api/convert",
        files={"file": ("doc.pdf", MINIMAL_PDF)},
        data={"engine": "nope"},
    )
    assert r.status_code == 400


def test_too_large(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(routes.get_settings(), "max_file_size_mb", 0)
    r = client.post("/api/convert", files={"file": ("doc.pdf", MINIMAL_PDF)})
    assert r.status_code == 413


def test_convert_real_fast_engine(monkeypatch: pytest.MonkeyPatch, sample_pdf: Path) -> None:
    from pdf_to_md.converters.factory import get_converter as real_get_converter

    monkeypatch.setattr(routes, "get_converter", real_get_converter)
    r = client.post(
        "/api/convert",
        files={"file": ("sample.pdf", sample_pdf.read_bytes())},
        data={"engine": "fast"},
    )
    assert r.status_code == 200
    assert "PDFTOMD" in r.text
    assert r.headers["content-type"].startswith("text/markdown")
