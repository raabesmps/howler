# Documentação

[English](../README.md) · [Português](README.md)

Tudo aqui está em inglês, e cada documento tem o seu gêmeo em português no mesmo caminho dentro de [pt-BR/](../pt-BR/). O `python scripts/check-docs.py` (que roda na CI) confere que todo link funciona e que nenhum documento está sem o seu gêmeo.

## Guias: como fazer as coisas

| Documento | Serve para |
|-----------|-----------|
| [DEVELOPMENT.md](guides/DEVELOPMENT.md) | Rodar o banco, a API e o site na sua máquina; as variáveis de configuração; quando algo dá errado |
| [TESTING.md](guides/TESTING.md) | A estratégia de testes: as camadas, como rodá-las, a lista de acessibilidade, desempenho, notas de cobertura |
| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | O runbook: criar e preparar a VM, conectar o GitHub, fazer deploy, voltar atrás, monitoramento, backups, segredos |

## Decisões: por que é do jeito que é

| Documento | Decisão |
|-----------|---------|
| [ADR-001](decisions/ADR-001-stack-and-layout.md) | Stack e estrutura do repositório |
| [ADR-002](decisions/ADR-002-voice-approach.md) | A voz: modelo, tom, tratamento, travas, reserva |
| [ADR-003](decisions/ADR-003-data-model-and-retention.md) | Modelo de dados e retenção |
| [ADR-004](decisions/ADR-004-hosting.md) | Hospedagem e como ela é construída |
| [ADR-005](decisions/ADR-005-error-monitoring.md) | Monitoramento de erros e o que pode sair do servidor |

Uma decisão nova é um ADR curto (contexto, decisão, alternativas, consequências) numerado em ordem.

## Referência

| Documento | O que descreve |
|-----------|----------------|
| [api/README.md](api/README.md) · [api/openapi.yaml](../api/openapi.yaml) | Os quatro endpoints, o comportamento de uso único, o contrato (OpenAPI 3.1) |
| [design/tokens.md](design/tokens.md) · [design/wireframes.md](design/wireframes.md) | A direção visual: cores, tipografia, espaçamento, as telas. O [reference.html](../design/reference.html) é a referência visual aprovada |

## Projeto: como ele é conduzido

| Documento | O que é |
|-----------|---------|
| [project/PLAN.md](project/PLAN.md) | O plano mestre: fases, checkpoints, as regras e as mudanças feitas no caminho |
| [project/STATUS.md](project/STATUS.md) | Onde o projeto está agora, com o histórico |
| [project/releases/v1.0.0.md](project/releases/v1.0.0.md) · [CHANGELOG.pt-BR.md](../../CHANGELOG.pt-BR.md) | As notas da versão v1.0.0 (o que ela faz bem, os limites conhecidos) e o changelog de cada versão |

## Outros

A pasta [assets/](../assets/) guarda as imagens usadas pelos READMEs. O [backend/](../../backend/README.pt-BR.md) e o [frontend/](../../frontend/README.pt-BR.md) têm cada um o seu README para trabalhar dentro deles.
