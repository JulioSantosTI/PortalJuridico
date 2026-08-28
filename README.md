# Portal Jurídico

Sistema web interno para o setor jurídico, com 3 perfis de acesso (Usuário, Colaborador Jurídico e Gestor), cobrindo abertura de solicitações (Advertência, Revisão de Contrato), fila de atendimento com prazo em dias úteis, tratativa com histórico de interações, anexos, busca no histórico e um dashboard com KPIs para o gestor.

Este documento explica **o que foi construído, com o quê, e por quê** — a ideia é que você consiga entender e defender cada decisão técnica, não só usar o sistema.

---

## Índice

1. [Visão geral da arquitetura](#visão-geral-da-arquitetura)
2. [Stack do Backend — e por quê](#stack-do-backend--e-por-quê)
3. [Stack do Frontend — e por quê](#stack-do-frontend--e-por-quê)
4. [Modelo de dados](#modelo-de-dados)
5. [Módulos do Backend](#módulos-do-backend)
6. [Módulos do Frontend](#módulos-do-frontend)
7. [Fluxos principais explicados](#fluxos-principais-explicados)
8. [Estrutura de pastas](#estrutura-de-pastas)
9. [Como rodar localmente](#como-rodar-localmente)
10. [Documentos relacionados](#documentos-relacionados)

---

## Visão geral da arquitetura

```
┌─────────────────┐        HTTP/JSON (REST)        ┌──────────────────┐
│                 │ ───────────────────────────────▶ │                  │
│  Frontend (SPA) │        Authorization: Bearer      │   Backend (API)  │
│  React + Vite   │ ◀─────────────────────────────── │  Node + Express  │
│                 │                                    │                  │
└─────────────────┘                                    └───────┬──────────┘
                                                                │
                                        ┌───────────────────────┼───────────────────────┐
                                        ▼                                               ▼
                              ┌──────────────────┐                          ┌────────────────────┐
                              │   PostgreSQL      │                          │  Storage S3-compat  │
                              │  (dados: usuários, │                          │  (MinIO em dev)     │
                              │  solicitações...)  │                          │  anexos/arquivos    │
                              └──────────────────┘                          └────────────────────┘
```

**Por que separar front e back em dois projetos independentes, falando por API REST?**
Porque assim cada um pode ser desenvolvido, testado e (futuramente) hospedado de forma independente. O front não sabe nada sobre banco de dados ou regras de negócio — ele só sabe "chamar endpoints e mostrar a resposta". Isso também foi decisão direta do projeto: a ideia original era o front ser feito no Lovable (uma ferramenta separada) consumindo essa mesma API; quando trocamos o Lovable por um front feito à mão, a API não precisou mudar em nada — prova de que a separação estava certa.

Toda a lógica de negócio (quem pode ver o quê, cálculo de prazo, regras de atribuição, etc.) vive **só no backend**. O frontend nunca decide regra de negócio sozinho — ele só reflete visualmente o que a API permite ou não (e a API é quem de fato bloqueia com 401/403).

---

## Stack do Backend — e por quê

| Peça | O que é | Por que essa escolha |
|---|---|---|
| **Node.js + TypeScript** | Runtime JS no servidor, com tipagem estática | Mesma linguagem do frontend (facilita trocar contexto), e TypeScript pega erros de tipo (ex: mandar campo errado pro banco) antes de rodar o código, não só em produção |
| **Express** | Framework web minimalista pra criar rotas HTTP | O projeto é uma API REST relativamente direta (CRUD + regras simples). Frameworks maiores (NestJS, por ex.) trariam estrutura/complexidade que não se paga nesse tamanho de projeto |
| **PostgreSQL** | Banco de dados relacional | Os dados são naturalmente relacionais (usuário → solicitação → interações → anexos) e o histórico precisa de buscas combinando vários filtros (setor, loja, pessoa advertida, data) — SQL é feito pra isso. Também facilita relatórios/KPIs mais complexos no futuro |
| **Prisma** | ORM (mapeia tabelas do banco para objetos TypeScript) | Gera migrations versionadas automaticamente a partir do `schema.prisma`, e todo o código que usa o banco já vem com autocomplete e checagem de tipo — evita erros bobos tipo digitar o nome de uma coluna errado |
| **JWT (jsonwebtoken) + bcrypt** | Autenticação por token + hash de senha | JWT é "stateless": o servidor não precisa guardar sessão em memória/banco pra saber quem está logado, só validar o token a cada request — combina bem com uma API separada do front. `bcrypt` garante que senha nunca fica salva em texto puro no banco |
| **Zod** | Validação de dados em tempo de execução | TypeScript só verifica tipos em tempo de compilação — ele não impede alguém de mandar um JSON malformado pela rede. Zod valida o corpo de cada requisição *de fato*, na hora, e devolve erro 400 claro se algo estiver errado |
| **AWS SDK v3 (S3) + presigned URL** | Cliente de storage de arquivos compatível com S3 | Ao invés do arquivo passar pelo nosso servidor Node (o que consome memória/CPU à toa e trava com arquivo grande), o frontend pede uma "URL assinada" pro backend e manda o arquivo *direto* pro bucket. O backend só guarda a referência (`storageKey`). Por usar o padrão S3, funciona tanto com AWS S3 quanto Cloudflare R2, DigitalOcean Spaces etc — não trava você num único fornecedor |
| **MinIO (Docker, só em dev)** | Storage S3-compatible rodando localmente | Pra desenvolver e testar upload de arquivo sem precisar de uma conta AWS de verdade nem gastar dinheiro em ambiente de dev |
| **Docker Compose** | Sobe Postgres + MinIO com um comando | Qualquer pessoa que for rodar o projeto localmente tem o ambiente idêntico, sem precisar instalar Postgres/MinIO manualmente na máquina |

---

## Stack do Frontend — e por quê

| Peça | O que é | Por que essa escolha |
|---|---|---|
| **React + Vite + TypeScript** | Biblioteca de UI + ferramenta de build | Vite dá um servidor de desenvolvimento muito rápido (hot reload quase instantâneo) e um build de produção otimizado. React porque é o padrão de mercado pra esse tipo de SPA e tem o maior ecossistema de bibliotecas prontas |
| **Tailwind CSS v4** | Framework de CSS "utility-first" (classes prontas ao invés de escrever CSS do zero) | Permite montar telas com aparência profissional rapidamente sem escrever arquivo de CSS separado por componente, e sem depender de um designer |
| **Componentes estilo shadcn/ui (feitos à mão)** | Botão, input, select, tabela, card, badge, dialog etc, em `src/components/ui/` | A ideia original era usar o Lovable, que gera esse tipo de interface pronta usando exatamente essa combinação (Tailwind + Radix). Como decidimos não pagar o Lovable, replicamos o mesmo padrão visual manualmente — dá o mesmo acabamento "de produto", sem custo e com controle total do código |
| **Radix UI** | Biblioteca de componentes "sem estilo" (comportamento pronto, aparência em branco) | Por trás do Select, Dialog, Tabs e Label — resolve acessibilidade e comportamento (teclado, foco, abrir/fechar) que seria muito trabalhoso reimplementar do zero |
| **React Router** | Roteamento client-side (trocar de tela sem recarregar a página) | Padrão de mercado para SPA em React. Usado também para proteger rotas por papel (`ProtectedRoute`) |
| **TanStack Query** | Gerenciador de dados vindos do servidor (cache, loading, erro, revalidação) | Sem ele, cada tela precisaria escrever manualmente `useState` + `useEffect` + tratamento de erro pra cada chamada de API. Com ele, isso vira uma linha (`useQuery`), e ele cuida de cache, refetch e loading sozinho |
| **Recharts** | Biblioteca de gráficos em React | Usada no gráfico de barras do dashboard (solicitações ativas por colaborador) — simples de integrar e leve |
| **Sonner** | Biblioteca de notificações (toast) | Feedback visual de sucesso/erro (ex: "Solicitação enviada com sucesso") sem precisar implementar um sistema de notificação do zero |

---

## Modelo de dados

Definido em [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma):

- **`User`** — pessoas do sistema. O campo `role` (`USUARIO`/`COLABORADOR`/`GESTOR`) decide o que a pessoa pode ver e fazer. `setor` e `loja` existem como campos próprios porque no seu negócio são conceitos diferentes (loja = unidade física, setor = departamento).
- **`RequestType`** — os "motivos de solicitação" (hoje: Advertência, Revisão de Contrato), cada um com seu próprio prazo (`slaBusinessDays`). Ficou numa tabela (e não fixo no código) justamente pra dar pra ajustar o prazo ou criar um novo tipo de solicitação **sem precisar mexer em código**.
- **`Request`** — a solicitação em si: quem abriu, setor/loja, pra quem foi atribuída, status atual, prazo (`dueDate`) calculado na criação. Os campos específicos de cada tipo (`advertidoNome`, `motivo` para Advertência; `descricaoRevisao` para Revisão de Contrato) ficam como colunas próprias — assim dá pra buscar/filtrar por eles no histórico com performance. Existe também um campo `detalhes` (JSON livre, sem estrutura fixa) reservado pra quando um **futuro** tipo de solicitação precisar de campos que ainda não existem, sem precisar de uma migration de banco toda vez.
- **`RequestInteraction`** — cada "tratativa" registrada pelo jurídico (mensagem + possível mudança de status). Fica numa tabela separada (não é só um campo de texto único na solicitação) porque o negócio pode ter várias interações ao longo do tempo — isso vira automaticamente a "linha do tempo" que aparece na tela de detalhe.
- **`Attachment`** — anexos, tanto os enviados na abertura da solicitação (evidências) quanto os enviados numa tratativa (documento formal). Por isso tem `interactionId` opcional: se for nulo, é anexo da solicitação original; se tiver valor, é anexo daquela tratativa específica.

---

## Módulos do Backend

Cada pasta em `backend/src/modules/` é um recurso da API, sempre no padrão **rotas → validação (Zod) → Prisma → resposta**:

- **`auth/`** — login (verifica senha com bcrypt, gera JWT) e `/auth/me` (quem está logado).
- **`users/`** — hoje só lista colaboradores/gestores, usado pelo frontend pra montar o seletor "atribuir a quem" na Fila Geral.
- **`requestTypes/`** — lista os tipos de solicitação disponíveis (pro formulário "Nova Solicitação" saber o que oferecer).
- **`requests/`** — o módulo central: criar solicitação, listar (fila geral / minhas / histórico), ver detalhe, atribuir/reatribuir. É aqui que mora `requests.service.ts`, que calcula o prazo restante em dias úteis e injeta a `fileUrl` de cada anexo na resposta.
- **`interactions/`** — registrar uma tratativa (resposta do jurídico) numa solicitação, com possível troca de status e anexo.
- **`uploads/`** — gera a URL assinada (presigned URL) que o frontend usa pra subir arquivo direto no storage, sem passar pelo nosso servidor.
- **`dashboard/`** — os KPIs do gestor: total na fila, ativas por colaborador, total finalizado, tempo médio de resolução por tipo, curva ABC de solicitantes.

Suporte transversal, em `backend/src/`:
- **`middleware/auth.middleware.ts`** — dois middlewares: `requireAuth` (exige token válido) e `requireRole(...papéis)` (exige que o usuário logado tenha um dos papéis permitidos). Toda rota sensível passa por eles antes de chegar na lógica de negócio.
- **`middleware/error.middleware.ts`** — captura qualquer erro (validação, erro de negócio, erro inesperado) num único lugar e devolve uma resposta JSON consistente, ao invés de cada rota tratar erro do seu próprio jeito.
- **`lib/businessDays.ts`** — matemática de dias úteis (somar N dias úteis a partir de uma data; contar dias úteis entre duas datas). Usada tanto pra calcular o prazo de uma solicitação nova quanto pra calcular quanto tempo levou pra resolver uma solicitação finalizada.
- **`lib/jwt.ts`** e **`lib/prisma.ts`** — instâncias compartilhadas (o cliente do Prisma e as funções de assinar/verificar token), pra não recriar isso em cada arquivo.
- **`lib/s3.ts`** — encapsula toda a conversa com o storage S3-compatible (gerar chave de arquivo, gerar URL assinada, montar URL pública).

---

## Módulos do Frontend

- **`api/`** — uma função por operação da API (`login`, `createRequest`, `assignRequest`, ...), todas passando pelo `client.ts`, que centraliza: montar a URL, anexar o token no header `Authorization`, e transformar erro HTTP em uma exceção (`ApiError`) que a tela sabe tratar. Se amanhã a API mudar de formato de erro, só esse um arquivo muda.
- **`context/AuthContext.tsx`** — guarda quem está logado (usuário + token) e expõe `login`/`logout` pro resto do app via `useAuth()`. Também escuta um evento global (`auth:unauthorized`) disparado pelo `client.ts` quando o token expira, pra deslogar automaticamente.
- **`components/layout/`** — `AppShell` (o menu lateral, que muda de opção conforme o papel do usuário) e `ProtectedRoute` (bloqueia acesso a uma tela se o usuário não estiver logado ou não tiver o papel certo).
- **`components/requests/`** — pedacinhos de UI reaproveitados nas telas: `StatusBadge` (bolinha colorida de status), `DeadlineBadge` (prazo restante/atrasado), `FileUploadField` (input de arquivo com barra de progresso por arquivo) e `AttachmentList` (lista de anexos com link de download).
- **`hooks/useFileUpload.ts`** — implementa o fluxo de upload em 2 passos (pedir URL assinada → mandar o arquivo direto pro bucket) e controla o estado de cada arquivo (enviando/enviado/erro), pra qualquer tela que precise de upload (Nova Solicitação e Tratativa) só "plugar" o hook ao invés de reescrever essa lógica duas vezes.
- **`pages/`** — uma tela por rota, seguindo exatamente as regras de acesso por papel descritas acima. Cada página busca seus dados com `useQuery` e envia mudanças com `useMutation`, ambos do TanStack Query.

---

## Fluxos principais explicados

### Autenticação
1. Usuário manda e-mail/senha → backend confere o hash com `bcrypt` → se bater, gera um JWT contendo `id` e `role` do usuário.
2. Frontend guarda esse token e manda ele em todo request daí pra frente.
3. Cada rota da API decide, com base no `role` dentro do token, se aquele usuário pode ou não fazer aquela ação — **nunca** confiando em nada que o frontend "decidiu" sozinho.

### Ciclo de vida de uma solicitação
`Aberto` (criada, sem responsável) → alguém se atribui ou é atribuído → `Em andamento` (tratativa em curso, pode ter várias respostas registradas) → `Finalizado` (fecha o prazo, fica disponível na busca do Histórico).

O prazo (`dueDate`) é calculado **na criação**, somando os dias úteis definidos no tipo de solicitação (`RequestType.slaBusinessDays`) à data atual. A cada exibição, o backend recalcula quantos dias úteis faltam (ou quanto passou do prazo) comparando com a data atual — por isso o "3 dias úteis restantes" muda sozinho conforme os dias passam, sem precisar de um job/cronjob rodando em segundo plano.

### Upload de anexo (evidência ou documento de tratativa)
1. Frontend pede ao backend: "quero subir um arquivo chamado X" (`POST /uploads/presign`).
2. Backend gera uma URL assinada temporária (expira em 5 min) que dá permissão de escrita *só naquele arquivo específico* no bucket.
3. Frontend manda o arquivo direto pra essa URL — o arquivo nunca passa pelo nosso servidor Node.
4. Frontend manda pro backend só a referência (`storageKey`, nome, tipo, tamanho) junto com a solicitação/tratativa.

Isso evita que o servidor Node fique sobrecarregado recebendo e reenviando arquivos grandes, e permite trocar de provedor de storage sem mudar como o frontend funciona.

---

## Estrutura de pastas

```
ProjetoJuridico/
├── README.md                    (este arquivo)
├── docs/
│   ├── api-contract.md          contrato completo da API (todos os endpoints, payloads)
│   └── lovable-brief.md         especificação de tela por tela (histórico: era pro Lovable)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        modelo de dados
│   │   └── seed.ts              usuários e tipos de solicitação de teste
│   ├── src/
│   │   ├── modules/             um recurso da API por pasta (ver seção acima)
│   │   ├── middleware/          auth, papéis, tratamento de erro
│   │   ├── lib/                 prisma client, jwt, dias úteis, storage S3
│   │   ├── app.ts               monta o Express e registra as rotas
│   │   └── server.ts            ponto de entrada (sobe o servidor HTTP)
│   ├── docker-compose.yml       Postgres + MinIO pra desenvolvimento local
│   └── README.md                como rodar o backend
└── frontend/
    ├── src/
    │   ├── api/                 uma função por chamada à API
    │   ├── context/             sessão do usuário logado
    │   ├── components/          layout, UI genérica, componentes de domínio
    │   ├── hooks/                useFileUpload
    │   ├── pages/                uma tela por rota
    │   └── lib/                  tipos TypeScript e utilitários
    └── README.md                como rodar o frontend
```

---

## Como rodar localmente

Resumo rápido (detalhes em `backend/README.md` e `frontend/README.md`):

```bash
# 1. Suba o banco e o storage
cd backend
docker compose up -d

# 2. Configure e rode o backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev          # API em http://localhost:3333

# 3. Em outro terminal, rode o frontend
cd ../frontend
npm install
npm run dev           # App em http://localhost:5173
```

Usuários de teste (senha `123456` para todos): `usuario@empresa.com`, `juridico@empresa.com`, `gestor@empresa.com`.

---

## Documentos relacionados

- [`docs/api-contract.md`](docs/api-contract.md) — todos os endpoints da API, com payloads de entrada/saída. Referência técnica pra quem for consumir a API (inclusive você mesmo, revisando depois).
- [`docs/lovable-brief.md`](docs/lovable-brief.md) — a especificação de cada tela escrita originalmente para o Lovable gerar o frontend. Ficou como documento histórico e como especificação de UX, já que o frontend real acabou sendo escrito à mão seguindo exatamente essas mesmas regras.
