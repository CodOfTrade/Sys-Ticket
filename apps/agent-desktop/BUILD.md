# Compilação do Agente Desktop - Guia Completo

## ✅ Status do Desenvolvimento

**CONCLUÍDO:**
- ✅ Estrutura completa do projeto Electron + React
- ✅ Todos os serviços implementados (SystemInfo, API, Heartbeat, Storage)
- ✅ Interface React com wizard de configuração (3 passos)
- ✅ Dashboard principal
- ✅ Sistema de tray icon (ícone na bandeja)
- ✅ Configuração do electron-builder para instalador Windows

**PENDENTE:**
- ⏳ Instalar dependências (npm install)
- ⏳ Adicionar ícone personalizado (opcional)
- ⏳ Gerar instalador .exe

---

## 📋 Pré-requisitos

- Node.js versão 18+ instalado
- npm ou yarn
- Windows (para testar o instalador)

---

## 🚀 Passo a Passo

### 1. Navegue até a pasta do agente

```bash
cd apps/agent-desktop
```

### 2. Instale as dependências

```bash
npm install
```

**Tempo estimado:** 2-3 minutos (depende da conexão)

**Pacotes principais que serão instalados:**
- electron
- electron-builder
- react + react-dom
- vite
- systeminformation
- electron-store
- axios

### 3. (Opcional) Adicione um ícone personalizado

Siga as instruções em: `build/ICON_INSTRUCTIONS.txt`

Se não adicionar ícone, o electron-builder usará o ícone padrão do Electron.

### 4. Execute em modo desenvolvimento (para testar)

```bash
npm run electron:dev
```

**O que vai acontecer:**
1. Vite irá compilar o React em modo dev (com hot-reload)
2. Electron abrirá uma janela do agente
3. Se ainda não configurado, verá a tela de Setup
4. Você pode testar o fluxo de registro

**Para parar:** Ctrl+C no terminal

### 5. Gere o instalador Windows

```bash
npm run build:win
```

**O que vai acontecer:**
1. TypeScript será compilado (`tsc`)
2. React será buildado para produção (`vite build`)
3. electron-builder criará o instalador Windows

**Saída esperada:**
```
apps/agent-desktop/release/
├── Sys-Ticket-Agent-Setup-1.0.0.exe    (Instalador NSIS)
└── Sys-Ticket-Agent-Portable-1.0.0.exe (Versão portátil)
```

**Tempo estimado:** 1-2 minutos

---

## 📦 Resultados do Build

### Instalador NSIS (`Setup.exe`)

- **Arquivo:** `release/Sys-Ticket-Agent-Setup-1.0.0.exe`
- **Tipo:** Instalador wizard completo
- **Funcionalidades:**
  - Escolha do diretório de instalação
  - Criação de atalho no desktop
  - Criação de atalho no menu iniciar
  - Registro de desinstalador
  - Execução automática após instalação

### Versão Portátil (`Portable.exe`)

- **Arquivo:** `release/Sys-Ticket-Agent-Portable-1.0.0.exe`
- **Tipo:** Executável standalone (não precisa instalar)
- **Funcionalidades:**
  - Executa direto sem instalação
  - Útil para testes rápidos
  - Salva configurações no diretório do usuário

---

## 🧪 Testando o Agente

### Teste Local (antes de gerar instalador)

```bash
npm run electron:dev
```

**Checklist de testes:**
- [ ] Janela abre sem erros
- [ ] Tela de Setup aparece (se primeira execução)
- [ ] Consegue digitar URL da API
- [ ] Botão "Testar Conexão" funciona
- [ ] Dropdown de clientes carrega
- [ ] Dropdown de contratos carrega
- [ ] Informações da máquina são coletadas automaticamente
- [ ] Botão "Concluir Registro" funciona
- [ ] Após registro, Dashboard aparece
- [ ] Ícone aparece na bandeja do sistema
- [ ] Menu do tray funciona (clique direito no ícone)

### Teste do Instalador

