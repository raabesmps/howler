# Plano mestre do Howler

[English](../../project/PLAN.md) · [Português](PLAN.md)

Projeto: site onde a pessoa escreve um recado, manda um link, e quem abrir ouve o recado gritado por um envelope que treme, abre, grita e queima. O link só funciona uma vez.

Este arquivo é o plano mestre. O Claude Code lê este arquivo e o `CLAUDE.md` no início de toda sessão. A versão de referência é a em inglês ([PLAN.md](../../project/PLAN.md)); esta é a tradução em português.

---

## O que mudou no plano (2026-11-22)

O plano abaixo é o original. Estas são as decisões tomadas enquanto ele era construído. Elas valem mais que o texto abaixo onde forem diferentes.

1. **O CP2 (laboratório de áudio) foi feito e depois superado.** A ideia era deixar as pessoas compararem vozes. Depois de testar, a dona do produto decidiu que **ninguém escolhe o tom**: o tom é fixo, do produto. O laboratório fica guardado na branch `archive/audio-lab` e nunca foi mergeado (por isso não existe tag `cp2`). O resultado é o [ADR-002](../../decisions/ADR-002-voice-approach.md).
2. **O CP3, o CP4 e o CP5 foram entregues num único pull request do protótipo**, a pedido da dona do produto. As tags `cp3`, `cp4`, `cp5` e `prototype-approved` são criadas juntas depois do merge.
3. **A voz está decidida.** Uma mãe histérica, aos berros, exagerada, feita pelo modelo `gpt-audio` (voz Coral, snapshot datado) no servidor, depois limpa e deixada forte no aparelho, sem eco. Foi escolhida de ouvido em várias rodadas. Gravar a voz de uma pessoa fica fora do MVP. O endpoint antigo `gpt-4o-mini-tts` desliga em 06/01/2027, então não é usado.
4. **O "preview online" do CP5 ainda está pendente.** Precisa de autorização para publicar. Uma hospedagem estática como o GitHub Pages não tem endpoint de voz, então um preview com a voz de verdade precisa de uma pequena função de servidor; sem ela o preview só tem a voz simples do navegador.
5. **CP6 (modelo de dados):** o howler também guarda o áudio (`audio_path`) e o apaga quando for aberto ou expirar (ADR-003).
6. **CP8 (integração):** a voz é gerada **quando o howler é criado**, no servidor, com a chave só no servidor (o endpoint de `frontend/server/voice.ts` vira o backend). Mantém as travas do protótipo: de 1 a 140 caracteres, um limite por IP que também protege o custo, e a conferência da transcrição. Também precisa conferir o provedor e o preço (cerca de 1,5 centavo de dólar por howler medido, a confirmar na página oficial).
7. **A CI entrou cedo** (lint, tipos, testes unitários e build a cada pull request). O CP9 amplia com os testes ponta a ponta e o resto.
8. **Direção de hospedagem decidida (2026-11-23):** uma VM do Google Cloud rodando tudo com Docker Compose, e não o Netlify (que não roda Laravel). Veja o [ADR-004](../../decisions/ADR-004-hosting.md). Tamanho, região, domínio e preços são fixados no CP10, e o preview online do CP5 vira o deploy de staging.
9. **Produção na mesma VM, sem staging online (2026-11-24):** o CP11 roda a produção na VM que o CP10 preparou, no domínio do primeiro deploy; as versões são um workflow manual que exige a aprovação da dona, com um dump do banco antes e um teste de fumaça depois (com rollback se ele falhar). A licença é MIT. Veja a atualização no [ADR-004](../decisions/ADR-004-hosting.md).

---

## 0. Regras de trabalho (valem para todas as fases)

