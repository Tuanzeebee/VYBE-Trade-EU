"""Đọc/ghi file Excel (.xlsx) cho màn hình admin nhập dữ liệu hàng loạt. Không chứa nghiệp vụ.

- Sheet `data`: hàng 1 là khóa cột (máy đọc), từ hàng 2 là dữ liệu. Cột `readonly` (vd trạng thái
  duyệt) chỉ có ở file xuất và bị BỎ QUA khi nhập — file Excel không bao giờ tự duyệt được dữ liệu.
- Sheet `huong_dan`: ý nghĩa, kiểu và giá trị hợp lệ của từng cột.
- Số thập phân luôn đi qua `Decimal(str(...))`, không để float chạm vào tiền/tỷ lệ (AGENTS.md §5.7).
"""

import datetime as dt
import io
import zipfile
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import Response, UploadFile
from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
MAX_BYTES = 2 * 1024 * 1024
MAX_ROWS = 5000
MAX_ERRORS = 50
DATA_SHEET = "data"
GUIDE_SHEET = "huong_dan"

Kind = Literal["text", "date", "bool", "decimal", "int", "enum"]
_TRUE = {"true", "1", "yes", "có", "co"}
_FALSE = {"false", "0", "no", "không", "khong"}


@dataclass(frozen=True)
class Column:
    key: str
    kind: Kind = "text"
    required: bool = False
    choices: tuple[str, ...] = ()
    help: str = ""
    readonly: bool = False  # chỉ xuất, nhập bỏ qua


class RowError(BaseModel):
    row: int
    message: str


class ImportResult(BaseModel):
    created: int
    updated: int
    unchanged: int
    dry_run: bool
    applied: bool  # false khi có lỗi (không ghi gì) hoặc dry_run
    errors: list[RowError]


# ── Ghi file ────────────────────────────────────────────────────────────────
def _cell_value(column: Column, value: Any) -> Any:
    if value is None:
        return None
    if column.kind == "decimal":
        return float(Decimal(str(value)))
    if column.kind == "bool":
        return "true" if value else "false"
    return value


def build_workbook(
    columns: Sequence[Column], rows: Sequence[Mapping[str, Any]], *, template: bool = False
) -> bytes:
    """`template` = file mẫu để điền (không có cột readonly, không có dữ liệu)."""
    cols = [c for c in columns if not (template and c.readonly)]
    wb = Workbook()
    ws = wb.create_sheet(DATA_SHEET)
    wb.remove(wb.worksheets[0])
    header_fill = PatternFill("solid", fgColor="083832")
    for index, col in enumerate(cols, start=1):
        cell = ws.cell(row=1, column=index, value=col.key)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.comment = Comment(col.help or col.key, "evfta.eu")
        letter = cell.column_letter
        ws.column_dimensions[letter].width = max(14, len(col.key) + 4)
        if col.kind == "text":
            ws.column_dimensions[letter].number_format = "@"  # giữ số 0 đầu của mã HS
        if col.kind in ("enum", "bool") and not col.readonly:
            options = col.choices if col.kind == "enum" else ("true", "false")
            if options and len(",".join(options)) < 250:
                check = DataValidation(
                    type="list", formula1='"' + ",".join(options) + '"', allow_blank=True
                )
                check.add(f"{letter}2:{letter}{MAX_ROWS + 1}")
                ws.add_data_validation(check)
    ws.freeze_panes = "A2"
    for r, row in enumerate(rows, start=2):
        for c, col in enumerate(cols, start=1):
            value = _cell_value(col, row.get(col.key))
            cell = ws.cell(row=r, column=c, value=value)
            if isinstance(value, str) and value[:1] in ("=", "+", "-", "@"):
                cell.data_type = "s"  # chống formula injection: luôn là chuỗi
            if col.kind == "date" and value is not None:
                cell.number_format = "yyyy-mm-dd"
    guide = wb.create_sheet(GUIDE_SHEET)
    guide.append(["cột", "bắt buộc", "kiểu", "giá trị hợp lệ", "ý nghĩa"])
    for col in columns:
        if col.readonly:
            continue
        valid = ", ".join(col.choices) if col.kind == "enum" else _FORMAT.get(col.kind, "")
        guide.append([col.key, "có" if col.required else "không", col.kind, valid, col.help])
    for cell in guide[1]:
        cell.font = Font(bold=True)
    for letter, width in zip("ABCDE", (24, 10, 10, 40, 90), strict=True):
        guide.column_dimensions[letter].width = width
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


_FORMAT = {
    "date": "YYYY-MM-DD",
    "bool": "true hoặc false",
    "decimal": "số thập phân, vd 12.5",
    "int": "số nguyên",
}


