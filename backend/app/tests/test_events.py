from dataclasses import dataclass

from app.core.events import Event, clear_subscribers, publish, subscribe


@dataclass(frozen=True)
class Pinged(Event):
    value: int


async def test_publish_calls_every_subscriber_in_order() -> None:
    clear_subscribers()
    seen: list[str] = []

    async def first(e: Pinged) -> None:
        seen.append(f"a{e.value}")

    async def second(e: Pinged) -> None:
        seen.append(f"b{e.value}")

    subscribe(Pinged, first)
    subscribe(Pinged, second)
    await publish(Pinged(value=1))
    assert seen == ["a1", "b1"]


async def test_publish_without_subscriber_is_noop() -> None:
    clear_subscribers()
    await publish(Pinged(value=2))
