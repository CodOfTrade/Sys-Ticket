# 🚀 Início Rápido - Agente Desktop

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter o **Node.js** instalado:

1. Baixe em: https://nodejs.org/
2. Instale a versão **18 LTS** ou superior
3. Verifique a instalação:
   ```bash
   node --version
   npm --version
   ```

## 📦 Passo a Passo Simplificado

### Opção 1: Usando Scripts .BAT (Mais Fácil!)

Basta dar duplo clique nos arquivos na ordem:

1. **`1-instalar-dependencias.bat`**
   - Instala todas as dependências necessárias
   - Tempo: ~2-3 minutos

2. **`2-build-instalador.bat`**
   - Compila o projeto
   - Gera os instaladores .exe
   - Tempo: ~1-2 minutos
   - Resultado: Pasta `release/` com os instaladores

3. (Opcional) **`3-testar-dev.bat`**
   - Testa o agente em modo desenvolvimento
   - Útil para testar antes de gerar instalador

### Opção 2: Linha de Comando

Se preferir usar o terminal:

```bash
# 1. Navegar até a pasta
cd apps/agent-desktop

# 2. Instalar dependências
npm install

# 3. (Opcional) Testar em desenvolvimento
npm run electron:dev

# 4. Gerar instalador
npm run build:win
```

## 📂 Resultado

Após executar, você terá na pasta **`release/`**:

- ✅ `Sys-Ticket-Agent-Setup-1.0.0.exe` - **Instalador completo**
- ✅ `Sys-Ticket-Agent-Portable-1.0.0.exe` - **Versão portátil**

## 🎯 Distribuir para Clientes

Recomendamos distribuir o **`Setup.exe`** para clientes finais.

O instalador irá:
- Instalar o agente automaticamente
- Criar atalho no desktop
- Criar atalho no menu iniciar
- Configurar inicialização automática (opcional)

## 🧪 Testar o Instalador

1. Execute `Sys-Ticket-Agent-Setup-1.0.0.exe`
2. Siga o wizard de instalação
3. Após instalação, o agente abrirá automaticamente
4. Na primeira execução, aparecerá a tela de **Setup** (3 passos)

## ❓ Problemas?

### "Node.js não encontrado"
→ Instale o Node.js de https://nodejs.org/

### "Erro ao instalar dependências"
→ Tente deletar `node_modules` e executar novamente:
```bash
rmdir /s /q node_modules
npm install
```

### "Python não encontrado"
→ Algumas dependências precisam compilar módulos nativos.
Instale: https://www.python.org/ (versão 3.x)

### Build falha com erro de memória
→ Feche outros programas e tente novamente
→ Ou execute com mais memória:
```bash
set NODE_OPTIONS=--max-old-space-size=4096
npm run build:win
```

## 📖 Documentação Completa

Para mais detalhes, veja:
- **[BUILD.md](BUILD.md)** - Guia completo de compilação
- **[README.md](README.md)** - Documentação do projeto

## 🎉 Pronto!

Agora você pode distribuir o instalador para seus clientes!

---

**Versão:** 1.0.0
**Data:** 21/01/2026
**Desenvolvido por:** Claude Sonnet 4.5
