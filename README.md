# TechDiagnose

Projeto acadêmico da disciplina de Arquitetura e Padrões de Software (CEFET/RJ).
O objetivo central é implementar o padrão arquitetural **Blackboard** (Knowledge
Sources independentes + Blackboard em memória + Control Component).

Estado atual: **Blocos 1 a 5** — monorepo, Express + Prisma, React + Vite +
Tailwind, autenticação JWT com papéis (`USER`, `TECH`, `ADMIN`) gestão de incidentes, Blackboard e as 5 Knowledge Sources (domínio).

## Requisitos

- Node.js 18+ (recomendado 20+)
- PostgreSQL 14+ (local ou via Docker)

## Como rodar

```bash
# 1. dependências (na raiz)
npm install

# 2. banco de dados (exemplo com Docker)
docker run --name techdiagnose-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=techdiagnose -p 5432:5432 -d postgres:16

# 3. variáveis de ambiente
cp apps/api/.env.example apps/api/.env      # ajuste DATABASE_URL e JWT_SECRET
cp apps/web/.env.example apps/web/.env      # opcional

# 4. Prisma
npm run prisma:generate
npm run prisma:migrate        # aplica as migrations de apps/api/prisma/migrations

# 5. subir API (http://localhost:3000) e web (http://localhost:5173)
npm run dev:api
npm run dev:web      # em outro terminal
```

Testes: `npm test` (roda API e web). Saúde da API: `GET http://localhost:3000/api/health`.

## Estrutura

```
apps/api   Express + Prisma (domain / application / infra / interfaces)
apps/web   React 18 + Vite + Tailwind
```

No domínio (`apps/api/src/domain`): `blackboard/` (classe `Blackboard`, Bloco 4),
`knowledge-sources/` (classe base `KnowledgeSource` e as 5 KS, Bloco 5) e `control/`
(reservada para o Bloco 6).
