"""Event bus nội tiến trình.

Phản ứng chéo module đi qua đây; việc chậm thì handler đẩy sang job nền.
"""

from collections import defaultdict
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Event:
    """Lớp gốc cho mọi event. Event con là dataclass frozen."""


Handler = Callable[[Any], Awaitable[None]]
_subscribers: defaultdict[type[Event], list[Handler]] = defaultdict(list)


def subscribe(event_type: type[Event], handler: Handler) -> None:
    _subscribers[event_type].append(handler)


async def publish(event: Event) -> None:
    for handler in _subscribers[type(event)]:
        await handler(event)


def clear_subscribers() -> None:
    _subscribers.clear()
