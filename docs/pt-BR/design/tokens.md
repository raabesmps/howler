# Direção de design e tokens

[English](../../design/tokens.md) · [Português](tokens.md)

## Direção

**Ideia: papel chamuscado.** Uma carta prestes a queimar. O produto inteiro é um objeto (um envelope) e um momento (ele queima), então a interface fica quieta e escura até esse momento, e o fogo é a única cor alta.

- **Tom:** seco, um pouco teatral, nunca fofo. Frases curtas. O produto fala como rubrica de teatro ("Toque para abrir."), não como app ("Vamos começar!").
- **Sem cara de filme:** nada de vermelho e dourado, brasão, letra gótica ou pergaminho clichê. O envelope é de **papel kraft** simples com uma **rachadura de selo brilhando**, a interface é **carvão**, o destaque é **laranja brasa**.
- **Sem cara de IA genérica:** sem gradiente roxo, sem glassmorphism, sem emoji na interface, sem tudo arredondado. Superfícies chapadas, sombras duras, uma serifa com personalidade, bastante espaço vazio.
- **Mobile primeiro:** uma coluna, ações ao alcance do polegar embaixo, área de toque mínima de 48px.

## Cor

| Token | Valor | Uso |
|-------|-------|-----|
| `--char-950` | `#100E0C` | fundo da página |
| `--char-900` | `#1A1714` | cartões, campos |
| `--char-700` | `#2E2924` | bordas, divisores |
| `--ash-400` | `#8C8378` | texto secundário |
| `--paper-100` | `#F3EAD8` | texto principal, papel do recado |
| `--kraft-500` | `#C8A46A` | corpo do envelope |
| `--kraft-700` | `#9C7B47` | aba e lado de sombra do envelope |
| `--ember-500` | `#FF5B1F` | ação principal, fogo, brilho do selo |
| `--flare-400` | `#FFC247` | brilho do fogo, anel de foco |
| `--ink-900` | `#1B1612` | texto sobre papel e sobre botão brasa |

Contraste medido (WCAG AA exige 4,5:1 para texto): `--paper-100` sobre `--char-950` 16,1:1; `--ash-400` sobre `--char-950` 5,2:1 (4,8:1 sobre `--char-900`); `--ink-900` sobre `--ember-500` 5,8:1; `--ember-500` sobre `--char-950` 6,2:1; `--ink-900` sobre `--paper-100` 15,0:1. Todos passam AA. Reverificar com ferramenta no CP9.

Cores de erro e estado reaproveitam a paleta de propósito: **expirado** usa `--ash-400`, **queimado** usa texto `--ember-500` sobre carvão. Não há vermelho nem verde separados.

## Tipografia

- **Display e recado:** [Fraunces](https://fonts.google.com/specimen/Fraunces) (serifa variável). Usada no título, no recado gritado e no papel.
- **Interface:** [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans). Usada em rótulos, botões e textos de apoio.
- As duas serão hospedadas localmente no CP3 (sem requisição a terceiros em runtime, melhor para privacidade e velocidade).

| Token | Tamanho / entrelinha | Fonte, peso |
|-------|----------------------|-------------|
| `--text-display` | 40 / 1,05 | Fraunces 700 |
| `--text-message` | 28 / 1,25 | Fraunces 600 (animado, palavra por palavra) |
| `--text-title` | 22 / 1,2 | Fraunces 600 |
| `--text-body` | 17 / 1,5 | Instrument Sans 400 |
| `--text-label` | 13 / 1,3, caixa alta, +0,08em | Instrument Sans 600 |

O corpo mínimo é 16px no celular (também evita o zoom automático do iOS ao focar campos).

## Espaçamento, forma, movimento

- **Escala de espaçamento (px):** 4, 8, 12, 16, 24, 32, 48, 64. Margem lateral da página: 20.
- **Raio:** `--radius-s` 4px (campos, botões), `--radius-m` 8px (cartões). Nada totalmente redondo, exceto o anel do contador de caracteres.
- **Sombra:** dura, deslocada, sem blur: `4px 4px 0 var(--char-700)`; o envelope usa `0 24px 0 -12px rgba(0,0,0,.4)` como sombra de chão.
- **Tokens de movimento:** `--ease-out` `cubic-bezier(.2,.8,.2,1)`, `--dur-fast` 120ms, `--dur-base` 240ms, `--dur-scene` 900ms. A intensidade do tremor e o fogo são roteirizados no CP3, não são tokens.
- **Movimento reduzido:** com `prefers-reduced-motion`, sem tremor, sem flash, sem giro 3D. O papel aparece com fade e a queima vira um fade lento para cinza. O som continua tocando (ele é opt-in pelo toque).

## Voz da interface (textos)

| Momento | Texto |
|---------|-------|
| Título de escrever | "Diga em voz alta." |
| Placeholder | "O que você precisa tirar do peito?" |
| Compartilhar | "Está selado. Envie este link. Ele funciona uma vez." |
| Destinatário, fechado | "Alguém te enviou algo." / "Toque para abrir." |
| Queimado | "Este howler já foi entregue." |
| Expirado | "Este howler expirou antes de ser aberto." |
| Não encontrado | "Nada aqui. Talvez nunca tenha existido." |
| Rodapé | "Projeto de fã. Sem afiliação com Warner Bros. ou J.K. Rowling." |

Obs.: a interface do produto nasce em inglês (como o resto do projeto); a tradução para português da interface é decisão futura.
