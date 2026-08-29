# SPEC 01 — Cuatro fantasmas clásicos

> **Estado:** Implementado
> **Depende de:** — (ninguna; extiende la base del juego existente)
> **Fecha:** 2026-08-29
> **Objetivo:** Añadir los cuatro fantasmas clásicos de Pac-Man, cada uno con una estrategia de persecución distinta.

## Alcance

**Incluido:**

- Cuatro fantasmas con identidad clásica: Blinky, Pinky, Inky y Clyde.
- Cuatro comportamientos distintos (uno por fantasma), de los cuales Blinky persigue agresivamente a Pac-Man.
- Los cuatro salen del pen por la puerta al empezar la partida.

**Fuera de alcance (para specs futuras):**

- Power pellets y modo "asustado" (fantasmas comestibles).
- Modo scatter/chase alternado (los fantasmas siempre persiguen; Clyde usa su esquina solo cuando está cerca).
- Salida escalonada del pen.
- Dificultad/escalado de velocidad por nivel.

## Modelo de datos

`GHOST_STARTS` (maze.js) pasa de 2 a 4 entradas. Cada fantasma se identifica por `kind`:

```js
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'blinky' }, // orden fijo: blinky SIEMPRE en índice 0
  { x: 12, y: 14, kind: 'pinky' },
  { x: 14, y: 14, kind: 'inky' },
  { x: 15, y: 14, kind: 'clyde' },
];
```

El objeto fantasma de `game.ghosts[i]` (game.js) queda:

```js
{
  kind: 'blinky' | 'pinky' | 'inky' | 'clyde',
  x: number, y: number,   // posición continua en celdas
  dir: 'left' | 'right' | 'up' | 'down',
  speed: 0.1,             // igual para los 4
}
```

Regla de acoplamiento: el orden de `GHOST_STARTS` debe coincidir con el orden de `GHOST_COLORS` en render.js (Blinky rojo, Pinky rosa, Inky cian, Clyde naranja).

## Plan de implementación

1. `maze.js`: reemplazar `GHOST_STARTS` por las 4 entradas anteriores. El juego sigue ejecutándose (aparecen 4 fantasmas; aún se comportan igual hasta el paso 2).
2. `game.js`: añadir `targetOf( game, g )` y reescribir `decideGhost()` para elegir, en cada celda, la dirección permitida que minimice la distancia Manhattan a la celda objetivo. Regla de target por `kind`:
   - `blinky` → celda actual de Pac-Man.
   - `pinky` → 4 celdas por delante de Pac-Man en su dirección.
   - `inky` → `2 × (Pac-Man + 2 por delante) − (celda de Blinky)`.
   - `clyde` → celda de Pac-Man si la distancia > 8 celdas; si no, la esquina inferior-izquierda `(0, filas−1)`.
3. `render.js`: reordenar `GHOST_COLORS` al orden clásico `['#ff0000', '#ffb8ff', '#00ffff', '#ffb852']`.

## Criterios de aceptación

- [ ] Al cargar se ven 4 fantasmas: rojo, rosa, cian y naranja.
- [ ] Los 4 salen del pen por la puerta al empezar.
- [ ] Blinky persigue directamente a Pac-Man.
- [ ] Pinky se dirige a la zona por delante de Pac-Man.
- [ ] Inky cambia su objetivo según la posición de Blinky.
- [ ] Clyde persigue cuando está lejos y se retira a la esquina inferior-izquierda cuando está cerca (< 8 celdas).
- [ ] Una colisión sigue costando una vida y reinicia posiciones (sin regresión).
- [ ] Sin errores en la consola.

## Decisiones

- **Sí:** un único algoritmo "celda objetivo" (greedy Manhattan) compartido por los 4, con una función `targetOf` distinta por fantasma. Menos código que 4 motores separados.
- **No:** pathfinding A*/BFS. Innecesario para este MVP; el greedy con giro de 180 como fallback ya navega el laberinto.
- **Sí:** identidad por `kind` (sin campo `name` separado); `kind` ya nombra al fantasma.
- **Sí:** misma velocidad (0.1) para los 4. La agresividad de Blinky viene del comportamiento, no de la velocidad.
- **No:** modo scatter/chase ni modo asustado. Fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Inky depende de `game.ghosts[0]` (Blinky). Si se reordena `GHOST_STARTS`, Inky se rompe. | Comentario en maze.js fijando que `blinky` va siempre en índice 0. |
| El target de Pinky/Inky puede caer en pared o fuera del laberinto. | El greedy solo compara distancias Manhattan; el target no necesita ser transitable. |
| El greedy puede atascarse en callejones sin salida. | Ya existe el fallback de giro de 180° cuando no hay salida válida. |