# ADR-004: Hospedagem

[English](../../decisions/ADR-004-hosting.md) · [Português](ADR-004-hosting.md)

Status: aceito (2026-11-23). Construído no CP10 (abaixo). A região, o tamanho da VM e o domínio são escolha da dona do produto na hora do deploy e ficam registrados no runbook.
Data: 2026-11-23

## Contexto

A dona do produto planejava subir no Netlify. A stack do ADR-001 é um frontend Vue e uma API Laravel com PostgreSQL, mais uma limpeza agendada dos howlers abertos ou expirados e, a partir do CP8, a geração da voz no servidor (ADR-002).

O Netlify não executa PHP, então o backend em Laravel não pode ficar lá. Uma resposta da comunidade do Netlify diz que o Laravel não é suportado, e o único jeito de contornar é exportar uma cópia estática, o que não serve para uma API com banco ([conversa no Laracasts](https://laracasts.com/discuss/channels/servers/deploying-a-dynamic-laravel-site-to-static-hosting-eg-nownetlify)). O Netlify hospeda bem sites estáticos. As funções dele são só em JavaScript, TypeScript ou Go, com limite de 10 segundos para as síncronas e de 15 minutos para as em segundo plano ([docs](https://docs.netlify.com/build/functions/api)). O Postgres deles, o Netlify DB (feito sobre a Neon), parou de aceitar bancos novos no beta em 13/04/2026 ([Neon](https://neon.com/blog/netlify-db-powered-by-neon)).

## Decisão

**Uma VM do Google Cloud (Compute Engine) roda tudo, com Docker Compose:**
- **Caddy** cuida do https (certificados automáticos), serve o frontend já compilado e repassa `/api` para o Laravel. Uma origem só: sem CORS entre o site e a API.
- **Laravel** (PHP-FPM) com o endpoint de abertura única, a geração da voz e o agendador. `OPENAI_API_KEY` e os outros segredos são variáveis de ambiente no servidor, nunca no repositório.
- **PostgreSQL** num contêiner com volume.
- **Agendador:** o scheduler do Laravel roda a limpeza dos howlers abertos e expirados (ADR-003).
- **Deploy:** um workflow do GitHub Actions monta as imagens e atualiza a VM por SSH. O rollback é a tag da imagem anterior (CP10).

Região, tamanho da VM, domínio (um subdomínio do portfólio é a opção do plano), alertas de orçamento e um dump diário do Postgres são decididos no CP10.

## Por quê

- Laravel e PostgreSQL são a stack escolhida (ADR-001) e precisam de um servidor de verdade; o Netlify não roda isso.
- Uma máquina e uma origem eliminam uma classe inteira de problemas (CORS, cookies entre sites, dois deploys para manter em sincronia).
- O Docker Compose já está no plano (CP10) e é o mesmo que usamos localmente.
- **Os dados são efêmeros por desenho:** o howler expira em 7 dias e é apagado quando aberto. O pior caso de uma VM única (perder dados) custa, no máximo, alguns howlers ainda não abertos, então backup é de baixo risco.

## Como é construído (CP10)

| Peça | O que é |
|------|---------|
| `web` | Caddy. Obtém e renova o certificado https, serve o frontend já construído, manda `/api` e `/up` para o app por FastCGI. Só ele publica portas (80 e 443). Define os cabeçalhos de segurança e a Content-Security-Policy |
| `app` | A API Laravel em PHP-FPM, sem ferramentas de desenvolvimento. As configurações vêm do arquivo `.env` no servidor, então nada secreto está na imagem |
| `scheduler` | A mesma imagem rodando `schedule:work`: a limpeza de hora em hora do ADR-003 |
| `db` | PostgreSQL 17 com um volume. Não é publicado no host |

Decisões dentro disso:

- **Uma origem só, então sem CORS.** O site e a API saem do mesmo endereço. O CORS fica fechado (nenhuma origem de fora é permitida, a menos que `CORS_ALLOWED_ORIGINS` diga).
- **O endereço do cliente vem do FastCGI.** O Caddy entrega ao PHP o endereço real do visitante como endereço da conexão, então os limites por IP funcionam e nenhuma lista de proxies (`TRUSTED_PROXIES`) é necessária. O FPM nunca é publicado, então ninguém consegue se passar pelo Caddy.
- **O FPM tem 20 workers, não 5.** Criar um howler segura um worker enquanto a voz é feita (segundos). Os limites por IP restringem quantos podem estar lentos ao mesmo tempo, e 20 deixa espaço para os pedidos baratos (estado, abrir) continuarem fluindo.
- **As imagens são construídas uma vez e promovidas:** `howler-app` e `howler-web`, com a tag do commit, no registro de contêineres do GitHub. O servidor nunca constrói nada. Staging e produção (CP11) rodam as mesmas imagens.
- **O deploy é um script só** (`deploy/deploy.sh <tag>`): baixa, migra, sobe, confere `/up`. Se a versão nova não ficar saudável em cerca de um minuto, ele recoloca a tag anterior sozinho. O `deploy/rollback.sh` faz o mesmo à mão.
- **Migrações não são desfeitas por um rollback.** Elas precisam ser escritas para que a versão anterior continue funcionando no esquema novo: adicionar primeiro, parar de usar o antigo numa versão seguinte, remover numa terceira.
- **Um dump diário** (`deploy/backup.sh`, guardado 7 dias) serve para uma migração ruim ou um engano, não para arquivo: os dados têm vida curta por projeto.
- **Os valores de cada ambiente** (domínio, região, tamanho da VM, alertas de gasto) são da dona do produto e ficam no runbook, não no código.

O tamanho da imagem ainda não foi otimizado (a imagem do app carrega as ferramentas de build das suas extensões). É candidato para depois, quando as fases terminarem.

## Alternativas consideradas

- **Netlify para o frontend e VM ou Cloud Run para o backend:** funciona, mas acrescenta uma segunda plataforma, CORS e dois deploys por um ganho pequeno (preview de deploy por pull request).
- **Tudo no Netlify, com o backend reescrito em funções TypeScript e Postgres da Neon:** sem servidor para cuidar, mas abandona o Laravel (substitui o ADR-001), fica espremido no limite de 10 segundos e depende de um produto de banco que está mudando.
- **Cloud Run com Postgres gerenciado:** menos manutenção de servidor, desliga sozinho quando ninguém usa, mas precisa de um banco gerenciado e o custo depende dos preços atuais. Possível mudança futura se manter a VM virar um peso.

## Consequências

- **A dona do produto administra o servidor:** atualizações de segurança do sistema (automáticas), um firewall que só abre 80 e 443 mais SSH com chave, e uma checagem de que o serviço está no ar. É um ponto único de falha, o que é aceitável aqui.
- Não há preview automático por pull request. O staging é o mesmo Compose na VM (ou um segundo projeto nela) e o ambiente local.
- O preview online pendente na issue #6 passa a ser o deploy de staging do CP10, com a voz de verdade e o backend de verdade, em vez de uma hospedagem estática.
- Os preços e os limites do nível gratuito da VM são conferidos no CP10, não assumidos aqui.
