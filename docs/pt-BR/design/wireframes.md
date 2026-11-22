# Wireframes mobile (5 telas)

[English](../../design/wireframes.md) · [Português](wireframes.md)

Viewport alvo: 390 x 844 (iPhone 14) até 360 x 640 (Android pequeno). Uma coluna, margens de 20px, ação principal fixa embaixo ao alcance do polegar. Versão colorida das telas: [reference.html](../../design/reference.html). Os desenhos ASCII estão na versão em inglês ([wireframes.md](../../design/wireframes.md)); aqui ficam as regras de cada tela.

## Fluxo

Remetente: 1. Escrever → 2. Link gerado → (envia o link por fora do app) → Destinatário: 3. Envelope fechado → (toque) → 4. Berrando → 5. Queimado. Abrir o link de novo, ou depois de 7 dias, leva à tela 5 (variantes queimado, expirado e não encontrado, mesmo layout).

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

- Envelope kraft com a rachadura do selo brilhando em laranja, respirando devagar.
- "Alguém te enviou algo." e "Para: Ana" só se houver nome.
- Botão "Toque para abrir": este toque desbloqueia o áudio. Envelope inteiro e botão são tocáveis.
- Aviso: "Som alto. Abaixe o volume antes." e "Só pode ser aberto uma vez."
- A página **não** chama o endpoint de abrir antes do toque (prévias de link e bots não podem queimar o howler).

## 4. Berrando (destinatário)

- Camada de canvas em tela cheia (fumaça e brasas); o papel se desdobra do envelope; as palavras aparecem em sincronia com a voz, com a palavra atual destacada.
- Sequência: ronco e tremor crescente, aba abre de golpe, fumaça, papel desdobra, voz grita enquanto as palavras aparecem, fogo come o papel pelas bordas, flash, cinzas.
- Tremor e flash são pulados com movimento reduzido.
- O texto é sempre texto real no DOM, anunciado uma vez com `aria-live="polite"`, não palavra por palavra. Botão de mudo no canto, alvo de 48px.

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
