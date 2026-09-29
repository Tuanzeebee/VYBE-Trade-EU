import io
import sys

import pytest

from scripts.create_admin import main


@pytest.mark.parametrize("password", ["", "          ", "ngan"])
def test_script_refuses_blank_or_short_password(
    password: str, capsys: pytest.CaptureFixture[str]
) -> None:
    code = main(["root@x.vn"], ask_password=lambda _prompt: password)
    assert code == 1
    out = capsys.readouterr()
    assert password.strip() == "" or password not in out.out + out.err  # không in mật khẩu


def test_script_requires_email_argument() -> None:
    assert main([], ask_password=lambda _prompt: "mat-khau-du-dai") == 2


def test_script_prints_vietnamese_on_a_cp1252_console(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_create(email: str, password: str) -> None:
        return None

    monkeypatch.setattr("scripts.create_admin._create", fake_create)
    raw = io.BytesIO()
    console = io.TextIOWrapper(raw, encoding="cp1252", errors="strict")
    monkeypatch.setattr(sys, "stdout", console)
    assert main(["Root@X.vn"], ask_password=lambda _prompt: "mat-khau-du-dai") == 0
    console.flush()
    assert "Đã tạo admin root@x.vn" in raw.getvalue().decode("utf-8")
