# Guia de desenvolvimento

[English](../DEVELOPMENT.md) · [Português](DESENVOLVIMENTO.md)

Como rodar tudo no seu computador: o banco e a API em contêineres, o frontend com o Vite.

## O que você precisa

- **Docker** com Compose. No Windows ele roda dentro do WSL (veja o [backend/README.pt-BR.md](../../backend/README.pt-BR.md)).
- **Node.js** (a versão do `.github/workflows/ci.yml`) para o frontend.
- Uma **chave da OpenAI**, só se quiser a voz de verdade. Sem ela tudo funciona e fala a voz comum do navegador.

## 1. A chave (opcional)

Crie o `.env.local` na raiz do repositório (ele é ignorado pelo git) com uma linha:

```
OPENAI_API_KEY=sua-chave
```

O Docker Compose entrega a chave ao contêiner do PHP. Só o backend a enxerga. Cada howler custa cerca de 1,5 centavo de dólar de áudio (ADR-002). Defina um limite mensal de gasto na conta da OpenAI e mantenha o `HOWLER_VOICE_DAILY_LIMIT` (padrão 300) num número que você aceite pagar.

## 2. Subir o backend

Na raiz do repositório, onde o Docker roda:

```
scripts/dev-up.sh                                       # PostgreSQL, pronto para receber conexões
docker compose run --rm backend php artisan migrate     # cria as tabelas
docker compose up -d backend                            # a API em http://localhost:8000
```

Confira: `curl http://localhost:8000/up` responde 200. O primeiro pedido depois de subir demora alguns segundos (o código está numa pasta montada do Windows); os seguintes são rápidos.

No Windows, pelo Git Bash, ponha antes de cada comando do Docker `MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root -- bash -c "cd /mnt/c/<caminho-do-repo> && ..."`. O WSL desliga quando fica ocioso e leva os contêineres junto: deixe rodando o processo escondido que mantém ele ligado, descrito no README do backend.

## 3. Subir o frontend

```
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173. O servidor de desenvolvimento encaminha `/api` para o backend, então o navegador nunca conversa com mais nada.

Para ver no celular, abra `http://<ip-do-seu-computador>:5173` na mesma rede Wi-Fi. Compartilhar e copiar ficam limitados em http puro (os navegadores só liberam em https ou localhost); o deploy de staging (CP10) é https.

## 4. Testar o fluxo inteiro

1. Escreva um recado no papel e aperte **Seal it**. Leva alguns segundos: o servidor está fazendo o grito.
2. **Share** ou **Copy link**. O link é `http://.../#/h/<token>`.
3. Abra o link (no celular, ou numa janela anônima: outra "pessoa") e toque o selo. Abaixe o volume antes.
4. Ele grita, queima e termina em "já foi entregue".
5. Abra o mesmo link de novo, em qualquer aparelho: continua "já foi entregue". É esse o ponto.

Ou na mão, direto na API:

```
curl -X POST http://localhost:8000/api/howlers -H 'Content-Type: application/json' -d '{"message":"HOW DARE YOU!"}'
curl -X POST http://localhost:8000/api/howlers/<token>/open     # 200, uma vez
curl -X POST http://localhost:8000/api/howlers/<token>/open     # 410
```

## Trabalhar sem Docker

`VITE_API=mock npm run dev` mantém tudo no navegador (o link carrega o recado, o uso único vale por aparelho, sem voz do servidor). Serve só para mexer nas telas.

## Testes e verificações

| O quê | Comando (a partir da raiz do repositório) |
|-------|-------------------------------------------|
| Testes do backend (PostgreSQL de verdade) | `docker compose run --rm backend php artisan test` |
| Estilo de código do backend | `docker compose run --rm backend ./vendor/bin/pint --test` |
| Testes do frontend | `cd frontend && npm test` (no Windows, de um caminho que começa com `C:/`) |
| Lint e tipos do frontend | `cd frontend && npm run lint && npm run typecheck` |

Os testes do backend nunca chamam a OpenAI: qualquer pedido que saia do app sem ser simulado faz o teste falhar, e a chave de verdade é zerada para eles.

## Configuração

| Variável | Onde | O que é |
|----------|------|---------|
| `OPENAI_API_KEY` | `.env.local` (raiz do repositório) | A voz. Só o backend |
| `HOWLER_VOICE_DAILY_LIMIT` | `backend/.env` | No máximo essas vozes do servidor por dia, somando todo mundo (padrão 300) |
| `TRUSTED_PROXIES` | `backend/.env` | Endereços de proxy em quem confiar para o IP do cliente. Vazio local, obrigatório atrás do proxy reverso (CP10) |
| `VITE_API_TARGET` | ambiente do `npm run dev` | Para onde o servidor de desenvolvimento encaminha `/api` (padrão `http://localhost:8000`) |
| `VITE_API` | ambiente do `npm run dev` / `build` | `mock` para a API dentro do navegador |
| `VITE_SITE_URL` | ambiente do `npm run build` | A URL pública, para as tags da prévia do link |

## Quando algo dá errado

- **`/api` responde a página web em vez de JSON, ou 500:** o backend não está rodando ou ainda não ficou pronto. Faça a checagem `curl http://localhost:8000/up`.
- **O howler ficou sem voz do servidor (`"voice": false` na resposta da criação):** sem chave, o limite diário foi atingido, ou o modelo não falou a frase exatamente (ele tenta de novo uma vez). O motivo está em `backend/storage/logs/laravel.log` (nunca o recado nem a chave). O howler continua funcionando com a voz do navegador.
- **A porta 5173 está ocupada:** há outro Vite rodando. O Vite escolhe a próxima porta e mostra qual.
- **Os contêineres somem no Windows:** o WSL ficou ocioso. Inicie o processo que o mantém ligado.
