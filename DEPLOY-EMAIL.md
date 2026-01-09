# Deploy do Sistema de Email SMTP

## ✅ Implementações Concluídas

1. **Módulo de Email criado** (`apps/backend/src/modules/email/`)
   - `email.module.ts` - Módulo NestJS
   - `email.service.ts` - Serviço com Nodemailer e templates HTML

2. **Integração com Tickets**
   - `TicketCommentsService` modificado para enviar emails automáticos
   - Email enviado quando `send_to_client` = true

3. **Configurações SMTP** (`.env.example` atualizado)
   ```env
   SMTP_HOST=mail.infoservice.tec.br
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=agent@infoservice.tec.br
   SMTP_PASSWORD=WuW8dhu7te3baKdfGgq7UWtb@
   SMTP_FROM_NAME=Sys-Ticket - Infoservice
   SMTP_FROM_EMAIL=agent@infoservice.tec.br
   ```

4. **Commit realizado** (1cc80fc)

---

## 📋 Próximos Passos (MANUAL - Executar no Servidor)

### 1️⃣ Conectar no servidor
```bash
ssh root@172.31.255.26
# Senha: 123321
```

### 2️⃣ Configurar .env no servidor
```bash
cd /root/Sys-Ticket/apps/backend
nano .env
```

**Adicionar/Atualizar as seguintes linhas no arquivo .env:**
```env
# Email (SMTP) - Configuração Infoservice
SMTP_HOST=mail.infoservice.tec.br
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=agent@infoservice.tec.br
SMTP_PASSWORD=WuW8dhu7te3baKdfGgq7UWtb@
SMTP_FROM_NAME=Sys-Ticket - Infoservice
SMTP_FROM_EMAIL=agent@infoservice.tec.br
```

Salvar: `Ctrl+O` → `Enter` → `Ctrl+X`

### 3️⃣ Executar deploy do backend
```bash
cd /root/Sys-Ticket
bash deploy-backend.sh
```

**O script vai:**
- ✅ Fazer git pull (código já está commitado)
- ✅ Instalar `nodemailer` e `@types/nodemailer` automaticamente (npm install)
- ✅ Compilar o backend
- ✅ Reiniciar o PM2

### 4️⃣ Verificar logs do backend
```bash
pm2 logs backend --lines 50
```

Procurar por:
- ✅ `Transporter SMTP inicializado: mail.infoservice.tec.br:465`
- ✅ `Conexão SMTP verificada com sucesso`

Se der erro, verificar as credenciais SMTP no .env.

---

## 🧪 Testar Envio de Email

### Opção 1: Através da Interface (Recomendado)

1. Acessar um ticket: https://172.31.255.26/tickets/{id}
2. Ir na aba **Comunicação**
3. Criar um novo comentário
4. **Marcar checkbox:** "Enviar notificação para o cliente"
5. Clicar em **Enviar**
6. Email será enviado automaticamente para o email do cliente do ticket

### Opção 2: Criar Endpoint de Teste (Temporário)

Se quiser testar rapidamente, posso criar um endpoint temporário:

```bash
# No servidor, depois do deploy:
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"jose.tecnoinf@gmail.com"}'
```

**OBS:** Isso requer criar um controller temporário. Me avise se quiser.

---

## 📧 Email de Teste

**Destinatário para testes:** jose.tecnoinf@gmail.com

---

## 🔧 Troubleshooting

### Erro: "Conexão SMTP falhou"
- Verificar firewall: porta 465 deve estar aberta
- Testar conexão: `telnet mail.infoservice.tec.br 465`
- Verificar senha no .env (sem espaços, sem aspas extras)

### Erro: "Client não possui email"
- Verificar se o cliente do ticket tem email cadastrado no banco
- Query SQL: `SELECT id, name, email FROM clients WHERE id = 'ID_DO_CLIENTE'`

### Email não chega
- Verificar logs do backend: `pm2 logs backend | grep -i email`
- Verificar spam/lixeira do destinatário
- Verificar logs do servidor SMTP (mail.infoservice.tec.br)

---

## 📝 Funcionalidades Implementadas

### EmailService (`email.service.ts`)

#### Métodos Genéricos:
- `sendEmail(dto)` - Envia email genérico com anexos, CC, BCC

#### Métodos Específicos de Templates:
- `sendTicketCommentNotification()` - Notificação de novo comentário
- `sendNewTicketNotification()` - Notificação de ticket criado
- `sendTicketStatusChangeNotification()` - Notificação de mudança de status

### Templates HTML
Todos os emails têm:
- ✅ Design responsivo
- ✅ Cores do sistema (azul #2563eb, verde #10b981, laranja #f59e0b)
- ✅ Botão "Ver Ticket" com link direto
- ✅ Footer com avisos automáticos
- ✅ Versão texto alternativa (fallback)

---

## 🎯 Próximas Melhorias (Futuro)

1. **Templates de email mais completos**
   - Adicionar logo da empresa
   - Incluir assinatura personalizada
   - Suporte a anexos nos emails

2. **Configurações via Interface**
   - Painel de configurações SMTP na UI
   - Teste de conexão SMTP pela interface
   - Histórico de emails enviados

3. **Mais notificações**
   - Email ao criar ticket novo
   - Email ao atribuir ticket para técnico
   - Email ao mudar status (aberto → em andamento → fechado)
   - Email de resumo diário/semanal

4. **Filas de Email**
   - Implementar Bull/BullMQ para envio assíncrono
   - Retry automático em caso de falha
   - Dashboard de monitoramento

---

## 📞 Suporte

Se tiver qualquer problema durante o deploy, me avise!

**Email de teste para validação:** jose.tecnoinf@gmail.com
