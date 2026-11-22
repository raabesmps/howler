# Laboratório de áudio

[English](README.md) · [Português](README.pt-BR.md)

Experimento descartável do CP2: compara três jeitos de dar voz ao howler (veja `docs/decisions/ADR-002-voice-approach.md`). HTML e JS puros, sem build, nada é enviado para lugar nenhum.

## Como rodar

```
cd lab/audio
python -m http.server 8080
```

- No mesmo computador: http://localhost:8080
- No celular, no mesmo Wi-Fi: `http://<ip-do-computador>:8080` (as abordagens A e C funcionam).
- A abordagem B (gravação) precisa do microfone, e os navegadores só liberam isso em `https://` ou `localhost`. No celular por http simples ela fica desativada com uma explicação. Use um link https para testá-la.

## Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `index.html`, `style.css` | A página |
| `app.js` | Desbloqueio de áudio, informações do aparelho, notas, exportação dos resultados |
| `fx.js` | A cadeia de efeitos de B e C, e os presets |
| `approach-a.js` | A: `speechSynthesis` |
| `approach-b.js` | B: gravação do microfone, decodificada e processada |
| `approach-c.js` | C: arquivo de exemplo ou enviado, processado |
| `samples/` | Vozes curtas feitas com vozes offline do Windows (chatas, servem só para testar os efeitos) |

## Como foi verificado

Um teste automatizado de navegador (Playwright, Chromium com microfone falso) cobriu: desbloqueio do áudio, carregar e tocar uma amostra, gravar e tocar no B, as notas e a exportação, e renderizações offline dos quatro presets para confirmar que cada um altera o sinal e termina limpo. Ele achou e corrigiu um offset DC na curva de distorção. Dar as notas em celulares de verdade é a parte que só uma pessoa consegue fazer.
