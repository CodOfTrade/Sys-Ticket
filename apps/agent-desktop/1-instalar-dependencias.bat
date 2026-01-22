@echo off

REM Mudar para o diretorio onde o script esta localizado
cd /d "%~dp0"

echo ========================================
echo  Sys-Ticket Agent Desktop
echo  Instalando dependencias...
echo ========================================
echo.
echo Diretorio atual: %CD%
echo.

REM Verificar se npm esta instalado
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js/npm nao encontrado!
    echo.
    echo Por favor, instale o Node.js primeiro:
    echo https://nodejs.org/
    echo.
    echo Recomendado: Node.js 18 LTS ou superior
    echo.
    pause
    exit /b 1
)

echo Node.js encontrado! Versao:
call node --version
echo.

echo npm versao:
call npm --version
echo.

echo Instalando dependencias...
echo Isso pode levar alguns minutos...
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias!
    echo.
    echo Tente executar manualmente:
    echo   npm install
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Instalacao concluida com sucesso!
echo ========================================
echo.
echo Proximo passo:
echo   Execute: 2-build-instalador.bat
echo.
pause
