# AGENTS.md

Juego de Pac-Man en vanilla JS/HTML/CSS. Sin build, sin npm, sin tests, sin linter.

## Ejecutar
- Sirve `src/` estático (`python3 -m http.server -d src`) o abre `src/index.html`.
- No hay `package.json` ni dependencias.

## Arquitectura
- Sin ES modules: `<script>` tags en `src/index.html`, orden estricto
  `maze.js` → `game.js` → `render.js` → `main.js`.
- Comunicación solo por globals (`window.*`). Añadir un archivo = añadir su
  `<script>` en index.html en la posición correcta.
- Globals por archivo:
  - `maze.js`: `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
  - `game.js`: `createGame()`, `update()`, `DIRS`
  - `render.js`: `draw(ctx, game, frame)`
  - `main.js`: cablea todo y corre el loop `requestAnimationFrame`.

## Modelo del laberinto
- Celdas: `1`=pared, `2`=dot, `3`=puerta del pen, `0`=vacío.
- `MAZE` es inmutable; `createGame()` la copia a `game.grid`. Render lee
  `game.grid`, nunca `MAZE`.
- Coordenadas `(x, y)` origen arriba-izquierda; `TILE=20` en render.js.

## Convenciones
- Comentarios y strings de UI en español.
- Comillas simples, espacios dentro de paréntesis (`( e )`), indent 2 espacios.

## Flujo spec-driven
- `/spec <descripción>` → escribe `specs/NN-slug.md` (estado `Draft`).
- `/spec-impl NN-slug` → solo si el estado es "Aprobado"/"Approved"; crea rama
  `spec-NN-slug`.
- `specs/` aún no existe. Nunca marques una spec "Approved": lo hace el humano.