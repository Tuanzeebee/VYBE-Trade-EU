# Chạy nhanh từ gốc repo. `make dev` = hạ tầng + BE + FE song song.
.PHONY: up down be fe dev install migrate api check

up:
	docker compose up -d

down:
	docker compose down

# --host ::1: trình duyệt trên Windows thử IPv6 (::1) trước cho "localhost"; backend chỉ nghe IPv4 thì
# mỗi kết nối mới tới API chờ thêm ~200–300ms mới lùi về 127.0.0.1.
be:
	cd backend && uv run fastapi dev app/main.py --host ::1

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
