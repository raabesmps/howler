# Changelog

[English](CHANGELOG.md) · [Português](CHANGELOG.pt-BR.md)

Todas as mudanças relevantes do Howler. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/). Cada versão também é uma tag e uma [release do GitHub](https://github.com/raabesmps/howler/releases). A história da primeira, com os seus limites conhecidos, está nas [notas da versão v1.0.0](docs/pt-BR/project/releases/v1.0.0.md).

## [Não lançado]

### Alterado
- **Um link mais curto.** O token do link de um howler agora tem 22 caracteres (128 bits, tão forte quanto um UUID) em vez de 43. Os links feitos antes continuam funcionando. Veja a atualização no [ADR-003](docs/pt-BR/decisions/ADR-003-data-model-and-retention.md).

Próximo: refinar o layout.

## [1.0.0] - 2026-11-24

A primeira versão: o produto inteiro, no ar em <https://howler.aquifunciona.dev.br>.

### Adicionado
- **O produto.** Escreva um recado de até 140 caracteres (e um nome opcional) e receba um link de uso único. Quem recebe vê um envelope fechado que ronca, rasga e grita o recado numa voz fixa de mãe histérica, tremendo com o volume do áudio, depois fecha, queima do centro para fora e vira pó. O link funciona uma vez (checkpoints CP0 a CP5, tags `cp0` a `cp5`).
- **A voz.** Feita no servidor quando o howler é criado, com uma versão fixada do `gpt-audio` e a voz Coral; a transcrição precisa bater com o texto palavra por palavra (uma nova tentativa), senão a voz do próprio navegador lê. Entregue junto com a única abertura e apagada logo depois. Limpa e nivelada no aparelho (sem eco, sem chiado). Um controle de mudo antes e durante o grito, lembrado entre visitas ([ADR-002](docs/pt-BR/decisions/ADR-002-voice-approach.md), CP4, CP8, CP9).
- **A API.** `POST /api/howlers`, `GET /api/howlers/{token}` (só o estado), `POST /api/howlers/{token}/open` (uma vez, dentro de uma transação com `SELECT … FOR UPDATE`, `410 Gone` depois) e `POST /api/howlers/{token}/report`. Limites de pedidos por IP e um orçamento diário de vozes do servidor. Contrato OpenAPI 3.1 em [docs/api](docs/api/openapi.yaml) (CP7).
- **Privacidade por construção.** Os tokens são guardados só como hashes SHA-256; abrir ou expirar apaga o recado; restrições `CHECK` do banco proíbem conteúdo num howler queimado ou expirado; uma limpeza de hora em hora remove as marcas de túmulo depois de 30 dias; nenhum IP ou aparelho é guardado ([ADR-003](docs/pt-BR/decisions/ADR-003-data-model-and-retention.md), CP6).
- **Monitoramento de erros** com Sentry, desligado a menos que haja um DSN, com um filtro para que tokens, recados, IPs, cabeçalhos e breadcrumbs nunca saiam ([ADR-005](docs/pt-BR/decisions/ADR-005-error-monitoring.md), CP10).
- **Testes e acessibilidade.** PHPUnit no PostgreSQL (inclusive um teste de concorrência com 12 processos), Vitest, Playwright de ponta a ponta com tela de celular, verificações do axe em todas as telas, caminhos só com teclado e com movimento reduzido, um aviso de som alto (CP9).
- **Desempenho.** A queima em canvas observa o próprio tempo de quadro e desce por quatro níveis de qualidade em celulares lentos (CP9).
- **Entrega.** Imagens de produção (Laravel em PHP-FPM, Caddy com HTTPS automático), Docker Compose, um deploy numa VM do Google Cloud, um workflow de deploy manual que exige aprovação, um dump do banco antes de cada deploy, rollback automático quando a versão nova não fica saudável ou o teste de fumaça falha, um backup diário e um runbook ([ADR-004](docs/pt-BR/decisions/ADR-004-hosting.md), CP10 e CP11).
- **Teste de fumaça pós-deploy** (`deploy/smoke.sh`): a vida inteira de um howler contra o site de verdade, inclusive uma expiração e a limpeza (CP11).
- **Documentação** em inglês com um gêmeo em português de cada documento, um índice, um verificador de links e gêmeos que roda na CI e um README com a arquitetura e as notas de engenharia.
- **Licença:** MIT.

### Alterado
- Os buscadores podem indexar a página inicial (`robots.txt`, sem `noindex`). Um link de howler não pode ser indexado: o token fica depois do `#`, que os robôs nunca pedem (CP11).
- A produção roda na VM que serviu o primeiro deploy, no mesmo domínio. Não há staging online ([ADR-004](docs/pt-BR/decisions/ADR-004-hosting.md), CP11).

### Segurança
- Toda resposta da API leva `nosniff`, `no-referrer`, uma Content-Security-Policy restritiva e política de recurso `same-origin`; a página recebe HSTS, uma Content-Security-Policy e proteções contra frames do Caddy; corpos de pedido acima de 8 KB são recusados na borda; o CORS vem fechado.
- Os segredos vivem só no arquivo de ambiente do servidor e nos secrets do GitHub, nunca no repositório nem numa imagem. O deploy fixa a chave SSH do servidor.

### Limites conhecidos
Veja as [notas da versão](docs/pt-BR/project/releases/v1.0.0.md): a VM de produção é pequena, o Sentry ainda não está ligado, o SSH está aberto para a internet e só o Chromium é testado.

[Não lançado]: https://github.com/raabesmps/howler/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/raabesmps/howler/releases/tag/v1.0.0
