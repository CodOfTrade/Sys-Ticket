# 🔌 API Integration Guide - Sys-Ticket

Guia completo para integração com a API do Sys-Ticket.

## 📚 Índice

- [Autenticação](#autenticação)
- [Formato de Requisições](#formato-de-requisições)
- [Formato de Respostas](#formato-de-respostas)
- [Webhooks](#webhooks)
- [Exemplos de Uso](#exemplos-de-uso)
- [SDKs](#sdks)

## 🔐 Autenticação

### JWT Bearer Token

Todas as requisições à API (exceto login) requerem autenticação via JWT token.

**1. Obter Token:**

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "name": "Nome do Usuário",
      "email": "user@example.com",
      "role": "agent"
    }
  }
}
```

**2. Usar Token:**

```http
GET /api/v1/tickets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**3. Renovar Token:**

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 📝 Formato de Requisições

### Query Parameters

**Paginação:**
```
GET /api/v1/tickets?page=1&limit=50
```

**Filtros:**
```
GET /api/v1/tickets?filter[status]=open&filter[priority]=high
```

**Ordenação:**
```
GET /api/v1/tickets?sort=-created_at,priority
# - (menos) = descendente
# + ou sem prefixo = ascendente
```

**Campos específicos:**
```
GET /api/v1/tickets?fields=id,title,status,created_at
```

**Busca:**
```
GET /api/v1/tickets/search?q=problema+internet
```

### Request Body

```json
{
  "client_id": "12345",
  "title": "Problema com internet",
  "description": "Cliente sem internet há 2 horas",
  "priority": "high",
  "service_desk_id": "uuid"
}
```

## 📦 Formato de Respostas

### Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Ticket criado"
  },
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 250,
    "total_pages": 5
  },
  "errors": []
}
```

### Resposta de Erro

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Campo obrigatório: title",
      "field": "title",
      "timestamp": "2025-01-03T14:30:00Z",
      "path": "/api/v1/tickets",
      "method": "POST"
    }
  ]
}
```

### Códigos HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado |
| 204 | Sem conteúdo (Delete) |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 422 | Erro de validação |
| 429 | Rate limit excedido |
| 500 | Erro interno |

## 🪝 Webhooks

### Configurar Webhook

```http
POST /api/v1/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "n8n - Notificações de Tickets",
  "url": "https://n8n.empresa.com/webhook/tickets",
  "events": [
    "ticket.created",
    "ticket.closed",
    "ticket.status_changed"
  ],
  "secret": "sua_chave_secreta"
}
```

### Eventos Disponíveis

```
ticket.created              # Ticket criado
ticket.updated              # Ticket atualizado
ticket.status_changed       # Status alterado
ticket.assigned             # Atribuído a um atendente
ticket.closed               # Ticket fechado
ticket.invoiced             # Ticket faturado
timesheet.created           # Apontamento criado
timesheet.updated           # Apontamento atualizado
signature.uploaded          # Assinatura enviada
sla.warning                 # SLA em 80%
sla.violated                # SLA violado
contract.expiring           # Contrato expirando (30 dias)
```

### Payload do Webhook

```json
{
  "event": "ticket.closed",
  "timestamp": "2025-01-03T14:30:00Z",
  "data": {
    "ticket_id": "uuid",
    "ticket_number": "TK-2025-00123",
    "status": "closed",
    "client": {
      "id": "12345",
      "name": "Empresa XYZ Ltda"
    },
    "invoice": {
      "os_id": "OS-2025-00123",
      "total": 430.00
    }
  },
  "signature": "sha256_hmac_signature"
}
```

### Verificar Assinatura

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## 💡 Exemplos de Uso

### JavaScript/Node.js

```javascript
const axios = require('axios');

// 1. Login
async function login() {
  const response = await axios.post('http://localhost:3000/api/v1/auth/login', {
    email: 'user@example.com',
    password: 'senha123'
  });
  return response.data.data.access_token;
}

// 2. Criar Ticket
async function createTicket(token) {
  const response = await axios.post(
    'http://localhost:3000/api/v1/tickets',
    {
      client_id: '12345',
      title: 'Problema com internet',
      description: 'Cliente relata lentidão na conexão',
      priority: 'high',
      service_desk_id: 'uuid-mesa-suporte'
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data.data;
}

// 3. Listar Tickets
async function listTickets(token, filters = {}) {
  const params = new URLSearchParams({
    page: 1,
    limit: 50,
    ...filters
  });

  const response = await axios.get(
    `http://localhost:3000/api/v1/tickets?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data.data;
}

