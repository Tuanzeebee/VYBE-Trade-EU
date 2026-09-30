import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog, record


async def test_record_stores_who_what_before_after(db_session: AsyncSession) -> None:
    await record(
        db_session,
        actor_id=None,
        action_type="company.hide",
        entity_type="company",
        entity_id="42",
        before={"is_hidden": False},
        after={"is_hidden": True},
    )
    await db_session.flush()
    row = (await db_session.execute(select(AuditLog))).scalars().one()
    assert (row.action_type, row.entity_type, row.entity_id) == ("company.hide", "company", "42")
    assert row.before_state == {"is_hidden": False}
    assert row.after_state == {"is_hidden": True}
    assert row.created_at is not None


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE audit_logs SET action_type = 'x'",
        "DELETE FROM audit_logs",
        "TRUNCATE audit_logs",
    ],
)
async def test_audit_logs_are_append_only(db_session: AsyncSession, sql: str) -> None:
    await record(
        db_session,
        actor_id=None,
        action_type="t",
        entity_type="t",
        entity_id="1",
        before=None,
        after={"a": 1},
    )
    await db_session.flush()
    with pytest.raises(DBAPIError, match="append-only"):
        await db_session.execute(text(sql))
