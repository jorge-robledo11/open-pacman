# SPEC 03 — Salida escalonada de fantasmas y limpieza del flujo

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-08-29
> **Objetivo:** Liberar a los fantasmas uno a uno con la regla clásica del nivel 1 (contador de dots con respaldo temporal) y limpiar el código del flujo de fantasmas.

## Alcance

**Incluido:**

- Liberación escalonada: Blinky sale al inicio; Pinky espera a que Blinky cruce la puerta del pen; Inky sale a los 30 dots; Clyde a los 60.
- Respaldo temporal: si pasan 4 segundos sin comer dots ni liberar un fantasma, sale el siguiente que esté esperando.
- Reinicio de la secuencia al perder una vida: todos vuelven al pen y los contadores vuelven a cero.
- Limpieza del flujo de fantasmas en `src/js/game.js`: funciones enfocadas, sin duplicación en el reset, sin cambiar las demás reglas del juego.
- Harness de verificación `tests/ghost-release.test.js` ejecutable con Node.

**Fuera de alcance (para specs futuras):**

- Contador global clásico del arcade tras perder una vida (umbrales 7/17/32).
- Variación de tiempos o umbrales por nivel (esta spec fija los valores del nivel 1).
- Power pellets y modo asustado (ya excluidos en SPEC 01).
- Limpieza de `render.js` o `main.js`.
- Reducir globals o cambiar la arquitectura de scripts.

## Modelo de datos

```js
// maze.js — GHOST_STARTS (orden fijo: blinky SIEMPRE en indice 0, ver SPEC 01)
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'blinky', releaseDots: 0 },  // sale al inicio
  { x: 12, y: 14, kind: 'pinky', releaseDots: 0 },   // tras cruzar Blinky
  { x: 14, y: 14, kind: 'inky', releaseDots: 30 },
  { x: 15, y: 14, kind: 'clyde', releaseDots: 60 },
];
```

```js
// game.js — se anade a cada game.ghosts[i]
{
  x, y, dir, speed, kind,
  releaseDots: 0 | 30 | 60,
  releaseState: 'waiting' | 'leaving' | 'active',
}

// game.js — estado compartido de la secuencia
game.ghostRelease = {
  dotsSinceReset: 0, // dots comidos desde el ultimo reinicio de posiciones
  idleSteps: 0,      // pasos sin comer dot ni liberar fantasma
};

// Constante en game.js
const GHOST_TIMEOUT_STEPS = 240; // 4 s a 60 Hz (paso fijo de SPEC 02)
```

Convenciones:

- `waiting`: el fantasma se queda inmóvil en su celda inicial.
- `leaving`: se dirige a `PEN_DOOR` (13, 12); al alcanzarla alineado pasa a `active`.
- `active`: comportamiento de persecución normal (`targetOf` de SPEC 01).
- Solo un fantasma puede estar `leaving` a la vez (exclusividad: se ven salir uno a uno).

## Plan de implementación

1. `src/js/maze.js`: añadir `releaseDots` a cada entrada de `GHOST_STARTS` (0, 0, 30, 60). El juego sigue igual; el campo aún no se usa.
2. `src/js/game.js`: en `createGame()`, inicializar `releaseState: 'waiting'` en cada fantasma y crear `game.ghostRelease` con los contadores a cero. Sin cambios de comportamiento.
3. `src/js/game.js`: extraer un helper `resetGhost( g, start )` que devuelve un fantasma a su posición inicial con `releaseState: 'waiting'`; usarlo en `createGame()` y en `resetPositions()`. `resetPositions()` además reinicia `game.ghostRelease` a ceros (la secuencia se repite desde cero al perder una vida).
4. `src/js/game.js`: en `moveGhost()`, los fantasmas `waiting` no se mueven; los `leaving` se mueven hacia `PEN_DOOR` (ya lo hace `targetOf`) y, al llegar a `PEN_DOOR` alineados, pasan a `active`.
5. `src/js/game.js`: implementar `updateGhostRelease( game )` y llamarlo en `update()`:
   - Si hay un fantasma `waiting` con `releaseDots <= dotsSinceReset` y ningún otro está `leaving`, pasa a `leaving` y `idleSteps` vuelve a 0.
   - Si `idleSteps` llega a `GHOST_TIMEOUT_STEPS` (240), el primer fantasma `waiting` pasa a `leaving` y `idleSteps` se reinicia (respaldo temporal).
   - En `movePacman()`, al comer un dot: `dotsSinceReset++` e `idleSteps = 0`.
