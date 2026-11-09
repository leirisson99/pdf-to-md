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


class BrokenConverter:
    def convert(self, pdf_path: Path) -> str:
        raise RuntimeError("boom")


@pytest.fixture(autouse=True)
def fake_converter(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(routes, "get_converter", lambda engine: FakeConverter())


def _convert(name: str = "doc.pdf", engine: str = "fast") -> None:
    r = client.post(
        "/api/convert",
        files={"file": (name, MINIMAL_PDF)},
        data={"engine": engine},
    )
    assert r.status_code == 200


def test_history_empty() -> None:
    body = client.get("/api/history").json()
    assert body == {"items": [], "total": 0, "page": 1, "page_size": 10}


def test_convert_is_recorded() -> None:
    _convert("relatorio.pdf", "accurate")
    body = client.get("/api/history").json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["filename"] == "relatorio.pdf"
    assert item["output_filename"] == "relatorio.md"
    assert item["engine"] == "accurate"
    assert item["created_at"]


def test_failed_conversion_not_recorded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(routes, "get_converter", lambda engine: BrokenConverter())
    r = client.post("/api/convert", files={"file": ("doc.pdf", MINIMAL_PDF)})
    assert r.status_code == 500
    assert client.get("/api/history").json()["total"] == 0


def test_invalid_upload_not_recorded() -> None:
    client.post("/api/convert", files={"file": ("a.pdf", b"hello")})
    assert client.get("/api/history").json()["total"] == 0


def test_history_pagination_newest_first() -> None:
    for i in range(1, 6):
        _convert(f"doc{i}.pdf")

    p1 = client.get("/api/history", params={"page": 1, "page_size": 2}).json()
    p3 = client.get("/api/history", params={"page": 3, "page_size": 2}).json()

    assert p1["total"] == 5
    assert [i["filename"] for i in p1["items"]] == ["doc5.pdf", "doc4.pdf"]
    assert [i["filename"] for i in p3["items"]] == ["doc1.pdf"]


def test_history_page_out_of_range() -> None:
    _convert()
    body = client.get("/api/history", params={"page": 99}).json()
    assert body["items"] == []
    assert body["total"] == 1


@pytest.mark.parametrize(
    "params", [{"page": 0}, {"page_size": 0}, {"page_size": 51}, {"page": "x"}]
)
def test_history_invalid_params(params: dict[str, object]) -> None:
    assert client.get("/api/history", params=params).status_code == 422


def test_history_write_failure_does_not_break_convert(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(*args: object) -> None:
        raise OSError("disk")

    monkeypatch.setattr(routes, "add_conversion", boom)
    _convert()
