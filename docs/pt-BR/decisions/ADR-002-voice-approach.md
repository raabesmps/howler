# ADR-002: Abordagem de voz

[English](../../decisions/ADR-002-voice-approach.md) · [Português](ADR-002-voice-approach.md)

Status: **proposto** (análise técnica feita; aguardando as notas do celular no laboratório de áudio, veja "Notas")
Data: 2026-11-22

## Contexto

O primeiro protótipo usava o `speechSynthesis` do navegador. Esse áudio não passa pelo Web Audio, então não recebe distorção, reverb, graves nem volume extra, e soa como voz de GPS com pitch alto. O howler precisa de uma voz que possa ser processada até virar um grito de verdade.

Três abordagens foram construídas lado a lado em `lab/audio/index.html` (CP2):

- **A. Voz do navegador** (`speechSynthesis`): só pitch, velocidade e volume.
- **B. Voz gravada do remetente** (`MediaRecorder`), decodificada e passada por uma cadeia de efeitos.
- **C. Arquivo de voz gerado no servidor** por um serviço de TTS neural, passado pela mesma cadeia. No laboratório é simulado com arquivos de exemplo e um campo de upload.

A cadeia de efeitos (compartilhada por B e C) é: pitch, distorção WaveShaper, graves, compressor, reverb por convolução, tremolo, rampa de volume, volume master, limitador. Foi verificada com teste automatizado (Playwright, renderização offline): todo preset altera o sinal, a saída é limitada pelo limitador, e um bug de offset DC na curva de distorção foi encontrado e corrigido.

Restrições do plano: mobile primeiro (iOS Safari e Chrome Android), LGPD (guardar o mínimo, apagar após abrir), prevenção de abuso, recado em qualquer idioma (pelo menos inglês e português do Brasil), e interface em inglês.

## Comparação

| Critério | A. speechSynthesis | B. Voz gravada | C. Arquivo de TTS no servidor |
|----------|--------------------|----------------|-------------------------------|
| Dá para processar até virar grito | Não (sem Web Audio) | Sim | Sim |
| Qualidade da voz | Varia por aparelho, costuma ser robótica | Voz humana real | Consistente, qualidade neural |
| Esforço e atrito do remetente | Nenhum | Permissão de microfone, precisa gravar, exige https | Nenhum |
| Privacidade (LGPD) | Melhor: nada é guardado | Pior: a voz de uma pessoa é dado pessoal, guardada até abrir | Boa: só o texto vai ao provedor, nenhuma voz de pessoa real |
| Abuso e moderação | Só texto, fácil | Áudio de pessoa real (assédio), difícil de moderar | Só texto, fácil de moderar |
| Idiomas | Depende das vozes instaladas no aparelho | Qualquer | Depende do provedor; EN e PT-BR bem cobertos |
| iOS Safari | Precisa de toque; vozes limitadas; sem efeitos | Grava `audio/mp4`; só em https | Toca áudio decodificado após um toque, igual ao B |
| Latência | Nenhuma | Nenhuma (gravado antes de enviar) | Gerado uma vez na criação do howler, não na abertura |
| Custo | Grátis | Armazenamento e banda | Cobrado por caractere; com limite de 140 caracteres cada howler é pequeno, mas conferir preços atuais no CP6 e CP8 |
| Offline ou provedor fora do ar | Funciona | Funciona depois de baixar | Precisa de plano B |
| Trabalho no servidor | Nenhum | Upload, guardar, apagar áudio | Chamar o provedor, guardar o arquivo até abrir, apagar |

## Notas (do laboratório, a preencher)

| Abordagem | Assusta (1-5) | Alto-falante (1-5) | Fone (1-5) | Observações |
|-----------|---------------|--------------------|------------|-------------|
| A | _pendente_ | _pendente_ | _pendente_ | |
| B | _pendente_ | _pendente_ | _pendente_ | |
| C | _pendente_ | _pendente_ | _pendente_ | |

Ressalva: as amostras de C no laboratório foram feitas com vozes offline antigas do Windows e soam chatas. Elas testam a cadeia de efeitos, não a qualidade de uma voz neural. Uma nota justa para C pede um arquivo de TTS neural de verdade enviado pelo campo de upload.

## Decisão proposta (a confirmar com as notas)

1. **C é a abordagem principal**: o texto vai a um provedor de TTS neural quando o howler é criado, o arquivo de áudio fica guardado até ser aberto e depois é apagado. É a única opção com voz processável, sem atrito para o remetente, sem voz de pessoa real guardada e com moderação fácil.
2. **A é o plano B** quando o provedor de TTS falha ou o áudio não toca: o howler continua funcionando, com a voz simples do navegador.
3. **B fica fora do MVP.** Gravar a voz de uma pessoa traz o maior risco de privacidade e abuso pelo menor ganho. Pode voltar depois como recurso opcional explícito.
4. A cadeia de efeitos de `lab/audio/fx.js` é a base do motor de áudio do CP4, com o preset "howler" como ponto de partida.

## Alternativas consideradas

- **Só speechSynthesis com pitch alterado**: rejeitada, não dá para processar (o motivo deste checkpoint existir).
- **Capturar o speechSynthesis por captura de áudio da aba ou do sistema**: impossível numa página normal e exige permissões assustadoras.
- **TTS neural no cliente (modelos WASM)**: possível, mas com downloads grandes (dezenas de MB), lento em celular, e estraga o momento "toca e grita". Rever só se o custo do provedor virar problema.
- **Gerar a voz no momento de abrir**: adiciona latência bem no momento dramático e mantém o texto no servidor sem processar; gerar na criação evita os dois.

## Consequências

- O CP6 (modelo de dados) precisa de `audio_path` e de uma regra de retenção: apagar o arquivo quando o howler for aberto ou expirar (a definir no ADR-003).
- Os CP7/CP8 precisam de uma chave do provedor de TTS guardada só no servidor (`.env`, nunca no repositório) e de um rate limit por IP que também proteja o custo do provedor.
- A escolha do provedor e os preços são conferidos no CP6, não assumidos aqui.
- Se a decisão final mudar depois das notas (por exemplo, C ir mal mesmo com voz neural), este ADR é atualizado antes de o CP4 começar.
