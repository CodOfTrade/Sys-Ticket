@echo off
echo ========================================
echo  Sys-Ticket Agent Desktop
echo  LIMPAR TUDO (Reset Completo)
echo ========================================
echo.
echo ATENCAO: Isso vai deletar:
echo   - node_modules/ (dependencias)
echo   - dist/ (build React)
echo   - dist-electron/ (build Electron)
echo   - release/ (instaladores gerados)
echo.
echo Voce tera que reinstalar tudo depois!
echo.
set /p CONFIRMA="Tem certeza? (S/N): "

if /i NOT "%CONFIRMA%"=="S" (
    echo.
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
echo Limpando...
echo.

if exist "node_modules" (
    echo [1/4] Removendo node_modules...
    rmdir /s /q node_modules
    echo   OK
) else (
    echo [1/4] node_modules nao encontrado
)

if exist "dist" (
    echo [2/4] Removendo dist...
    rmdir /s /q dist
    echo   OK
) else (
    echo [2/4] dist nao encontrado
)

if exist "dist-electron" (
    echo [3/4] Removendo dist-electron...
    rmdir /s /q dist-electron
    echo   OK
) else (
    echo [3/4] dist-electron nao encontrado
)

if exist "release" (
    echo [4/4] Removendo release...
    rmdir /s /q release
    echo   OK
) else (
    echo [4/4] release nao encontrado
)

echo.
echo ========================================
echo  LIMPEZA CONCLUIDA!
echo ========================================
echo.
echo Para reconstruir:
echo   1. Execute: 1-instalar-dependencias.bat
echo   2. Execute: 2-build-instalador.bat
echo.
pause
