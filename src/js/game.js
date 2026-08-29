// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const GHOST_TIMEOUT_STEPS = 240; // 4 s a 60 Hz (paso fijo de SPEC 02)

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( s ) => {
      const g = {
        speed: GHOST_SPEED,
        kind: s.kind,
        releaseDots: s.releaseDots,
      };
      resetGhost( g, s );
      return g;
    } ),
    ghostRelease: {
      dotsSinceReset: 0, // dots comidos desde el ultimo reinicio de posiciones
      idleSteps: 0,      // pasos sin comer dot ni liberar fantasma
    },
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    const v = grid[ p.y ][ p.x ];
    if ( v === 2 || v === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += ( v === 4 ) ? 50 : 10;
      game.dotsRemaining--;
      game.ghostRelease.dotsSinceReset++;
      game.ghostRelease.idleSteps = 0;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda objetivo de cada fantasma segun su kind.
function targetOf( game, g ) {
  // Dentro del pen: objetivo = puerta (el greedy no sube solo hacia el target).
  if ( g.y >= PEN.top && g.y <= PEN.bottom && g.x >= PEN.left && g.x <= PEN.right ) {
    return PEN_DOOR;
  }

  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const f = DIRS[ p.dir ];

  if ( g.kind === 'blinky' ) return { x: px, y: py };
  if ( g.kind === 'pinky' ) return { x: px + f.x * 4, y: py + f.y * 4 };
  if ( g.kind === 'inky' ) {
    const blinky = game.ghosts[ 0 ];
    const ax = px + f.x * 2;
    const ay = py + f.y * 2;
    return { x: 2 * ax - Math.round( blinky.x ), y: 2 * ay - Math.round( blinky.y ) };
  }
  // clyde: persigue si esta lejos; si no, esquina inferior-izquierda.
  const dist = Math.abs( g.x - px ) + Math.abs( g.y - py );
  if ( dist > 8 ) return { x: px, y: py };
  return { x: 0, y: game.grid.length - 1 };
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const target = targetOf( game, g );

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Elegir la direccion que mas acerque a la celda objetivo.
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // Esperando dentro del pen: no se mueve hasta que lo liberan.
  if ( g.releaseState === 'waiting' ) return;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    // Salio del pen al llegar a la puerta: ya puede perseguir.
    if ( g.releaseState === 'leaving' && g.x === PEN_DOOR.x && g.y === PEN_DOOR.y ) {
      g.releaseState = 'active';
    }
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

// Devuelve un fantasma a su posicion inicial esperando dentro del pen.
function resetGhost( g, start ) {
  g.x = start.x;
  g.y = start.y;
  g.dir = 'up';
  g.releaseState = 'waiting';
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => resetGhost( g, GHOST_STARTS[ i ] ) );
  game.ghostRelease.dotsSinceReset = 0;
  game.ghostRelease.idleSteps = 0;
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// Libera a los fantasmas uno a uno: por dots (regla clasica nivel 1) y por
// respaldo temporal si pasan GHOST_TIMEOUT_STEPS sin comer dot ni liberar.
// Solo puede salir uno a la vez (exclusividad).
function updateGhostRelease( game ) {
  const rel = game.ghostRelease;
  const leaving = game.ghosts.some( ( g ) => g.releaseState === 'leaving' );
  if ( leaving ) return;

  let next = game.ghosts.find(
    ( g ) => g.releaseState === 'waiting' && g.releaseDots <= rel.dotsSinceReset
  );

  if ( !next ) {
    rel.idleSteps++;
    if ( rel.idleSteps >= GHOST_TIMEOUT_STEPS ) {
      next = game.ghosts.find( ( g ) => g.releaseState === 'waiting' );
    }
  }

  if ( next ) {
    next.releaseState = 'leaving';
    rel.idleSteps = 0;
  }
}

function update( game ) {
  movePacman( game );
  updateGhostRelease( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
