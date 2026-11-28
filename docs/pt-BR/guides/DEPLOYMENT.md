# Runbook de deploy e rollback

[English](../../guides/DEPLOYMENT.md) · [Português](DEPLOYMENT.md)

Como o Howler é colocado num servidor, atualizado e revertido. O desenho está no [ADR-004](../decisions/ADR-004-hosting.md) (uma VM do Google Cloud rodando Docker Compose) e no [ADR-005](../decisions/ADR-005-error-monitoring.md) (monitoramento de erros e privacidade). Este guia são os passos.

**Quem faz o quê.** O código, as imagens e o script de deploy estão no repositório e são testados. Criar a VM, o DNS, as configurações do GitHub, o Sentry e os alertas de gasto são da dona do produto, porque precisam das contas e do dinheiro dela. Nada no repositório mexe no Google Cloud, e nada é implantado até a dona rodar o workflow de produção e aprová-lo.

## O que roda onde

```
 visitante ──https──▶ Caddy (web) ──/api, /up──▶ Laravel PHP-FPM (app) ──▶ PostgreSQL (db)
                         │                                  ▲
                         └── o site já construído (estático)└── scheduler (limpeza de hora em hora)
```

Os quatro são contêineres do `deploy/docker-compose.prod.yml`, iniciados pelo `deploy/deploy.sh`. Só o Caddy publica portas (80, 443). O banco e o PHP-FPM só são alcançáveis dentro da rede do Docker. As configurações ficam em `/opt/howler/.env` no servidor, nunca no repositório.

## 1. Decidir

| Decisão | Sugestão | Por quê |
|---------|----------|---------|
| Região | `southamerica-east1` (São Paulo) se a maior parte dos visitantes está no Brasil | Latência. Custa um pouco mais que as regiões dos EUA: confira o preço atual |
| Tamanho da VM | A VM que roda hoje é uma e2-micro (1 GB): funciona com o swap de 2 GB que o script de preparo cria, e o PHP-FPM já está dimensionado para ela (8 workers). Antes de um lançamento com tráfego de verdade, passe para 2 vCPU e 2 a 4 GB de RAM (trocar o tipo de máquina: alguns minutos fora do ar) e suba o `pm.max_children` para cerca de 20 | Cabem o Caddy, o PHP-FPM, o PostgreSQL e o scheduler. A voz é feita pela OpenAI, não pela VM |
| Domínio | Um subdomínio, por exemplo `howler.<seu-domínio>` | O Caddy obtém e renova sozinho o certificado https dele |
| Limite da OpenAI | O limite mensal que você já definiu, mais o `HOWLER_VOICE_DAILY_LIMIT` | O custo por howler é cerca de 1,5 centavo de dólar (ADR-002) |

Confira os preços e os limites do nível gratuito do Google Cloud na página oficial antes de escolher: eles não são assumidos aqui.

## 2. Criar e preparar a VM

Crie a VM no console do Google Cloud (ou com o `gcloud`) com estas propriedades:

- Debian 12 ou Ubuntu 24.04 LTS (qualquer versão que tenha os pacotes do próprio Docker; versões muito novas podem não ter).
- Um **IP externo estático** (para o registro de DNS nunca precisar mudar).
- Regras de firewall: permitir TCP 80, TCP e UDP 443 de qualquer lugar, e TCP 22 só do seu próprio endereço, se der.

**Atalho:** o `deploy/server-setup.sh` faz tudo da lista abaixo, menos o firewall e as configurações de SSH: `sudo bash server-setup.sh "<a parte pública da chave de deploy>"` (copie o arquivo para a VM antes; leia-o antes de rodar, ele é curto). Para fazer à mão, como root ou com sudo:

```
# Docker e o plugin Compose (siga docs.docker.com/engine/install para a sua distribuição)
# um usuário que faz o deploy, no grupo docker, com a pasta dele
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy /opt/howler

# o sistema aplica sozinho as correções de segurança
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# impede que os logs dos contêineres encham o disco
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl restart docker

# SSH: só chaves, sem senha, sem login como root (edite /etc/ssh/sshd_config e reinicie o ssh)
#   PasswordAuthentication no
#   PermitRootLogin no
```

