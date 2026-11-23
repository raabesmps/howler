# Howler

[English](README.md) · [Português](README.pt-BR.md)

Escreva um recado curto e compartilhe um link de uso único. Quem abrir vê um envelope fechado: ele ronca, rasga e **grita o recado com a voz de uma mãe furiosa e histérica**, tremendo a cada berro. Depois fecha, queima do centro para fora e cai em pó. O link só funciona uma vez.

Status: o protótipo está pronto (a experiência inteira, com um pequeno endpoint de voz no servidor e ainda sem backend de verdade). Em seguida vêm o backend em Laravel, uma prévia online e o lançamento. Veja [docs/pt-BR/STATUS.md](docs/pt-BR/STATUS.md).

## Experimente

```
cd frontend
npm install
npm run dev        # http://localhost:5173
```

A voz é feita por um modelo de áudio da OpenAI, por um pequeno endpoint no servidor de desenvolvimento, então precisa de uma chave: copie o `.env.example` para `.env.local` na raiz do repositório e preencha o `OPENAI_API_KEY`. O arquivo é ignorado pelo git e a chave nunca chega ao navegador. Cada howler custa mais ou menos 1,5 centavo de dólar de áudio. Sem chave o howler ainda funciona, com a voz simples do navegador. Comece com o volume baixo: ele foi feito para ser alto.

Mais detalhes em [frontend/README.pt-BR.md](frontend/README.pt-BR.md).

## Como foi feito

| Onde | O quê |
|------|-------|
| [docs/pt-BR/PLANO.md](docs/pt-BR/PLANO.md) | O plano mestre, com os checkpoints e as mudanças feitas no caminho |
| [docs/pt-BR/STATUS.md](docs/pt-BR/STATUS.md) | Em que ponto o projeto está agora |
| [docs/pt-BR/decisions/](docs/pt-BR/decisions/) | Decisões de arquitetura: [ADR-001](docs/pt-BR/decisions/ADR-001-stack-and-layout.md) a stack, [ADR-002](docs/pt-BR/decisions/ADR-002-voice-approach.md) a voz, [ADR-003](docs/pt-BR/decisions/ADR-003-data-model-and-retention.md) dados e retenção, [ADR-004](docs/pt-BR/decisions/ADR-004-hosting.md) a hospedagem |
| [docs/pt-BR/TESTES.md](docs/pt-BR/TESTES.md) | A estratégia de testes: o que é testado, como rodar, notas de cobertura |
| [docs/pt-BR/DESENVOLVIMENTO.md](docs/pt-BR/DESENVOLVIMENTO.md) | Rodar tudo localmente: banco, API e frontend |
| [docs/pt-BR/api/](docs/pt-BR/api/README.md) | O contrato da API (OpenAPI) e como funciona a abertura de uso único |
| [docs/design/](docs/design/) | A direção visual aprovada, os tokens e as referências das telas |
| [frontend/](frontend/) | Vue 3 + Vite + TypeScript: as telas, o motor de áudio, a queima em canvas |
| [backend/](backend/) | Laravel 13 + PostgreSQL: a tabela e o modelo howlers (CP6) e a API de uso único (CP7) |

A documentação é em inglês, com uma aba em português (`docs/pt-BR/`, `README.pt-BR.md`).

> Projeto de fã. Sem afiliação com Warner Bros. ou J.K. Rowling.
