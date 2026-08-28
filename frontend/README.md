# Portal Jurídico — Frontend

SPA em React + TypeScript + Vite + Tailwind, consumindo a API do backend (`../backend`). Feito à mão (sem Lovable) seguindo a especificação em [`../docs/lovable-brief.md`](../docs/lovable-brief.md).

## Rodando localmente

1. Copie `.env.example` para `.env` (já aponta para `http://localhost:3333/api`, a porta padrão do backend).
2. Com o backend já rodando (`../backend`, ver README de lá):
   ```bash
   npm install
   npm run dev
   ```
3. Acesse `http://localhost:5173`.

Usuários de teste (senha `123456` para todos): `usuario@empresa.com`, `juridico@empresa.com`, `gestor@empresa.com`.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 + componentes próprios no estilo shadcn/ui (`src/components/ui`)
- React Router (rotas protegidas por papel em `src/components/layout/ProtectedRoute.tsx`)
- TanStack Query para chamadas à API (`src/api/*`)
- Recharts (gráfico do dashboard) e Sonner (toasts)

## Estrutura

- `src/api/` — funções tipadas por recurso, todas passando pelo wrapper `client.ts` (injeta o token JWT e trata erros)
- `src/context/AuthContext.tsx` — sessão do usuário (token em `localStorage`)
- `src/hooks/useFileUpload.ts` — fluxo de upload de anexos em 2 passos (presigned URL + PUT direto no bucket)
- `src/pages/` — uma página por tela do briefing (login, nova solicitação, minhas solicitações, fila geral, detalhe/tratativa, histórico, dashboard)

## Build de produção

```bash
npm run build
```
Gera os arquivos estáticos em `dist/`. Ajuste `VITE_API_URL` no `.env` (ou nas variáveis de ambiente do serviço de deploy) para apontar para a URL pública do backend antes de publicar.
