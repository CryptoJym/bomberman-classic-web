const DIRECTION_CODE_TO_NAME = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const VALID_DIRECTIONS = new Set(['up', 'down', 'left', 'right']);
const DEFAULT_DEADZONE = 12;

export function isMovementCode(code) {
  return Object.prototype.hasOwnProperty.call(DIRECTION_CODE_TO_NAME, code);
}

export function updateDirectionOrder(directionOrder, code, isDown) {
  if (!isMovementCode(code)) {
    return directionOrder.slice();
  }

  const nextOrder = directionOrder.filter((entry) => entry !== code);
  if (isDown) {
    nextOrder.push(code);
  }
  return nextOrder;
}

export function resolveDirection(activeCodes, directionOrder, touchDirection) {
  if (VALID_DIRECTIONS.has(touchDirection)) {
    return touchDirection;
  }

  for (let index = directionOrder.length - 1; index >= 0; index -= 1) {
    const code = directionOrder[index];
    if (activeCodes.has(code)) {
      return DIRECTION_CODE_TO_NAME[code] || null;
    }
  }

  for (const code of activeCodes) {
    if (DIRECTION_CODE_TO_NAME[code]) {
      return DIRECTION_CODE_TO_NAME[code];
    }
  }

  return null;
}

export function heldDirectionsFromInputs(activeCodes, touchDirection) {
  const heldDirections = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  for (const code of activeCodes) {
    const direction = DIRECTION_CODE_TO_NAME[code];
    if (direction) {
      heldDirections[direction] = true;
    }
  }

  if (VALID_DIRECTIONS.has(touchDirection)) {
    heldDirections[touchDirection] = true;
  }

  return heldDirections;
}

export function directionFromVector(dx, dy, deadzone = DEFAULT_DEADZONE) {
  if (Math.hypot(dx, dy) < deadzone) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'down' : 'up';
}
