import {
  directionFromVector,
  heldDirectionsFromInputs,
  isMovementCode,
  resolveDirection,
  updateDirectionOrder,
} from './client-input.mjs';
import {
  buildShareUrl,
  createRoomCode,
  normalizeRoomCode,
  readRoomCodeFromLocation,
} from './client-room.mjs';
import {
  advanceVisualState,
  buildTextSnapshot,
  syncVisualState,
} from './client-state.mjs';

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const statusEl = document.getElementById('status');
  const roundInfoEl = document.getElementById('roundInfo');
  const netInfoEl = document.getElementById('netInfo');
  const hudInfoEl = document.getElementById('hudInfo');
  const roomBadgeEl = document.getElementById('roomBadge');
  const scoreboardEl = document.getElementById('scoreboard');
  const nameInput = document.getElementById('nameInput');
  const roomInput = document.getElementById('roomInput');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const copyRoomBtn = document.getElementById('copyRoomBtn');
  const newRoomBtn = document.getElementById('newRoomBtn');
  const roomHintEl = document.getElementById('roomHint');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const colorblindToggle = document.getElementById('cbMode');
  const pad = document.getElementById('pad');
  const padKnob = document.getElementById('padKnob');
  const bombBtn = document.getElementById('bombBtn');

  let socket;
  let you = null;
  let visualGame = null;
  let desiredName = '';
  let scoreboard = [];
  let lastSentInput = {};
  let latencyMs = null;
  let lastFrameAt = performance.now();
  let colorblindMode = false;
  let touchDirection = null;
  let padPointerId = null;
  let directionOrder = [];
  let reconnectTimer = null;
  let reconnectImmediately = false;
  let currentRoomCode = null;

  const keys = new Set();
  const controlKeys = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space',
  ]);

  function isTypingTarget(target) {
    return target instanceof HTMLElement
      && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function resetPadKnob() {
    if (padKnob) {
      padKnob.style.transform = 'translate(-50%, -50%)';
    }
  }

  function roomUrl(roomCode) {
    return buildShareUrl(window.location.href, roomCode);
  }

  function syncRoomUi() {
    if (roomBadgeEl) {
      roomBadgeEl.textContent = currentRoomCode ? `Room ${currentRoomCode}` : 'Room ——';
    }
    if (roomInput && currentRoomCode && document.activeElement !== roomInput) {
      roomInput.value = currentRoomCode;
    }
    if (roomHintEl && currentRoomCode) {
      roomHintEl.textContent = `Share room ${currentRoomCode} or send the full link so friends enter the same match.`;
    }
  }

  function applyRoomCode(roomCode, { updateHistory = true } = {}) {
    currentRoomCode = normalizeRoomCode(roomCode);
    if (updateHistory) {
      window.history.replaceState({}, '', roomUrl(currentRoomCode));
    }
    syncRoomUi();
  }

  function ensureRoomCode() {
    const roomFromUrl = readRoomCodeFromLocation(window.location);
    applyRoomCode(roomFromUrl || createRoomCode());
  }

  function resetLocalStateForReconnect() {
    visualGame = null;
    scoreboard = [];
    latencyMs = null;
    lastSentInput = {};
    you = null;
    updateScoreboard([]);
    render();
  }

  function switchRoom(nextRoomCode) {
    applyRoomCode(nextRoomCode);
    resetLocalStateForReconnect();
    if (socket && socket.readyState <= WebSocket.OPEN) {
      reconnectImmediately = true;
      socket.close();
      return;
    }
    connect();
  }

  async function copyRoomLink() {
    if (!currentRoomCode) {
      return;
    }

    const shareUrl = roomUrl(currentRoomCode);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        tempInput.remove();
      }
      statusEl.textContent = `Copied invite link for room ${currentRoomCode}`;
    } catch {
      statusEl.textContent = `Copy failed. Share this room code: ${currentRoomCode}`;
    }
  }

  function releaseControls() {
    const hadKeyboardInput = keys.size > 0 || touchDirection !== null;
    if (!hadKeyboardInput) {
      return;
    }
    keys.clear();
    directionOrder = [];
    touchDirection = null;
    padPointerId = null;
    resetPadKnob();
    sendInput(true);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      return document.documentElement.requestFullscreen();
    }
    return document.exitFullscreen();
  }

  function onKey(event, down) {
    if (isTypingTarget(event.target) && event.code !== 'Escape') {
      return;
    }

    if (event.code === 'KeyF' && down) {
      event.preventDefault();
      toggleFullscreen().catch(() => {});
      return;
    }

    if (controlKeys.has(event.code)) {
      event.preventDefault();
      if (down) {
        keys.add(event.code);
      } else {
        keys.delete(event.code);
      }
      if (isMovementCode(event.code)) {
        directionOrder = updateDirectionOrder(directionOrder, event.code, down);
      }
      sendInput(true);
    }
  }

  function currentInput() {
    const direction = resolveDirection(keys, directionOrder, touchDirection);
    const bomb = keys.has('Space');
    const heldDirections = heldDirectionsFromInputs(keys, touchDirection);
    return {
      direction,
      ...heldDirections,
      bomb,
    };
  }

  function syncDesiredName() {
    desiredName = nameInput?.value.trim() || desiredName;
    if (socket && socket.readyState === WebSocket.OPEN && desiredName.length > 0) {
      socket.send(JSON.stringify({ type: 'join', name: desiredName }));
    }
  }

  function sendInput(force = false) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const input = currentInput();
    const changed = JSON.stringify(input) !== JSON.stringify(lastSentInput);
    if (!force && !changed) {
      return;
    }

    socket.send(JSON.stringify({ type: 'input', ...input }));
    lastSentInput = input;
  }

  function updateScoreboard(players) {
    scoreboard = players.slice().sort((a, b) => (b.wins || 0) - (a.wins || 0));
    scoreboardEl.innerHTML = '';

    for (const player of scoreboard) {
      const li = document.createElement('li');
      if (player.id === you) {
        li.classList.add('is-you');
      }

      const left = document.createElement('div');
      left.className = 'player-row';

      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = player.color;
      left.appendChild(swatch);

      const name = document.createElement('span');
      name.textContent = player.name;
      left.appendChild(name);

      const wins = document.createElement('span');
      wins.textContent = `${player.wins || 0}★`;

      li.appendChild(left);
      li.appendChild(wins);
      scoreboardEl.appendChild(li);
    }
  }

  function updateHud() {
    syncRoomUi();

    if (!visualGame) {
      roundInfoEl.textContent = 'Round —';
      netInfoEl.textContent = '— ms';
      hudInfoEl.textContent = currentRoomCode
        ? `Waiting for room ${currentRoomCode}. Share the link and have another player join.`
        : 'Waiting for server state';
      return;
    }

    if (latencyMs !== null) {
      netInfoEl.textContent = `~${latencyMs} ms`;
    }

    if (roomBadgeEl && visualGame.roomCode) {
      roomBadgeEl.textContent = `Room ${visualGame.roomCode} • ${visualGame.playerCount || 0}/${visualGame.maxPlayers || 16}`;
    }

    const round = visualGame.round;
    if (round?.phase === 'intermission') {
      const winner = visualGame.players.find((player) => player.id === round.winnerId);
      const winnerName = winner ? winner.name : '—';
      const secondsLeft = ((round.timeLeftMs || 0) / 1000).toFixed(1);
      roundInfoEl.textContent = `Round ${round.roundNumber} winner: ${winnerName} • Next in ${secondsLeft}s`;
    } else {
      roundInfoEl.textContent = `Round ${round?.roundNumber || '—'}`;
    }

    const localPlayer = visualGame.players.find((player) => player.id === you);
    if (!localPlayer) {
      hudInfoEl.textContent = `Room ${visualGame.roomCode || currentRoomCode} • ${visualGame.playerCount || 0} player${visualGame.playerCount === 1 ? '' : 's'} connected`;
      return;
    }

    const readyBombs = Math.max(0, (localPlayer.maxBombs || 0) - (localPlayer.activeBombs || 0));
    hudInfoEl.textContent = `Room ${visualGame.roomCode || currentRoomCode} • ${visualGame.playerCount || 0}/${visualGame.maxPlayers || 16} players • bombs ${readyBombs}/${localPlayer.maxBombs || 0} • blast ${localPlayer.bombRadius || 0} • move ${localPlayer.moveCooldownMs || 0}ms`;
  }

  function drawTile(px, py, tile, fill, innerFill) {
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, tile, tile);
    ctx.fillStyle = innerFill;
    ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4);
  }

  function drawBoard(game, tile, offX, offY) {
    for (let y = 0; y < game.board.height; y += 1) {
      for (let x = 0; x < game.board.width; x += 1) {
        const cell = game.board.tiles[y][x];
        const px = offX + x * tile;
        const py = offY + y * tile;

        if (cell === 1) {
          drawTile(px, py, tile, '#475569', '#64748b');
        } else if (cell === 2) {
          drawTile(px, py, tile, '#78350f', '#92400e');
        } else {
          drawTile(px, py, tile, '#1f1f23', '#26262b');
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);
      }
    }
  }

  function drawBombs(game, tile, offX, offY) {
    for (const bomb of game.bombs) {
      const px = offX + bomb.x * tile;
      const py = offY + bomb.y * tile;
      const pulse = 0.55 + 0.45 * Math.sin((performance.now() + (bomb.timeLeftMs || 0)) / 90);
      const inset = Math.max(5, Math.round(8 - pulse * 3));
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + inset, py + inset, tile - inset * 2, tile - inset * 2);
      ctx.fillStyle = '#111827';
      ctx.fillRect(px + inset + 4, py + inset + 4, tile - (inset + 4) * 2, tile - (inset + 4) * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px + tile * 0.65, py + tile * 0.28, Math.max(3, tile * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawExplosions(game, tile, offX, offY) {
    for (const explosion of game.explosions) {
      const alpha = Math.max(0.15, Math.min(1, (explosion.timeLeftMs || 300) / 280));
      for (const cell of explosion.cells) {
        const px = offX + cell.x * tile;
        const py = offY + cell.y * tile;
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.fillRect(px + 3, py + 3, tile - 6, tile - 6);
        ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;
        ctx.fillRect(px + 8, py + 8, tile - 16, tile - 16);
      }
    }
  }

  function drawPickups(game, tile, offX, offY) {
    for (const pickup of game.pickups) {
      const px = offX + pickup.x * tile;
      const py = offY + pickup.y * tile;
      if (pickup.type === 'bomb') {
        ctx.fillStyle = '#38bdf8';
      } else if (pickup.type === 'radius') {
        ctx.fillStyle = '#a3e635';
      } else {
        ctx.fillStyle = '#f472b6';
      }
      ctx.fillRect(px + 10, py + 10, tile - 20, tile - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px + 14, py + 14, tile - 28, tile - 28);
    }
  }

  function drawPlayers(game, tile, offX, offY) {
    for (const player of game.players) {
      const px = offX + player.renderX * tile;
      const py = offY + player.renderY * tile;
      ctx.save();
      ctx.globalAlpha = player.alive ? 1 : 0.35;
      ctx.fillStyle = player.color;
      ctx.fillRect(px + 5, py + 5, tile - 10, tile - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(px + 8, py + 8, tile - 18, Math.max(6, tile * 0.18));

      if (colorblindMode) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = String((scoreboard.findIndex((entry) => entry.id === player.id) + 1) || '?');
        ctx.fillText(label, px + tile / 2, py + tile / 2 + 1);
      }

      if (player.id === you) {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2.5, py + 2.5, tile - 5, tile - 5);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(px + tile / 2, py - 6);
        ctx.lineTo(px + tile / 2 - 6, py + 4);
        ctx.lineTo(px + tile / 2 + 6, py + 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function render() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(1, '#111827');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (!visualGame) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for game state…', width / 2, height / 2);
      updateHud();
      return;
    }

    const cols = visualGame.board.width;
    const rows = visualGame.board.height;
    const topInset = width < 900 ? 70 : 64;
    const bottomInset = width < 900 ? 24 : 32;
    const leftInset = width < 900 ? 20 : 280;
    const rightInset = width < 900 ? 20 : 48;
    const tile = Math.max(
      18,
      Math.floor(Math.min((width - leftInset - rightInset) / cols, (height - topInset - bottomInset) / rows))
    );
    const viewW = tile * cols;
    const viewH = tile * rows;
    const offX = Math.floor((width - viewW + leftInset - rightInset) / 2);
    const offY = Math.floor((height - viewH + topInset - bottomInset) / 2);

    drawBoard(visualGame, tile, offX, offY);
    drawExplosions(visualGame, tile, offX, offY);
    drawBombs(visualGame, tile, offX, offY);
    drawPickups(visualGame, tile, offX, offY);
    drawPlayers(visualGame, tile, offX, offY);
    updateHud();
  }

  function connect() {
    clearTimeout(reconnectTimer);
    statusEl.textContent = currentRoomCode ? `Connecting to room ${currentRoomCode}…` : 'Connecting…';

    const socketUrl = new URL((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    if (currentRoomCode) {
      socketUrl.searchParams.set('room', currentRoomCode);
    }
    socket = new WebSocket(socketUrl);

    socket.addEventListener('open', () => {
      statusEl.textContent = currentRoomCode ? `Connected to room ${currentRoomCode}` : 'Connected';
      const defaultName = nameInput?.value.trim() || desiredName || `Player ${Math.floor(Math.random() * 1000)}`;
      desiredName = defaultName;
      socket.send(JSON.stringify({ type: 'join', name: defaultName }));
      sendInput(true);
    });

    socket.addEventListener('close', () => {
      if (reconnectImmediately) {
        reconnectImmediately = false;
        connect();
        return;
      }
      statusEl.textContent = currentRoomCode
        ? `Disconnected from room ${currentRoomCode}. Reconnecting…`
        : 'Disconnected. Reconnecting…';
      reconnectTimer = window.setTimeout(connect, 1000);
    });

    socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'you') {
        you = msg.id;
        if (msg.roomCode) {
          applyRoomCode(msg.roomCode);
        }
        return;
      }

      if (msg.type === 'full') {
        statusEl.textContent = `Room ${msg.roomCode || currentRoomCode} is full (${msg.maxPlayers || 16} players max).`;
        return;
      }

      if (msg.type === 'state') {
        latencyMs = typeof msg.t === 'number' ? Math.max(0, Date.now() - msg.t) : null;
        if (msg.roomCode) {
          applyRoomCode(msg.roomCode);
        }
        visualGame = syncVisualState(visualGame, msg, you);
        updateScoreboard(msg.players || []);
        render();
      }
    });
  }

  function tickFrame(now) {
    const dt = Math.min(64, Math.max(0, now - lastFrameAt));
    lastFrameAt = now;
    if (visualGame) {
      visualGame = advanceVisualState(visualGame, dt);
    }
    render();
    requestAnimationFrame(tickFrame);
  }

  window.render_game_to_text = () => buildTextSnapshot(visualGame, you);
  window.advanceTime = async (ms) => {
    if (visualGame) {
      visualGame = advanceVisualState(visualGame, ms);
      render();
    }
  };

  window.addEventListener('resize', resize);
  window.addEventListener('blur', releaseControls);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      releaseControls();
    }
  });
  window.addEventListener('keydown', (event) => onKey(event, true));
  window.addEventListener('keyup', (event) => onKey(event, false));

  setInterval(() => sendInput(), 33);

  if (nameInput) {
    nameInput.addEventListener('input', syncDesiredName);
    nameInput.addEventListener('change', syncDesiredName);
    nameInput.addEventListener('blur', syncDesiredName);
  }

  if (roomInput) {
    roomInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        switchRoom(roomInput.value || currentRoomCode || createRoomCode());
      }
    });
  }

  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
      switchRoom(roomInput?.value || currentRoomCode || createRoomCode());
    });
  }

  if (copyRoomBtn) {
    copyRoomBtn.addEventListener('click', () => {
      copyRoomLink();
    });
  }

  if (newRoomBtn) {
    newRoomBtn.addEventListener('click', () => {
      switchRoom(createRoomCode());
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      toggleFullscreen().catch(() => {});
    });
  }

  if (colorblindToggle) {
    colorblindToggle.addEventListener('change', () => {
      colorblindMode = colorblindToggle.checked;
      render();
    });
  }

  if (pad) {
    const updatePadFromPoint = (clientX, clientY) => {
      const rect = pad.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const maxRadius = Math.min(rect.width, rect.height) * 0.28;
      const distance = Math.hypot(dx, dy);
      const clampRatio = distance > maxRadius ? maxRadius / distance : 1;
      const knobX = dx * clampRatio;
      const knobY = dy * clampRatio;

      if (padKnob) {
        padKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      }

      touchDirection = directionFromVector(dx, dy, Math.max(12, maxRadius * 0.28));
      sendInput(true);
    };

    const releasePad = () => {
      touchDirection = null;
      padPointerId = null;
      resetPadKnob();
      sendInput(true);
    };

    pad.addEventListener('pointerdown', (event) => {
      padPointerId = event.pointerId;
      pad.setPointerCapture(event.pointerId);
      updatePadFromPoint(event.clientX, event.clientY);
      event.preventDefault();
    });

    pad.addEventListener('pointermove', (event) => {
      if (padPointerId !== event.pointerId) {
        return;
      }
      updatePadFromPoint(event.clientX, event.clientY);
      event.preventDefault();
    });

    const endPadPointer = (event) => {
      if (padPointerId !== event.pointerId) {
        return;
      }
      releasePad();
      event.preventDefault();
    };

    pad.addEventListener('pointerup', endPadPointer);
    pad.addEventListener('pointercancel', endPadPointer);
    pad.addEventListener('lostpointercapture', releasePad);
  }

  if (bombBtn) {
    bombBtn.addEventListener('pointerdown', (event) => {
      keys.add('Space');
      sendInput(true);
      event.preventDefault();
    });

    const releaseBomb = (event) => {
      keys.delete('Space');
      sendInput(true);
      event.preventDefault();
    };

    bombBtn.addEventListener('pointerup', releaseBomb);
    bombBtn.addEventListener('pointercancel', releaseBomb);
  }

  ensureRoomCode();
  resize();
  connect();
  requestAnimationFrame(tickFrame);
})();
