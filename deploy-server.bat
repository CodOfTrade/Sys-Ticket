@echo off
echo Conectando ao servidor para atualizar...
echo.
echo Execute os seguintes comandos quando conectar:
echo   cd /home/ubuntu/Sys-Ticket
echo   git pull
echo   pm2 restart backend
echo.
ssh root@172.31.255.26
