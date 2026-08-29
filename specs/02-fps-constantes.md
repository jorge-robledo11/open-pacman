# SPEC 02 — FPS constantes (60) independientes del monitor

> **Estado:** Implementado
> **Depende de:** — (ninguna; modifica el loop existente)
> **Fecha:** 2026-08-29
> **Objetivo:** Hacer que el juego avance a velocidad constante (60 pasos por segundo) independientemente del refresco del monitor.

## Alcance

**Incluido:**

- Bucle con paso fijo a 60 Hz: `update()` se ejecuta 60 veces por segundo real, sin importar la frecuencia del monitor.
- Render a máxima frecuencia (cada `requestAnimationFrame`); en 144 Hz se ve fluido pero no más rápido.
- Animación de la boca de Pac-Man independiente del framerate (basada en tiempo).

**Fuera de alcance (para specs futuras):**

- Interpolación entre pasos fijos (en >60 Hz puede haber frames duplicados; es aceptable y no se interpola).
- Cap absoluto del render a 60 fps.
- Ajuste/balanceo de las velocidades de juego (los valores actuales en `game.js` se consideran la velocidad correcta).

## Modelo de datos

Sin estructuras de datos nuevas. Cambian solo variables locales del loop:

- Desaparece el contador global `frame`.
- Aparecen `last` (ms), `acc` (acumulador en ms) y `time` (segundos, para animaciones).
- `PACMAN_SPEED` (0.125) y `GHOST_SPEED` (0.1) se reinterpretan como "celdas por paso de 60 Hz" (sin cambiar su valor).

## Plan de implementación

1. `main.js`: reemplazar `let frame = 0` y el bucle `loop()` por un paso fijo con acumulador (`STEP = 1000 / 60` ms). Mientras `acc >= STEP` (con tope de pasos por frame para evitar espiral de muerte en caídas de fps), se ejecuta `update()` y se avanza `time`. `draw( ctx, game, time )` se llama una vez por `requestAnimationFrame`. El juego sigue funcionando a 60 Hz sin cambios.
2. `render.js`: renombrar el parámetro `frame` → `time` en `draw()` y `drawPacman()`, y animar la boca con `Math.sin( time * 18 )` (18 rad/s equivale a la velocidad actual a 60 fps).

## Criterios de aceptación

- [ ] A 60 Hz el juego se comporta exactamente igual que antes (misma velocidad y alineación a la cuadrícula).
- [ ] A 144 Hz, Pac-Man y los fantasmas recorren la misma distancia por segundo que a 60 Hz.
- [ ] La boca de Pac-Man se abre/cierra a la misma velocidad en 60 Hz y 144 Hz.
- [ ] Un frame largo (p. ej. >100 ms de lag) no congela ni dispara un salto brusco: se limita el número de pasos por frame.
- [ ] Sin errores en la consola.

## Decisiones

- **Sí:** paso fijo con acumulador (fixed timestep) en vez de `deltaTime` por frame. Preserva la lógica de alineación a cuadrícula (`PACMAN_SPEED = 1/8` alinea cada 8 pasos) sin tocar `game.js`.
- **No:** `deltaTime` multiplicando la velocidad. Rompería la alineación a celdas y es más invasivo.
- **Sí:** render a máxima frecuencia (no cap a 60 fps); la velocidad constante la garantiza el paso fijo, no el render.
- **Sí:** boca basada en tiempo (`time * 18`), para que toda la animación sea independiente del monitor.
- **No:** interpolación entre pasos. En >60 Hz habrá frames duplicados, aceptable para un arcade sencillo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Espiral de muerte: en un frame muy largo el `while` ejecutaría muchísimos pasos y congelaría. | Tope de pasos por frame (p. ej. 5). |
| Verificación a 144 Hz requiere monitor real. | Se verificará la lógica del acumulador en un harness de Node con timestamps sintéticos (60/144/30 Hz) que debe producir ~60 `update` por segundo simulado. |
| Deriva de tiempo por usar `performance.now()` del navegador. | El acumulador resta `STEP` por paso; la deriva es despreciable para este juego. |