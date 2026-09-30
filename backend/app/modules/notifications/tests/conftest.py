"""Dùng lại fixture của messaging: hs_seeded (autouse) và notifications_on."""

from app.modules.messaging.tests.conftest import hs_seeded, notifications_on  # noqa: F401
