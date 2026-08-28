# Portal Jurídico — Briefing completo para o Lovable (Frontend)

Este documento é para ser colado no Lovable (inteiro no prompt inicial, ou em pedaços por tela). Ele descreve um app React que **consome uma API REST externa já pronta** — não use o banco de dados / Supabase integrado do Lovable para os dados de negócio (solicitações, usuários, anexos etc). O Lovable deve tratar essa API exatamente como uma API de terceiros.

---

## 1. Visão geral do projeto

Portal interno do setor jurídico com 3 perfis de acesso, identificados automaticamente no login:

- **Usuário**: abre solicitações (Advertência, Revisão de Contrato) e acompanha o andamento das suas.
- **Colaborador jurídico**: vê a fila geral de solicitações, atribui a si mesmo, trata (responde, anexa documento, muda status) e consulta o histórico.
- **Gestor**: tudo que o colaborador faz, mais pode atribuir/realocar solicitações a qualquer colaborador e acessa um dashboard com KPIs.

Fluxo de status de uma solicitação: `Aberto` → `Em andamento` → `Finalizado`.

---

## 2. Configuração técnica obrigatória

- **Base URL da API**: guardar em uma variável de ambiente (`VITE_API_URL` ou equivalente). Valor em desenvolvimento: `http://localhost:3333/api`. Vou te passar a URL de produção quando o backend estiver publicado — não deixe a URL fixa (hardcoded) no código.
- **Autenticação**: JWT. Após login, salvar o `token` (ex: em `localStorage`). Enviar em **todas** as chamadas subsequentes o header:
  ```
  Authorization: Bearer <token>
  ```
- **Erros da API** vêm sempre como JSON:
  ```json
  { "error": "mensagem legível" }
  ```
  ou, em erro de validação:
  ```json
  { "error": "Dados inválidos", "details": { ... } }
  ```
  Exiba `error` como toast/mensagem de erro nos formulários.
- **Códigos HTTP**: 401 = não autenticado (token ausente/expirado → redirecionar pro login); 403 = autenticado mas sem permissão para aquela ação/tela (não deveria acontecer se a navegação por papel estiver certa, mas trate mostrando "acesso não permitido"); 400 = validação; 404 = não encontrado.
- **CORS** já estará liberado no backend para o domínio publicado pelo Lovable (preciso saber a URL final pra configurar).

---

## 3. Perfis e roteamento

Depois do login, o backend devolve `user.role` (`USUARIO`, `COLABORADOR` ou `GESTOR`). Direcione:

- `USUARIO` → tela "Minhas Solicitações" (com botão para abrir nova solicitação)
- `COLABORADOR` → tela "Fila Geral"
- `GESTOR` → tela "Fila Geral" (com acesso extra ao menu "Dashboard")

Todos os perfis com solicitações finalizadas visíveis devem ter acesso à aba **Histórico**, exceto `USUARIO` (ele já vê tudo que é dele em "Minhas Solicitações"; o endpoint de histórico é 403 para esse perfil).

Menu lateral/topo sugerido por perfil:
- **Usuário**: Minhas Solicitações · Nova Solicitação
- **Colaborador**: Fila Geral · Histórico
- **Gestor**: Fila Geral · Histórico · Dashboard

---

## 4. Telas

### 4.1 Login

- Campos: e-mail, senha.
- `POST /auth/login` com `{ email, password }` → salva `token` e `user`, redireciona conforme o papel.
- Erro de credencial inválida (401) → mensagem "E-mail ou senha inválidos".
- Usuários de teste pra você validar durante o desenvolvimento (senha `123456` para todos):
  - `usuario@empresa.com` (perfil Usuário)
  - `juridico@empresa.com` (perfil Colaborador)
  - `gestor@empresa.com` (perfil Gestor)

### 4.2 Nova Solicitação (perfil Usuário)

Formulário com:
1. **Motivo da solicitação** (select, carregado de `GET /request-types`, mostrando `name`; guardar o `slug` selecionado).
2. Campos condicionais conforme o motivo escolhido:
   - Se **Advertência** (`slug: advertencia`):
     - Campo de texto: **Motivo** (textarea, obrigatório) → campo `motivo`
     - Campo de texto: **Nome de quem será advertido** (obrigatório) → campo `advertidoNome`
   - Se **Revisão de Contrato** (`slug: revisao_contrato`):
     - Campo de texto: **Descrição do que precisa ser revisado** (textarea, obrigatório) → campo `descricaoRevisao`
