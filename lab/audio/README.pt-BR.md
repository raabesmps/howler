# Laboratório de áudio

[English](README.md) · [Português](README.pt-BR.md)

Experimento descartável do CP2: compara três jeitos de dar voz ao howler (veja `docs/decisions/ADR-002-voice-approach.md`). HTML e JS puros, sem build, nada é enviado para lugar nenhum. A página está em português porque só uma pessoa usa.

## Como rodar

```
cd lab/audio
python -m http.server 8080
```

- No mesmo computador: http://localhost:8080
- No celular, no mesmo Wi-Fi: `http://<ip-do-computador>:8080`.
- A voz B (gravação) precisa do microfone, e os navegadores só liberam isso em `https://` ou `localhost`. Por http simples a página pula esse passo e explica o motivo. A decisão não depende dele.

## O passo a passo

Uma pergunta por tela, um botão principal, tudo cabe na tela do celular sem rolar.

1. **Início:** idioma do recado, alto-falante ou fone, aviso de volume.
2. **Voz A** (a voz do próprio celular): ouvir e dar nota de 1 a 5.
3. **Voz C** (arquivo de voz de servidor, simulado por uma amostra ou por um arquivo enviado): quatro versões para ouvir (Limpa, Howler, Demônio, Rádio), escolher a melhor e dar nota.
4. **Ajuste fino:** botões de um toque ("mais grave", "mais agressiva", "graves pesados", "mais eco", "mais tensão") que tocam de novo na hora.
5. **Voz B** (a sua própria voz gravada, com a receita que você escolheu).
6. **Fim:** um resumo e o botão "copiar resultado" para colar no chat.

## Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `index.html`, `style.css` | A página (segue `docs/design/tokens.md`) |
| `app.js` | Criação do contexto de áudio (precisa de um toque) e informações do aparelho |
| `fx.js` | O motor de efeitos e as quatro receitas (sem interface) |
| `wizard.js` | O passo a passo, as vozes A, B e C e a exportação do resultado |
| `samples/` | Vozes curtas feitas com vozes offline do Windows (chatas, servem só para testar os efeitos) |

## Como foi verificado

Um teste automatizado de navegador (Playwright, Chromium com microfone falso) percorre o fluxo inteiro: o botão principal fica desabilitado até cada passo ser feito, troca de idioma, voz A, as quatro versões da C, os ajustes de um toque e o desfazer, gravar e tocar a voz B, o resumo e o resultado exportado. Ele também confere que toda tela cabe num celular 390x844 sem rolar. Versões anteriores do teste acharam um offset DC na curva de distorção e um problema de download travado no servidor de desenvolvimento, ambos corrigidos. Dar as notas em celulares de verdade é a parte que só uma pessoa consegue fazer.