Numa máquina de 2 GB, crie um arquivo de swap de 2 GB para um pico não derrubar um contêiner.

Aponte o registro DNS do seu domínio (um **registro A**) para o IP estático da VM.

**Se o DNS está no Cloudflare, deixe o registro em "DNS only" (a nuvem cinza), não "Proxied".** Com o proxy ligado, o endereço do visitante que o Laravel enxerga é o do Cloudflare, então todos os visitantes dividiriam poucos endereços e os limites de pedidos por IP (e a proteção deles à conta da OpenAI) deixariam de funcionar; ele também pode atrapalhar o certificado. Manter o proxy exigiria código extra para confiar no cabeçalho de endereço do Cloudflare: não foi feito.

## 3. As configurações do servidor

Na VM, como o usuário `deploy`, em `/opt/howler`:

```
cp env.production.example .env      # o arquivo está no repositório: deploy/env.production.example
chmod 600 .env
```

(Na primeira vez o arquivo ainda não está no servidor: copie à mão, por exemplo com `scp deploy/env.production.example deploy@<ip>:/opt/howler/.env`.) Preencha:

| Configuração | Valor |
|--------------|-------|
| `APP_URL`, `SITE_ADDRESS` | `https://howler.exemplo.com`, `howler.exemplo.com` |
| `APP_KEY` | `echo "base64:$(openssl rand -base64 32)"` (ou `php artisan key:generate --show` na imagem, quando ela já existir) |
| `DB_PASSWORD` | `openssl rand -base64 32 \| tr -d '/+='` |
| `OPENAI_API_KEY` | a sua chave (só no servidor). Sem ela os howlers ficam sem voz do servidor e o navegador os lê |
| `HOWLER_VOICE_DAILY_LIMIT` | o máximo de vozes do servidor por dia, somando todo mundo |

Para um primeiro teste **sem domínio**, `SITE_ADDRESS=203-0-113-10.sslip.io` (o IP com hifens) também recebe um certificado de verdade.

## 4. Conectar o GitHub

Crie uma chave de deploy só para isso (uma chave que não serve para mais nada):

```
ssh-keygen -t ed25519 -f howler-deploy -C howler-deploy -N ""
# ponha o howler-deploy.pub em /home/deploy/.ssh/authorized_keys na VM
ssh-keyscan -t ed25519 <o endereço da VM>        # a chave do servidor, a ser fixada
```

No repositório, **Settings → Secrets and variables → Actions**:

| Tipo | Nome | Valor |
|------|------|-------|
| Secret | `PRODUCTION_SSH_KEY` | o conteúdo do arquivo privado `howler-deploy` |
| Secret | `PRODUCTION_SSH_KNOWN_HOSTS` | a linha impressa pelo `ssh-keyscan` |
| Variável | `PRODUCTION_SSH_HOST` | o IP ou o domínio da VM |
| Variável | `PRODUCTION_SSH_USER` | `deploy` |
| Variável | `PRODUCTION_DOMAIN` | `howler.exemplo.com` |
| Ambiente | `production` | com você como aprovadora obrigatória e `main` como única branch permitida (abaixo) |
| Variável (opcional) | `SENTRY_FRONTEND_DSN` | o DSN do Sentry da página (seção 7) |
| Variável (opcional) | `PRODUCTION_GTM_ID` | o id do container do Google Tag Manager (`GTM-...`), carregado só na tela de escrever ([ADR-006](../decisions/ADR-006-analytics.md)) |

O workflow ([deploy-production.yml](../../../.github/workflows/deploy-production.yml)) usa o ambiente `production`. Crie-o em **Settings → Environments → New environment → production**, adicione você mesma em **Required reviewers** e, em **Deployment branches**, permita só a `main`. Daí em diante todo deploy espera a sua aprovação e só pode rodar a partir da `main`. Um merge na `main` não faz deploy nenhum.

## 5. Fazer o deploy

**Para lançar uma versão:** Actions → **Deploy production** → **Run workflow** na `main` (deixe a tag vazia). O GitHub pede a aprovação da aprovadora; depois disso o workflow confere que o commit tem a CI verde, constrói as duas imagens, faz um dump do banco na VM, copia o compose e os scripts, loga a VM no registro com um token de vida curta e roda o `deploy.sh` (baixar, migrar, subir, conferir a saúde). Em seguida confere `https://<domínio>/up` de fora e roda o teste de fumaça.

