# Chạy nhanh từ gốc repo. `make dev` = hạ tầng + BE + FE song song.
.PHONY: up down be fe dev install migrate api check

up:
	docker compose up -d

down:
	docker compose down

be:
	cd backend && uv run fastapi dev app/main.py

fe:
	cd frontend && npm run dev

dev: up
	$(MAKE) -j2 be fe

install:
	cd backend && uv sync
	cd frontend && npm install

migrate:
	cd backend && uv run alembic upgrade head

api:
	cd frontend && npm run generate:api

check:
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest
	cd frontend && npm run lint && npm run typecheck && npm test
