from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.modules.auth import service
from app.modules.auth.models import User, UserRole
from app.modules.auth.schemas import LoginIn, MePatch, RegisterIn, UserOut

router = APIRouter(tags=["auth"])
DbSession = Annotated[AsyncSession, Depends(get_session)]
CurrentUser = Annotated[User, Depends(service.current_user)]


def _set_session_cookie(response: Response, token: str) -> None:
    s = get_settings()
    response.set_cookie(
        s.session_cookie_name,
        token,
        max_age=s.session_days * 86400,
        httponly=True,
        secure=s.session_cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, response: Response, session: DbSession) -> UserOut:
    user = await service.create_user(
        session,
        email=body.email,
        password=body.password,
        name=body.name,
        role=UserRole(body.role),
        company_name=body.company_name,
        preferred_language=body.preferred_language,
        consent_accepted=body.consent_accepted,
    )
    _set_session_cookie(response, await service.create_session(session, user))
    return UserOut.model_validate(user)


@router.post("/api/auth/login")
async def login(body: LoginIn, response: Response, session: DbSession) -> UserOut:
    user = await service.authenticate(session, body.email, body.password)
    _set_session_cookie(response, await service.create_session(session, user))
    return UserOut.model_validate(user)


@router.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, session: DbSession) -> None:
    name = get_settings().session_cookie_name
    if token := request.cookies.get(name):
        await service.revoke_session(session, token)
    response.delete_cookie(name, path="/")


@router.get("/api/me")
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/api/me")
async def patch_me(body: MePatch, user: CurrentUser, session: DbSession) -> UserOut:
    user = await service.update_me(
        session, user, name=body.name, preferred_language=body.preferred_language
    )
    return UserOut.model_validate(user)


@router.get("/api/admin/users")
async def admin_list_users(
    _: Annotated[User, Depends(service.require_role(UserRole.admin))], session: DbSession
) -> list[UserOut]:
    return [UserOut.model_validate(u) for u in await service.list_users(session)]
