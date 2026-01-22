# Sys-Ticket Agent Desktop

Agente Windows para monitoramento e gerenciamento de recursos do Sys-Ticket.

## Funcionalidades

- ✅ **Ícone na Bandeja**: Sistema tray com menu de atalhos
- ✅ **Registro Automático**: Cadastro do recurso no backend
- ✅ **Heartbeat**: Envia status a cada 5 minutos
- ✅ **Coleta de Inventário**: CPU, RAM, disco, rede, OS
- 🚧 **Abertura de Tickets**: Via interface do agente (Fase 3)
- 🚧 **Chat Integrado**: Comunicação com suporte (Fase 4)

## Tecnologias

- **Electron**: Framework para desktop
- **React**: Interface de usuário
- **TypeScript**: Tipagem estática
- **Vite**: Build tool
- **systeminformation**: Coleta de informações do sistema

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run electron:dev

# Build para produção
npm run build:win

# Gerar instalador Windows
npm run build:win
```

## Estrutura

```
src/
├── main/              # Processo principal (Electron)
│   ├── index.ts       # Entry point
│   └── services/      # Serviços (API, Heartbeat, SystemInfo)
├── preload/           # Preload script (IPC bridge)
├── renderer/          # Interface React
│   ├── App.tsx
│   └── pages/         # Telas (Setup, Dashboard)
└── shared/            # Types compartilhados
```

## Build & Instalador

O comando `npm run build:win` gera:

- **Setup Wizard** (NSIS): `Sys-Ticket-Agent-Setup-1.0.0.exe`
- **Portable**: `Sys-Ticket-Agent-Portable-1.0.0.exe`

Ambos em `release/`
