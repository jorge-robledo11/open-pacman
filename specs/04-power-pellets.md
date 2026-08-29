# SPEC 04 — Cuatro Power Pellets estáticos

> **Estado:** Implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-08-29
> **Objetivo:** Añadir cuatro Power Pellets estáticos a las posiciones clásicas del laberinto, integrándolos en el conteo, puntuación, recolección y renderizado existentes.

## Alcance

**Incluido:**

- Cuatro Power Pellets en las posiciones clásicas: `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)`. Todas ocupan una celda que hoy es un dot normal (`2`).
- Reemplazan al dot normal de su celda: el valor de cuadrícula pasa de `2` a `4`.
- Visualmente más grandes que los dots, alineados a la cuadrícula, con el mismo color y sin animación.
- Forman parte del total de coleccionables: se gana solo al consumirlos todos.
- Recoger uno suma 50 puntos.
- Recoger uno actualiza los contadores de salida de fantasmas de SPEC 03 igual que un dot.
- Los ya recogidos se conservan consumidos al perder una vida.
- Harness de verificación `tests/power-pellets.test.js` ejecutable con Node.

**Fuera de alcance (para specs futuras):**

- Modo asustado / fantasmas vulnerables (los Power Pellets no alteran estado, velocidad, apariencia ni colisiones de fantasmas).
- Parpadeo o animación del Power Pellet.
- Persistencia de partida entre sesiones.
- Dificultad o variación por nivel.
- Cambios en `main.js` o en la arquitectura de scripts.

## Modelo de datos

El laberinto gana un cuarto valor de celda en `MAZE`/`game.grid`:

```js
// Valores de celda
0 = vacio transitable · 1 = pared · 2 = dot · 3 = puerta del pen · 4 = power pellet
```

```js
// maze.js — MAZE_STR: 'o' minúscula representa un power pellet (valor 4)
// parseTile( 'o' ) => 4
const MAZE_STR = [
  // ...
  '#o..........##..........o#', // 3
  // ...
  '#...o................o...#', // 23  fila inicio Pacman
  // ...
];
```

Los Power Pellets viven solo en `game.grid` (copia de `MAZE`), como los dots. No se añade ninguna estructura nueva en `game`.

## Plan de implementación

1. `src/js/maze.js`: en `MAZE_STR`, cambiar las celdas `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)` de `.` a `o`, y añadir `if ( ch === 'o' ) return 4;` en `parseTile`. El juego sigue igual salvo el render: aún no se dibuja el 4.
2. `src/js/game.js`: en `createGame()`, contar como coleccionables tanto `2` como `4` para inicializar `dotsRemaining`. En `movePacman()`, al consumir la celda: si vale `4`, sumar `50` a `game.score` (si vale `2`, mantener `+10`); en ambos casos decrementar `dotsRemaining`, incrementar `ghostRelease.dotsSinceReset` y poner `ghostRelease.idleSteps` a 0, igual que hoy.
3. `src/js/render.js`: en `drawDots()`, dibujar con radio `2.5` las celdas `2` y con radio `6` las celdas `4`, mismas `DOT_COLOR` y centro de celda.
4. `tests/power-pellets.test.js`: harness Node autocontenido (como `tests/ghost-release.test.js`, carga `maze.js` y `game.js` con `vm`) que verifica con `assert`:
   - `MAZE` y `game.grid` tienen `4` en las cuatro posiciones y `2` en el resto del mapa original.
   - `dotsRemaining` incluye los cuatro Power Pellets.
   - Recoger un Power Pellet suma 50, decrementa `dotsRemaining`, incrementa `dotsSinceReset` y pone `idleSteps` a 0.
   - Al perder una vida, los Power Pellets recogidos siguen consumidos.
   - Consumir todos los coleccionables (2 y 4) deja `state === 'won'`.
   Se ejecuta con `node tests/power-pellets.test.js`.

## Criterios de aceptación

- [ ] `node tests/power-pellets.test.js` termina sin errores de `assert`.
- [ ] En el navegador se ven cuatro Power Pellets más grandes que los dots, alineados a la cuadrícula y del mismo color.
- [ ] Los Power Pellets aparecen en `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)`.
- [ ] Recoger un Power Pellet suma exactamente 50 puntos.
- [ ] Recoger un Power Pellet decrementa el total de coleccionables y el juego se gana al consumir todos.
- [ ] Recoger un Power Pellet incrementa `dotsSinceReset` y pone `idleSteps` a 0 (integración con SPEC 03).
- [ ] Al perder una vida, los Power Pellets ya recogidos no reaparecen.
- [ ] Comer un dot normal sigue sumando 10 (sin regresión).
- [ ] Sin errores en la consola.

## Decisiones

- **Sí:** posiciones clásicas `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`. Coinciden con el arcade original y, al ser simétricas respecto al eje central, respetan la simetría del laberinto.
- **Sí:** nuevo valor de celda `4` (antes era `2`). Mantiene una única fuente de verdad en `game.grid` y separa el tipo del render; extiende el mismo modelo que `2`.
- **Sí:** `parseTile( 'o' ) => 4` con `o` minúscula en `MAZE_STR`. Símbolo legible, distinto del `.` de dot.
- **Sí:** 50 puntos sin efecto sobre los fantasmas. Los Power Pellets puntúan pero no alteran el comportamiento; el modo asustado requiere su propia spec.
- **Sí:** se cuentan (2 y 4) para `dotsRemaining` y para `dotsSinceReset`/`idleSteps` de SPEC 03. Los Power Pellets son coleccionables plenos, coherentes con el resto del juego.
- **Sí:** radio `6` estático, sin parpadeo. Simple y suficiente para distinguirlos a simple vista; la animación se deja fuera.
- **Sí:** los recogidos se conservan al perder una vida. Igual que los dots; reaparecen solo en partida nueva.
- **Sí:** harness Node con `vm` en `tests/power-pellets.test.js`. Prueba el código real sin dependencias, siguiendo `tests/ghost-release.test.js`.
- **No:** modo asustado / fantasmas vulnerables. Ampliaría el alcance (estados, temporización, velocidad, colisiones); va en otra spec.
- **No:** parpadeo animado. Solo visual y prescindible; se deja para el futuro.
- **No:** persistencia entre sesiones. Ajeno a esta feature.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un Power Pellet no consumido haría imposible ganar (al participar en `dotsRemaining`). | El harness consume los cuatro Power Pellets y verifica `state === 'won'`. |
| Regresión del conteo si el consumo de `2` y `4` se desincroniza. | El harness cubre ambos valores en un mismo flujo de consumo. |
| Los contadores de SPEC 03 (dots/tiempo) podrían romperse si el Power Pellet no los actualiza. | La integración se verifica explícitamente con `dotsSinceReset` e `idleSteps`. |
| El render duplica el tamaño solo por coincidencia de valor; si cambia `parseTile`, el tamaño no sigue. | El render lee el mismo valor `4` que produce `parseTile`, con fuente única en `game.grid`. |

## What is **not** in this spec

- Modo asustado / fantasmas vulnerables (otra spec si llega).
- Parpadeo o animación de los Power Pellets.
- Persistencia de partida entre sesiones.

Cada uno de esos, si llega, va en su propia spec.