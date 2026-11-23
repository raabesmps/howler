# Frontend do Howler

[English](README.md) · [Português](README.pt-BR.md)

Vue 3 + Vite + TypeScript. Este é o protótipo: a experiência inteira funciona, sem backend.

Escreva um recado, ganhe um link, e quem abrir vê um envelope fechado. Toca no selo: ele ronca e treme, a aba rasga, a carta sobe, o envelope grita o recado (tremendo conforme o volume da voz), fecha, queima do centro para fora e cai em pó. O link funciona uma vez.

## Como rodar

```
cd frontend
npm install
npm run dev        # http://localhost:5173 (também acessível do celular no mesmo Wi-Fi)
npm test           # testes unitários (Vitest)
npm run lint
npm run typecheck
npm run build
```

**A voz precisa de uma chave.** A voz do howler é feita por um modelo de áudio da OpenAI, chamado por um pequeno endpoint dentro do servidor de desenvolvimento (`server/voice.ts`). Crie um arquivo `.env.local` na **raiz do repositório** (um nível acima de `frontend/`) com uma linha, `OPENAI_API_KEY=sua-chave`. Ele é ignorado pelo git e a chave nunca chega ao navegador. Veja o `.env.example`. Sem chave o howler ainda funciona, com a voz simples do navegador. Cada howler custa mais ou menos 1,5 centavo de dólar de áudio (veja o ADR-002).

No Windows, rode os testes de um caminho que começa com a letra do drive em maiúscula (`C:/...`): com `c:` minúsculo o Vitest carrega duas cópias de si mesmo e falha com "Cannot read properties of undefined (reading 'config')".

Celular e https: os navegadores só liberam compartilhar e copiar em `https://` ou `localhost`, então no celular por `http://<ip>:5173` simples esses dois botões ficam limitados. A voz em si funciona, porque quem a gera é o servidor de desenvolvimento.

## O que fica onde

| Caminho | O que é |
|---------|---------|
| `src/views/` | As telas: escrever, compartilhar, destinatário (a jornada inteira), não encontrado |
| `src/components/` | Envelope, selo, o envelope que fala, a cena da queima, telas finais |
| `src/audio/engine.ts` | O tratamento da voz, a reprodução e os efeitos sonoros (ronco, rasgo do papel) |
| `src/audio/dsp.ts` | Funções puras de áudio (portão de ruído, nível), com testes |
| `src/audio/voice.ts` | Pede a voz ao servidor |
| `src/burn/burn.ts` | A queima em canvas: fogo, papel caindo, pó |
| `src/api/` | O contrato da API (`types.ts`) e a implementação no navegador (`mock.ts`) |
| `server/voice.ts` | O endpoint da voz (só no servidor de desenvolvimento): o tom fixo, as travas, a chave |

## Como se comporta

- **O tom é fixo.** Quem envia não muda a voz. É uma mãe histérica, aos berros, exagerada, feita por um modelo de áudio com direção fixa, depois limpa e deixada forte no aparelho (sem eco). Veja o ADR-002.
- **O envelope se mexe com a voz.** O tremor é guiado pelo volume real do áudio a cada quadro, então ele bate nas palavras fortes e fica parado nas pausas.
- **Uso único.** Abrir queima o howler primeiro e revela o recado depois. O mock guarda isso por navegador; o endpoint atômico de verdade chega no CP7.
- **Nada se perde.** Se a voz não puder ser gerada, o howler ainda fala com a voz simples do navegador.
- **O endpoint tem travas.** De 1 a 140 caracteres, 6 pedidos por minuto, e a transcrição do modelo precisa bater com o texto palavra por palavra (senão tenta mais uma vez e depois cai no plano B).
- **Movimento reduzido.** Com `prefers-reduced-motion` não há tremor nem fogo: as palavras ainda acendem e o envelope some em fade para a tela final.
- **A queima é silenciosa** de propósito: só o ronco e o rasgo do papel têm som.

## Limitações do protótipo (de propósito, resolvidas depois)

- O token carrega o recado, então um link feito num aparelho abre em outro sem servidor. Quem tiver o link pode ler o recado pela URL, e o mesmo link pode ser aberto uma vez por aparelho. O produto de verdade usa um id aleatório e uma abertura atômica no servidor (CP7).
- A voz é feita na hora que o envelope é aberto, então há uns 3 segundos de ronco. Com servidor o áudio é feito na criação e já está pronto (CP8).
- O endpoint da voz só existe nos servidores de desenvolvimento e de prévia. Uma cópia estática do site (como o GitHub Pages) não tem o endpoint e usa a voz simples do navegador.
- As meta tags de prévia do link e o botão de denúncia ainda não estão ligados (CP8, CP7).