1. **Execute o instalador:**
   ```
   release/Sys-Ticket-Agent-Setup-1.0.0.exe
   ```

2. **Siga o wizard de instalação**

3. **Após instalação:**
   - [ ] Atalho criado no desktop
   - [ ] Atalho no menu iniciar
   - [ ] Agente inicia automaticamente
   - [ ] Ícone na bandeja

4. **Teste o desinstalador:**
   - Painel de Controle → Programas e Recursos
   - Encontre "Sys-Ticket Agent"
   - Desinstale e verifique limpeza completa

---

## 🔧 Troubleshooting

### Erro: `npm: command not found`

**Solução:** Instale Node.js de https://nodejs.org/

### Erro: `Cannot find module 'electron'`

**Solução:** Execute `npm install` primeiro

### Erro: `Python not found` durante instalação

**Causa:** Algumas dependências nativas (systeminformation) precisam compilar módulos C++

**Solução Windows:**
```bash
npm install --global windows-build-tools
```

Ou instale Visual Studio Build Tools:
https://visualstudio.microsoft.com/downloads/ → "Build Tools for Visual Studio"

### Erro: Build do electron-builder falha

**Verifique:**
1. Espaço em disco suficiente (500MB+ livres)
2. Antivírus não está bloqueando
3. Caminho do projeto não tem caracteres especiais

**Solução alternativa:**
```bash
npm run build   # Apenas build, sem gerar instalador
```

### Agente não conecta ao backend

**Verifique:**
1. Backend está rodando em https://172.31.255.26/api
2. URL da API está correta no Setup
3. Firewall/Antivírus não está bloqueando conexão
4. Certificado SSL (se necessário, pode ignorar em dev)

---

## 📁 Estrutura de Arquivos Gerados

```
apps/agent-desktop/
├── dist-electron/           # Electron compilado
│   ├── main/
│   │   └── index.js        # Main process
│   └── preload/
│       └── index.js        # Preload script
│
├── dist/                   # React buildado
│   ├── index.html
│   └── assets/
│       ├── index-[hash].js
│       └── index-[hash].css
│
├── release/                # Instaladores
│   ├── Sys-Ticket-Agent-Setup-1.0.0.exe
│   ├── Sys-Ticket-Agent-Portable-1.0.0.exe
│   └── win-unpacked/      # Arquivos desempacotados (para debug)
│
└── node_modules/          # Dependências
```

---

## 🚢 Distribuição

### Para clientes finais:

**Recomendado:** `Sys-Ticket-Agent-Setup-1.0.0.exe`

**Distribuir via:**
- Download direto do site
- Email (anexo ou link)
- Compartilhamento de rede
- Portal do cliente

### Para testes rápidos:

**Recomendado:** `Sys-Ticket-Agent-Portable-1.0.0.exe`

---

## 📝 Próximos Passos (após compilar)

Após gerar o instalador com sucesso, os próximos passos do roadmap são:

### Fase 2 - Concluída ✅
- [x] Estrutura Electron
- [x] Sistema de registro
- [x] Heartbeat
- [x] Tray icon

### Fase 3 - Abertura de Tickets (próxima)
- [ ] Tela de criação de ticket no agente
- [ ] Serviço de captura de screenshot
- [ ] API backend para tickets via agente
- [ ] Integração com tabela tickets

### Fase 4 - Chat Integrado
- [ ] WebSocket gateway
- [ ] Interface de chat no agente
- [ ] Interface de chat no frontend web
- [ ] Notificações em tempo real

---

## ❓ Ajuda

Se encontrar problemas, verifique:

1. **Logs do Electron (modo dev):**
   - Abra DevTools: Ctrl+Shift+I
   - Aba Console

2. **Logs do build:**
   - Terminal mostrará erros detalhados

3. **Documentação:**
   - Electron: https://www.electronjs.org/docs
   - electron-builder: https://www.electron.build/

---

**Compilação criada por:** Claude Sonnet 4.5
**Data:** 21/01/2026
**Versão do Agente:** 1.0.0
