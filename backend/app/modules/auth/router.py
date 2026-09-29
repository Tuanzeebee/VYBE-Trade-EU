from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.modules.auth import service
from app.modules.auth.schemas import CurrentUser, LoginIn, MePatch, RegisterIn

router = APIRouter(tags=["auth"])
DB = Annotated[AsyncSession, Depends(get_session)]
Me = Annotated[CurrentUser, Depends(service.get_current_user)]


def _set_cookie(response: Response, token: str) -> None:
    s = get_settings()
    response.set_cookie(
        service.COOKIE_NAME,
        token,
        max_age=s.session_days * 86400,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterIn, session: DB, response: Response) -> dict[str, str]:
    _set_cookie(response, await service.register(session, data))
    return {"status": "ok"}


@router.post("/api/auth/login")
async def login(data: LoginIn, session: DB, response: Response) -> dict[str, str]:
    _set_cookie(response, await service.login(session, data))
    return {"status": "ok"}


@router.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout(session: DB, evfta_session: Annotated[str | None, Cookie()] = None) -> Response:
    await service.logout(session, evfta_session)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(service.COOKIE_NAME, path="/")
    return response


@router.get("/api/me")
async def me(user: Me) -> CurrentUser:
    return user


@router.patch("/api/me")
async def patch_me(data: MePatch, user: Me, session: DB) -> CurrentUser:
    return await service.update_me(session, user.id, data)
