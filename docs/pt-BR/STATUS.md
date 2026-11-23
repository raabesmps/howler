# Status

[English](../STATUS.md) · [Português](STATUS.md)

Checkpoint atual: CP8 (frontend ligado ao backend)
Última tag: cp7 (antes dela: cp6, prototype-approved, cp5, cp4, cp3)
Aguardando aprovação: sim (pull request do CP8)

## Histórico
- 2026-11-22 CP0 aprovado, mergeado (PR #13), tag `cp0`
- 2026-11-22 CP1 aprovado, mergeado (PR #14), tag `cp1`
- 2026-11-22 CP2 laboratório de áudio feito (PR #15, fechado sem merge). Depois de testar, a direção mudou: ninguém escolhe a voz, o fluxo de verdade tem tom fixo. ADR-002 aceito. O laboratório fica na branch `archive/audio-lab`.
- 2026-11-22 Tom da voz ajustado de ouvido em várias rodadas e fixado: gpt-audio, voz Coral, tratamento limpo e forte, sem eco.
- 2026-11-23 CP3 a CP5 entregues como um protótipo só, aprovados e mergeados (PR #16), tags `cp3`, `cp4`, `cp5` e `prototype-approved`. A barreira "protótipo aprovado" foi passada: a Fase 3 (backend) pode começar.
- 2026-11-23 Hospedagem decidida: uma VM do Google Cloud, não o Netlify (ADR-004, PR #18, mergeado).
- 2026-11-23 CP6 aprovado, mergeado (PR #19), tag `cp6`: Docker dentro do WSL, Laravel 13 com PostgreSQL, a tabela howlers com regras no próprio banco, 22 testes, ADR-003.
- 2026-11-23 CP7 aprovado, mergeado (PR #20), tag `cp7`. Construído: criar, estado, abertura atômica, denúncia, limites por IP, limpeza de hora em hora, contrato OpenAPI, 57 testes incluindo um de concorrência com 12 processos. A proteção da `main` agora exige as duas verificações da CI (`frontend` e `backend`).
- 2026-11-23 CP8 construído: cliente de API tipado, o fluxo real de ponta a ponta, estados de erro e de limite de pedidos, botão de denúncia, Web Share e prévia do link, a voz movida para o backend (feita na criação, entregue uma vez na abertura), guia de desenvolvimento. Verificado num navegador de verdade contra o backend real, o PostgreSQL e a voz da OpenAI.
- Ainda aberto do CP5: a prévia online. Ela vira o deploy de staging do CP10 (issue #6).

## A seguir
- CP9: testes de ponta a ponta (Playwright), acessibilidade, o aviso de volume alto, desempenho em celulares e a CI completa.
