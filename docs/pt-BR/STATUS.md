# Status

[English](../STATUS.md) · [Português](STATUS.md)

Checkpoint atual: CP9 concluído, CP10 a seguir (deploy de staging)
Última tag: cp9 (antes dela: cp8, cp7, cp6, prototype-approved, cp5, cp4, cp3)
Aguardando aprovação: não

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
- O refinamento do layout e uma passada pelo docs/pt-BR/TESTES.md estão previstos para depois de terminadas as fases (pedido da dona do projeto).
- Ainda aberto do CP5: a prévia online. Ela vira o deploy de staging do CP10 (issue #6).

## A seguir
- CP10: deploy numa VM do Google Cloud (Docker Compose, Caddy, GitHub Actions por SSH) e a prévia de staging.
