# ADR-003: Modelo de dados e política de retenção

[English](../../decisions/ADR-003-data-model-and-retention.md) · [Português](ADR-003-data-model-and-retention.md)

Status: aceito (2026-11-23)
Data: 2026-11-23

## Contexto

Um howler é um recado curto (até 140 caracteres) mais o áudio da sua voz, aberto exatamente uma vez e depois sumindo. A privacidade (LGPD) pede guardar o mínimo e apagar o conteúdo depois de aberto ou expirado. O link precisa continuar de uso único mesmo quando duas requisições chegam no mesmo instante (CP7). O áudio da voz é gerado quando o howler é criado e guardado até ser aberto (ADR-002).

## Decisão

### A tabela `howlers`

| Coluna | Tipo | Significado |
|--------|------|-------------|
| `id` | ULID, chave primária | Identificador ordenável e impossível de adivinhar, interno |
| `token_hash` | `char(64)`, único | SHA-256 do token do link. **O token em si nunca é guardado** |
| `recipient_name` | `varchar(40)`, nulo | Nome opcional mostrado no envelope fechado. Não é segredo |
| `message` | `varchar(140)`, nulo | O conteúdo. Apagado quando o howler é queimado ou expira |
| `audio_path` | `varchar(255)`, nulo | O arquivo da voz num disco privado. Apagado junto com o recado |
| `voice_settings` | `jsonb`, nulo | Qual modelo, voz e tratamento fizeram o áudio (para auditar o tom). Sem dado pessoal |
| `status` | `varchar(16)` | `sealed`, `burned` ou `expired` |
| `expires_at` | `timestamptz` | Criação mais 7 dias |
| `opened_at` | `timestamptz`, nulo | Quando foi queimado |
| `created_at`, `updated_at` | `timestamptz` | |

Índice em `(status, expires_at)` para a limpeza.

### As regras também vivem no banco

Quatro restrições `CHECK` tornam impossível sobrar um recado, mesmo que a aplicação tenha um bug:
1. `status` é um dos três valores.
2. Um howler selado tem recado não vazio.
3. Um howler queimado ou expirado **não** tem recado **nem** áudio.
4. `opened_at` está preenchido exatamente quando o status é `burned`.

### Ciclo de vida

`sealed` vai para `burned` (aberto uma vez) ou para `expired` (ninguém abriu antes de `expires_at`). Não existe volta. Um howler selado depois do seu `expires_at` já é tratado como expirado na hora (`effectiveStatus`), mesmo antes de a limpeza marcá-lo.

### O token é guardado como hash (um desvio deliberado do plano)

O plano lista uma coluna `token`. Guardar um token aleatório longo em texto puro entregaria links funcionando a quem conseguir uma cópia do banco. Então o token é gerado (256 bits aleatórios, seguro para URL), mostrado **uma única vez** quando o howler é criado, e só o SHA-256 dele é guardado. Para achar um link, o token recebido é transformado em hash. Um hash rápido basta porque o token é aleatório e longo, não uma senha.

### Retenção

| Momento | O que acontece |
|---------|----------------|
| **Aberto** | Na mesma transação: status `burned`, `opened_at` preenchido, recado e `audio_path` apagados. O arquivo de áudio é apagado depois do commit. O conteúdo é devolvido só àquela requisição |
| **Expirado** | Uma tarefa agendada (de hora em hora, CP7) marca como `expired` os howlers selados passados do `expires_at`, apaga recado e `audio_path` e apaga o arquivo de áudio. Até ela rodar, o howler já se comporta como expirado |
| **Marca de túmulo** | A linha sem conteúdo (id, hash, status, horários) fica **30 dias** depois de aberta ou expirada, para o link continuar dizendo "já foi entregue" ou "expirou". Depois disso a tarefa apaga a linha e o link parece nunca ter existido |
| **Arquivos órfãos** | A mesma tarefa apaga todo arquivo de áudio cujo howler não esteja mais selado |

Nada sobre quem abre o link é guardado: sem IP, sem aparelho. O limite de pedidos usa uma chave de cache de vida curta (CP7). O endpoint de denúncia (CP7) guardará só o necessário.

## Alternativas consideradas

- **Guardar o token em texto puro, como o plano dizia:** mais simples de depurar, rejeitado pelo motivo acima.
- **Apagar a linha quando aberto:** remove até a marca de túmulo, mas aí um link aberto diz "não encontrado" em vez de "já foi entregue", o que piora a experiência e confunde quem recebeu.
- **Soft delete:** mantém o conteúdo por padrão, o oposto do que se quer.
- **Criptografar o recado em repouso** com a chave da aplicação: uma boa camada extra, mas o conteúdo vive no máximo 7 dias e é apagado na hora ao abrir. Também exige uma coluna `text`. Possível reforço depois.
- **IDs auto-incrementais:** adivinháveis e em ordem. O ULID não tem nenhum dos dois problemas e ainda ordena por tempo.

## Consequências

- O CP7 abre um howler dentro de uma transação com `SELECT ... FOR UPDATE`, chama `burn()` e apaga o áudio depois do commit. Uma segunda requisição simultânea espera, encontra o howler já queimado e recebe `410 Gone`. Isso exige PostgreSQL (os testes rodam nele).
- O seeder usa tokens fixos só para desenvolvimento e se recusa a rodar em produção.
- O período da marca de túmulo (30 dias) e a limpeza de hora em hora são configurações que podem mudar sem mexer no esquema.
- O token original não pode ser recuperado: se quem enviou perder o link, não há como mostrá-lo de novo. É intencional.
