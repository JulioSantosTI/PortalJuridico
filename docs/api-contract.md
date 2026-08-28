# Contrato de API — Portal Jurídico (backend)

Base URL (dev local): `http://localhost:3333/api`

Todas as rotas (exceto `/auth/login`) exigem o header:
```
Authorization: Bearer <token>
```

Erros seguem o formato: `{ "error": "mensagem" }` (400/401/403/404) ou `{ "error": "Dados inválidos", "details": {...} }` (400 de validação).

Perfis (`role`): `USUARIO`, `COLABORADOR` (jurídico), `GESTOR`.

---

## Autenticação

### `POST /auth/login`
Body: `{ "email": string, "password": string }`
Resposta 200: `{ "token": string, "user": { "id", "name", "email", "role", "setor", "loja" } }`

### `GET /auth/me`
Resposta 200: `{ "user": {...} }`

---

## Usuários

### `GET /users/colaboradores` — perfis `COLABORADOR`, `GESTOR`
Lista usuários com papel `COLABORADOR` ou `GESTOR`, usada para popular o seletor de atribuição na Fila Geral (o gestor escolhe a quem atribuir).
Resposta: `{ "colaboradores": [{ "id", "name", "role" }] }`

---

## Tipos de solicitação

### `GET /request-types`
Lista tipos ativos para popular o formulário (nome + prazo em dias úteis).
Resposta: `{ "requestTypes": [{ "id", "name", "slug", "slaBusinessDays", "active" }] }`

Seed inicial: `advertencia` (3 dias úteis), `revisao_contrato` (5 dias úteis).

---

## Solicitações

Objeto `Request` retornado por essas rotas inclui sempre `diasUteisRestantes` (negativo = atrasado) e `atrasado` (boolean).

### `POST /requests` — perfil `USUARIO`
Cria uma solicitação. Anexos devem ser enviados **antes**, via `/uploads/presign` (ver abaixo), e referenciados aqui pela `storageKey`.

Body comum:
```json
{
  "requestTypeSlug": "advertencia | revisao_contrato",
  "requesterSetor": "string",
  "requesterLoja": "string",
  "attachments": [
    { "storageKey": "string", "fileName": "string", "mimeType": "string", "sizeBytes": 123 }
  ]
}
```
Se `requestTypeSlug = "advertencia"`, exige também: `advertidoNome`, `motivo`.
Se `requestTypeSlug = "revisao_contrato"`, exige também: `descricaoRevisao`.

Resposta 201: `{ "request": {...} }`

### `GET /requests/mine` — perfil `USUARIO`
Lista as solicitações do próprio usuário logado (todos os status), com contador de prazo.

### `GET /requests` — perfis `COLABORADOR`, `GESTOR`
Fila geral do jurídico. Query params opcionais: `status` (`ABERTO|EM_ANDAMENTO|FINALIZADO`), `requestTypeId`, `assignedToId`.

### `GET /requests/:id` — qualquer perfil autenticado
Detalhe completo (inclui `interactions` e `attachments`). `USUARIO` só acessa solicitações próprias (403 caso contrário).

### `PATCH /requests/:id/assign` — perfis `COLABORADOR`, `GESTOR`
Body: `{ "assignedToId": "uuid" }`
- `COLABORADOR` só pode se auto-atribuir (`assignedToId` deve ser o próprio id, senão 403).
- `GESTOR` pode atribuir a qualquer colaborador ou a si mesmo.

### `GET /requests/history` — perfis `COLABORADOR`, `GESTOR`
Somente solicitações `FINALIZADO`. Query params opcionais: `solicitante` (nome), `setor`, `loja`, `advertido` (nome da pessoa advertida), `dataInicio`, `dataFim` (ISO datetime, filtram por `createdAt`).

---

## Tratativa (interações)

### `POST /requests/:id/interactions` — perfis `COLABORADOR`, `GESTOR`
Registra uma resposta do jurídico à solicitação, podendo mudar o status e anexar arquivos (PDF, Word etc. — mesmo fluxo de presigned URL dos anexos de evidência).

Body:
```json
{
  "message": "string",
  "statusChangeTo": "ABERTO | EM_ANDAMENTO | FINALIZADO",
  "attachments": [
    { "storageKey": "string", "fileName": "string", "mimeType": "string", "sizeBytes": 123 }
  ]
}
```
`statusChangeTo` é opcional (permite só comentar sem mudar status). Um `COLABORADOR` só pode tratar solicitações atribuídas a ele mesmo (403 caso contrário); `GESTOR` pode tratar qualquer uma.

Resposta 201: `{ "request": {...} }` (já com a interação e possível novo status/`closedAt`).

---

## Upload de anexos

### `POST /uploads/presign`
Body: `{ "fileName": "string", "mimeType": "string" }`
Resposta: `{ "uploadUrl": "string (PUT assinado, expira em 5min)", "storageKey": "string", "fileUrl": "string (URL pública de leitura)" }`

Fluxo no frontend:
1. Chamar `/uploads/presign` para cada arquivo.
2. Fazer `PUT` do arquivo direto para `uploadUrl` (não passa pela nossa API).
3. Guardar `storageKey`/`fileName`/`mimeType`/`sizeBytes` e enviar em `attachments` ao criar a solicitação ou a interação.
4. Para exibir/baixar um anexo já salvo, usar a `fileUrl` retornada nos objetos `Attachment`.

---

## Dashboard (gestor)

### `GET /dashboard/kpis` — perfil `GESTOR`
```json
{
  "totalNaFilaGeral": 128,
  "ativasPorColaborador": [{ "colaboradorId", "nome", "quantidade" }],
  "finalizadasTotal": 42,
  "tempoMedioResolucaoPorTipo": [{ "requestTypeId", "nome", "mediaDiasUteis", "amostras" }],
  "curvaAbcSolicitantes": [{ "solicitanteId", "nome", "quantidade", "percentualAcumulado", "classe": "A|B|C" }]
}
```
`totalNaFilaGeral` é o total de solicitações já abertas (todos os status). `ativasPorColaborador` conta solicitações com status diferente de `FINALIZADO`. `tempoMedioResolucaoPorTipo` calcula a média de dias úteis entre abertura e finalização (`createdAt` → `closedAt`) por tipo de solicitação, considerando só as finalizadas (`amostras` = quantas entraram na média). `curvaAbcSolicitantes` vem ordenada do maior para o menor solicitante, com percentual acumulado e classificação ABC (A até 80%, B até 95%, C acima disso).

---

## Usuários de teste (seed)

| Email | Senha | Papel |
|---|---|---|
| usuario@empresa.com | 123456 | USUARIO |
| juridico@empresa.com | 123456 | COLABORADOR |
| gestor@empresa.com | 123456 | GESTOR |