1. **Um checkpoint por vez.** O Claude Code só trabalha no checkpoint atual (ver `docs/project/STATUS.md`).
2. **Parar e esperar aprovação.** Ao terminar um checkpoint: rodar lint e testes, atualizar `docs/project/STATUS.md`, abrir o PR, escrever "Como validar" e **parar**. Só avança depois de uma mensagem "APROVADO CPx".
3. **Um branch por checkpoint:** `cpNN-nome-curto`. PR contra `main`.
4. **Merge sem squash**, pra preservar cada commit do plano. Depois do merge, criar a tag `cpNN`.
5. **Commits pequenos e convencionais:** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`. Um commit por item da lista do checkpoint.
6. **Nada de assets da Warner ou da franquia.** Sem brasão, sem nome de casa, sem "Harry Potter" em nome, domínio ou marca. O visual é original. Aviso no rodapé: "Projeto de fã, sem afiliação com Warner Bros. ou J.K. Rowling."
7. **Decisões viram ADR curto** em `docs/decisions/ADR-NNN-titulo.md` (contexto, decisão, alternativas).
8. **Segredos nunca entram no repo.** Só `.env.example`.
9. **Mobile primeiro.** Toda validação é feita no celular dela.
10. **Documentação em inglês, com uma aba em português** (`docs/pt-BR/`, `README.pt-BR.md`). Código, commits e nomes de repositório em inglês.

## 1. Escopo

**Entra no MVP**
- Escrever recado (até 140 caracteres), nome do destinatário opcional.
- Gerar link de uso único.
- Quem abre vê o envelope fechado. Ao tocar, o envelope abre, grita o recado e queima.
- Depois de queimado, o link mostra "este howler já foi entregue".
- Expiração automática (padrão 7 dias) e apagamento do conteúdo depois de aberto.

**Fica fora do MVP**
- Contas de usuário, pagamento, envio por e-mail ou WhatsApp pelo sistema, moderação por IA.

**Riscos que viram requisitos**
- Abuso (assédio): limite de envios por IP, limite de tamanho, botão "denunciar", o sistema não envia nada sozinho (quem manda o link é o remetente).
- Privacidade (LGPD): guardar o mínimo, apagar conteúdo após abertura ou expiração, sem rastrear o destinatário.
- Áudio no celular: Safari e Chrome mobile só tocam som depois de um toque. O toque no envelope é o desbloqueio.

## 2. Stack proposta (validar no CP0 e registrar em ADR)

- **Frontend:** Vue 3 + Vite + TypeScript. Canvas para fogo e fumaça. Web Audio API.
- **Backend:** Laravel (API) + PostgreSQL. Testes com PHPUnit.
- **Testes:** Vitest (front), PHPUnit (back), Playwright (e2e).
- **CI:** GitHub Actions.
- **Deploy:** Docker. Decidir no CP10 onde hospedar (conferir planos gratuitos atuais antes). Opção de domínio: subdomínio do portfólio.

Estrutura do repositório:

```
howler/
  CLAUDE.md
  README.md
  docs/            plano, STATUS.md, decisions/, design/
  lab/audio/       experimentos de áudio (HTML puro)
  frontend/        Vue (nasce como protótipo e vira o app real)
  backend/         Laravel API
  .github/         workflows, template de PR
