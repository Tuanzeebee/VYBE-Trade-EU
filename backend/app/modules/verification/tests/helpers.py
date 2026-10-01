"""Hàm dựng dữ liệu SYNTHETIC dùng chung cho test bằng chứng."""

import datetime as dt
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.verification.models import (
    CheckResult,
    CheckSubject,
    CheckType,
    Evidence,
    EvidenceCheck,
    EvidenceType,
    RequiredEvidenceRule,
)

TODAY = dt.datetime.now(dt.UTC).date()
LIST = "/api/exporter/evidences"


async def add_type(
    session: AsyncSession,
    reviewer: uuid.UUID | None,
    code: str = "iso_9001",
    validity: int | None = None,
    active: bool = True,
) -> EvidenceType:
    row = EvidenceType(
        code=code,
        name_vi=f"Loại {code}",
        name_en=f"Type {code}",
        group="quality",
        validity_months=validity,
        is_active=active,
        reviewed_by=reviewer,
        reviewed_at=dt.datetime.now(dt.UTC) if reviewer else None,
    )
    session.add(row)
    await session.flush()
    return row


async def add_rule(
    session: AsyncSession,
    reviewer: uuid.UUID | None,
    type_code: str,
    category: str = "agriculture",
    required: bool = True,
    note: str | None = None,
) -> None:
    session.add(
        RequiredEvidenceRule(
            category=category,
            evidence_type_code=type_code,
            is_required=required,
            note=note,
            reviewed_by=reviewer,
            reviewed_at=dt.datetime.now(dt.UTC) if reviewer else None,
        )
    )
    await session.flush()


async def prove_ownership(
    session: AsyncSession, company_id: uuid.UUID | str, result: str = "match"
) -> None:
    """Ghi kết quả gọi lại số chính thức (I11) — điều kiện để lên evfta_verified."""
    session.add(
        EvidenceCheck(
            company_id=uuid.UUID(str(company_id)),
            subject=CheckSubject.ownership,
            check_type=CheckType.phone_callback,
            result=CheckResult(result),
        )
    )
    await session.flush()


async def cross_check(session: AsyncSession, evidence: Evidence, result: str = "match") -> None:
    """Ghi một lần kiểm chéo nguồn ngoài (I8) — điều kiện để duyệt bằng chứng và lên evfta_verified."""
    session.add(
        EvidenceCheck(
            company_id=evidence.company_id,
            evidence_id=evidence.id,
            subject=CheckSubject.evidence,
            check_type=CheckType.registry_lookup,
            result=CheckResult(result),
            source="https://www.iafcertsearch.org/",
            snapshot_key=f"checks/{evidence.company_id}/snap.png",
        )
    )
    await session.flush()


def snapshot_key(company_id: uuid.UUID | str) -> str:
    return f"checks/{company_id}/{uuid.uuid4().hex}.png"


def body(company_id: str, **over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "type_code": "iso_9001",
        "file_key": f"evidence/{company_id}/{uuid.uuid4().hex}.pdf",
        "certificate_number": "VN-123",
        "issuer": "SGS Vietnam",
        "issued_at": (TODAY - dt.timedelta(days=10)).isoformat(),
        "expires_at": (TODAY + dt.timedelta(days=355)).isoformat(),
    }
    b.update(over)
    return b
