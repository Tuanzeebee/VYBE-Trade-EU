import io
import sys
from pathlib import Path

import pytest

from scripts.seed_hs_codes import DEFAULT_CSV, load_csv, main

# 20 mã đợt 1 do PO cung cấp 29/09/2026 (backlog C0).
WAVE_1 = {
    "090111", "090121", "080132", "090411", "090619", "090240", "100630", "030617", "160529",
    "030462", "160414", "081060", "081090", "080450", "081190", "200899", "080111", "190219",
    "210390", "040900",
}  # fmt: skip


def test_csv_has_exactly_the_wave_1_codes() -> None:
    rows = load_csv(DEFAULT_CSV)
    assert len(rows) == 20
    assert {r.code for r in rows} == WAVE_1


def test_csv_rows_are_complete() -> None:
    for row in load_csv(DEFAULT_CSV):
        assert len(row.code) == 6
        assert row.name_vi.strip()
        assert row.name_en.strip()
        assert row.category is not None
        assert row.is_calculator_supported is True


def test_csv_has_no_tax_or_sps_columns() -> None:
    """Dữ liệu thuế chỉ vào tariff_lines (C1) sau khi luật TM duyệt — không lẫn vào danh mục HS."""
    header = next(
        line
        for line in DEFAULT_CSV.read_text(encoding="utf-8").splitlines()
        if not line.startswith("#")
    )
    assert header == "code,name_vi,name_en,category,is_calculator_supported"


def test_csv_states_it_is_not_signed_yet() -> None:
    text = DEFAULT_CSV.read_text(encoding="utf-8")
    assert "CHƯA xác nhận" in text


def test_load_csv_skips_comments_and_rejects_bad_rows(tmp_path: Path) -> None:
    good = tmp_path / "ok.csv"
    good.write_text(
        "# ghi chú\ncode,name_vi,name_en,category,is_calculator_supported\n"
        "100630,Gạo xát,Rice,agriculture,true\n",
        encoding="utf-8",
    )
    assert [r.code for r in load_csv(good)] == ["100630"]
    bad = tmp_path / "bad.csv"
    bad.write_text(
        "code,name_vi,name_en,category,is_calculator_supported\n1006,Gạo,Rice,agriculture,true\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="dòng 2"):
        load_csv(bad)


def test_main_reports_missing_file(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main([str(tmp_path / "khong-co.csv")]) == 1
    assert "Không tìm thấy" in capsys.readouterr().err


def test_main_prints_vietnamese_on_a_cp1252_console(monkeypatch: pytest.MonkeyPatch) -> None:
    """Console Windows dùng cp1252: in tiếng Việt không được làm script sập sau khi đã ghi DB."""

    async def fake_seed(rows: object) -> int:
        return 20

    monkeypatch.setattr("scripts.seed_hs_codes._seed", fake_seed)
    raw = io.BytesIO()
    console = io.TextIOWrapper(raw, encoding="cp1252", errors="strict")
    monkeypatch.setattr(sys, "stdout", console)
    assert main([str(DEFAULT_CSV)]) == 0
    console.flush()
    assert "Đã nạp 20 mã HS" in raw.getvalue().decode("utf-8")
