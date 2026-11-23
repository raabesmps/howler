# Backend do Howler

[English](README.md) · [Português](README.pt-BR.md)

API Laravel 13 com PostgreSQL. Guarda os howlers, abre cada um exatamente uma vez e apaga o que não precisa mais. Planejado no CP6 (modelo de dados) e no CP7 (a API); veja `docs/pt-BR/PLANO.md`.

Tudo roda em contêineres, no mesmo formato do servidor (ADR-004), então você não precisa ter PHP, Composer nem PostgreSQL instalados.

## Como rodar

A partir da raiz do repositório, onde o Docker roda:

```
scripts/dev-up.sh                                              # sobe o PostgreSQL e espera ele ficar pronto
docker compose run --rm backend php artisan migrate:fresh --seed
docker compose run --rm backend php artisan test
docker compose up backend                                      # a API em http://localhost:8000
```

A configuração fica em `backend/.env` (copie o `backend/.env.example`, que o git ignora). As credenciais do banco no exemplo são só para desenvolvimento local.

### No Windows

O Docker roda dentro do WSL (Ubuntu), não no Docker Desktop. No PowerShell ou no Git Bash:

```
wsl -d Ubuntu -u root -- bash /mnt/c/<caminho-do-repositorio>/scripts/dev-up.sh
wsl -d Ubuntu -u root -- bash -c "cd /mnt/c/<caminho-do-repositorio> && docker compose run --rm backend php artisan test"
```

No Git Bash, coloque `MSYS_NO_PATHCONV=1` na frente do comando, senão ele reescreve o caminho `/mnt/c/...`.

O WSL se desliga sozinho um minuto depois que o último terminal fecha, e o banco vai junto. Para mantê-lo rodando, deixe este processo escondido aberto:

```
Start-Process wsl.exe -ArgumentList '-d','Ubuntu','-u','root','--exec','sleep','infinity' -WindowStyle Hidden
```

É preciso iniciá-lo de novo depois de reiniciar o computador.

## Testes

Os testes rodam num PostgreSQL de verdade (o banco `howler_test`, criado na primeira subida do contêiner), e não em SQLite: travas de linha e ULIDs se comportam diferente, e a abertura única do CP7 depende delas.

## O que fica onde

| Caminho | O que é |
|---------|---------|
| `app/Models/Howler.php` | O modelo do howler e seus estados (CP6) |
| `database/migrations/` | As tabelas |
| `database/factories`, `database/seeders` | Dados de teste e de desenvolvimento |
| `tests/` | Testes PHPUnit |
| `../docker-compose.yml`, `../docker/` | PostgreSQL e a imagem PHP usada no desenvolvimento |
