# Wireframes mobile (5 telas)

[English](../../design/wireframes.md) · [Português](wireframes.md)

Viewport alvo: 390 x 844 (iPhone 14) até 360 x 640 (Android pequeno). Uma coluna, margens de 20px, ação principal fixa embaixo ao alcance do polegar. Versão colorida das telas: [reference.html](../../design/reference.html). Os desenhos ASCII estão na versão em inglês ([wireframes.md](../../design/wireframes.md)); aqui ficam as regras de cada tela.

## Fluxo

Remetente: 1. Escrever → 2. Link gerado → (envia o link por fora do app) → Destinatário: 3. Envelope fechado → (toque) → 4a. Berrando → 4b. Queimando → 5. Queimado. Abrir o link de novo, ou depois de 7 dias, leva à tela 5 (variantes queimado, expirado e não encontrado, mesmo layout).

## 1. Escrever (remetente)

- Recado obrigatório, de 1 a 140 caracteres, contador ao vivo (fica laranja a partir de 120). Nome opcional, máximo 40.
- Botão "Selar" desabilitado enquanto vazio; erro em texto, nunca só por cor.
- Fonte do campo de 16px ou mais (sem zoom do iOS).
- Avisos: "O link funciona uma vez. Expira em 7 dias."

## 2. Link gerado (remetente)

- Envelope selado pequeno e estático, título "Está selado. Envie este link. Ele funciona uma vez."
- Campo somente leitura com o link (seleciona tudo ao tocar), botão "Compartilhar" (Web Share API) e "Copiar link" como alternativa, que mostra "Copiado".
- O remetente não relê o recado aqui (privacidade). Aviso: "Abrir este link você mesma vai queimá-lo."

## 3. Envelope fechado (destinatário)

- Envelope vermelho tijolo (fechado, puxando pro laranja) com o selo de cera escura e a rachadura brilhando em laranja, respirando devagar.
- "Alguém te enviou algo." e "Para: Ana" só se houver nome.
- Botão "Toque para abrir": este toque desbloqueia o áudio. Envelope inteiro e botão são tocáveis.
- Aviso: "Som alto. Abaixe o volume antes." e "Só pode ser aberto uma vez."
- A página **não** chama o endpoint de abrir antes do toque (prévias de link e bots não podem queimar o howler).

## 4a. Berrando (destinatário)

- **O envelope é quem fala.** Ele não treme num ronco uniforme. Ele se mexe em **rajadas no ritmo da fala**: batidas curtas e secas nas palavras fortes, quase parado nas pausas. O corpo estica e comprime um pouco (mais alto na batida, mais achatado ao soltar), inclina alguns graus pros lados, e a **aba abre e fecha como uma mandíbula** no tempo da voz.
- A carta sobe de dentro do envelope no começo (cerca de 0,6s) e depois acompanha o movimento dele. As palavras aparecem em sincronia com a voz, com a palavra atual destacada.
- **Sem fogo nesta tela.** O fogo é da 4b.
- Com movimento reduzido: sem tremor e sem a aba mexendo; a carta aparece com fade sobre o envelope aberto e parado, e as palavras destacam em sincronia.
- O texto é sempre texto real no DOM, anunciado uma vez com `aria-live="polite"`, não palavra por palavra. Botão de mudo no canto, alvo de 48px.
- Nota para CP3/CP4: o ritmo das rajadas deve vir do volume da voz (`AnalyserNode` do Web Audio) e não de keyframes fixos, para o envelope mexer de verdade com a fala. Os keyframes CSS do `reference.html` são só um substituto.

## 4b. Queimando (destinatário)

- Sequência: a voz termina, o envelope fecha, uma faísca acende na borda de baixo, as chamas sobem por uma frente de queima inclinada (escurecendo o envelope), o envelope é consumido, um monte de cinzas cresce e alguns flocos sobem e somem. Passa para a 5a (este howler já foi entregue).
- Duração alvo: de 5 a 6 segundos, depois a 5a. O loop do `reference.html` é só para revisão.
- Com movimento reduzido: o envelope vira o monte de cinzas num fade lento, sem chamas.

## 5. Queimado / expirado / não encontrado

| Variante | Ilustração | Título |
|----------|------------|--------|
| queimado | cinzas e algumas brasas | Este howler já foi entregue. |
| expirado | envelope cinza fechado | Este howler expirou antes de ser aberto. |
| não encontrado | envelope aberto e vazio | Nada aqui. Talvez nunca tenha existido. |

- Texto de apoio: "Ninguém pode ler de novo. Esse é o ponto."
- Botão principal "Enviar o seu", que leva à tela 1.
- "Não encontrado" é também o que um token errado mostra; nenhuma variante revela mais do que o próprio estado.

## Denúncia

Um link discreto "Denunciar" fica no rodapé das telas 3 e 5 e abre uma confirmação curta. Funciona a partir dos CP7/CP8; no protótipo aparece como link sem ação.
