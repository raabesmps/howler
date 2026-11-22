# ADR-001: Stack e estrutura do repositório

[English](../../decisions/ADR-001-stack-and-layout.md) · [Português](ADR-001-stack-and-layout.md)

Status: aceito (CP0 aprovado, 2026-11-22)
Data: 2026-11-22

## Contexto

O Howler é um produto pequeno com duas necessidades técnicas difíceis:

1. Uma experiência visual e sonora rica em navegadores mobile (animação do envelope, fogo em canvas, cadeia de efeitos com Web Audio).
2. Um link estritamente de uso único: o conteúdo só pode ser revelado uma vez, mesmo com requisições simultâneas, e apagado depois.

É também um projeto de portfólio, construído um checkpoint validado por vez, então a stack deve ser conhecida, testável e barata de hospedar.

## Decisão

- **Frontend:** Vue 3 + Vite + TypeScript. Canvas 2D para fogo, fumaça e brasas. Web Audio API para a cadeia de efeitos da voz. Vitest para testes unitários.
- **Backend:** Laravel (só API) + PostgreSQL. PHPUnit para testes. A garantia de uso único vem de uma transação com `lockForUpdate` (lock de linha no PostgreSQL), e não de checagens na aplicação.
- **E2E:** Playwright.
- **CI:** GitHub Actions.
- **Empacotamento:** Docker; a hospedagem fica para o ADR-004 (CP10).
- **Estrutura:** monorepo com `frontend/`, `backend/`, `lab/audio/` (experimentos de áudio descartáveis), `docs/` e `.github/`.
- **Repositório:** `raabesmps/howler`, público desde o primeiro dia. O trabalho acontece em branches `cpNN-nome-curto` e PRs, com merge sem squash.

### Nota sobre proteção da branch

O objetivo era proteger a `main` e exigir PR. Isso é garantido por processo (sempre PR, nunca commit direto depois do inicial) e, quando o plano do GitHub permite, por regras de proteção de branch. Repositórios públicos têm proteção de branch no plano gratuito.

## Alternativas consideradas

- **Nuxt ou Next full-stack (um único deploy):** hospedagem mais simples, mas a garantia de uso único é mais fácil de raciocinar e testar com um banco relacional de verdade e locks de linha, e o Laravel já é familiar de outros projetos.
- **Frontend em React:** igualmente capaz; Vue escolhido por consistência com outros projetos do portfólio.
- **Redis ou similar para tokens de uso único:** um `GETDEL` atômico funcionaria, mas o PostgreSQL dá armazenamento durável, consultas de expiração e o job de limpeza num só lugar, então é um datastore a menos para operar.
- **Repositórios separados para front e back:** mais cerimônia para um projeto com uma autora e checkpoints fortemente acoplados.

## Consequências

- Dois runtimes (Node e PHP) para manter, mitigado com Docker.
- O frontend pode ser desenvolvido e aprovado como protótipo independente (CP2 a CP5) antes de existir qualquer backend.
- A abordagem de voz (ADR-002) pode adicionar armazenamento de áudio no backend, tratado no ADR-003.