**O teste de fumaça** (`deploy/smoke.sh`) vive a vida inteira de um howler contra o site de verdade: a página, o https e os cabeçalhos dele; criar um howler; olhá-lo (nenhum recado vaza); abri-lo uma vez; a segunda abertura recusada; as portas fechadas (um link desconhecido, um `GET` na abertura, entrada inválida, um corpo grande demais). Depois uma expiração: ele move a expiração de um howler de teste para o passado no banco, confere que o site diz que expirou, roda a limpeza no servidor e confere que o recado sumiu. Se qualquer coisa falhar, o workflow recoloca a versão anterior sozinho e fica vermelho. Dá para rodá-lo à mão também: `deploy/smoke.sh https://<domínio>` (ele cria dois howlers comuns: cerca de 3 centavos de dólar de voz).

Confira você mesma também: abra o site no celular e mande um howler para você.

## 6. Voltar atrás (rollback)

Três jeitos, do menos ao mais manual.

1. **Automático.** Se uma versão nova não ficar saudável em cerca de um minuto, ou se o teste de fumaça falhar, a tag anterior é recolocada sozinha e o workflow falha. Você não faz nada.
2. **No servidor:** `cd /opt/howler && ./rollback.sh`. Ele volta para a versão registrada em `.previous_tag`. As imagens anteriores ainda estão na máquina, então não precisa de login.
3. **Qualquer versão antiga:** Actions → Deploy production → Run workflow, com a **tag** de uma versão que se sabe boa (ele ainda espera a aprovação) (as tags são os 12 primeiros caracteres do hash de um commit, listadas em Packages do repositório). Nada é construído: as imagens já existem.

**As migrações não são desfeitas por um rollback.** Escreva-as para que a versão anterior continue funcionando no esquema novo:
1. a versão A adiciona a coluna ou tabela nova (o código antigo a ignora);
2. a versão B passa a usá-la e deixa de usar a antiga;
3. a versão C remove a antiga.
Se uma migração não consegue seguir isso, diga no pull request dela e planeje o rollback (um dump do banco antes: seção 8).

## 7. Monitoramento, logs, alertas

**Sentry** (opcional, a conta é da dona; leia o ADR-005 antes: tokens e recados nunca podem chegar a ele).
1. Crie dois projetos no Sentry: um para PHP/Laravel e um para Vue.
2. Ponha o DSN do Laravel em `/opt/howler/.env` como `SENTRY_LARAVEL_DSN`, e o DSN do Vue na variável do repositório `SENTRY_FRONTEND_DSN`. Faça o deploy de novo.
3. Envie um evento de teste: no servidor `docker compose -f docker-compose.prod.yml exec app php artisan sentry:test`, e lance um erro na página (console do navegador no site: `setTimeout(() => { throw new Error('sentry test') })`).
4. **Abra os dois eventos no Sentry e confirme que não há token, recado, IP nem cookies.** O filtro é testado, e esta é a checagem com o serviço de verdade.

**Logs.** `cd /opt/howler && docker compose -f docker-compose.prod.yml logs --tail 100 app` (ou `web`, `scheduler`, `db`). Os logs do Laravel vão para o stderr do contêiner. O Docker guarda até 30 MB por contêiner (seção 2).

**Disponibilidade.** No Google Cloud: Monitoring → Uptime checks → crie um para `https://<domínio>/up` a cada minuto, com alerta por e-mail.

**Dinheiro.** Google Cloud: Billing → Budgets & alerts, com um valor mensal e alertas em 50, 90 e 100 por cento. OpenAI: o limite mensal na conta, e o `HOWLER_VOICE_DAILY_LIMIT` como segunda linha.

## 8. Backups

Os dados têm vida curta de propósito (um howler vive 7 dias e é apagado ao ser aberto), então um backup serve para uma migração ruim ou um engano, não para arquivo.

```
crontab -e   # como deploy
17 3 * * *  /opt/howler/backup.sh >> /opt/howler/backups/backup.log 2>&1
```

