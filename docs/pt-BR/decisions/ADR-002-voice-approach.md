# ADR-002: Abordagem de voz

[English](../../decisions/ADR-002-voice-approach.md) · [Português](ADR-002-voice-approach.md)

Status: aceito (2026-11-22)
Data: 2026-11-22

## Contexto

O primeiro protótipo usava o `speechSynthesis` do navegador. Esse áudio não passa pelo Web Audio, então não recebe distorção, reverb, graves nem volume extra, e soa como voz de GPS com pitch alto. O howler precisa de uma voz que possa ser processada até virar um grito de verdade.

Três abordagens foram testadas num laboratório de áudio (mantido na branch `cp02-audio-lab`): A) a voz do navegador, B) a voz gravada do remetente, C) um arquivo de voz gerado no servidor por um serviço de TTS. B e C passaram pela mesma cadeia de efeitos (pitch, saturação, graves, compressão, reverb, tremolo, rampa de volume, limitador). A cadeia funciona com qualquer áudio decodificado, então ela não decide nada.

A direção da dona do produto depois de testar: **ninguém escolhe o tom**. Quem envia só escreve o recado; o tom é fixo, definido por nós duas, e o alvo é o berrador de uma mãe furiosa: uma bronca enorme, que enche a casa e vai crescendo em raiva. É um tom de personagem, não a imitação de uma pessoa real, e nenhum nome da franquia aparece no produto.

## Comparação

| Critério | A. Voz do navegador | B. Voz gravada | C. Arquivo de TTS no servidor |
|----------|---------------------|----------------|-------------------------------|
| Dá para processar até virar grito | Não (sem Web Audio) | Sim | Sim |
| Tom fixo escolhido pelo produto | Não (depende das vozes do aparelho) | Não (é a voz do próprio remetente) | Sim |
| Esforço do remetente | Nenhum | Permissão de microfone, precisa gravar, exige https | Nenhum |
| Privacidade (LGPD) | Nada é guardado | A voz de uma pessoa é dado pessoal, guardada até abrir | Só o texto vai ao provedor |
| Abuso e moderação | Só texto | Áudio de pessoa real, difícil de moderar | Só texto |
| Idiomas | Depende das vozes instaladas | Qualquer | Depende do provedor; inglês e português do Brasil são bem cobertos |

## Decisão

1. **Produção: C.** O texto vai a um serviço de TTS neural quando o howler é criado, o arquivo de áudio fica guardado até o howler ser aberto e depois é apagado. A voz e a entrega "furiosa" são fixas do produto, e a cadeia de efeitos de `frontend/src/audio/engine.ts` é aplicada no aparelho na hora de tocar. O provedor e a voz concretos são escolhidos no CP8, ouvindo amostras reais juntas.
2. **Protótipo: um substituto dentro do navegador.** Enquanto não existe backend, o protótipo fala com modelos Piper rodando no navegador (WebAssembly, licença MIT) e dá a raiva pelo tratamento do `engine.ts`: o recado é falado em pedaços, cada um mais alto, mais rápido e mais agudo que o anterior, e tudo passa por saturação, compressor pesado e um salão enorme. É claramente um substituto: uma voz Piper lê com calma, a primeira visita baixa um modelo de uns 60 MB, e é preciso um contexto seguro (https) para guardá-lo.
3. **Plano B: A.** Se a voz não puder ser preparada (offline, bloqueada, navegadores sem a API de armazenamento necessária), o howler continua funcionando com a voz simples do navegador, para um recado nunca se perder depois de aberto.
4. **B fica fora do MVP.** Gravar a voz de uma pessoa traz o maior risco de privacidade e abuso pelo menor ganho. Pode voltar depois como recurso opcional explícito.

## Alternativas consideradas

- **Só `speechSynthesis` com pitch alterado**: rejeitada, não dá para processar (o motivo desta decisão existir).
- **Capturar a saída do `speechSynthesis` por captura de áudio da aba ou do sistema**: impossível numa página normal.
- **TTS neural no cliente como resposta final**: possível, mas com downloads grandes e lento em celular; e uma leitura calma não carrega raiva de verdade, o que uma boa voz de servidor consegue. Fica como substituto do protótipo e possível plano B offline.
- **Gerar a voz na hora de abrir**: adiciona latência no momento dramático e mantém o texto no servidor sem processar; gerar na criação evita os dois. (O protótipo só sintetiza na abertura porque não tem servidor.)

## Consequências

- O CP6 (modelo de dados) precisa de `audio_path` e de uma regra de retenção: apagar o arquivo quando o howler for aberto ou expirar (ADR-003).
- Os CP7 e CP8 precisam de uma chave do provedor de TTS guardada só no servidor (`.env`, nunca no repositório) e de um rate limit por IP que também proteja o custo do provedor. A escolha do provedor e os preços são conferidos no CP8, não assumidos aqui.
- O protótipo depende de CDNs de terceiros para o runtime WebAssembly e o modelo de voz, o que é aceitável para uma prévia e some quando a voz de servidor chegar.
