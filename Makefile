.PHONY: setup check-deps up down build install logs logs-api logs-web clean db-only api-only web-only lint test migrate

# URL do Postgres visto DO HOST (o .env usa o hostname "db", que so existe dentro do compose)
HOST_DATABASE_URL := postgresql://myfinance:myfinance@localhost:5432/myfinance

PYTHON := python3.12
NODE_MIN := 20

# Verifica se as dependencias do sistema estao instaladas
check-deps:
	@echo "Checking dependencies..."
	@command -v docker >/dev/null 2>&1 || (echo "✗ docker not found. Install: https://docs.docker.com/get-docker/" && exit 1)
	@echo "  ✓ docker $$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
	@docker compose version >/dev/null 2>&1 || (echo "✗ docker compose not found." && exit 1)
	@echo "  ✓ docker compose"
	@command -v $(PYTHON) >/dev/null 2>&1 || (echo "✗ $(PYTHON) not found. Install: brew install python@3.12" && exit 1)
	@echo "  ✓ $$($(PYTHON) --version)"
	@command -v node >/dev/null 2>&1 || (echo "✗ node not found. Install: https://nodejs.org/" && exit 1)
	@node -e "process.exit(parseInt(process.version.slice(1))>=$(NODE_MIN)?0:1)" 2>/dev/null || (echo "✗ node >= $(NODE_MIN) required (found: $$(node --version))" && exit 1)
	@echo "  ✓ node $$(node --version)"
	@command -v npm >/dev/null 2>&1 || (echo "✗ npm not found." && exit 1)
	@echo "  ✓ npm $$(npm --version)"
	@echo "All dependencies OK."

# Setup completo do ambiente (rodar uma vez ao clonar o projeto)
setup: check-deps
	@echo ""
	@echo "=== Setting up My Finance ==="
	@echo ""
	@echo "[1/5] Creating .env from example..."
	@test -f .env || cp .env.example .env
	@echo "  ✓ .env ready (edit with your Supabase credentials)"
	@echo "[2/5] Creating Python virtual environment ($(PYTHON))..."
	@test -d .venv || $(PYTHON) -m venv .venv
	@echo "  ✓ .venv ready"
	@echo "[3/5] Installing Python dependencies..."
	@.venv/bin/pip install -q -r requirements.txt
	@echo "  ✓ Python dependencies installed"
	@echo "[4/5] Installing Node dependencies..."
	@cd web && npm install --silent
	@echo "  ✓ Node dependencies installed"
	@echo "[5/5] Building Docker images..."
	@docker compose build -q
	@echo "  ✓ Docker images built"
	@echo ""
	@echo "=== Setup complete! ==="
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env with your Supabase credentials"
	@echo "  2. Run 'make up' to start the app"
	@echo ""

# Aplica migracoes pendentes no banco local (tabela _migrations controla o que ja rodou)
migrate:
	@test -d .venv || (echo "✗ .venv not found. Run 'make setup' first." && exit 1)
	@docker compose up -d db --wait
	@# Shim: roles e schema auth do Supabase referenciados pelas migracoes
	@# (nao existem num Postgres puro; RLS local e inocuo pois a API conecta como dona das tabelas)
	@docker compose exec -T db psql -U myfinance -d myfinance -q -c "DO \$$\$$ BEGIN \
		IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; \
		IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; \
		IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; \
	END \$$\$$; \
	CREATE SCHEMA IF NOT EXISTS auth; \
	CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS 'SELECT NULL::uuid' LANGUAGE sql STABLE; \
	CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS 'SELECT NULL::jsonb' LANGUAGE sql STABLE;"
	@DATABASE_URL="$(HOST_DATABASE_URL)" .venv/bin/python scripts/run_migrations.py

# Sobe tudo: banco + migracoes + backend (Docker) + frontend (Vite dev server)
up:
	@test -f .env || (cp .env.example .env && echo "  ✓ .env criado a partir do .env.example")
	@test -f web/.env || (printf '# Dev local sem Supabase: usa o token "local-dev" contra a API local.\nVITE_LOCAL_DEV=true\n' > web/.env && echo "  ✓ web/.env criado (VITE_LOCAL_DEV=true)")
	@echo "Starting database..."
	@docker compose up -d db --wait
	@$(MAKE) -s migrate
	@echo "Starting API..."
	@docker compose up -d
	@echo "Starting frontend (Vite)..."
	@# Libera a 5173 se um Vite antigo ficou orfao (strictPort faz o novo falhar em vez de trocar de porta)
	@lsof -ti tcp:5173 | xargs kill 2>/dev/null || true
	@cd web && npm run dev &
	@echo ""
	@echo "  API:      http://localhost:8000"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Swagger:  http://localhost:8000/docs"
	@echo "  DB:       localhost:5432 (myfinance/myfinance)"
	@echo ""

# Para tudo
down:
	@docker compose down
	@lsof -ti tcp:5173 | xargs kill 2>/dev/null || true
	@echo "All services stopped."

# Build completo
build:
	@docker compose build
	@cd web && npm run build

# Instala dependencias
install:
	@pip install -r requirements.txt
	@cd web && npm install

# Logs do backend
logs:
	@docker compose logs -f

logs-api:
	@docker compose logs -f api

logs-web:
	@docker compose logs -f db

# Sobe apenas o banco
db-only:
	@docker compose up -d db

# Sobe apenas o backend + banco
api-only:
	@docker compose up -d

# Sobe apenas o frontend
web-only:
	@cd web && npm run dev

# Lint
lint:
	@cd web && npm run lint
	@ruff check api/

# Testes
test:
	@pytest api/
	@cd web && npm test 2>/dev/null || true

# Limpa tudo (volumes, dist, cache)
clean:
	@docker compose down -v
	@rm -rf web/dist web/node_modules/.tmp
	@find api -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned."
