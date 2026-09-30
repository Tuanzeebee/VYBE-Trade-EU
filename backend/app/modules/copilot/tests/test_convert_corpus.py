"""Script chuyển corpus EUR-Lex sang định dạng bộ nạp: đầu ra phải được bộ nạp đọc đúng."""

import json
from pathlib import Path

import pytest

from app.modules.copilot.ingest import parse_corpus_file
from scripts.convert_corpus import clean_body, convert_all, main

FULL = """# Quy dinh (EC) 852/2004 - Ve sinh thuc pham

CELEX: 32004R0852 | Phien ban: 02004R0852-20210324 | Nguon: http://example.test/doc

▼B

Article 1

▼M3

Scope of this Regulation.



Article 2

Definitions.
"""


def _folder(root: Path, name: str, *, full: str | None = FULL, language: str = "EN") -> None:
    folder = root / name
    folder.mkdir()
    if full is not None:
        (folder / "full.md").write_text(full, encoding="utf-8")
    (folder / "metadata.json").write_text(
        json.dumps(
            {
                "act_id": name.split("_")[0],
                "celex": "32004R0852",
                "title": "Quy dinh (EC) 852/2004 - Ve sinh thuc pham",
                "version": "02004R0852-20210324",
                "source_url": "http://example.test/doc",
                "language": language,
            }
        ),
        encoding="utf-8",
    )


def test_clean_body_bo_tieu_de_va_ky_hieu_hop_nhat_giu_nguyen_dieu_khoan() -> None:
    body = clean_body(FULL)
    assert body.startswith("Article 1")
    assert "▼" not in body
    assert "Scope of this Regulation." in body
    assert "\n\n\n" not in body


def test_dau_ra_duoc_bo_nap_doc_dung(tmp_path: Path) -> None:
    source, target = tmp_path / "src", tmp_path / "out"
    source.mkdir()
    _folder(source, "F2_Quy_dinh")
    done, skipped = convert_all(source, target)
    assert (done, skipped) == (["F2"], [])
    parsed = parse_corpus_file(target / "F2.md")
    assert parsed.title == "Quy dinh (EC) 852/2004 - Ve sinh thuc pham"
    assert parsed.source == "EUR-Lex 32004R0852 (02004R0852-20210324)"
    assert (parsed.language, parsed.doc_type) == ("en", "law")
    assert parsed.source_url == "http://example.test/doc"
    assert parsed.hs_codes == []  # không đoán mã HS
    assert parsed.body.startswith("Article 1")


def test_thu_muc_thieu_full_md_bi_bao_khong_lam_dung_ca_lo(tmp_path: Path) -> None:
    source, target = tmp_path / "src", tmp_path / "out"
    source.mkdir()
    _folder(source, "F2_ok")
    _folder(source, "T1c_thieu", full=None)
    done, skipped = convert_all(source, target)
    assert done == ["F2"]
    assert len(skipped) == 1
    assert "T1c_thieu" in skipped[0]


def test_ngon_ngu_la_bi_tu_choi(tmp_path: Path) -> None:
    source = tmp_path / "src"
    source.mkdir()
    _folder(source, "F2_x", language="FR")
    with pytest.raises(ValueError, match="language"):
        convert_all(source, tmp_path / "out")


def test_main_khong_doi_so_thi_bao_cach_dung(capsys: pytest.CaptureFixture[str]) -> None:
    assert main([]) == 1
    assert "Cách dùng" in capsys.readouterr().out
