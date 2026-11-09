import io
import zipfile
from pathlib import Path

import docx
import openpyxl
import pytest
from fastapi.testclient import TestClient

from pdf_to_md.formats import MAX_UNCOMPRESSED_BYTES, InvalidFileError, validate_file
from pdf_to_md.main import app

client = TestClient(app)


def make_docx() -> bytes:
    d = docx.Document()
    d.add_heading("Título", 1)
    d.add_paragraph("Olá mundo")
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def make_xlsx() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Vendas"
    ws.append(["produto", "qtd"])
    ws.append(["maçã", 3])
    wb.create_sheet("Outra").append(["x"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def post(name: str, content: bytes, engine: str = "fast"):
    return client.post("/api/convert", files={"file": (name, content)}, data={"engine": engine})


def test_docx() -> None:
    r = post("relatorio.docx", make_docx())
    assert r.status_code == 200
    assert "Título" in r.text and "Olá mundo" in r.text
    assert 'filename="relatorio.md"' in r.headers["content-disposition"]


def test_xlsx_keeps_sheet_names() -> None:
    r = post("dados.xlsx", make_xlsx())
    assert r.status_code == 200
    assert "## Vendas" in r.text and "## Outra" in r.text
    assert "maçã" in r.text


def test_csv() -> None:
    r = post("a.csv", "nome,idade\nJoão,30\n".encode())
    assert r.status_code == 200
    assert "João" in r.text and "|" in r.text


def test_txt_preserves_line_breaks() -> None:
    r = post("a.txt", b"linha 1\nlinha 2\n")
    assert r.status_code == 200
    assert r.text == "linha 1\nlinha 2\n"


def test_txt_cp1252() -> None:
    r = post("a.txt", "ação e coração".encode("cp1252"))
    assert r.status_code == 200
    assert r.text == "ação e coração"


def test_history_records_effective_engine() -> None:
    post("a.xlsx", make_xlsx(), engine="fast")
    post("b.txt", b"oi")
    items = client.get("/api/history").json()["items"]
    assert {i["filename"]: i["engine"] for i in items} == {"a.xlsx": "accurate", "b.txt": "fast"}


@pytest.mark.parametrize(
    ("name", "content"),
    [
        ("a.exe", b"MZ"),
        ("a.doc", b"\xd0\xcf\x11\xe0"),
        ("fake.docx", b"texto puro"),
        ("fake.xlsx", make_docx()),  # ZIP válido, mas é um docx
        ("fake.pdf", b"texto"),
        ("bin.txt", b"abc\x00def"),
        ("semextensao", b"abc"),
    ],
)
def test_rejected_files(name: str, content: bytes) -> None:
    assert post(name, content).status_code == 400


def test_zip_bomb_rejected() -> None:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<x/>")
        zf.writestr("word/document.xml", b"0" * (MAX_UNCOMPRESSED_BYTES + 1))
    assert len(buf.getvalue()) < 1024 * 1024 * 5
    with pytest.raises(InvalidFileError, match="descompactado"):
        validate_file("bomba.docx", buf.getvalue())


def test_extension_is_case_insensitive() -> None:
    assert validate_file("A.PDF", b"%PDF-1.4") == "pdf"
    assert validate_file("DADOS.CSV", b"a,b") == "csv"


def test_pdf_still_works(sample_pdf: Path) -> None:
    r = post("sample.pdf", sample_pdf.read_bytes())
    assert r.status_code == 200
    assert "PDFTOMD" in r.text


# --- imagens ---------------------------------------------------------------


def make_image(fmt: str, size: tuple[int, int] = (900, 400), text: bool = True) -> bytes:
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", size, "white")
    if text:
        draw = ImageDraw.Draw(img)
        font = ImageFont.load_default(40)
        draw.text((30, 30), "Relatorio de Vendas", font=font, fill="black")
        draw.text((30, 120), "Produto Quantidade", font=font, fill="black")
        draw.text((30, 210), "Maca 3", font=font, fill="black")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


class FakeOcr:
    def __init__(self, text: str) -> None:
        self.text = text

    def convert(self, path: Path) -> str:
        assert path.suffix in {".png", ".jpg", ".jpeg"}
        return self.text


@pytest.fixture
def fake_ocr(monkeypatch: pytest.MonkeyPatch):
    from pdf_to_md.api import routes

    def install(text: str) -> None:
        monkeypatch.setattr(routes, "get_document_converter", lambda ext: FakeOcr(text))

    return install


@pytest.mark.parametrize(("name", "fmt"), [("a.png", "PNG"), ("a.jpg", "JPEG"), ("A.JPEG", "JPEG")])
def test_image_accepted(name: str, fmt: str, fake_ocr) -> None:
    fake_ocr("# texto")
    r = post(name, make_image(fmt))
    assert r.status_code == 200
    assert r.text == "# texto"
    assert client.get("/api/history").json()["items"][0]["engine"] == "accurate"


def test_image_without_text_returns_422(fake_ocr) -> None:
    fake_ocr("  \n")
    r = post("vazia.png", make_image("PNG", text=False))
    assert r.status_code == 422
    assert "texto" in r.json()["detail"]
    assert client.get("/api/history").json()["total"] == 0


def test_image_too_many_pixels_rejected() -> None:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("1", (8000, 8000)).save(buf, format="PNG")  # 64 MP, poucos KB
    assert len(buf.getvalue()) < 100_000
    r = post("enorme.png", buf.getvalue())
    assert r.status_code == 400
    assert "resolução" in r.json()["detail"]


@pytest.mark.parametrize(
    ("name", "content"),
    [
        ("fake.png", b"texto puro"),
        ("fake.jpg", b"texto puro"),
        ("corrompida.png", b"\x89PNG\r\n\x1a\n" + b"lixo" * 20),
        ("corrompida.jpg", b"\xff\xd8\xff" + b"lixo" * 20),
        ("trocada.png", make_image("JPEG")),  # conteúdo JPEG com extensão .png
        ("trocada.jpg", make_image("PNG")),
        ("a.gif", b"GIF89a"),
    ],
)
def test_bad_images_rejected(name: str, content: bytes) -> None:
    assert post(name, content).status_code == 400


@pytest.mark.slow
def test_image_real_ocr() -> None:
    r = post("scan.png", make_image("PNG"))
    assert r.status_code == 200
    assert "vendas" in r.text.lower()
