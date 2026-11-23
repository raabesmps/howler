# Status

[English](../STATUS.md) · [Português](STATUS.md)

Checkpoint atual: CP6 (modelo de dados)
Última tag: prototype-approved (também cp3, cp4, cp5)
Aguardando aprovação: sim (pull request do CP6)

## Histórico
- 2026-11-22 CP0 aprovado, mergeado (PR #13), tag `cp0`
- 2026-11-22 CP1 aprovado, mergeado (PR #14), tag `cp1`
- 2026-11-22 CP2 laboratório de áudio feito (PR #15, fechado sem merge). Depois de testar, a direção mudou: ninguém escolhe a voz, o fluxo de verdade tem tom fixo. ADR-002 aceito. O laboratório fica na branch `archive/audio-lab`.
- 2026-11-22 Tom da voz ajustado de ouvido em várias rodadas e fixado: gpt-audio, voz Coral, tratamento limpo e forte, sem eco.
- 2026-11-23 CP3 a CP5 entregues como um protótipo só, aprovados e mergeados (PR #16), tags `cp3`, `cp4`, `cp5` e `prototype-approved`. A barreira "protótipo aprovado" foi passada: a Fase 3 (backend) pode começar.
- 2026-11-23 Direção de hospedagem decidida: uma VM do Google Cloud, não o Netlify (ADR-004).
- 2026-11-23 CP6 iniciado: Docker instalado dentro do WSL, Laravel 13 com PostgreSQL em contêineres, a tabela e o modelo howlers, fábrica e seeder, 22 testes, ADR-003.
- Ainda aberto do CP5: a prévia online. Ela vira o deploy de staging do CP10 (issue #6).