def xlsx_response(data: bytes, filename: str) -> Response:
    return Response(
        data,
        media_type=XLSX,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Đọc file ────────────────────────────────────────────────────────────────
def _plain(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, int | float):
        return format(Decimal(str(value)).normalize(), "f")
    text = str(value).strip()
    return text or None


async def read_upload(file: UploadFile) -> bytes:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise AppError("file_too_large", "File must be 2 MB or smaller", 413)
    return data


def read_workbook(
    data: bytes, columns: Sequence[Column]
) -> list[tuple[int, dict[str, str | None]]]:
    """(số hàng trong Excel, giá trị chuỗi theo khóa cột). Bỏ hàng trống và cột readonly."""
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except (zipfile.BadZipFile, KeyError, ValueError, OSError) as error:
        raise AppError("invalid_file", "Not a valid .xlsx file", 422) from error
    if DATA_SHEET not in wb.sheetnames:
        raise AppError("invalid_file", f"Missing sheet '{DATA_SHEET}'", 422)
    iterator = wb[DATA_SHEET].iter_rows(values_only=True)
    header = next(iterator, None)
    if header is None:
        return []
    names = [str(h).strip() if h is not None else "" for h in header]
    wanted = [c for c in columns if not c.readonly]
    missing = [c.key for c in wanted if c.required and c.key not in names]
    if missing:
        raise AppError("invalid_file", "Missing columns: " + ", ".join(missing), 422)
    index = {c.key: names.index(c.key) for c in wanted if c.key in names}
    rows: list[tuple[int, dict[str, str | None]]] = []
    for number, values in enumerate(iterator, start=2):
        row = {key: _plain(values[i]) if i < len(values) else None for key, i in index.items()}
        if not any(row.values()):
            continue
        if len(rows) >= MAX_ROWS:
            raise AppError("file_too_large", f"At most {MAX_ROWS} rows per file", 413)
        rows.append((number, row))
    wb.close()
    return rows


def coerce(columns: Sequence[Column], raw: Mapping[str, str | None]) -> dict[str, Any]:
    """Chuỗi ô → giá trị đúng kiểu cho schema `*In`. Số thập phân giữ dạng chuỗi (schema tự kiểm).
    Ô trống của cột bool bị bỏ qua để giá trị mặc định của schema có hiệu lực."""
    out: dict[str, Any] = {}
    for col in columns:
        if col.readonly or col.key not in raw:
            continue
        text = raw[col.key]
        if col.kind == "bool":
            if text is None:
                continue
            lowered = text.lower()
            if lowered not in _TRUE | _FALSE:
                raise ValueError(f"{col.key}: chỉ nhận true hoặc false")
            out[col.key] = lowered in _TRUE
        elif text is None:
            out[col.key] = None
        elif col.kind == "date":
            try:
                out[col.key] = dt.date.fromisoformat(text)
            except ValueError as error:
                raise ValueError(f"{col.key}: ngày phải có dạng YYYY-MM-DD") from error
        elif col.kind == "int":
            try:
                out[col.key] = int(Decimal(text))
            except (InvalidOperation, ValueError) as error:
                raise ValueError(f"{col.key}: phải là số nguyên") from error
        else:
            out[col.key] = text
    return out


def describe(error: Exception) -> str:
    if isinstance(error, ValidationError):
        return "; ".join(
            f"{'.'.join(str(p) for p in e['loc']) or 'dòng'}: {e['msg']}" for e in error.errors()
        )
    if isinstance(error, AppError):
        return error.message
    return str(error)


# ── Áp dữ liệu vào DB ───────────────────────────────────────────────────────
async def apply_rows[In: BaseModel](
    session: AsyncSession,
    columns: Sequence[Column],
    rows: Sequence[tuple[int, dict[str, str | None]]],
    *,
    schema: type[In],
    key: Callable[[In], tuple[Any, ...]],
    find: Callable[[In], Awaitable[Any | None]],
    create: Callable[[In], Awaitable[Any]],
    update: Callable[[Any, In], Awaitable[Any]],
    dry_run: bool,
) -> ImportResult:
    """Tất cả-hoặc-không: có lỗi ở bất kỳ dòng nào → rollback, không ghi gì. Dòng trùng khóa với
    dòng đã có: giống hệt → `unchanged`; khác → cập nhật (caller đưa về chưa duyệt + audit)."""
    errors: list[RowError] = []
    parsed: list[tuple[int, In]] = []
    seen: dict[tuple[Any, ...], int] = {}
    for number, raw in rows:
        try:
            data = schema(**coerce(columns, raw))
            k = key(data)
        except (ValidationError, ValueError) as error:
            errors.append(RowError(row=number, message=describe(error)))
            continue
        if k in seen:
            errors.append(RowError(row=number, message=f"trùng khóa với dòng {seen[k]} trong file"))
            continue
        seen[k] = number
        parsed.append((number, data))
    created = updated = unchanged = 0
    for number, data in parsed:  # vẫn chạy khi đã có lỗi để báo hết một lượt; cuối cùng rollback
        try:
            existing = await find(data)
            if existing is None:
                await create(data)
                created += 1
            elif all(getattr(existing, f) == v for f, v in data.model_dump().items()):
                unchanged += 1
            else:
                await update(existing, data)
                updated += 1
        except AppError as error:
            errors.append(RowError(row=number, message=error.message))
    errors.sort(key=lambda e: e.row)
    applied = not errors and not dry_run
    if applied:
        await session.commit()
    else:
        await session.rollback()
    return ImportResult(
        created=created,
        updated=updated,
        unchanged=unchanged,
        dry_run=dry_run,
        applied=applied,
        errors=errors[:MAX_ERRORS],
    )
