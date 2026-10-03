"""PDF báo cáo go-to-market (U18) — hàm thuần, không DB/HTTP.

Font DejaVu Sans (giấy phép tự do, kèm trong data/fonts) để hiển thị đủ dấu tiếng Việt. Mọi trang có
dòng nguồn số liệu và câu "không phải tư vấn pháp lý".
"""

import datetime as dt
import io
from collections.abc import Sequence
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

FONT_DIR = Path(__file__).resolve().parents[3] / "data" / "fonts"
FONT, FONT_BOLD = "DejaVuSans", "DejaVuSans-Bold"
BRAND = colors.Color(8 / 255, 56 / 255, 50 / 255)

FOOTER = {
    "vi": "Nguồn: {source}. Báo cáo tham khảo, không phải tư vấn pháp lý hay cam kết kết quả.",
    "en": "Source: {source}. For reference only; not legal advice or a guarantee of results.",
}
DEMO_NOTE = {
    "vi": "Dữ liệu thuế minh hoạ, chưa được luật TM duyệt.",
    "en": "Illustrative tariff data, not yet reviewed by trade lawyers.",
}
LABELS = {
    "vi": {
        "title": "Báo cáo go-to-market",
        "company": "Công ty",
        "date": "Ngày lập",
        "narrative_model": "Lời văn do mô hình AI viết; mọi con số do hệ thống điền từ thống kê.",
        "narrative_template": "Lời văn theo mẫu; mọi con số do hệ thống điền từ thống kê.",
        "top": "Thị trường ưu tiên",
        "potential": "Thị trường tiềm năng",
        "competitors": "Nguồn cung ngoài EU",
        "country": "Nước",
        "imports": "Nhập khẩu",
        "growth": "Tăng trưởng/năm",
        "vn_share": "Thị phần VN",
        "share": "Thị phần",
        "unit_price": "Đơn giá (EUR/kg)",
        "page": "Trang",
    },
    "en": {
        "title": "Go-to-market report",
        "company": "Company",
        "date": "Date",
        "narrative_model": "Narrative by an AI model; all figures filled in from statistics.",
        "narrative_template": "Template narrative; all figures filled in from statistics.",
        "top": "Priority markets",
        "potential": "Potential markets",
        "competitors": "Extra-EU suppliers",
        "country": "Country",
        "imports": "Imports",
        "growth": "Growth/year",
        "vn_share": "VN share",
        "share": "Share",
        "unit_price": "Unit price (EUR/kg)",
        "page": "Page",
    },
}


@dataclass(frozen=True)
class ReportTable:
    kind: str  # top | potential | competitors
    rows: Sequence[Sequence[str]]  # giá trị đã định dạng, theo thứ tự cột của kind


@dataclass(frozen=True)
class ReportDocument:
    language: str
    company_name: str
    product_name: str
    created: dt.date
    source: str
    narrative_source: str  # model | template
    sections: Sequence[tuple[str, str, str]]  # (khoá, tiêu đề, lời văn đã điền số)
    tables: Sequence[ReportTable] = field(default_factory=tuple)
    demo_data: bool = False


@lru_cache
def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont(FONT, str(FONT_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_DIR / "DejaVuSans-Bold.ttf")))


def _styles() -> dict[str, ParagraphStyle]:
    return {
        "title": ParagraphStyle("title", fontName=FONT_BOLD, fontSize=18, leading=23),
        "subtitle": ParagraphStyle("subtitle", fontName=FONT_BOLD, fontSize=13, leading=17),
        "meta": ParagraphStyle(
            "meta", fontName=FONT, fontSize=9, leading=12, textColor=colors.grey
        ),
        "h2": ParagraphStyle(
            "h2", fontName=FONT_BOLD, fontSize=12, leading=16, spaceBefore=8, textColor=BRAND
        ),
        "body": ParagraphStyle("body", fontName=FONT, fontSize=10, leading=14),
        "cell": ParagraphStyle("cell", fontName=FONT, fontSize=8.5, leading=11),
        "demo": ParagraphStyle(
            "demo", fontName=FONT_BOLD, fontSize=9, leading=12, textColor=colors.darkorange
        ),
    }


def _headers(kind: str, lang: str) -> list[str]:
    t = LABELS[lang]
    if kind == "competitors":
        return [t["country"], t["imports"], t["share"], t["unit_price"]]
    return [t["country"], t["imports"], t["growth"], t["vn_share"]]


def _table(table: ReportTable, lang: str, cell: ParagraphStyle) -> Table:
    data = [[Paragraph(escape(h), cell) for h in _headers(table.kind, lang)]]
    data += [[Paragraph(escape(value), cell) for value in row] for row in table.rows]
    widths = [60 * mm, 40 * mm, 35 * mm, 35 * mm]
    out = Table(data, colWidths=widths, repeatRows=1)
    out.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.93, 0.96, 0.95)),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return out


def render_report(doc: ReportDocument) -> bytes:
    register_fonts()
    lang = doc.language if doc.language in LABELS else "vi"
    t = LABELS[lang]
    s = _styles()
    buffer = io.BytesIO()
    footer = FOOTER[lang].format(source=doc.source)

    def furniture(canvas: Canvas, template: SimpleDocTemplate) -> None:
        width, _ = A4
        canvas.saveState()
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(colors.grey)
        canvas.drawString(18 * mm, 10 * mm, footer)
        canvas.drawRightString(width - 18 * mm, 10 * mm, f"{t['page']} {canvas.getPageNumber()}")
        canvas.restoreState()

    template = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=f"{t['title']} — {doc.product_name}",
        author="VYBE Trade",
    )
    story: list[object] = [
        Paragraph(escape(t["title"]), s["title"]),
        Paragraph(escape(doc.product_name), s["subtitle"]),
        Paragraph(
            escape(f"{t['company']}: {doc.company_name} · {t['date']}: {doc.created.isoformat()}"),
            s["meta"],
        ),
        Paragraph(escape(t[f"narrative_{doc.narrative_source}"]), s["meta"]),
    ]
    if doc.demo_data:
        story.append(Paragraph(escape(DEMO_NOTE[lang]), s["demo"]))
    story.append(Spacer(1, 4 * mm))
    tables = {table.kind: table for table in doc.tables}
    after = {"why_market": ("top", "potential"), "competition": ("competitors",)}
    for key, title, text in doc.sections:
        story.append(Paragraph(escape(title), s["h2"]))
        if text:
            story.append(Paragraph(escape(text), s["body"]))
        for kind in after.get(key, ()):
            table = tables.get(kind)
            if table and table.rows:
                story.append(Spacer(1, 2 * mm))
                story.append(Paragraph(escape(t[kind]), s["meta"]))
                story.append(_table(table, lang, s["cell"]))
    template.build(story, onFirstPage=furniture, onLaterPages=furniture)
    return buffer.getvalue()