// Uso
(async () => {
  const token = await login();
  const ticket = await createTicket(token);
  console.log('Ticket criado:', ticket.ticket_number);

  const tickets = await listTickets(token, {
    'filter[status]': 'open'
  });
  console.log(`${tickets.length} tickets abertos`);
})();
```

### Python

```python
import requests

API_URL = 'http://localhost:3000/api/v1'

# 1. Login
def login(email, password):
    response = requests.post(f'{API_URL}/auth/login', json={
        'email': email,
        'password': password
    })
    return response.json()['data']['access_token']

# 2. Criar Ticket
def create_ticket(token, ticket_data):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(
        f'{API_URL}/tickets',
        json=ticket_data,
        headers=headers
    )
    return response.json()['data']

# 3. Buscar Contratos do Cliente
def get_client_contracts(token, client_id):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(
        f'{API_URL}/clients/{client_id}/contracts',
        headers=headers
    )
    return response.json()['data']

# Uso
token = login('user@example.com', 'senha123')

ticket = create_ticket(token, {
    'client_id': '12345',
    'title': 'Instalação de software',
    'description': 'Cliente precisa instalar Office',
    'priority': 'medium',
    'service_desk_id': 'uuid-mesa'
})

print(f"Ticket criado: {ticket['ticket_number']}")

contracts = get_client_contracts(token, '12345')
print(f"Cliente possui {len(contracts)} contratos ativos")
```

### cURL

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"senha123"}' \
  | jq -r '.data.access_token')

# 2. Criar Ticket
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "12345",
    "title": "Problema com email",
    "description": "Cliente não consegue enviar emails",
    "priority": "high",
    "service_desk_id": "uuid-mesa"
  }'

# 3. Listar Tickets
curl -X GET "http://localhost:3000/api/v1/tickets?filter[status]=open" \
  -H "Authorization: Bearer $TOKEN"

# 4. Fechar Ticket e Faturar
curl -X POST http://localhost:3000/api/v1/tickets/{ticket_id}/close \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"can_invoice": true}'
```

### Postman Collection

**Download:** [Sys-Ticket.postman_collection.json](./postman/Sys-Ticket.postman_collection.json)

**Importar no Postman:**
1. File → Import
2. Selecione o arquivo JSON
3. Configure as variáveis de ambiente

## 🛡️ Rate Limiting

- **Limite padrão**: 100 requisições por minuto por IP
- **Header de resposta**: `X-RateLimit-Remaining`

**Exemplo:**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1704294600
```

## 🔄 Sincronização Offline (Mobile)

### Pull (Baixar dados)

```http
POST /api/v1/sync/pull
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": "uuid",
  "last_sync_at": "2025-01-03T10:00:00Z"
}
```

### Push (Enviar dados offline)

```http
POST /api/v1/sync/push
Authorization: Bearer {token}
Content-Type: application/json

{
  "tickets": [...],
  "timesheets": [...],
  "signatures": [...]
}
```

## 📚 SDKs Oficiais

### JavaScript/TypeScript
```bash
npm install @sys-ticket/sdk
```

```typescript
import { SysTicketClient } from '@sys-ticket/sdk';

const client = new SysTicketClient({
  apiUrl: 'http://localhost:3000/api',
  email: 'user@example.com',
  password: 'senha123'
});

await client.authenticate();

const ticket = await client.tickets.create({
  client_id: '12345',
  title: 'Novo ticket',
  description: 'Descrição do problema'
});
```

*(Em desenvolvimento)*

## 🆘 Suporte

- **Swagger UI**: http://localhost:3000/api/docs
- **Email**: api-support@sys-ticket.com
- **Issues**: https://github.com/seu-usuario/sys-ticket/issues

---

**Última atualização**: 2025-01-03
