"""Lọc benchmark cước/bảo hiểm: hàm thuần (AGENTS.md §5.3, §6.1)."""

import datetime as dt
from collections.abc import Sequence
from typing import Protocol


class _Reviewed(Protocol):
    @property
    def reviewed_by(self) -> object | None: ...
    @property
    def valid_from(self) -> dt.date: ...
    @property
    def valid_until(self) -> dt.date: ...


def usable[T: _Reviewed](rows: Sequence[T], today: dt.date) -> list[T]:
    """Chỉ dòng ĐÃ DUYỆT (`reviewed_by` khác None) và còn hiệu lực vào `today`."""
    return [r for r in rows if r.reviewed_by is not None and r.valid_from <= today <= r.valid_until]
