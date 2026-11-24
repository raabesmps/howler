# Status

[English](../../project/STATUS.md) · [Português](STATUS.md)

Checkpoint atual: CP10 (staging): NO AR em https://howler.aquifunciona.dev.br. Para fechar: uma passada no celular, o Sentry, os alertas de gasto e de disponibilidade do Google Cloud, e restringir o SSH ao endereço da dona
Última tag: cp10 (antes dela: cp9, cp8, cp7, cp6, prototype-approved, cp5, cp4, cp3)
Aguardando aprovação: não (a issue #11 fecha depois do primeiro deploy de verdade)

## Histórico
- 2026-11-22 CP0 aprovado, mergeado (PR #13), tag `cp0`
- 2026-11-22 CP1 aprovado, mergeado (PR #14), tag `cp1`
- 2026-11-22 CP2 laboratório de áudio feito (PR #15, fechado sem merge). Depois de testar, a direção mudou: ninguém escolhe a voz, o fluxo de verdade tem tom fixo. ADR-002 aceito. O laboratório fica na branch `archive/audio-lab`.
- 2026-11-22 Tom da voz ajustado de ouvido em várias rodadas e fixado: gpt-audio, voz Coral, tratamento limpo e forte, sem eco.
- 2026-11-23 CP3 a CP5 entregues como um protótipo só, aprovados e mergeados (PR #16), tags `cp3`, `cp4`, `cp5` e `prototype-approved`. A barreira "protótipo aprovado" foi passada: a Fase 3 (backend) pode começar.
- 2026-11-23 Hospedagem decidida: uma VM do Google Cloud, não o Netlify (ADR-004, PR #18, mergeado).
- 2026-11-23 CP6 aprovado, mergeado (PR #19), tag `cp6`: Docker dentro do WSL, Laravel 13 com PostgreSQL, a tabela howlers com regras no próprio banco, 22 testes, ADR-003.
- 2026-11-23 CP7 aprovado, mergeado (PR #20), tag `cp7`. Construído: criar, estado, abertura atômica, denúncia, limites por IP, limpeza de hora em hora, contrato OpenAPI, 57 testes incluindo um de concorrência com 12 processos. A proteção da `main` agora exige as duas verificações da CI (`frontend` e `backend`).
- 2026-11-23 CP8 aprovado, mergeado (PR #22), tag `cp8`. Construído: cliente de API tipado, o fluxo real de ponta a ponta, estados de erro e de limite de pedidos, botão de denúncia, Web Share e prévia do link, a voz movida para o backend (feita na criação, entregue uma vez na abertura), guia de desenvolvimento. Verificado num navegador de verdade contra o backend real, o PostgreSQL e a voz da OpenAI.
- 2026-11-23 CP9 aprovado, mergeado (PR #24), tag `cp9`; a `main` agora exige também a verificação `e2e`. Construído: 33 testes de ponta a ponta num navegador de verdade (jornada, uso único, falhas, som, acessibilidade com axe), um aviso de som alto e um controle de mudo que persiste e silencia também a voz do navegador, as correções de acessibilidade que a auditoria achou, um orçamento de desempenho para a queima (de 23 para 52 fps na máquina de teste), o job `e2e` na CI e o documento de estratégia de testes.
- 2026-11-23 CP10 aprovado, mergeado (PR #26), tag `cp10`. Construído: imagens de produção (app em PHP-FPM, web no Caddy), o compose de produção, scripts de deploy, rollback e backup, o workflow de deploy de staging (desligado até definir `STAGING_ENABLED`), CORS e cabeçalhos de segurança, monitoramento de erros com Sentry que nunca envia tokens nem recados (ADR-005) e o runbook. Conferido nesta máquina com as imagens de verdade: deploy, o fluxo inteiro por https, uma versão quebrada voltando sozinha. Ainda não feito: a VM, o domínio, as configurações do GitHub e o primeiro deploy de verdade (dona).
- 2026-11-24 Primeiro deploy de verdade: o staging está no ar numa e2-micro do Google Cloud (us-central1-c) atrás do Caddy, com certificado Let's Encrypt e o DNS no Cloudflare em modo DNS only. Conferido de fora e de dentro: https e cabeçalhos de segurança, o fluxo inteiro num navegador com a voz real (sem erros de console nem de CSP), a abertura única, os limites por IP enxergando o endereço real, a limpeza de hora em hora agendada, um backup diário no cron, um redeploy automático a cada merge e os dois rollbacks (no servidor e reimplantando uma tag antiga pelo workflow). Achados e corrigidos no caminho: o healthcheck do app (pgrep do BusyBox), CRLF em secrets salvos pelo PowerShell e a falta do cron no Ubuntu minimal.
- O refinamento do layout e uma passada pelo docs/pt-BR/guides/TESTING.md estão previstos para depois de terminadas as fases (pedido da dona do projeto).
- Ainda aberto do CP5: a prévia online. Ela vira o deploy de staging do CP10 (issue #6).

## A seguir
- Terminar o CP10 com o primeiro deploy de verdade (a dona cria a VM e define as variáveis do GitHub: docs/pt-BR/guides/DEPLOYMENT.md), depois o CP11: produção e lançamento.