6. `tests/ghost-release.test.js`: harness Node autocontenido que usa `vm` para cargar `maze.js` y `game.js` en un contexto con `window`, y verifica con `assert`: orden de salida, umbrales 30/60, timeout de 240 pasos y reinicio tras colisión. Se ejecuta con `node tests/ghost-release.test.js`.

## Criterios de aceptación

- [ ] `node tests/ghost-release.test.js` termina sin errores de `assert`.
- [ ] Al iniciar la partida solo Blinky sale del pen; Pinky, Inky y Clyde permanecen dentro.
- [ ] Pinky empieza a salir solo después de que Blinky alcanza `PEN_DOOR` (13, 12).
- [ ] Con `dotsSinceReset >= 30` sale Inky; con `>= 60` sale Clyde.
- [ ] Con `idleSteps >= 240` sin comer dots ni liberar, el siguiente fantasma `waiting` sale por timeout.
- [ ] Comer un dot incrementa `dotsSinceReset` y pone `idleSteps` a 0.
- [ ] Al perder una vida, todos vuelven al pen con `releaseState: 'waiting'` y `dotsSinceReset` a 0.
- [ ] En el navegador, los fantasmas persiguen con sus estrategias de SPEC 01 sin regresión y sin errores en la consola.

## Decisiones

- **Sí:** regla híbrida clásica del nivel 1 (Pinky inmediata, Inky 30, Clyde 60) con respaldo temporal de 4 s. Balance entre fidelidad al arcade y simplicidad.
- **Sí:** exclusividad de salida (solo un `leaving` a la vez) y `releaseDots: 0` para Blinky y Pinky, eligiendo en orden de `GHOST_STARTS`. Da la salida "uno a uno" sin configuración extra.
- **Sí:** `releaseState` con 3 fases. Distingue esperando/saliendo/activo y hace legible la exclusividad.
- **Sí:** `releaseDots` dentro de `GHOST_STARTS`. Una sola fuente de verdad, acoplada al orden (blinky en índice 0) ya fijado en SPEC 01.
- **Sí:** `game.ghostRelease` agrupa `dotsSinceReset` e `idleSteps`. Evita llenar la raíz de `game`.
- **Sí:** timeout en pasos (`GHOST_TIMEOUT_STEPS = 240`), aprovechando el paso fijo de 60 Hz de SPEC 02.
- **Sí:** limpieza acotada al flujo de fantasmas: el helper `resetGhost` elimina la duplicación entre `createGame` y `resetPositions`, y la lógica queda separada en `updateGhostRelease`.
- **No:** contador global clásico tras perder una vida (7/17/32). Complejidad arcade sin valor visible para este MVP; contar dots desde cero es suficiente y predecible.
- **No:** mover la lógica a un nuevo `ghosts.js`. Añadiría un script y un global más sin beneficio; se respeta la arquitectura actual.
- **No:** reescribir todo `src/js`. La limpieza se limita al código tocado por el bug.
- **Sí:** harness con `vm` de Node. Prueba el código real sin modificar producción ni añadir dependencias.
- **No:** framework de tests. `assert` con un script autocontenido es suficiente para este proyecto.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Blinky y Pinky con `releaseDots: 0` podrían salir juntos si falla la exclusividad. | Solo se libera si ningún otro fantasma está `leaving`, y se elige en orden de `GHOST_STARTS` (blinky primero). |
| El timeout y los umbrales comparten contadores; un fallo podría liberar dos fantasmas a la vez. | Solo un `releaseState` cambia por paso; el harness verifica la exclusividad en cada paso. |
| Los fantasmas `waiting` quedan inmóviles dentro del pen (el arcade los hace oscilar). | Solo visual; no afecta la jugabilidad. Se acepta por simplicidad. |
| El harness manipula `dotsSinceReset` directamente para probar umbrales y no cubre el incremento real. | Un caso del harness come un dot real y verifica el incremento y el reset de `idleSteps`. |
| 240 pasos = 4 s depende del paso fijo de SPEC 02. | La constante se comenta y se relaciona con `STEP = 1000/60` de main.js. |