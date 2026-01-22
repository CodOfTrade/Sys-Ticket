@echo off

REM Mudar para o diretorio onde o script esta localizado
cd /d "%~dp0"

echo ========================================
echo  Sys-Ticket Agent Desktop
echo  REINSTALACAO COMPLETA
echo ========================================
echo.
echo Este script vai:
echo   1. Limpar node_modules (se existir)
echo   2. Limpar cache do npm
echo   3. Reinstalar todas as dependencias
echo.
pause
echo.

echo [1/4] Limpando node_modules...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo   OK - node_modules removido
) else (
    echo   OK - node_modules nao existia
)
echo.

echo [2/4] Limpando package-lock.json...
if exist "package-lock.json" (
    del /f /q package-lock.json
    echo   OK - package-lock.json removido
) else (
    echo   OK - package-lock.json nao existia
)
echo.

echo [3/4] Limpando cache do npm...
call npm cache clean --force
echo   OK - Cache limpo
echo.

echo [4/4] Instalando dependencias (SEM workspace)...
echo.
echo IMPORTANTE: Agora o agent-desktop esta FORA do workspace
echo             As dependencias serao instaladas LOCALMENTE
echo.

call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha na instalacao!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  VERIFICANDO INSTALACAO
echo ========================================
echo.

if exist "node_modules" (
    echo [OK] node_modules CRIADO com sucesso!
    echo.
    echo Conteudo de node_modules:
    dir node_modules /b | find /c /v ""
    echo   pastas/arquivos encontrados
) else (
    echo [ERRO] node_modules NAO foi criado!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  SUCESSO!
echo ========================================
echo.
echo As dependencias foram instaladas localmente em:
echo %CD%\node_modules
echo.
echo Proximo passo:
echo   Execute: 2-build-instalador.bat
echo.
pause
