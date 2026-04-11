# Projeto: My Finance

## Stack
- **Linguagem Backend**: Python 3.12+
- **Framework Backend**: FastAPI
- **Linguagem Frontend**: TypeScript
- **Framework Frontend**: React 19 + Vite
- **UI**: shadcn/ui + Tailwind CSS 4
- **Banco de dados**: PostgreSQL via Supabase
- **DB Client**: asyncpg (conexão direta PostgreSQL)
- **Validacao**: Pydantic v2
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Infra**: Docker, Vercel (serverless)

## Arquitetura
- **Padrao**: DDD + Hexagonal (Clean Architecture)
- **Monorepo**: `api/` (backend Python) + `web/` (frontend React)
- **Camadas Backend**:
  - `api/domain/` - Entidades, Value Objects, Repository interfaces (protocols)
  - `api/application/` - Use Cases, DTOs
  - `api/infrastructure/` - Adapters (Supabase repos, FastAPI routers, config)
- **Camadas Frontend**:
  - `web/src/components/` - Componentes React (ui, layout, cards, transactions, dashboard)
  - `web/src/pages/` - Paginas da aplicacao
  - `web/src/services/` - API client
  - `web/src/stores/` - Zustand stores
  - `web/src/hooks/` - Custom hooks

## Convencoes

### Codigo
- Backend: snake_case (Python)
- Frontend: camelCase para funcoes, PascalCase para componentes
- Nomes de arquivos backend: snake_case.py
- Nomes de arquivos frontend: PascalCase.tsx para componentes, camelCase.ts para utils
- Testes backend: `api/tests/` espelhando a estrutura de `api/`
- Testes frontend: ao lado do arquivo com .test.tsx

### Git
- Commits: conventional commits (feat:, fix:, refactor:, test:, docs:)
- Branch naming: feature/xxx, bugfix/xxx

## Comandos

```bash
# Instalar dependencias backend
pip install -r requirements.txt

# Instalar dependencias frontend
cd web && npm install

# Rodar testes backend
pytest

# Rodar testes frontend
cd web && npm test

# Rodar lint backend
ruff check api/

# Rodar lint frontend
cd web && npm run lint

# Rodar backend local (Docker)
docker-compose up

# Rodar frontend local
cd web && npm run dev

# Rodar tudo local (Vercel)
vercel dev
```

## Regras de Workflow
- **NUNCA fazer git commit ou git push sem autorizacao explicita do usuario**. Sempre esperar o usuario pedir "commit", "push" ou "commit e push" antes de executar. Mesmo que o trabalho esteja concluido, aguardar a autorizacao.

## Regras Especificas do Projeto
- Backend dockerizado (Dockerfile no api/)
- Deploy 100% no Vercel (frontend + backend serverless) + Supabase
- Autenticacao: tela placeholder por enquanto, implementacao futura
- Bancos brasileiros pre-seeded + bancos custom do usuario
- Categorias de gastos pre-definidas + custom
- Gastos futuros (is_scheduled) ja abatem do saldo disponivel
- Sempre usar Pydantic v2 para validacao e serializacao no backend
- Repository pattern com Protocol (typing) para interfaces
- Sem ORM - usar asyncpg direto (pool async)
