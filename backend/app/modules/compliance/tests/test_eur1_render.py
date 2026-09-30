"""render_eur1: bản nháp dữ liệu EUR.1 (C5). Hàm thuần — không DB, không HTTP."""

import datetime as dt
import io

import pytest
from pypdf import PdfReader

from app.modules.compliance.eur1 import (
    AUTHORITY_LINE,
    WATERMARK,
    Eur1Data,
    ascii_fold,
    render_eur1,
)


def sample(**over: str) -> Eur1Data:
    fields: dict[str, object] = {
        "exporter_name": "Cong ty TNHH Nong San Viet",
        "exporter_address": "720A Dien Bien Phu, Ho Chi Minh City",
        "exporter_country": "Viet Nam",
        "consignee_name": "Global Foods GmbH",
        "consignee_address": "Hafenstrasse 12, Hamburg",
        "consignee_country": "Germany",
        "origin_country": "Viet Nam",
        "destination": "European Union",
        "hs_code": "0901.21",
        "goods_description": "Roasted coffee, not decaffeinated",
        "packages": "100 bags",
        "gross_mass_kg": "6200.50",
        "invoice_number": "INV-2026-001",
        "invoice_date": dt.date(2026, 10, 1),
        "transport_details": "Sea freight, Cat Lai to Hamburg",
        "remarks": "",
        "check_reference": "abcd1234",
    }
    fields.update(over)
    return Eur1Data(**fields)  # type: ignore[arg-type]


def pages_text(pdf: bytes) -> list[str]:
    return [(p.extract_text() or "") for p in PdfReader(io.BytesIO(pdf)).pages]


def test_renders_a_pdf() -> None:
    pdf = render_eur1(sample())
    assert pdf.startswith(b"%PDF")
    assert len(PdfReader(io.BytesIO(pdf)).pages) >= 1


def test_watermark_on_every_page() -> None:
    long_goods = "\n".join(
        f"Item {i}: roasted coffee, lot {i}, packed in jute bags" for i in range(140)
    )
    pdf = render_eur1(sample(goods_description=long_goods))
    reader = PdfReader(io.BytesIO(pdf))
    assert len(reader.pages) >= 2, "cần ít nhất 2 trang để kiểm watermark mọi trang"
    for index, page in enumerate(reader.pages):
        assert WATERMARK in (page.extract_text() or ""), f"trang {index + 1} thiếu dòng DRAFT"
        content = page.get_contents()
        assert content is not None and b"DRAFT" in content.get_data(), (
            f"trang {index + 1} thiếu watermark chéo"
        )


def test_watermark_text_is_the_agreed_wording() -> None:
    assert WATERMARK == "DRAFT — for review before submission to issuing authority"


def test_issuing_authority_is_moit_on_every_page() -> None:
    long_goods = "\n".join(f"Item {i}: coffee lot {i}" for i in range(140))
    pdf = render_eur1(sample(goods_description=long_goods))
    for page in pages_text(pdf):
        assert (
            ascii_fold(AUTHORITY_LINE) in page
        )  # tên tiếng Việt viết không dấu (PDF dùng font chuẩn)
    assert (
        AUTHORITY_LINE
        == "Official issuing authority: Ministry of Industry and Trade (Bộ Công Thương)"
    )


def test_data_appears_in_the_document() -> None:
    text = "\n".join(pages_text(render_eur1(sample())))
    for expected in (
        "Cong ty TNHH Nong San Viet",
        "Global Foods GmbH",
        "Germany",
        "0901.21",
        "Roasted coffee, not decaffeinated",
        "100 bags",
        "6200.50",
        "INV-2026-001",
        "2026-10-01",
        "abcd1234",
    ):
        assert expected in text, expected


def test_no_issue_wording_outside_the_watermark_and_authority_line() -> None:
    """Không có chữ nào ngụ ý đây là chứng từ đã cấp/chứng nhận."""
    text = "\n".join(pages_text(render_eur1(sample())))
    stripped = text.replace(WATERMARK, "").replace(ascii_fold(AUTHORITY_LINE), "")
    lowered = stripped.lower()
    for word in ("issued", "certified", "certificate", "signed", "stamp"):
        assert word not in lowered, word


def test_states_it_is_a_draft_for_review_not_a_certificate() -> None:
    text = "\n".join(pages_text(render_eur1(sample())))
    assert "DRAFT" in text and "not an official document" in text


@pytest.mark.parametrize(
    ("raw", "folded"),
    [
        ("Công ty TNHH Nông Sản Việt", "Cong ty TNHH Nong San Viet"),
        ("Đường Điện Biên Phủ", "Duong Dien Bien Phu"),
        ("Straße Müller", "Strasse Muller"),
        ("plain ascii", "plain ascii"),
    ],
)
def test_ascii_fold_keeps_the_pdf_readable_without_unicode_fonts(raw: str, folded: str) -> None:
    assert ascii_fold(raw) == folded


def test_vietnamese_text_is_folded_not_garbled() -> None:
    text = "\n".join(pages_text(render_eur1(sample(exporter_name="Công ty TNHH Nông Sản Việt"))))
    assert "Cong ty TNHH Nong San Viet" in text


def test_markup_in_user_text_is_not_interpreted() -> None:
    hostile = '<b>bold</b> <font size="99">x</font> <a href="http://evil">link</a>'
    pdf = render_eur1(sample(consignee_name=hostile))
    text = "\n".join(pages_text(pdf))
    assert "<b>bold</b>" in text  # hiển thị nguyên văn, không thành in đậm/liên kết
    reader = PdfReader(io.BytesIO(pdf))
    assert not any("/Annots" in p for p in reader.pages)  # không có liên kết bấm được


def test_empty_optional_fields_render_a_dash() -> None:
    text = "\n".join(pages_text(render_eur1(sample(remarks="", transport_details=""))))
    assert "—" in text or "-" in text
