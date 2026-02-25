@echo off
title Iniciando Advocacia CRM (Auto-Start)
cd /d d:\antigravity\server
:: Tenta restaurar processos salvos (pm2 save)
call pm2 resurrect
:: Se falhar (ex: nao tinha save), inicia manual
if %errorlevel% neq 0 (
    call pm2 start index.js --name "AdvocaciaCRM" --time
)
:: Aguarda 5 segundos só para garantir e fecha a janela
timeout /t 5
exit