3. **Setor do solicitante** (texto ou select, obrigatório) → campo `requesterSetor`
4. **Loja/unidade do solicitante** (texto ou select, obrigatório) → campo `requesterLoja`
5. **Anexos** (upload múltiplo de imagens/prints/PDF) — ver seção 5 (fluxo de upload em 2 passos).
6. Mostrar o prazo (`slaBusinessDays`) do tipo selecionado como informação ao usuário (ex: "Prazo estimado: 3 dias úteis").

Ao enviar: `POST /requests` com:
```json
{
  "requestTypeSlug": "advertencia",
  "requesterSetor": "...",
  "requesterLoja": "...",
  "advertidoNome": "...",
  "motivo": "...",
  "attachments": [{ "storageKey": "...", "fileName": "...", "mimeType": "...", "sizeBytes": 123 }]
}
```
(para Revisão de Contrato, trocar `advertidoNome`/`motivo` por `descricaoRevisao`)

Sucesso → mostrar confirmação e redirecionar para "Minhas Solicitações".

### 4.3 Minhas Solicitações (perfil Usuário)

`GET /requests/mine` → lista de cards/tabela com:
- Tipo de solicitação (`requestType.name`)
- Status (badge: Aberto / Em andamento / Finalizado — ver cores na seção 6)
- Prazo restante: `diasUteisRestantes` (ex: "3 dias úteis restantes"); se `atrasado: true`, destacar em vermelho ("Atrasado")
- Data de criação (`createdAt`)
- Clique abre o detalhe (`GET /requests/:id`) em modo somente leitura (usuário não trata, só acompanha e vê as respostas do jurídico em `interactions`).

### 4.4 Fila Geral (perfis Colaborador e Gestor)

`GET /requests` (aceita filtros por query string: `status`, `requestTypeId`, `assignedToId`) → tabela/lista com:
- Solicitante (`requester.name`), setor (`requesterSetor`), loja (`requesterLoja`)
- Tipo de solicitação, status, prazo restante (mesma lógica da seção 4.3)
- Responsável atual (`assignedTo.name` ou "Não atribuído")
- Filtros no topo: status, tipo, responsável
- Ação **"Assumir"** (aparece se não atribuído, ou sempre para o colaborador ver a própria fila): `PATCH /requests/:id/assign` com `{ "assignedToId": <id do usuário logado> }`
- Se perfil **Gestor**: também mostrar um seletor "Atribuir a..." (lista de colaboradores) permitindo `PATCH /requests/:id/assign` com o `assignedToId` de qualquer colaborador.
- Clique na linha abre o detalhe (4.5).

### 4.5 Detalhe da Solicitação / Tratativa (perfis Colaborador e Gestor)

`GET /requests/:id` retorna a solicitação completa com `interactions` (histórico de tratativas, ordenado do mais antigo pro mais novo) e `attachments` (anexos da criação).

Layout sugerido:
- Topo: dados da solicitação (solicitante, setor, loja, tipo, campos específicos como `advertidoNome`/`motivo` ou `descricaoRevisao`, prazo, status atual).
- Lista de anexos de evidência (da criação) com link de download (`fileUrl` de cada `Attachment`).
- Linha do tempo de tratativas (`interactions`): autor (`author.name`), mensagem, data, e anexos daquela interação (se houver).
- Formulário de tratativa (só visível se o usuário logado for o `assignedTo` da solicitação, ou for `GESTOR`):
  - Campo de texto (textarea) para a resposta → `message`
  - Upload de arquivo (PDF, Word, imagem) → mesmo fluxo de presigned URL da seção 5
  - Select de novo status (`Aberto` / `Em andamento` / `Finalizado`) — opcional, pode só comentar sem mudar status
  - Enviar → `POST /requests/:id/interactions`:
    ```json
    { "message": "...", "statusChangeTo": "EM_ANDAMENTO", "attachments": [...] }
    ```

Se o colaborador logado **não** for o responsável pela solicitação, esconda o formulário de tratativa (ou mostre desabilitado) — a API retorna 403 se tentar mesmo assim.

### 4.6 Histórico (perfis Colaborador e Gestor)

`GET /requests/history` — mostra só solicitações `FINALIZADO`. Filtros de busca no topo (todos opcionais, combináveis):
- Nome do solicitante → query `solicitante`
- Setor do solicitante → query `setor`
- Loja → query `loja`
- Nome da pessoa advertida → query `advertido`
- Intervalo de datas (data início / data fim, formato ISO datetime) → query `dataInicio` / `dataFim`

