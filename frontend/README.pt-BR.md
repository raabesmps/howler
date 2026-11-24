# Frontend do Howler

[English](README.md) · [Português](README.pt-BR.md)

Vue 3 + Vite + TypeScript. Desde o CP8 ele conversa com o backend de verdade (Laravel + PostgreSQL); a configuração local completa está no [guia de desenvolvimento](../docs/pt-BR/guides/DEVELOPMENT.md).

Escreva um recado, receba um link, e quem abrir vê um envelope fechado. A pessoa toca o selo: ele ronca e treme, a aba rasga, a carta sobe, o envelope grita o recado (tremendo com o volume da voz), fecha, queima do centro para fora e vira pó. O link funciona uma vez.

## Rodar

Com o backend rodando (veja o guia de desenvolvimento):

```
cd frontend
npm install
npm run dev        # http://localhost:5173 (também acessível de um celular na mesma rede Wi-Fi)
npm test           # testes unitários (Vitest)
npm run lint
npm run typecheck
npm run build
```

O servidor de desenvolvimento encaminha `/api` para o backend (`http://localhost:8000`, mude com `VITE_API_TARGET`), então o navegador só conversa com a própria origem: sem CORS e sem chave no navegador.

Para mexer nas telas **sem Docker**, rode `VITE_API=mock npm run dev`: tudo passa a viver no navegador (o link carrega o recado, o uso único vale por aparelho e não há voz do servidor, então fala a voz comum do navegador).

No Windows, rode os testes a partir de um caminho com a letra do drive em maiúscula (`C:/...`): com `c:` minúsculo o Vitest carrega duas cópias de si mesmo e falha com "Cannot read properties of undefined (reading 'config')".

Celulares e https: os navegadores só liberam compartilhar e copiar em `https://` ou `localhost`, então num celular por `http://<ip>:5173` os botões Compartilhar e Copiar ficam limitados. O deploy de staging (CP10) é https.

## O que fica onde

| Caminho | O que é |
|---------|---------|
| `src/views/` | As telas: escrever, compartilhar, destinatário (a jornada toda), não encontrado |
| `src/components/` | Envelope, selo, o envelope falante, a cena de queima, os estados finais, o botão de denúncia |
| `src/api/types.ts` | O contrato da API que as telas usam, e os erros tipados |
| `src/api/http.ts` | O cliente real (conversa com a API Laravel). O `index.ts` escolhe ele, ou o mock |
| `src/api/mock.ts` | A implementação dentro do navegador, para testes e para trabalhar sem Docker |
| `src/lib/errors.ts` | Transforma um erro em palavras claras para a pessoa |
| `src/audio/engine.ts` | O tratamento da voz, a reprodução e os efeitos sonoros (ronco, papel rasgando) |
| `src/audio/dsp.ts` | Funções puras de áudio (noise gate, nível), com testes unitários |
| `src/audio/voice.ts` | Decodifica a voz que chega junto com o howler aberto |
| `src/burn/burn.ts` | A queima em canvas: fogo, papel caindo, pó |
| `public/og.png` | A imagem da prévia do link: um envelope fechado, igual para todo link |

## Como se comporta

- **O tom é fixo.** Quem envia não muda a voz. É uma mãe histérica, aos berros, exagerada, feita pelo backend com um modelo de áudio e uma direção fixa, depois limpa e amplificada no aparelho (sem eco). Veja o ADR-002.
- **A voz é feita quando o howler é criado**, então está pronta no instante em que o destinatário toca o selo. Ela viaja com o recado na única abertura, e o servidor a apaga logo depois.
- **O envelope se mexe com a voz.** O tremor é guiado pelo volume real do áudio a cada quadro: bate nas palavras fortes e para nas pausas.
- **Uso único.** Abrir é um `POST` que queima o howler no servidor e revela o recado só ao primeiro que chegar. Uma segunda tentativa, de qualquer aparelho, diz "já foi entregue".
- **Nada se perde.** Se o servidor não conseguiu fazer a voz, o howler ainda fala com a voz comum do navegador.
- **Os erros são explicados.** Sem conexão, devagar (limite de pedidos, com o tempo de espera), entrada inválida, falha do servidor, queimado, expirado, desconhecido: cada um tem suas palavras e, quando ajuda, uma nova tentativa. Se a abertura falha antes de qualquer coisa chegar, o envelope continua fechado para tentar de novo.
- **Prévia do link.** A prévia de um link de howler é sempre o mesmo envelope fechado. O token fica depois do `#` da URL, que os navegadores nunca enviam a um servidor, então um app de chat ou robô não enxerga o recado, o nome nem o token. Defina `VITE_SITE_URL` na hora do build para as tags da prévia terem URLs absolutas.
- **Movimento reduzido.** Com `prefers-reduced-motion` não há tremor nem fogo: as palavras ainda acendem e o envelope some para a tela final.
- **A queima é silenciosa** de propósito: só o ronco e o papel rasgando têm som.

## Lacunas conhecidas

- Acessibilidade, contraste e 60 fps em celulares são o assunto do CP9.
- O botão de denúncia envia só o motivo "abuse". Um seletor de motivo pode vir depois.
