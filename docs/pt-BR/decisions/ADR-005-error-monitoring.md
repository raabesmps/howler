# ADR-005: Monitoramento de erros e o que pode sair do servidor

[English](../../decisions/ADR-005-error-monitoring.md) · [Português](ADR-005-error-monitoring.md)

Status: aceito (2026-11-23)
Data: 2026-11-23

## Contexto

O plano pede monitoramento de erros (Sentry). Uma ferramenta de erros é útil, e também é um caminho para dados saírem do produto: por padrão ela coleta a URL do pedido, cabeçalhos, cookies, o corpo do pedido, o endereço do usuário, a trilha de cliques e consultas antes do erro e as props do componente que falhou.

Este produto tem dois segredos, e o segundo é apagado de propósito:
- o **token do link**: quem o tem consegue abrir o howler. Ele está no endereço da página (depois do `#`) e no caminho da API (`/api/howlers/{token}/open`);
- o **recado**: é removido do banco assim que é aberto ou expira (ADR-003). Uma cópia num relatório de erro anularia isso.

## Decisão

O Sentry é usado **só para erros**, e um relatório é reduzido ao que é preciso para achar o bug: a exceção, o stack trace, a rota, o método e a versão (o commit de onde o código veio). Todo o resto é removido antes de o relatório sair.

No servidor (`backend/config/sentry.php`, `App\Support\SentryScrubber`):
- nenhum dado pessoal (`send_default_pii` desligado), o corpo do pedido nunca é coletado, sem variáveis locais;
- os breadcrumbs (logs, cache, SQL, cliente HTTP, filas, notificações) ficam desligados;
- um filtro `before_send` mantém só o método e o caminho do pedido, apaga todo token no caminho, nas mensagens de exceção, no nome da transação e em qualquer outro texto, e remove o usuário, os breadcrumbs e os dados extras;
- resultados esperados não são reportados: erros de validação, link desconhecido, howler já aberto, limites de pedidos e outras exceções HTTP;
- o rastreamento de desempenho fica desligado.

Na página (`frontend/src/monitoring.ts`):
- as integrações padrão são trocadas pelas poucas necessárias para erros; não há breadcrumbs (eles registram cliques, saída do console e navegação), nem props de componentes, nem usuário, cookies, cabeçalhos, corpos ou query strings;
- o endereço do relatório perde o fragmento (onde está o token) e a query;
- o código do Sentry é um pedaço separado, carregado só quando o build tem um DSN.

Os dois ficam **desligados a menos que haja um DSN**: `SENTRY_LARAVEL_DSN` no servidor, `VITE_SENTRY_DSN` na hora do build. Sem DSN nada é enviado e nada é carregado. O DSN da página é público por projeto (ele só consegue enviar eventos), então é uma variável do repositório, não um segredo.

A Content-Security-Policy permite `connect-src https://*.sentry.io` para isso.

## Alternativas consideradas

- **Só arquivos de log, sem Sentry:** nada sai do servidor, mas os erros passam despercebidos até alguém ler o log, e um projeto de uma pessoa só não lê log todo dia. Uma boa alternativa de reserva, e os logs continuam existindo.
- **Sentry com os padrões dele:** mais informação por erro, e colocaria tokens e recados num terceiro. Rejeitado.
- **Rastreamento de erros hospedado por nós:** mantém os dados, mas é mais uma coisa para rodar e atualizar na VM única. Uma mudança possível mais tarde.
- **Sentry Replay ou rastreamento de desempenho:** gravam o que a pessoa viu e fez, que aqui é o próprio segredo. Rejeitados, não apenas deixados desligados.

## Consequências

- Os relatórios são menos detalhados que o padrão do Sentry (sem breadcrumbs, sem dados do pedido). Achar um bug depende da exceção, do stack trace e da versão. É o preço da regra de privacidade e foi aceito.
- O filtro é testado com um evento realista (um token na URL, cabeçalhos, corpo, mensagem da exceção, breadcrumbs e o IP): nada disso pode sobreviver.
- Quando o Sentry for ligado, a dona do produto envia um evento de teste (`php artisan sentry:test` no servidor, e um erro lançado na página) e olha no Sentry para confirmar que nenhum token ou recado aparece. Essa última checagem exige um projeto de verdade e faz parte do runbook.
- Um novo lugar que possa guardar o token ou o recado (uma nova integração, um novo log) precisa passar pelo filtro ou ficar desligado.
