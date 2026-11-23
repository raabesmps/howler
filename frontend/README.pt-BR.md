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

No Windows, rode os testes de um caminho que começa com a letra do drive em maiúscula (`C:/...`): com `c:` minúsculo o Vitest carrega duas cópias de si mesmo e falha com "Cannot read properties of undefined (reading 'config')".

Celular e https: os navegadores só liberam o armazenamento usado pelo modelo de voz, o compartilhar e o copiar em `https://` ou `localhost`. Por `http://<ip>:5173` simples, a voz cai para a voz simples do navegador. Veja as limitações abaixo.

## O que fica onde

| Caminho | O que é |
|---------|---------|
| `src/views/` | As telas: escrever, compartilhar, destinatário (a jornada inteira), não encontrado |
| `src/components/` | Envelope, selo, o envelope que fala, a cena da queima, telas finais |
| `src/audio/engine.ts` | O tratamento da voz (fixo do produto) e os efeitos sonoros |
| `src/audio/voice.ts` | Substituto de texto para fala (Piper no navegador) |
| `src/burn/burn.ts` | A queima em canvas: fogo, papel caindo, pó |
| `src/api/` | O contrato da API (`types.ts`) e a implementação no navegador (`mock.ts`) |
| `src/lib/` | Funções de texto (idioma, divisão, tempo das palavras) e tremor |

## Como se comporta

- **O tom é fixo.** Quem envia não muda a voz. O recado é falado em pedaços, cada um mais alto, mais rápido e mais agudo que o anterior, por saturação, compressor pesado e um salão enorme.
- **O envelope se mexe com a voz.** O tremor é guiado pelo volume real do áudio a cada quadro, então ele bate nas palavras fortes e fica parado nas pausas.
- **Uso único.** Abrir queima o howler primeiro e revela o recado depois. O mock guarda isso por navegador; o endpoint atômico de verdade chega no CP7.
- **Nada se perde.** Se a voz não puder ser preparada, o howler ainda fala com a voz simples do navegador.
- **Movimento reduzido.** Com `prefers-reduced-motion` não há tremor nem fogo: as palavras ainda acendem e o envelope some em fade para a tela final.
- **Ajustar o tom juntas.** Acrescente `?voice=cori` (ou `alba`, `southern`, `jenny`) depois do link, por exemplo `#/h/<token>?voice=cori`, para ouvir outra voz britânica.

## Limitações do protótipo (de propósito, resolvidas depois)

- O token carrega o recado, então um link feito num aparelho abre em outro sem servidor. Quem tiver o link pode ler o recado pela URL, e o mesmo link pode ser aberto uma vez por aparelho. O produto de verdade usa um id aleatório e uma abertura atômica no servidor (CP7).
- A voz é um substituto: modelos Piper rodando no navegador, uma leitura calma que o tratamento deixa furiosa. A primeira visita baixa uns 60 MB de CDNs de terceiros. A voz final vem de um serviço de TTS no servidor (ADR-002, CP8).
- A voz é criada na hora que o envelope é aberto, então o ronco pode durar vários segundos. Com servidor o áudio já está pronto.
- As meta tags de prévia do link e o botão de denúncia ainda não estão ligados (CP8, CP7).
