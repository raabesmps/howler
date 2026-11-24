# Estratégia de testes e notas de cobertura

[English](../../guides/TESTING.md) · [Português](TESTING.md)

O que é testado, onde, por quê, e o que de propósito não é testado.

## As camadas

| Camada | Ferramenta | Onde | O que prova | Roda na CI |
|--------|-----------|------|-------------|------------|
| Backend | PHPUnit num PostgreSQL de verdade | `backend/tests` | As regras: estados e suas restrições no banco, os quatro endpoints, limites de pedidos, retenção, a voz (com a OpenAI simulada) e que duas aberturas simultâneas entregam o recado a um só | job `backend` |
| Unidades do frontend | Vitest + jsdom | `frontend/src/**/*.test.ts` | As peças com lógica: o cliente HTTP e seus erros, o texto dos erros, o tempo do texto, funções de áudio, a memória do mudo, as tags da prévia do link, o orçamento de desempenho da queima | job `frontend` |
| Ponta a ponta | Playwright (Chromium, tela de Pixel 7) | `e2e/tests` | Um navegador de verdade contra o frontend, a API e o banco de verdade: a jornada, o uso único, as falhas, os controles de som, a acessibilidade | job `e2e` |

As três camadas respondem a perguntas diferentes. Os testes do backend são a fonte da verdade da promessa de uso único (inclusive um teste real de concorrência com 12 processos separados). Os de ponta a ponta provam que as telas e a API concordam entre si e com o teclado e o leitor de tela de uma pessoa. Os de unidade mantêm a lógica rápida de conferir.

## O que os testes de ponta a ponta cobrem

- **A jornada** (`flow.spec.ts`): escrever, selar, compartilhar, um segundo navegador abre, grita e queima, "já foi entregue".
- **Uso único:** recarregar no mesmo aparelho, outro aparelho, a API direto, seis aberturas simultâneas (exatamente um 200) e que só olhar o link (o que a prévia de um chat faz) não o queima.
- **Falhas:** limite de pedidos (com o tempo de espera e o texto mantido), servidor inalcançável ao selar e ao chegar (com nova tentativa funcionando), conexão perdida ao abrir (o envelope continua fechado e dá para tentar de novo), link desconhecido, denúncia.
- **Teclado e movimento reduzido:** a abertura inteira pelo teclado; com `prefers-reduced-motion` as palavras ainda chegam e termina sem o fogo.
- **Som** (`sound.spec.ts`): o aviso de som alto aparece antes de qualquer coisa tocar; o mudo funciona antes de abrir, é lembrado no próximo howler, silencia também a voz do navegador e continua lá para parar no meio.
- **Acessibilidade** (`a11y.spec.ts`): axe-core (WCAG 2.0 e 2.1, A e AA) em todas as telas, a estrutura da página, zoom permitido, o foco indo para o resultado, alvos de toque de pelo menos 44 px.

A API dos testes de ponta a ponta roda **sem chave da OpenAI**: os howlers não têm voz do servidor e a voz do próprio navegador os lê. Esse é o caminho de reserva, e deixa a suíte gratuita e determinística. A voz do servidor é coberta pelos testes do backend com a OpenAI simulada, e por uma execução manual com a chave de verdade (abaixo). Nenhum teste alcança a OpenAI: qualquer pedido de saída que não seja simulado faz o teste do backend falhar.

## Como rodar

```
# unidades do backend e do frontend: veja docs/pt-BR/guides/DEVELOPMENT.md
scripts/e2e-backend.sh            # onde o Docker roda: a API com a voz desligada, limites altos, o banco howler_test
cd e2e && npm install && npx playwright install chromium
npm test                          # sobe o frontend sozinho; defina E2E_API_TARGET se a API não estiver na :8000
```

Depois, `docker compose up -d --force-recreate backend` devolve a API às configurações normais de desenvolvimento. Na CI a mesma coisa roda no job `e2e`, e o relatório e os traces ficam guardados como artefato quando ele falha.

## Acessibilidade: o que é automático e o que é conferência manual

As checagens automáticas acham mais ou menos um terço dos problemas reais: contraste, nomes, papéis, estrutura. A auditoria achou e corrigiu:

- o contador de caracteres e as palavras ainda não ditas no grito tinham pouco contraste sobre um degradê e sobre o papel (as palavras agora têm pelo menos 4,5:1, o contador tem fundo próprio);
- o texto visível do botão de mudo não batia com o nome acessível (WCAG 2.5.3): o texto visível agora é o nome e nunca muda, o `aria-pressed` carrega o estado;
- quando a queima terminava, o foco do teclado se perdia: agora ele vai para o título do resultado, para o leitor de tela anunciar;
- alvos de toque pequenos: os botões de texto agora têm pelo menos 44 px de altura.

Lista manual para rodar num celular antes de uma versão (não dá para automatizar):

- [ ] Com um leitor de tela (TalkBack ou VoiceOver): escrever e selar; abrir um link; o grito é anunciado como texto; o resultado é anunciado no fim.
- [ ] Com o tamanho de texto do sistema no maior e com zoom de 200 por cento: nada é cortado nem se sobrepõe.
- [ ] Com "reduzir movimento" ligado no sistema: sem tremor e sem fogo.
- [ ] Mudo antes de abrir: nada é ouvido, inclusive o ronco e o papel rasgando.
- [ ] A orientação paisagem continua funcionando.

## Desempenho

A queima é a parte pesada: um passe por pixel, centenas de sprites de chama por segundo e um brilho em tela cheia. Em vez de ajustar para um celular só, ela observa o próprio tempo de quadro e desce por quatro níveis de qualidade (resolução do canvas, com que frequência a frente da queima é recalculada, quantas partículas nascem). Ela só desce, e um prazo em tempo real a encerra num aparelho lento demais para terminar. Celulares que informam poucos núcleos ou pouca memória já começam um nível abaixo. Veja `frontend/src/burn/budget.ts` (com testes unitários).

Medido no Chromium sem interface numa máquina de desenvolvimento, com o navegador freado por um fator de lentidão de CPU para imitar um celular mais fraco (uma aproximação grosseira: renderização por software, não uma GPU de verdade):

| Lentidão da CPU | Antes do orçamento | Com o orçamento |
|-----------------|--------------------|-----------------|
| 1x (esta máquina) | 23 fps | 52 a 54 fps |
| 4x | 3 fps | 5 a 16 fps |
| 6x | 2 fps | 5 a 13 fps |

Os números com freio variam de uma execução para outra porque o orçamento precisa de alguns quadros para descer depois que o freio começa. Uma lentidão de 6x está muito abaixo de qualquer celular vendido hoje; o que os números mostram é a direção. **O teste num celular de verdade continua sendo a validação** ("como validar" do CP9): anote qualquer engasgo durante a queima.

## Notas de cobertura

- Não há percentual de cobertura, de propósito. Os riscos estão no comportamento (uso único, privacidade, retenção, tratamento de falhas), e isso é testado diretamente, não medido em linhas.
- **Não coberto por automação:** como a voz e os efeitos *soam* (julgados de ouvido, ADR-002), como a queima *parece* num celular de verdade, a chamada real à OpenAI (coberta por uma execução manual com chave) e o Web Share (precisa de https e de uma folha de compartilhamento real; a alternativa de copiar é o que os testes alcançam).
- **Lacunas conhecidas:** só o Chromium é testado (Safari e Firefox não); o comportamento da API sob carga não é medido; o orçamento diário de vozes é testado com um limite pequeno, não com 300.
