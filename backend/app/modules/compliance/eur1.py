"""Bản NHÁP dữ liệu EUR.1 (C5) — hàm thuần, không DB/HTTP.

Đây KHÔNG phải chứng từ chính thức và KHÔNG cấp C/O: chỉ là bản dữ liệu để rà soát trước khi
nộp cho cơ quan cấp chính thức là Bộ Công Thương. Mọi trang có watermark chéo, dòng DRAFT và
dòng cơ quan cấp.

Bố cục hiện là bảng dữ liệu trung tính. Khi luật TM cung cấp mẫu EUR.1 chính thức (Q8) thì thay
bố cục ở đây bằng bản phủ dữ liệu lên mẫu đó; giữ nguyên watermark và dòng cơ quan cấp. Font
chuẩn của PDF không có dấu tiếng Việt nên văn bản chuyển sang không dấu (ascii_fold).
"""

import datetime as dt
import io
import unicodedata
from dataclasses import dataclass
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Flowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer

WATERMARK = "DRAFT — for review before submission to issuing authority"
AUTHORITY_LINE = "Official issuing authority: Ministry of Industry and Trade (Bộ Công Thương)"
NOT_OFFICIAL = "This is a draft data sheet for review, not an official document."
EMPTY = "—"


@dataclass(frozen=True)
class Eur1Data:
    exporter_name: str
    exporter_address: str
    exporter_country: str
    consignee_name: str
    consignee_address: str
    consignee_country: str
    origin_country: str
    destination: str
    hs_code: str
    goods_description: str
    packages: str
    gross_mass_kg: str
    invoice_number: str
    invoice_date: dt.date
    transport_details: str
    remarks: str
    check_reference: str  # rút gọn id compliance_checks (kết quả RoO = pass)


def ascii_fold(text: str) -> str:
    """Bỏ dấu (kể cả đ/Đ) để dùng được với font chuẩn của PDF."""
    folded = text.replace("đ", "d").replace("Đ", "D").replace("ß", "ss")
    decomposed = unicodedata.normalize("NFKD", folded)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def _plain(value: str) -> str:
    """Văn bản người dùng: không dấu, escape để reportlab không hiểu thành thẻ."""
    text = ascii_fold(value).strip()
    return escape(text) if text else EMPTY


def _draw_page_furniture(canvas: Canvas, doc: SimpleDocTemplate) -> None:
    """Vẽ trên MỌI trang: watermark chéo, dòng DRAFT ở đầu trang, dòng cơ quan cấp ở chân trang."""
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.16))
    canvas.setFont("Helvetica-Bold", 30)
    canvas.translate(width / 2, height / 2)
    canvas.rotate(45)
    canvas.drawCentredString(0, 0, WATERMARK)
    canvas.restoreState()

    canvas.saveState()
    canvas.setFillColor(colors.Color(0.7, 0.05, 0.05))
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawCentredString(width / 2, height - 12 * mm, WATERMARK)
    canvas.setFillColor(colors.Color(0.2, 0.2, 0.2))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(width / 2, 12 * mm, ascii_fold(AUTHORITY_LINE))
    canvas.drawRightString(width - 15 * mm, 8 * mm, f"{doc.page}")
    canvas.restoreState()


def render_eur1(data: Eur1Data) -> bytes:
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        "body",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
        borderWidth=0.5,
        borderColor=colors.Color(0.6, 0.6, 0.6),
        borderPadding=(4, 6, 4, 6),
        spaceAfter=7,
    )
    label_style = ParagraphStyle(
        "label", parent=styles["BodyText"], fontSize=8, textColor=colors.Color(0.35, 0.35, 0.35)
    )
    plain_style = ParagraphStyle("plain", parent=styles["BodyText"], fontSize=9, leading=12)
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=16)

    def box(number: str, name: str, value: str) -> list[Flowable]:
        # Đoạn văn có viền: tách trang được khi mô tả hàng hóa dài (bảng một ô thì không).
        lines = ascii_fold(value).splitlines() or [""]
        text = "<br/>".join(escape(line) for line in lines) if any(lines) else EMPTY
        return [
            KeepTogether([Paragraph(f"{number}. {name}", label_style), Spacer(1, 1 * mm)]),
            Paragraph(text, body_style),
        ]

    story: list[Flowable] = [
        Paragraph("EUR.1 — DRAFT data sheet", title_style),
        Paragraph(NOT_OFFICIAL, plain_style),
        Spacer(1, 6 * mm),
    ]
    for number, name, value in (
        (
            "1",
            "Exporter",
            "\n".join((data.exporter_name, data.exporter_address, data.exporter_country)),
        ),
        (
            "3",
            "Consignee",
            "\n".join((data.consignee_name, data.consignee_address, data.consignee_country)),
        ),
        ("4", "Country of origin", data.origin_country),
        ("5", "Country of destination", data.destination),
        ("6", "Transport details", data.transport_details),
        ("7", "Remarks", data.remarks),
        ("8", "HS code", data.hs_code),
        ("8", "Packages", data.packages),
        ("9", "Gross mass (kg)", data.gross_mass_kg),
        ("10", "Invoice", f"{data.invoice_number} / {data.invoice_date.isoformat()}"),
        ("-", "Origin check reference (result: pass)", data.check_reference),
        ("8", "Description of goods", data.goods_description),
    ):
        story.extend(box(number, name, value))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title="EUR.1 draft data sheet",
        author="evfta.eu",
    )
    doc.build(story, onFirstPage=_draw_page_furniture, onLaterPages=_draw_page_furniture)
    return buffer.getvalue()
