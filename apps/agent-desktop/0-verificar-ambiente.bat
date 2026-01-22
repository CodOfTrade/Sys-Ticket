@echo off

REM Mudar para o diretorio onde o script esta localizado
cd /d "%~dp0"

echo ========================================
echo  Sys-Ticket Agent Desktop
echo  Verificacao do Ambiente
echo ========================================
echo.
echo Diretorio: %CD%
echo.

set TODOS_OK=1

REM Verificar Node.js
echo [1/3] Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   [X] Node.js NAO encontrado!
    echo       Instale de: https://nodejs.org/
    set TODOS_OK=0
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   [OK] Node.js instalado: %NODE_VERSION%
)
echo.

REM Verificar npm
echo [2/3] Verificando npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   [X] npm NAO encontrado!
    set TODOS_OK=0
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo   [OK] npm instalado: %NPM_VERSION%
)
echo.

REM Verificar dependencias instaladas
echo [3/3] Verificando dependencias do projeto...
if exist "node_modules" (
    echo   [OK] Dependencias instaladas
) else (
    echo   [!] Dependencias NAO instaladas ainda
    echo       Execute: 1-instalar-dependencias.bat
)
echo.

echo ========================================
if %TODOS_OK% EQU 1 (
    echo  STATUS: AMBIENTE OK!
    echo ========================================
    echo.
    echo Voce pode prosseguir:
    echo.
    if not exist "node_modules" (
        echo   1. Execute: 1-instalar-dependencias.bat
        echo   2. Execute: 2-build-instalador.bat
    ) else (
        echo   Execute: 2-build-instalador.bat
    )
) else (
    echo  STATUS: PROBLEMAS ENCONTRADOS
    echo ========================================
    echo.
    echo Por favor, instale os requisitos faltantes.
)
echo.
pause
