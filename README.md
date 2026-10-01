# Corra, Benício!

Endless runner de navegador, otimizado para celulares em modo retrato e feito sem dependências de runtime.

## Jogar (maneira recomendada)

Com o [Node.js](https://nodejs.org/) instalado, entre na pasta do jogo e execute:

```bash
npm start
```

O terminal exibirá **“Corra, Benício! está pronto”**. Sem fechar o terminal, abra `http://localhost:4173` no navegador. Não é necessário executar `npm install` e o jogo não depende da internet.

Também é possível abrir `index.html` diretamente ou usar `python3 -m http.server 4173`. Se a porta estiver ocupada, use `PORT=8080 npm start` (macOS/Linux) ou `$env:PORT=8080; npm start` (PowerShell).

Deslize para os lados, para cima ou para baixo. No teclado, use as setas ou WASD. Colete peças, complete missões e use ímã, escudo e bônus de velocidade para sobreviver à bagunça de Henrique e Rafaela.

## Recursos

- Três faixas em perspectiva com dificuldade e velocidade progressivas.
- Obstáculos baixos e altos, inimigos especiais e geração procedural.
- Missões infinitas, recorde persistente, vidas e tela de pausa/derrota.
- Controles touch, teclado e mouse, áudio gerado com Web Audio e feedback de partículas.