Ele guarda 7 dumps diários em `/opt/howler/backups`. Para restaurar: `gunzip -c backups/howler-<data>.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U howler howler`.

## 9. Segredos

| Segredo | Onde vive | Para trocar |
|---------|-----------|-------------|
| `OPENAI_API_KEY` | só em `/opt/howler/.env` | Chave nova na OpenAI, edite o `.env`, `docker compose -f docker-compose.prod.yml up -d` |
| `DB_PASSWORD` | `/opt/howler/.env` e o banco | Troque os dois juntos (`ALTER USER`), depois reinicie |
| `APP_KEY` | `/opt/howler/.env` | Pode trocar sem medo: nada é criptografado com ela e os tokens são guardados como hashes SHA-256 (ADR-003) |
| Chave de deploy | secret do GitHub e `authorized_keys` | Par de chaves novo, troque os dois |

Nenhum deles está no repositório, numa imagem ou num log.

## 10. O que foi conferido nos primeiros deploys

O runbook foi escrito antes do primeiro deploy e corrigido por ele. Conferido na VM de verdade: https com certificado Let's Encrypt e o redirecionamento do http; os cabeçalhos de segurança e a Content-Security-Policy, sem erros de console num navegador de verdade; o fluxo inteiro com a voz real; a abertura única; os limites por IP enxergando o endereço real do visitante; a limpeza de hora em hora no scheduler; um dump diário no cron; um redeploy automático, os dois rollbacks (no servidor e reimplantando uma tag antiga pelo workflow) e, localmente com as mesmas imagens, uma versão propositalmente quebrada voltando sozinha. O primeiro deploy achou e corrigiu três coisas: o healthcheck do app (`pgrep -x` do BusyBox), fim de linha CRLF em secrets salvos pelo PowerShell e o `cron` ausente no Ubuntu minimal.

**Continua sendo da dona:** o Sentry, com a checagem de que nenhum token ou recado aparece num evento de verdade (seção 7), e restringir o SSH (porta 22) ao endereço da dona.

## Quando algo dá errado

| O que você vê | Provavelmente | O que fazer |
|---------------|---------------|-------------|
| O workflow é pulado, ou espera e não faz nada | Ele não foi rodado na `main`, ou a aprovadora ainda não aprovou o ambiente `production` | Rode na `main` e aprove |
| `Permission denied (publickey)` | A chave de deploy não está no `authorized_keys`, ou o secret está errado | Confira a seção 4 |
| `Host key verification failed` ou `invalid format` na chave, com secrets que parecem certos | Um secret foi salvo com fim de linha do Windows (CRLF), por exemplo ao ser enviado pelo PowerShell | Salve a partir de um arquivo com `gh secret set NOME < arquivo` no Git Bash, ou cole na página do GitHub. O workflow remove os caracteres a mais, mas confira |
| `Host key verification failed` | `PRODUCTION_SSH_KNOWN_HOSTS` falta ou é de outro host | Rode o `ssh-keyscan` de novo |
| Os limites de pedidos parecem não funcionar, ou todo visitante parece ter o mesmo endereço | O registro DNS está com proxy do Cloudflare | Deixe em "DNS only" (seção 2) |
| O site mostra erro de certificado por um minuto | O Caddy ainda está obtendo o certificado | Espere; confira se o DNS aponta para o IP e se as portas 80 e 443 estão abertas |
| O workflow termina com "the smoke test failed" | Uma verificação do `deploy/smoke.sh` falhou depois do deploy; a versão anterior foi recolocada | Leia a linha que falhou no log, corrija e lance de novo |
| O `deploy.sh` diz que não ficou saudável e volta atrás | A versão nova não inicia | `docker compose -f docker-compose.prod.yml logs --tail 50 app web` |
| `502` em `/api` | O contêiner do app está parado ou reiniciando | `docker compose -f docker-compose.prod.yml ps`, depois os logs dele |
| Os howlers ficam sem voz do servidor | Sem chave, o limite diário foi atingido, ou a OpenAI recusou | A resposta da criação diz `"voice": false`; o motivo está no log do app (nunca o recado) |
| Disco cheio | Imagens antigas ou logs | `docker image prune -a`, confira `/opt/howler/backups` |
