# Portal Jurídico — Backend

API REST em Node.js + TypeScript + Express + Prisma (PostgreSQL) + storage S3-compatible, feita para ser consumida pelo frontend do Lovable. Contrato completo de endpoints em [`../docs/api-contract.md`](../docs/api-contract.md).

## Rodando localmente

1. Copie o `.env.example` para `.env` e ajuste se necessário.
2. Suba Postgres + MinIO (dev local):
   ```bash
   docker compose up -d
   ```
3. Instale dependências, gere o client e aplique as migrations:
   ```bash
   npm install
   npx prisma migrate dev
   npm run prisma:seed
   ```
4. Suba a API:
   ```bash
   npm run dev
   ```
   Servidor em `http://localhost:3333`. Healthcheck: `GET /health`.

Usuários de teste (senha `123456` para todos): `usuario@empresa.com`, `juridico@empresa.com`, `gestor@empresa.com`.

## Notas

- MinIO local expõe o console em `http://localhost:9001` (login `juridico` / `juridico123`) e a API S3 em `http://localhost:9000`. Em produção, troque as variáveis `S3_*` do `.env` para um provedor real (AWS S3, Cloudflare R2 etc.) — o código já usa o SDK padrão da AWS, compatível com qualquer um deles.
- O prazo (SLA) de cada tipo de solicitação está na tabela `RequestType` e hoje só considera dias úteis (sem calendário de feriados) — pode ser ajustado direto no banco sem precisar alterar código.
- Configure `CORS_ORIGIN` no `.env` com o domínio publicado pelo Lovable antes de integrar o frontend.
