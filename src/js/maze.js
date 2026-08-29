// maze.js
// Laberinto 28x31 fiel a la geometria del nivel 1 de Pac-Man.
// Se escribe como 31 strings de 28 chars (legible) y se parsea a numeros.
//   '#' pared(1) · '.' dot(2) · ' ' vacio transitable(0) · '-' puerta pen(3)
// Coordenadas: celda (x,y), origen arriba-izquierda. x in [0,27], y in [0,30].
// Simetrico respecto al eje vertical central (entre cols 13 y 14).

const MAZE_STR = [
  '############################', // 0  borde
  '#............##............#', // 1
  '#.####.#####.##.#####.####.#', // 2
  '#o####.#####.##.#####.####o#', // 3  power pellets (1,3) y (26,3)
  '#.####.#####.##.#####.####.#', // 4
  '#..........................#', // 5
  '#.####.##.########.##.####.#', // 6
  '#.####.##.########.##.####.#', // 7
  '#......##....##....##......#', // 8
  '######.#####.##.#####.######', // 9
  '######.#####.##.#####.######', // 10
  '######.##..........##.######', // 11
  '######.##.###--###.##.######', // 12  puerta pen cols 13-14
  '######.##.#      #.##.######', // 13  interior pen
  '          #      #          ', // 14  tunel (extremos abiertos) + pen
  '######.##.#      #.##.######', // 15  interior pen
  '######.##.########.##.######', // 16  fondo pen
  '######.##..........##.######', // 17
  '######.#####.##.#####.######', // 18
  '######.#####.##.#####.######', // 19
  '#............##............#', // 20
  '#.####.#####.##.#####.####.#', // 21
  '#.####.#####.##.#####.####.#', // 22
  '#o..##................##..o#', // 23  power pellets (1,23) y (26,23); fila inicio Pacman
  '###.##.##.########.##.##.###', // 24
  '###.##.##.########.##.##.###', // 25
  '#......##....##....##......#', // 26
  '#.##########.##.##########.#', // 27
  '#.##########.##.##########.#', // 28
  '#..........................#', // 29
  '############################', // 30  borde
];

function parseTile( ch ) {
  if ( ch === '#' ) return 1;
  if ( ch === '.' ) return 2;
  if ( ch === '-' ) return 3;
  if ( ch === 'o' ) return 4; // power pellet
  return 0; // espacio = vacio transitable
}

// Matriz numerica pristina (no se muta; cada partida copia esto).
const MAZE = MAZE_STR.map( ( row ) => row.split( '' ).map( parseTile ) );

const TUNNEL_ROW = 14;
// Pen (jaula): celdas transitables filas 13-15, cols 11-16. Puerta en (13,12).
const PEN = { top: 13, bottom: 15, left: 11, right: 16 };
const PEN_DOOR = { x: 13, y: 12 };
const PACMAN_START = { x: 13, y: 23 };
// Orden fijo: blinky SIEMPRE en indice 0 (inky usa game.ghosts[0]).
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'blinky', releaseDots: 0 }, // dentro de la pen; sale al inicio
  { x: 12, y: 14, kind: 'pinky', releaseDots: 0 },  // dentro de la pen; tras cruzar Blinky
  { x: 14, y: 14, kind: 'inky', releaseDots: 30 },  // dentro de la pen
  { x: 15, y: 14, kind: 'clyde', releaseDots: 60 }, // dentro de la pen
];

window.MAZE = MAZE;
window.TUNNEL_ROW = TUNNEL_ROW;
window.PEN = PEN;
window.PEN_DOOR = PEN_DOOR;
window.PACMAN_START = PACMAN_START;
window.GHOST_STARTS = GHOST_STARTS;
