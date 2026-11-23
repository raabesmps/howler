# ADR-002: Abordagem de voz

[English](../../decisions/ADR-002-voice-approach.md) · [Português](ADR-002-voice-approach.md)

Status: aceito (2026-11-22)
Data: 2026-11-22

## Contexto

O primeiro protótipo usava o `speechSynthesis` do navegador. Esse áudio não dá para processar e soa como voz de GPS com pitch alto. O howler precisa de uma voz que berre de verdade.

A direção da dona do produto: **ninguém escolhe o tom**. Quem envia só escreve o recado; o tom é fixo, do produto. O alvo é o berrador de uma mãe furiosa, e combinamos que não dá para ser cópia de ninguém: a nossa versão é uma **mãe histérica, aos berros, exagerada**. É um tom de personagem, não a imitação de uma pessoa real, e nenhum nome da franquia aparece no produto, no código nem nos documentos.

Três abordagens foram testadas: A) a voz do navegador, B) a voz gravada do remetente, C) uma voz gerada no servidor por um modelo. A C ganhou com folga (tom fixo, sem atrito para o remetente, nenhuma voz de pessoa real guardada, fácil de moderar como texto).

Depois o tom foi ajustado de ouvido em várias rodadas de takes, com estes achados:
- Uma leitura simples, mesmo alta, não é um berro. O que importa é a **direção** dada ao modelo e **como a frase é escrita**.
- Eco e reverb foram rejeitados: o som que se quer é um grito seco, de perto, alto. Esticar vogais na escrita também foi rejeitado.
- Processamento pesado de volume causou chiado, aspereza e "bombeamento" que machucavam o ouvido. Um tratamento **limpo** resolveu.
- O endpoint de fala `gpt-4o-mini-tts` com a voz Coral era bom, mas **está descontinuado e desliga em 06/01/2027** (guia de texto para fala da OpenAI). Não pode ser a base do produto.
- O modelo mais novo `gpt-audio`, que atua a frase em vez de só ler, com a voz Coral, **foi escolhido de ouvido** como o melhor berro. O `gpt-audio-1.5` leu a direção em voz alta e acrescentou falas que não estavam na frase, então não serve como está. Foi preciso enquadrar a tarefa como uma atriz de teatro num esquete de comédia: descrever a personagem como alguém "perdendo o controle, quase chorando" fez os modelos novos recusarem.

## Decisão

1. **Modelo e voz:** `gpt-audio` (fixado no snapshot datado `gpt-audio-2025-08-28`, para o tom não mudar sozinho), voz **Coral**, chamado pelo endpoint de chat completions com saída de áudio. A direção e o enquadramento de esquete de comédia ficam fixos em `frontend/server/voice.ts`.
2. **Tratamento no aparelho (chamado "V2"):** um portão de ruído que tira o chiado entre as palavras, um pouco de compressão, o agudo áspero atenuado e um volume medido de cerca de -14 dB em média com picos abaixo de -1 dBFS. **Sem eco, sem saturação, sem realce extra de agudos.** Implementado em `frontend/src/audio/engine.ts` e `dsp.ts`.
3. **A chave fica no servidor.** No protótipo, um pequeno endpoint dentro do servidor de desenvolvimento do Vite (`POST /api/voice`) lê `OPENAI_API_KEY` do `.env.local` (ignorado pelo git) e devolve o áudio. No produto isso vira o backend (CP8), onde o áudio é gerado quando o howler é criado, guardado até ser aberto e depois apagado (ADR-003).
4. **Travas no endpoint:** o texto precisa ter de 1 a 140 caracteres; no máximo 6 pedidos por minuto por cliente (o custo é por uso); a transcrição devolvida pelo modelo precisa bater, palavra por palavra, com o texto do remetente (isso rejeita direção lida em voz alta, recusa, fala extra e um modelo que obedeceu a instruções escondidas no texto do remetente), com uma nova tentativa.
5. **Plano B:** se a voz não puder ser gerada (offline, recusa, erro do provedor), o howler continua funcionando com a voz simples do navegador, para um recado nunca se perder depois de aberto.
6. **B (gravar a voz de uma pessoa) fica fora do MVP.** Traz o maior risco de privacidade e abuso pelo menor ganho.

## Alternativas consideradas

- **`gpt-4o-mini-tts` (endpoint de fala):** funcionava bem, rejeitado porque desliga em 06/01/2027.
- **`gpt-audio-1.5`:** rejeitado por enquanto, lê direções em voz alta e acrescenta fala. Vale retestar depois.
- **`gpt-realtime-2.1-mini` (o substituto que a OpenAI recomenda):** não testado. Usa a Realtime API (outro fluxo), então é candidato se o `gpt-audio` sair do ar.
- **ElevenLabs** (aceita marcações como `[shouting]`) e **Azure** (estilos de grito em algumas vozes): não foram necessários até agora; são o plano B se o tom da OpenAI não puder ser mantido.
- **Modelos Piper no navegador:** usados no primeiro protótipo como substituto e removidos: leem com calma e não conseguem berrar.

## Consequências

- **Custo:** um howler medido usou cerca de 300 tokens de entrada e 220 de saída. Com o preço de saída de áudio listado por agregadores (cerca de US$ 64 por milhão de tokens, **a confirmar na página de preços da OpenAI**) dá algo como 1,5 centavo de dólar por howler, o dobro nas raras novas tentativas. O limite de pedidos também protege esse custo.
- **Latência:** uns 3 segundos para gerar. O protótipo gera quando o envelope é aberto (o ronco cobre a espera); o produto gera na criação, então o áudio já está pronto.
- **Risco:** o tom pertence a um snapshot do modelo. Se a OpenAI aposentar o `gpt-audio-2025-08-28`, o tom precisa ser reconferido de ouvido antes de trocar.
- **Moderação:** mensagens abusivas não são moderadas no MVP; o modelo pode recusar algumas, e a voz de plano B cobre isso. O botão de denúncia e o limite de pedidos são as defesas do MVP (CP7).
- O CP6 precisa de `audio_path` e de uma regra de retenção (ADR-003). O CP8 precisa da chave só no servidor e de um limite por IP.