```

## 3. Por que o primeiro protótipo ficou fraco (e o que muda)

A voz do primeiro protótipo vem do `speechSynthesis` do navegador. Esse áudio **não passa pelo Web Audio**, então não dá pra aplicar distorção, reverb, graves nem aumento de volume. Por isso soa como uma voz de GPS com pitch alto.

Para o grito ficar de verdade, a voz precisa virar um **arquivo ou buffer de áudio** que passa por uma cadeia de efeitos. Por isso existe o CP2 (laboratório de áudio) antes do protótipo.

O visual também sobe de nível: envelope com abertura 3D, fumaça saindo antes de abrir, tremor que aumenta, papel que se desdobra, tela que balança e pisca, e fogo em Canvas (partículas) no lugar de formas CSS.

---

# FASES E CHECKPOINTS

Cada checkpoint tem: objetivo, tarefas, commits, como validar e o que ela precisa aprovar. Os commits ficam em inglês, como no plano original.

## FASE 0: Fundação

### CP0: Repositório e regras
**Objetivo:** repositório no GitHub desde o primeiro dia, com toda a evolução registrada.

**Tarefas**
- Criar o repositório: `gh repo create raabesmps/howler --public --clone` (público desde o começo, por decisão).
- Proteger a `main` e exigir PR (se o plano do GitHub permitir).
- Criar milestones no GitHub: um por fase. Criar uma issue por checkpoint.
- Escrever `CLAUDE.md` com as regras da seção 0 e os comandos de lint e teste.
- Versionar este plano em `docs/project/PLAN.md` e criar `docs/project/STATUS.md`.
- Template de PR com os campos: "O que mudou", "Como validar", "Checklist de aceite".

**Commits**
1. `chore: initial commit with README and gitignore`
2. `docs: add master plan and status tracker`
3. `docs: add CLAUDE.md with working rules`
4. `chore: add PR template and issue labels`
5. `docs: ADR-001 stack and repository layout`

**Como validar:** repositório visível no GitHub, plano e issues criados, tag `cp0`.
**Aprovar:** stack e estrutura (ADR-001).

---

## FASE 1: Design

### CP1: Direção visual e wireframes
**Objetivo:** identidade original e fluxo de telas aprovados antes de qualquer código de produto.

**Tarefas**
- Definir paleta, tipografia e tom (moderno, funcional, sem cara de IA, sem copiar a identidade do filme).
- Wireframes mobile das 5 telas: escrever, link gerado, envelope fechado (destinatário), berrando, queimado/expirado.
- Registrar tokens de design em `docs/design/tokens.md`.
- Páginas HTML estáticas de referência em `docs/design/`.

**Commits**
1. `docs: add visual direction and design tokens`
2. `docs: add mobile wireframes for the 5 screens`
3. `docs: add static HTML references for key screens`

**Como validar:** abrir as páginas de referência no celular.
**Aprovar:** direção visual e fluxo.

---

## FASE 2: Protótipo (só frontend, sem backend)

### CP2: Laboratório de áudio

*Superado: veja "O que mudou no plano" no topo. Resultado: ADR-002.*

**Objetivo:** descobrir qual voz realmente assusta, comparando 3 abordagens lado a lado em `lab/audio/index.html`.

**Abordagens**
- **A. Base:** `speechSynthesis` com pitch e velocidade (é o que já existe).
- **B. Voz gravada do remetente** (MediaRecorder) passada por efeitos: pitch, distorção (WaveShaper), reverb (Convolver), compressão e volume em rampa.
- **C. Voz de TTS neural gerada no servidor** (arquivo de áudio) passada pelos mesmos efeitos. Apenas simulada com áudio de exemplo neste checkpoint.

**Cadeia de efeitos a testar:** ganho em rampa, WaveShaper, reverb de sala, compressor, filtro de graves, tremor no volume.

**Critérios de comparação:** assusta? soa bem em celular com e sem fone? funciona no Safari iOS? latência? custo? privacidade (guardar voz de pessoa)?

**Commits**
1. `feat(lab): audio lab page with approach A (speechSynthesis)`
2. `feat(lab): approach B with recording and effects chain`
3. `feat(lab): approach C with sample audio and effects chain`
4. `docs: ADR-002 voice approach decision`

**Como validar:** ouvir as três no celular e anotar a nota de cada uma.
**Aprovar:** qual abordagem segue (ADR-002).

### CP3: Protótipo A, envelope e animações (sem som)
**Tarefas**
- Criar `frontend/` com Vue 3 + Vite + TS, tokens do CP1 e estrutura de telas.
- Envelope com abertura 3D, fumaça, tremor crescente, papel se desdobrando.
- Fogo e brasas em Canvas, tela que balança e pisca.
- Respeitar `prefers-reduced-motion`.

**Commits**
1. `chore(frontend): scaffold Vue 3 + Vite + TS with design tokens`
2. `feat(frontend): envelope component with 3D open animation`
3. `feat(frontend): smoke and escalating shake before opening`
4. `feat(frontend): unfolding note with word-by-word reveal`
5. `feat(frontend): canvas fire and embers for the burn`
6. `feat(frontend): screen shake and flash`
7. `feat(frontend): reduced-motion fallback`

**Como validar:** rodar no celular, tocar no envelope, avaliar se parece um objeto vivo.
**Aprovar:** qualidade da animação.

### CP4: Protótipo B, som e voz
**Tarefas**
- Implementar a abordagem escolhida no ADR-002 dentro do `frontend/`.
- Trilha de efeitos: ronco antes de abrir, rasgo ao abrir, grito, crepitar do fogo.
- Desbloqueio de áudio no primeiro toque (iOS e Android).
- Sincronizar o texto palavra por palavra com o áudio.

**Commits**
1. `feat(frontend): audio engine with unlock on first tap`
2. `feat(frontend): voice pipeline per ADR-002`
3. `feat(frontend): sound effects (rumble, tear, fire)`
4. `feat(frontend): word sync with voice`
5. `test(frontend): unit tests for audio engine state`

**Como validar:** celular Android e iPhone (se tiver acesso), com e sem fone.
**Aprovar:** o grito.

### CP5: Protótipo C, fluxo completo e preview online
**Tarefas**
- Fluxo das 5 telas com dados mockados (localStorage e estado em memória).
- Telas de erro: link expirado, já queimado, não encontrado.
- Publicar preview online (Vercel, Netlify ou GitHub Pages) para ela abrir no celular por link.
- Aviso de projeto de fã no rodapé.

**Commits**
1. `feat(frontend): compose screen with validation`
2. `feat(frontend): share screen with copy link`
3. `feat(frontend): recipient flow with mocked API`
4. `feat(frontend): burned, expired and not-found screens`
5. `ci: deploy preview of the prototype`
6. `docs: prototype walkthrough and known gaps`

**Como validar:** abrir o link de preview no celular e percorrer tudo.

> **GATE: PROTÓTIPO APROVADO.** Nada da Fase 3 em diante começa antes da mensagem "APROVADO CP5". Tag `prototype-approved`.

---

## FASE 3: Backend

### CP6: Modelo de dados
**Modelo `Howler`:** `id` (ULID), `token` (único, aleatório, longo), `recipient_name`, `message`, `voice_settings` (json), `audio_path` (se o ADR-002 exigir), `status` (`sealed`, `burned`, `expired`), `expires_at`, `opened_at`, timestamps.

**Commits**
1. `chore(backend): scaffold Laravel API with PostgreSQL via Docker`
2. `feat(backend): howlers migration and model`
3. `feat(backend): factory and seeders`
4. `test(backend): model and status transition tests`
5. `docs: ADR-003 data model and retention policy`

**Como validar:** `php artisan migrate:fresh --seed` e testes verdes.
**Aprovar:** modelo e política de retenção.

### CP7: API com abertura única
**Endpoints**
- `POST /api/howlers`: cria e devolve o token.
- `GET /api/howlers/{token}`: só diz o estado (`sealed`, `burned`, `expired`), **sem revelar o conteúdo**.
- `POST /api/howlers/{token}/open`: devolve o conteúdo **uma única vez**, dentro de transação com `lockForUpdate`, e marca como `burned`. Segunda chamada retorna `410 Gone`.
- `POST /api/howlers/{token}/report`: denúncia.

**Também:** validação, rate limit por IP, comando agendado que apaga conteúdo de howlers abertos ou expirados.

**Commits**
1. `feat(backend): create howler endpoint with validation`
2. `feat(backend): status endpoint without leaking content`
3. `feat(backend): atomic single-use open endpoint`
4. `feat(backend): rate limiting and report endpoint`
5. `feat(backend): scheduled purge of burned and expired howlers`
6. `test(backend): concurrency test for double open`
7. `docs: OpenAPI spec for the API`

**Como validar:** testes e uma chamada manual com `curl` abrindo o mesmo token duas vezes.
**Aprovar:** contrato da API e comportamento de abertura única.

---

## FASE 4: Integração

### CP8: Frontend conectado ao backend
**Tarefas**
- Trocar os mocks por chamadas reais, com cliente de API tipado.
- Tratar erros e estados: carregando, expirado, queimado, rede caiu, limite de envios.
- Se o ADR-002 usa voz gravada ou TTS: upload e download do áudio com apagamento após abrir.
- Compartilhar com Web Share API, com botão de copiar como alternativa.
- Meta tags de prévia do link mostrando só o envelope fechado, sem vazar o recado.

**Commits**
1. `feat(frontend): typed API client`
2. `feat(frontend): replace mocks with real API calls`
3. `feat(frontend): error and rate-limit states`
4. `feat(frontend): audio upload and cleanup flow (if per ADR-002)`
5. `feat(frontend): Web Share API and link preview meta`
6. `docs: local development guide`

**Como validar:** subir front e back localmente, mandar um howler pra si mesma, abrir no celular, tentar abrir o link de novo.
**Aprovar:** fluxo ponta a ponta.

---

## FASE 5: Qualidade

### CP9: Testes, acessibilidade e CI
**Tarefas**
- E2E com Playwright: criar, abrir, queimar, tentar abrir de novo.
- Acessibilidade: foco por teclado, contraste, texto alternativo, alternativa a animação intensa.
- Aviso de volume alto e botão de mudo.
- Desempenho no celular (60 fps nas animações).
- GitHub Actions: lint, testes do back e do front, e2e.

**Commits**
1. `test(e2e): happy path and second-open failure`
2. `feat(frontend): volume warning and mute control`
3. `fix(frontend): accessibility issues from audit`
4. `perf(frontend): canvas particle budget on low-end phones`
5. `ci: lint, unit and e2e workflows`
6. `docs: test strategy and coverage notes`

**Como validar:** CI verde no PR e uma sessão de teste no celular.
**Aprovar:** qualidade geral.

---

## FASE 6: Deploy

### CP10: Staging
**Tarefas**
- Dockerfile de produção e `docker-compose` de apoio.
- Escolher a hospedagem (ADR-004), conferindo preços e limites atuais.
- Ambiente de staging com banco, HTTPS, variáveis de ambiente, CORS e headers de segurança.
- Deploy automático do `main` para staging via GitHub Actions.
- Monitoramento de erros (Sentry) e logs.

**Commits**
1. `chore: production Dockerfile and compose`
2. `docs: ADR-004 hosting decision`
3. `ci: deploy workflow to staging`
4. `chore(backend): production config, CORS and security headers`
5. `feat: error monitoring with Sentry`
6. `docs: deploy and rollback runbook`

**Como validar:** URL de staging funcionando no celular, deploy refeito sem erro, rollback testado.
**Aprovar:** ambiente e runbook.

### CP11: Produção e lançamento
**Tarefas**
- Domínio, HTTPS e DNS.
- Deploy manual com aprovação (`workflow_dispatch`) para produção.
- Smoke test pós-deploy: criar, abrir, queimar, expirar.
- README com GIF e aviso de projeto de fã, licença.
- Lançamento: artigo no Medium (como foi feito) e post no LinkedIn no tom de série ("Episódio N: ...").

**Commits**
1. `ci: production deploy workflow with manual approval`
2. `chore: production domain and HTTPS`
3. `test: post-deploy smoke test`
4. `docs: README with demo GIF and fan-project notice`
5. `docs: changelog and v1.0.0 release notes`

**Como validar:** acessar o domínio no celular e rodar o fluxo inteiro em produção.
**Aprovar:** publicar. Tag `v1.0.0`.

---

## 4. Tabela de checkpoints

| CP | Entrega | Gate de aprovação |
|----|---------|-------------------|
| 0 | Repo, plano, regras | Stack (ADR-001) |
| 1 | Direção visual e wireframes | Visual e fluxo |
| 2 | Laboratório de áudio | Voz (ADR-002) |
| 3 | Envelope e animações | Animação |
| 4 | Som e voz | O grito |
| 5 | Fluxo completo e preview | **PROTÓTIPO APROVADO** |
| 6 | Modelo de dados | ADR-003 |
| 7 | API de abertura única | Contrato da API |
| 8 | Integração front e back | Fluxo ponta a ponta |
| 9 | Testes, a11y e CI | Qualidade |
| 10 | Staging | ADR-004 e runbook |
| 11 | Produção e lançamento | Publicar v1.0.0 |
