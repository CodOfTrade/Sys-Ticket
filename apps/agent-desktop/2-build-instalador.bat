@echo off
echo ========================================
echo  Sys-Ticket Agent Desktop
echo  Gerando instalador Windows (.exe)
echo ========================================
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

echo Limpando builds anteriores...
if exist "dist" rmdir /s /q dist
if exist "dist-electron" rmdir /s /q dist-electron
if exist "release" rmdir /s /q release
echo.

echo Compilando TypeScript...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha na compilacao!
    pause
    exit /b 1
)

echo.
echo Gerando instalador Windows...
echo Isso pode levar 1-2 minutos...
echo.

call npm run build:win

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao gerar instalador!
    echo.
    echo Verifique os logs acima para mais detalhes.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILD CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Instaladores gerados em:
echo   release\Sys-Ticket-Agent-Setup-1.0.0.exe
echo   release\Sys-Ticket-Agent-Portable-1.0.0.exe
echo.
echo Abrindo pasta release...
start release
echo.
pause
