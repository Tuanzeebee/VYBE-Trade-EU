import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.storage import Storage, get_storage
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import require_role
from app.modules.verification import evidence_service
from app.modules.verification.schemas import ChecklistItem, EvidenceIn, EvidenceOut, EvidencePatch

router = APIRouter(tags=["verification"])

Exporter = Annotated[CurrentUser, Depends(require_role("exporter"))]
DB = Annotated[AsyncSession, Depends(get_session)]
Store = Annotated[Storage, Depends(get_storage)]


@router.get("/api/exporter/evidences")
async def list_evidences(user: Exporter, session: DB, storage: Store) -> list[EvidenceOut]:
    return await evidence_service.list_evidence(session, user, storage)


# Khai báo /checklist TRƯỚC /{evidence_id} để không bị coi là id.
@router.get("/api/exporter/evidences/checklist")
async def evidence_checklist(user: Exporter, session: DB) -> list[ChecklistItem]:
    return await evidence_service.checklist(session, user)


@router.post("/api/exporter/evidences", status_code=201)
async def create_evidence(
    data: EvidenceIn, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await evidence_service.create_evidence(session, user, storage, data)


@router.get("/api/exporter/evidences/{evidence_id}")
async def get_evidence(
    evidence_id: uuid.UUID, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await evidence_service.get_evidence(session, user, storage, evidence_id)


@router.patch("/api/exporter/evidences/{evidence_id}")
async def update_evidence(
    evidence_id: uuid.UUID, data: EvidencePatch, user: Exporter, session: DB, storage: Store
) -> EvidenceOut:
    return await evidence_service.update_evidence(session, user, storage, evidence_id, data)


@router.delete("/api/exporter/evidences/{evidence_id}", status_code=204)
async def delete_evidence(evidence_id: uuid.UUID, user: Exporter, session: DB) -> Response:
    await evidence_service.delete_evidence(session, user, evidence_id)
    return Response(status_code=204)