Resultado em tabela, com clique abrindo o detalhe (mesma tela 4.5, mas sem formulário de tratativa já que está finalizada — pode reexibir tudo em modo leitura).

### 4.7 Dashboard (perfil Gestor)

`GET /dashboard/kpis` retorna:
```json
{
  "ativasPorColaborador": [{ "colaboradorId", "nome", "quantidade" }],
  "finalizadasTotal": 42,
  "curvaAbcSolicitantes": [{ "solicitanteId", "nome", "quantidade", "percentualAcumulado", "classe": "A|B|C" }]
}
```
Sugestão de layout:
- Cards de KPI no topo: total de solicitações ativas (soma de `ativasPorColaborador`), total finalizado (`finalizadasTotal`)
- Gráfico de barras: quantidade de solicitações ativas por colaborador (`ativasPorColaborador`)
- Gráfico/tabela de curva ABC: `curvaAbcSolicitantes` ordenado (já vem ordenado do maior pro menor solicitante), mostrando quantidade, percentual acumulado e classe (A/B/C) — pode colorir por classe (A = destaque, C = neutro)

---

## 5. Fluxo de upload de anexos (usado em Nova Solicitação e em Tratativa)

O upload **não** vai direto para a nossa API — é em 2 passos, direto para um bucket de armazenamento:

1. Para cada arquivo selecionado, chamar `POST /uploads/presign` com `{ "fileName": "...", "mimeType": "..." }`.
   Resposta: `{ "uploadUrl": "...", "storageKey": "...", "fileUrl": "..." }`
2. Fazer um `PUT` do arquivo binário direto para `uploadUrl` (fetch simples, sem headers de auth — a URL já vem assinada), com `Content-Type` igual ao `mimeType` enviado.
3. Guardar `storageKey`, `fileName`, `mimeType` e `sizeBytes` (tamanho do arquivo em bytes) — esses 4 campos vão no array `attachments` ao criar a solicitação ou a interação.
4. Para exibir/baixar um anexo já existente, usar direto a `fileUrl` que vem em cada objeto `Attachment` retornado pela API.

Trate o progresso do upload com um spinner/estado de loading por arquivo, já que são duas chamadas em sequência.

---

## 6. Padrões visuais sugeridos

- Status: `ABERTO` (cinza/azul neutro), `EM_ANDAMENTO` (amarelo/laranja), `FINALIZADO` (verde).
- Prazo: mostrar `diasUteisRestantes` como badge; se `atrasado: true`, badge vermelho com "Atrasado".
- Curva ABC no dashboard: classe A em destaque (ex: verde/dourado), B neutro, C discreto.

---

## 7. Referência completa de endpoints

| Método | Rota | Quem acessa | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Login, retorna token + user |
| GET | `/auth/me` | autenticado | Dados do usuário logado |
| GET | `/request-types` | autenticado | Lista tipos de solicitação e SLA |
| POST | `/requests` | USUARIO | Cria solicitação |
| GET | `/requests/mine` | USUARIO | Lista solicitações do próprio usuário |
| GET | `/requests` | COLABORADOR, GESTOR | Fila geral (filtros: status, requestTypeId, assignedToId) |
| GET | `/requests/:id` | autenticado (dono ou jurídico) | Detalhe da solicitação |
| PATCH | `/requests/:id/assign` | COLABORADOR (só a si mesmo), GESTOR (qualquer um) | Atribui/reatribui |
| POST | `/requests/:id/interactions` | COLABORADOR (se responsável), GESTOR | Tratativa: mensagem + anexo + mudança de status |
| GET | `/requests/history` | COLABORADOR, GESTOR | Busca em solicitações finalizadas |
| POST | `/uploads/presign` | autenticado | Gera URL de upload direto pro bucket |
| GET | `/dashboard/kpis` | GESTOR | KPIs e curva ABC |

---

## 8. O que NÃO fazer

- Não usar o Supabase/banco integrado do Lovable para armazenar solicitações, usuários ou anexos — tudo isso já existe na API externa.
- Não fazer upload de arquivo direto pra nossa API (`/requests`, `/interactions`) — sempre passar pelo fluxo de presigned URL da seção 5.
- Não esconder telas só no frontend como única proteção — a API já valida por papel e retorna 401/403; o frontend deve refletir isso (esconder ações que dariam erro), mas a segurança real está no backend.
