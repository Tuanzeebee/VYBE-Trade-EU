"""J8: phần thuần của script thử sao lưu/khôi phục (đối soát và chốt an toàn)."""

import pytest

from scripts.backup_restore_check import assert_safe_target, compare_counts


def test_matching_counts_have_no_problems() -> None:
    assert compare_counts({"a": 1, "b": 0}, {"a": 1, "b": 0}) == []


def test_differences_missing_and_extra_tables_are_reported() -> None:
    problems = compare_counts({"a": 3, "b": 1, "c": 2}, {"a": 2, "b": 1, "d": 5})
    assert problems == [
        "a: nguồn 3 dòng, khôi phục 2 dòng",
        "c: thiếu ở bản khôi phục",
        "d: thừa ở bản khôi phục",
    ]


@pytest.mark.parametrize(
    ("host", "database"),
    [
        ("db.staging.internal", "evfta"),
        ("prod-db.eu", "evfta"),
        ("localhost", "evfta_prod"),
        ("localhost", "evfta_staging"),
        ("localhost", None),
        (None, "evfta"),
    ],
)
def test_refuses_anything_but_local_dev(host: str | None, database: str | None) -> None:
    with pytest.raises(SystemExit):
        assert_safe_target(host, database)


def test_accepts_local_dev_databases() -> None:
    assert_safe_target("localhost", "evfta")
    assert_safe_target("127.0.0.1", "evfta_test")
