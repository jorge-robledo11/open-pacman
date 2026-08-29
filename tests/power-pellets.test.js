// tests/power-pellets.test.js
// Verificacion de SPEC 04: cuatro power pellets estaticos.
// Se ejecuta con: node tests/power-pellets.test.js
// Carga el codigo real (maze.js y game.js) en un contexto de Node via vm.

const assert = require( 'assert' );
const fs = require( 'fs' );
const path = require( 'path' );
const vm = require( 'vm' );

const src = path.join( __dirname, '..', 'src', 'js' );
const code = fs.readFileSync( path.join( src, 'maze.js' ), 'utf8' ) +
  '\n' + fs.readFileSync( path.join( src, 'game.js' ), 'utf8' );

const sandbox = { window: {} };
vm.createContext( sandbox );
vm.runInContext( code, sandbox );

const w = sandbox.window;
const createGame = w.createGame;
const update = w.update;

const PP = [ { x: 1, y: 3 }, { x: 26, y: 3 }, { x: 1, y: 23 }, { x: 26, y: 23 } ];

// Mueve a pacman a una celda y come lo que haya en ella.
function eat( game, x, y ) {
  game.pacman.x = x;
  game.pacman.y = y;
  game.pacman.dir = 'left';
  game.pacman.nextDir = null;
  update( game );
}

// 1. MAZE y game.grid tienen 4 en las cuatro posiciones, y 2 fuera de ellas.
for ( const cell of PP ) assert.strictEqual( w.MAZE[ cell.y ][ cell.x ], 4 );
let game = createGame();
for ( const cell of PP ) assert.strictEqual( game.grid[ cell.y ][ cell.x ], 4 );
for ( let y = 0; y < game.grid.length; y++ ) {
  for ( let x = 0; x < game.grid[ 0 ].length; x++ ) {
    const isPP = PP.some( ( c ) => c.x === x && c.y === y );
    if ( !isPP ) assert.notStrictEqual( game.grid[ y ][ x ], 4 );
  }
}

// 2. dotsRemaining incluye los cuatro power pellets.
// createGame limpia la celda de inicio de Pacman, asi que el total es MAZE - 1.
const expectedTotal = w.MAZE.flat().filter( ( v ) => v === 2 || v === 4 ).length;
assert.strictEqual( game.dotsRemaining, expectedTotal - 1 );

// 3. Recoger un power pellet suma 50, decrementa dotsRemaining y actualiza SPEC 03.
game = createGame();
game.ghostRelease.idleSteps = 50;
eat( game, 1, 3 );
assert.strictEqual( game.score, 50 );
assert.strictEqual( game.dotsRemaining, expectedTotal - 2 );
assert.strictEqual( game.ghostRelease.dotsSinceReset, 1 );
assert.strictEqual( game.ghostRelease.idleSteps, 0 );

// 4. Al perder una vida, los power pellets recogidos siguen consumidos.
game = createGame();
eat( game, 1, 3 );
assert.strictEqual( game.grid[ 3 ][ 1 ], 0 );
game.ghosts[ 0 ].releaseState = 'active';
game.pacman.x = game.ghosts[ 0 ].x;
game.pacman.y = game.ghosts[ 0 ].y;
update( game );
assert.strictEqual( game.lives, 2 );
assert.strictEqual( game.grid[ 3 ][ 1 ], 0 );

// 5. Consumir todos los coleccionables (2 y 4) deja state === 'won'.
game = createGame();
for ( let y = 0; y < game.grid.length; y++ ) {
  for ( let x = 0; x < game.grid[ 0 ].length; x++ ) {
    game.grid[ y ][ x ] = 0;
  }
}
game.dotsRemaining = 1;
game.grid[ 3 ][ 1 ] = 4;
eat( game, 1, 3 );
assert.strictEqual( game.state, 'won' );

// 6. Un dot normal sigue sumando 10.
game = createGame();
game.grid[ 5 ][ 1 ] = 2;
eat( game, 1, 5 );
assert.strictEqual( game.score, 10 );

console.log( 'OK: 6 comprobaciones de power pellets pasaron.' );