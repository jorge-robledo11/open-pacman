// tests/ghost-release.test.js
// Verificacion de SPEC 03: salida escalonada de fantasmas (regla clasica nivel 1).
// Se ejecuta con: node tests/ghost-release.test.js
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
const PEN_DOOR = w.PEN_DOOR;

// Quita todos los dots del tablero: evita que pacman coma y reinicie idleSteps.
function clearDots( game ) {
  for ( let y = 0; y < game.grid.length; y++ ) {
    for ( let x = 0; x < game.grid[ 0 ].length; x++ ) {
      if ( game.grid[ y ][ x ] === 2 ) game.grid[ y ][ x ] = 0;
    }
  }
}

function states( game ) {
  return game.ghosts.map( ( g ) => g.kind + ':' + g.releaseState ).join( ',' );
}

// Avanza update() hasta que pred(game) sea verdadero (o se agoten pasos).
function stepUntil( game, pred, maxSteps ) {
  for ( let i = 0; i < maxSteps; i++ ) {
    update( game );
    if ( pred( game ) ) return i;
  }
  return -1;
}

// 1. Al iniciar, solo blinky sale; los demas esperan dentro del pen.
let game = createGame();
update( game );
assert.strictEqual( states( game ), 'blinky:leaving,pinky:waiting,inky:waiting,clyde:waiting' );

// 2. Pinky empieza a salir solo despues de que blinky alcanza la puerta.
assert.notStrictEqual( stepUntil( game, ( g ) => g.ghosts[ 0 ].releaseState === 'active', 500 ), -1 );
assert.strictEqual( Math.round( game.ghosts[ 0 ].x ), PEN_DOOR.x );
assert.strictEqual( Math.round( game.ghosts[ 0 ].y ), PEN_DOOR.y );
assert.strictEqual( game.ghosts[ 1 ].releaseState, 'waiting' );
assert.notStrictEqual( stepUntil( game, ( g ) => g.ghosts[ 1 ].releaseState === 'leaving', 100 ), -1 );
assert.strictEqual( game.ghosts[ 0 ].releaseState, 'active' );

// 3. Umbrales por dots: inky a los 30, clyde a los 60.
game.ghostRelease.dotsSinceReset = 30;
assert.notStrictEqual( stepUntil( game, ( g ) => g.ghosts[ 2 ].releaseState === 'leaving', 100 ), -1 );
assert.strictEqual( game.ghosts[ 1 ].releaseState, 'active' );
game.ghostRelease.dotsSinceReset = 60;
assert.notStrictEqual( stepUntil( game, ( g ) => g.ghosts[ 3 ].releaseState === 'leaving', 100 ), -1 );
assert.strictEqual( game.ghosts[ 2 ].releaseState, 'active' );

// 4. Respaldo temporal: sin dots, inky sale por timeout (240 pasos).
game = createGame();
clearDots( game );
assert.notStrictEqual( stepUntil( game, ( g ) => g.ghosts[ 2 ].releaseState === 'leaving', 600 ), -1 );

// 5. Comer un dot incrementa dotsSinceReset y resetea idleSteps.
game = createGame();
game.ghostRelease.idleSteps = 50;
game.pacman.x = 1;
game.pacman.y = 1;
game.pacman.dir = 'right';
game.pacman.nextDir = null;
update( game );
assert.strictEqual( game.ghostRelease.dotsSinceReset, 1 );
assert.strictEqual( game.ghostRelease.idleSteps, 0 );

// 6. Al perder una vida, la secuencia se reinicia desde cero.
game = createGame();
clearDots( game );
game.ghosts[ 0 ].releaseState = 'active';
game.pacman.x = game.ghosts[ 0 ].x;
game.pacman.y = game.ghosts[ 0 ].y;
game.ghostRelease.dotsSinceReset = 30;
game.ghostRelease.idleSteps = 50;
update( game );
assert.strictEqual( game.lives, 2 );
assert.notStrictEqual( game.state, 'lost' );
assert.ok( game.ghosts.every( ( g ) => g.releaseState === 'waiting' ) );
assert.strictEqual( game.ghostRelease.dotsSinceReset, 0 );
assert.strictEqual( game.ghostRelease.idleSteps, 0 );

// 7. Secuencia completa sin dots, con exclusividad (maximo un fantasma saliendo).
game = createGame();
clearDots( game );
const order = [];
for ( let i = 0; i < 1000 && order.length < 4; i++ ) {
  update( game );
  assert.ok( game.ghosts.filter( ( g ) => g.releaseState === 'leaving' ).length <= 1,
    'exclusividad rota en el paso ' + i );
  game.ghosts.forEach( ( g ) => {
    if ( g.releaseState === 'leaving' && !order.includes( g.kind ) ) order.push( g.kind );
  } );
}
assert.deepStrictEqual( order, [ 'blinky', 'pinky', 'inky', 'clyde' ] );

console.log( 'OK: 7 comprobaciones de salida escalonada pasaron.' );