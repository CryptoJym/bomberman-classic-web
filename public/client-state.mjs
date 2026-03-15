const PLAYER_TRANSITION_MS = 90;

function snapLerp(from, to, ratio) {
  if (!Number.isFinite(from)) return to;
  if (!Number.isFinite(to)) return from;
  const next = from + (to - from) * ratio;
  if (Math.abs(next - to) < 0.001) {
    return to;
  }
  return next;
}

function clonePlayerForVisual(player, previousPlayer, localPlayerId) {
  const targetX = player.x;
  const targetY = player.y;
  const renderX = previousPlayer ? previousPlayer.renderX : targetX;
  const renderY = previousPlayer ? previousPlayer.renderY : targetY;

  return {
    ...player,
    isLocal: player.id === localPlayerId,
    targetX,
    targetY,
    renderX,
    renderY,
  };
}

export function syncVisualState(previousVisualState, serverState, localPlayerId) {
  const previousPlayers = new Map(
    (previousVisualState?.players || []).map((player) => [player.id, player])
  );

  return {
    roomCode: serverState.roomCode || previousVisualState?.roomCode || null,
    playerCount: serverState.playerCount ?? (serverState.players || []).length,
    maxPlayers: serverState.maxPlayers ?? previousVisualState?.maxPlayers ?? null,
    board: serverState.board,
    serverTimeMs: typeof serverState.t === 'number' ? serverState.t : Date.now(),
    players: (serverState.players || []).map((player) =>
      clonePlayerForVisual(player, previousPlayers.get(player.id), localPlayerId)
    ),
    bombs: (serverState.bombs || []).map((bomb) => ({ ...bomb })),
    explosions: (serverState.explosions || []).map((explosion) => ({
      ...explosion,
      cells: (explosion.cells || []).map((cell) => ({ ...cell })),
    })),
    pickups: (serverState.pickups || []).map((pickup) => ({ ...pickup })),
    round: serverState.round ? { ...serverState.round } : null,
  };
}

export function advanceVisualState(visualState, dtMs) {
  if (!visualState) {
    return visualState;
  }

  const safeDtMs = Math.max(0, Math.min(250, dtMs || 0));
  const playerRatio = Math.min(1, safeDtMs / PLAYER_TRANSITION_MS);

  return {
    ...visualState,
    players: visualState.players.map((player) => ({
      ...player,
      renderX: snapLerp(player.renderX, player.targetX, playerRatio),
      renderY: snapLerp(player.renderY, player.targetY, playerRatio),
    })),
    bombs: visualState.bombs.map((bomb) => ({
      ...bomb,
      timeLeftMs: Math.max(0, (bomb.timeLeftMs || 0) - safeDtMs),
    })),
    explosions: visualState.explosions
      .map((explosion) => ({
        ...explosion,
        timeLeftMs: Math.max(0, (explosion.timeLeftMs || 0) - safeDtMs),
      }))
      .filter((explosion) => explosion.timeLeftMs > 0),
    round: visualState.round
      ? {
          ...visualState.round,
          timeLeftMs: Math.max(0, (visualState.round.timeLeftMs || 0) - safeDtMs),
        }
      : null,
  };
}

export function buildTextSnapshot(visualState, localPlayerId) {
  if (!visualState) {
    return JSON.stringify(
      {
        mode: 'loading',
        coordinateSystem: 'grid; origin is top-left; +x moves right; +y moves down',
      },
      null,
      2
    );
  }

  const localPlayer = visualState.players.find((player) => player.id === localPlayerId) || null;

  return JSON.stringify(
    {
      mode: visualState.round?.phase || 'playing',
      roomCode: visualState.roomCode,
      playerCount: visualState.playerCount,
      maxPlayers: visualState.maxPlayers,
      coordinateSystem: 'grid; origin is top-left; +x moves right; +y moves down',
      localPlayer: localPlayer
        ? {
            id: localPlayer.id,
            name: localPlayer.name,
            x: Number(localPlayer.renderX.toFixed(2)),
            y: Number(localPlayer.renderY.toFixed(2)),
            alive: localPlayer.alive,
            bombRadius: localPlayer.bombRadius,
            maxBombs: localPlayer.maxBombs,
            activeBombs: localPlayer.activeBombs,
            moveCooldownMs: localPlayer.moveCooldownMs,
          }
        : null,
      bombs: visualState.bombs.map((bomb) => ({
        x: bomb.x,
        y: bomb.y,
        timeLeftMs: bomb.timeLeftMs,
      })),
      explosions: visualState.explosions.map((explosion) => ({
        cells: explosion.cells,
        timeLeftMs: explosion.timeLeftMs,
      })),
      pickups: visualState.pickups.map((pickup) => ({
        x: pickup.x,
        y: pickup.y,
        type: pickup.type,
      })),
      players: visualState.players.map((player) => ({
        id: player.id,
        name: player.name,
        x: Number(player.renderX.toFixed(2)),
        y: Number(player.renderY.toFixed(2)),
        alive: player.alive,
        isLocal: player.id === localPlayerId,
      })),
      round: visualState.round,
    },
    null,
    2
  );
}
