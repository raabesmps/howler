# ADR-006: Analytics só na tela de escrever

[English](../../decisions/ADR-006-analytics.md) · [Português](ADR-006-analytics.md)

Status: aceito (2026-11-28)
Data: 2026-11-28

## Contexto

A dona quer o Google Tag Manager no site, para medir visitas.

Um container do GTM não é um script só: ele roda o que estiver ligado no painel web (Google Analytics, pixels de anúncio, gravação de sessão como Clarity ou Hotjar), e isso pode mudar sem deploy. Este produto tem dois segredos (ADR-003, ADR-005):

1. **O token do link**, que fica no endereço da página na tela de compartilhar (`#/sent/<token>`) e na tela de abrir (`#/h/<token>`). Quem vê o endereço de um howler selado consegue abri-lo.
2. **O recado**, digitado na tela de escrever e mostrado enquanto ele grita.

Uma tag de analytics que registra endereços de página, ou uma gravação de sessão, poderia mandar os dois para terceiros.

## Decisão

- **Nada opcional roda antes do consentimento (LGPD art. 7º, I).** Um aviso de cookies na tela de escrever pergunta antes; o GTM só carrega depois de "Aceitar". "Recusar" tem o mesmo tamanho, lado a lado. Os detalhes dizem quem é a responsável, o que é medido e para quê, quem recebe (o Google, possivelmente fora do Brasil), quais cookies e por quanto tempo, o que fica no aparelho e a base legal. Um link "Cookies" no rodapé reabre o aviso; recusar depois de aceitar apaga os cookies do Analytics e recarrega a página. A escolha fica no armazenamento local com uma versão, então uma mudança no que é coletado pergunta a todos de novo (`frontend/src/consent.ts`, `CookieBanner.vue`, com testes unitários).
- **O GTM é carregado só na tela de escrever.** Ela não tem token. O container nunca é carregado nas telas de compartilhar, abrir, fim ou erro.
- **Sair da tela de escrever depois que o GTM carregou é um carregamento completo da página**, não uma navegação dentro do app. Um script não pode ser descarregado, então uma página nova é a única forma de garantir que nada do container rode onde há um token (`frontend/src/analytics.ts`, com testes unitários).
- **Os campos de recado e de nome são marcados para mascaramento** (`data-clarity-mask`, `data-hj-suppress`), como segunda linha de defesa se uma ferramenta de gravação for ligada um dia. A regra continua: não ligar gravação de sessão.
- **Desligado a menos que o build tenha um id.** O id vem da variável do repositório `PRODUCTION_GTM_ID` no deploy. Desenvolvimento, testes e forks não carregam nada.
- **A Content-Security-Policy libera só os domínios de tag e de Analytics do Google**, e continua bloqueando scripts inline: o container é carregado pelo nosso próprio módulo em vez do snippet inline de costume, e tags "HTML personalizado" do container não rodam.

## Alternativas consideradas

- **GTM em todas as telas, com um endereço sem token enviado ao dataLayer:** só funciona se o painel for configurado para usá-lo e ninguém nunca ligar uma gravação ou um pixel. Frágil demais para um produto cuja promessa é que o recado some.
- **GTM em todas as telas, como foi passado:** recusado, pelos motivos acima.
- **Uma ferramenta de analytics sem cookies e hospedada por nós:** melhor para a privacidade, mas a dona já usa o GTM nos outros sites.

## Consequências

- O Analytics vê as visitas à tela de escrever e o que acontece nela (por exemplo o clique em "Selar"). Não vê compartilhamentos nem aberturas. As aberturas podem ser contadas pelo servidor se um dia for preciso, sem endereço nenhum.
- Enviar um howler custa um carregamento de página a mais (a tela de compartilhar recarrega). É rápido, e só acontece quando o GTM está ligado.
- O Analytics só conta quem aceita, então os números ficam abaixo do tráfego real. É o custo de perguntar antes.
