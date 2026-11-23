# API

[English](../../api/README.md) · [Português](README.md)

O contrato é o [openapi.yaml](../../api/openapi.yaml) (OpenAPI 3.1, em inglês). Cole-o em qualquer visualizador OpenAPI, ou no [editor.swagger.io](https://editor.swagger.io), para navegar.

| Método e caminho | O que faz | Respostas |
|------------------|-----------|-----------|
| `POST /api/howlers` | Cria um howler e devolve o token de uso único | 201, 422, 429 |
| `GET /api/howlers/{token}` | Só o estado: `sealed`, `burned` ou `expired`. Nunca o recado | 200, 404, 429 |
| `POST /api/howlers/{token}/open` | Entrega o recado a quem chegar primeiro e queima | 200, 404, **410**, 429 |
| `POST /api/howlers/{token}/report` | Denuncia abuso (só o motivo, sem recado, sem quem denunciou) | 201, 404, 422, 429 |

## O comportamento de abertura única

1. A linha é lida com `SELECT ... FOR UPDATE` dentro de uma transação.
2. A primeira requisição muda o status para `burned`, apaga o recado e confirma. Só ela recebe o recado.
3. Uma requisição simultânea espera a trava, lê a linha já confirmada, vê `burned` e recebe `410 Gone`.

O `ConcurrentOpenTest` prova isso com 12 processos PHP separados disparando no mesmo instante contra o PostgreSQL: exatamente um recebe o recado. Tirar o `lockForUpdate()` faz esse teste falhar (dois recebem), então o teste de fato protege a trava.

## Testar na mão

```
curl -X POST http://localhost:8000/api/howlers -H 'Content-Type: application/json' -d '{"message":"HOW DARE YOU!","recipient_name":"Ron"}'
curl http://localhost:8000/api/howlers/<token>              # {"status":"sealed","recipient_name":"Ron"}
curl -X POST http://localhost:8000/api/howlers/<token>/open  # 200 com o recado
curl -X POST http://localhost:8000/api/howlers/<token>/open  # 410 {"status":"burned", ...}
```

## Decisões que vale conhecer

- **Abrir é POST, ver o estado é GET.** Apps de chat e robôs expandem links com GET. Se abrir fosse GET, eles queimariam todo howler antes de o destinatário ver.
- **404 contra 410.** Token desconhecido é 404. Um conhecido, queimado ou expirado, é 410 (as marcas de túmulo ficam 30 dias, ADR-003). Depois da limpeza, o link volta a ser 404.
- **Nenhuma identidade é guardada.** Nem nas denúncias, nem nas aberturas. O IP serve só como chave de curta duração do limite de pedidos.
- **Os limites são por IP** e precisam do endereço real do cliente atrás do proxy reverso: defina `TRUSTED_PROXIES` (CP10).
- **A voz é feita quando o howler é criado**, no servidor, com a chave só no servidor (`VoiceGenerator`). A resposta da criação diz se deu certo (`voice`). Ela fica num armazenamento privado e é entregue dentro da única resposta de abertura (`audio`, WAV em base64), depois é apagada. O endpoint de estado nunca a carrega.
- **Uma voz que falha nunca derruba o howler.** Sem chave, erro do provedor, transcrição que não bate com a frase ou o orçamento diário (`HOWLER_VOICE_DAILY_LIMIT`) terminam do mesmo jeito: o howler é criado com `voice: false` e o navegador lê com a voz dele.
