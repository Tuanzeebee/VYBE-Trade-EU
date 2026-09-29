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
