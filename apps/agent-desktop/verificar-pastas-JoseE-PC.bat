@echo off

REM Mudar para o diretorio onde o script esta localizado
cd /d "%~dp0"

echo ========================================
echo  Verificacao de Pastas
echo ========================================
echo.
echo Diretorio atual:
echo %CD%
echo.
echo ----------------------------------------
echo Conteudo da pasta:
echo ----------------------------------------
dir /b
echo.
echo ----------------------------------------
echo Verificando node_modules:
echo ----------------------------------------
if exist "node_modules" (
    echo [OK] node_modules EXISTE
    echo.
    echo Tamanho aproximado:
    dir node_modules | find "bytes"
) else (
    echo [X] node_modules NAO EXISTE
    echo.
    echo Isso significa que as dependencias nao foram instaladas.
    echo Execute: 1-instalar-dependencias.bat
)
echo.
echo ----------------------------------------
echo Verificando package.json:
echo ----------------------------------------
if exist "package.json" (
    echo [OK] package.json existe
) else (
    echo [X] package.json NAO existe - ERRO!
)
echo.
pause
