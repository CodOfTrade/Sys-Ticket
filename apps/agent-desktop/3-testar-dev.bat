@echo off

REM Mudar para o diretorio onde o script esta localizado
cd /d "%~dp0"

echo ========================================
echo  Sys-Ticket Agent Desktop
echo  Executando em modo DESENVOLVIMENTO
echo ========================================
echo.
echo Diretorio atual: %CD%
echo.

REM Verificar se npm esta instalado
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js/npm nao encontrado!
    pause
    exit /b 1
)

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [ERRO] Dependencias nao instaladas!
    echo.
    echo Execute primeiro: 1-instalar-dependencias.bat
    echo.
    pause
    exit /b 1
)

echo Iniciando agente em modo desenvolvimento...
echo.
echo DICAS:
echo - DevTools abrirao automaticamente
echo - Hot reload ativado (mudancas aparecem automaticamente)
echo - Para parar: Feche a janela ou pressione Ctrl+C aqui
echo.
echo Aguarde alguns segundos...
echo.

call npm run electron:dev

echo.
echo Agente encerrado.
pause
