/**
 * Input handling system for Bomberman Online
 * Supports keyboard, touch controls, and input buffering
 */

// ============================================================================
// Types
// ============================================================================

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  bomb: boolean;
}

export type InputCallback = (state: InputState) => void;

export interface TouchZone {
  x: number;
  y: number;
  width: number;
  height: number;
  action: keyof InputState;
}

export interface VirtualJoystick {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deadzone: number;
}

interface BufferedInput {
  action: keyof InputState;
  timestamp: number;
}

// ============================================================================
// Key Mappings
// ============================================================================

const KEY_MAPPINGS: Record<string, keyof InputState> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'bomb',
  KeyX: 'bomb',
  KeyZ: 'bomb',
  Enter: 'bomb',
};

// Gamepad button mappings (standard gamepad layout)
const GAMEPAD_MAPPINGS: Record<number, keyof InputState> = {
  12: 'up',    // D-pad up
  13: 'down',  // D-pad down
  14: 'left',  // D-pad left
  15: 'right', // D-pad right
  0: 'bomb',   // A button
  1: 'bomb',   // B button
};

// ============================================================================
// Input Handler Class
// ============================================================================

/**
 * Input handler class
 * Manages keyboard, touch, and gamepad input for the game
 */
export class InputHandler {
  // Current input state
  private state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    bomb: false,
  };

  // Input callbacks
  private callbacks: Set<InputCallback> = new Set();

  // Enabled state
  private enabled = false;

  // Touch controls
  private touchEnabled = false;
  private virtualJoystick: VirtualJoystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deadzone: 20,
  };
  private touchZones: TouchZone[] = [];
  private activeTouches: Map<number, string> = new Map();

  // Input buffering
  private inputBuffer: BufferedInput[] = [];
  private bufferDuration = 100; // ms
  private bufferingEnabled = true;

  // Gamepad support
  private gamepadEnabled = true;
  private gamepadIndex: number | null = null;
  private gamepadPollInterval: number | null = null;

  // Sequence number for server sync
  private sequenceNumber = 0;

  constructor() {
    // Bind methods to preserve context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
    this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
    this.pollGamepad = this.pollGamepad.bind(this);
  }

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  /**
   * Start listening for input events
   */
  enable(): void {
    if (this.enabled) return;

    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Touch events
    if (this.touchEnabled) {
      window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
      window.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }

    // Gamepad events
    if (this.gamepadEnabled) {
      window.addEventListener('gamepadconnected', this.handleGamepadConnected);
      window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);

      // Check for already connected gamepads
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          this.gamepadIndex = i;
          this.startGamepadPolling();
          break;
        }
      }
    }

    this.enabled = true;
  }

  /**
   * Stop listening for input events
   */
  disable(): void {
    if (!this.enabled) return;

    // Keyboard events
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    // Touch events
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);

    // Gamepad events
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    this.stopGamepadPolling();

    this.reset();
    this.enabled = false;
  }

  // ==========================================================================
  // Callback Registration
  // ==========================================================================

  /**
   * Register a callback for input changes
   */
  onInput(callback: InputCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Get next sequence number
   */
  getSequenceNumber(): number {
    return ++this.sequenceNumber;
  }

  /**
   * Reset sequence number
   */
  resetSequenceNumber(): void {
    this.sequenceNumber = 0;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Reset all inputs to false
   */
  reset(): void {
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      bomb: false,
    };
    this.inputBuffer = [];
    this.activeTouches.clear();
    this.virtualJoystick.active = false;
    this.notifyCallbacks();
  }

  /**
   * Check if any directional input is active
   */
  isMoving(): boolean {
    return this.state.up || this.state.down || this.state.left || this.state.right;
  }

  /**
   * Get primary direction (prioritizes last pressed)
   */
  getPrimaryDirection(): 'up' | 'down' | 'left' | 'right' | null {
    // Check buffered inputs for most recent direction
    const now = Date.now();
    for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
      const input = this.inputBuffer[i];
      if (input && now - input.timestamp < this.bufferDuration) {
        if (['up', 'down', 'left', 'right'].includes(input.action)) {
          return input.action as 'up' | 'down' | 'left' | 'right';
        }
      }
    }

    // Fall back to current state
    if (this.state.up) return 'up';
    if (this.state.down) return 'down';
    if (this.state.left) return 'left';
    if (this.state.right) return 'right';
    return null;
  }

  // ==========================================================================
  // Keyboard Handling
  // ==========================================================================

  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in an input field
    if (this.isTypingInInput(event)) return;

    const key = KEY_MAPPINGS[event.code];
    if (key && !this.state[key]) {
      event.preventDefault();
      this.state[key] = true;
      this.addToBuffer(key);
      this.notifyCallbacks();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = KEY_MAPPINGS[event.code];
    if (key && this.state[key]) {
      event.preventDefault();
      this.state[key] = false;
      this.notifyCallbacks();
    }
  }

  private isTypingInInput(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  // ==========================================================================
  // Touch Handling
  // ==========================================================================

  /**
   * Enable touch controls
   */
  enableTouch(joystickDeadzone: number = 20): void {
    this.touchEnabled = true;
    this.virtualJoystick.deadzone = joystickDeadzone;

    if (this.enabled) {
      window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
      window.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
  }

  /**
   * Disable touch controls
   */
  disableTouch(): void {
    this.touchEnabled = false;
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);
  }

  /**
   * Set touch zones for button areas
   */
  setTouchZones(zones: TouchZone[]): void {
    this.touchZones = zones;
  }

  /**
   * Create default mobile control layout
   */
  createDefaultTouchLayout(screenWidth: number, screenHeight: number): void {
    const buttonSize = Math.min(screenWidth, screenHeight) * 0.12;
    const margin = 20;

    // D-pad on left side
    const dpadCenterX = margin + buttonSize * 1.5;
    const dpadCenterY = screenHeight - margin - buttonSize * 1.5;

    // Bomb button on right side
    const bombX = screenWidth - margin - buttonSize;
    const bombY = screenHeight - margin - buttonSize;

    this.touchZones = [
      // D-pad
      { x: dpadCenterX - buttonSize / 2, y: dpadCenterY - buttonSize * 1.5, width: buttonSize, height: buttonSize, action: 'up' },
      { x: dpadCenterX - buttonSize / 2, y: dpadCenterY + buttonSize * 0.5, width: buttonSize, height: buttonSize, action: 'down' },
      { x: dpadCenterX - buttonSize * 1.5, y: dpadCenterY - buttonSize / 2, width: buttonSize, height: buttonSize, action: 'left' },
      { x: dpadCenterX + buttonSize * 0.5, y: dpadCenterY - buttonSize / 2, width: buttonSize, height: buttonSize, action: 'right' },
      // Bomb button
      { x: bombX, y: bombY, width: buttonSize, height: buttonSize, action: 'bomb' },
    ];
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (!touch) continue;
      const x = touch.clientX;
      const y = touch.clientY;

      // Check touch zones first
      let handled = false;
      for (const zone of this.touchZones) {
        if (this.pointInZone(x, y, zone)) {
          this.state[zone.action] = true;
          this.activeTouches.set(touch.identifier, zone.action);
          this.addToBuffer(zone.action);
          handled = true;
          break;
        }
      }

      // If no zone hit, check for virtual joystick area (left half of screen)
      if (!handled && x < window.innerWidth / 2) {
        this.virtualJoystick.active = true;
        this.virtualJoystick.startX = x;
        this.virtualJoystick.startY = y;
        this.virtualJoystick.currentX = x;
        this.virtualJoystick.currentY = y;
        this.activeTouches.set(touch.identifier, 'joystick');
      }
    }

    this.notifyCallbacks();
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (!touch) continue;
      const touchType = this.activeTouches.get(touch.identifier);

      if (touchType === 'joystick') {
        this.virtualJoystick.currentX = touch.clientX;
        this.virtualJoystick.currentY = touch.clientY;
        this.updateJoystickState();
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (!touch) continue;
      const touchType = this.activeTouches.get(touch.identifier);

      if (touchType && touchType !== 'joystick') {
        this.state[touchType as keyof InputState] = false;
      } else if (touchType === 'joystick') {
        this.virtualJoystick.active = false;
        this.state.up = false;
        this.state.down = false;
        this.state.left = false;
        this.state.right = false;
      }

      this.activeTouches.delete(touch.identifier);
    }

    this.notifyCallbacks();
  }

  private pointInZone(x: number, y: number, zone: TouchZone): boolean {
    return (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    );
  }

  private updateJoystickState(): void {
    const { startX, startY, currentX, currentY, deadzone } = this.virtualJoystick;

    const dx = currentX - startX;
    const dy = currentY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Reset directional state
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;

    if (distance > deadzone) {
      // Determine direction based on angle
      const angle = Math.atan2(dy, dx);

      // 8-directional input
      if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
        this.state.right = true;
      } else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
        this.state.down = true;
      } else if (angle >= (3 * Math.PI) / 4 || angle < (-3 * Math.PI) / 4) {
        this.state.left = true;
      } else {
        this.state.up = true;
      }
    }

    this.notifyCallbacks();
  }

  /**
   * Get virtual joystick state for rendering
   */
  getJoystickState(): VirtualJoystick {
    return { ...this.virtualJoystick };
  }

  /**
   * Get touch zones for rendering
   */
  getTouchZones(): TouchZone[] {
    return [...this.touchZones];
  }

  // ==========================================================================
  // Gamepad Handling
  // ==========================================================================

  /**
   * Enable gamepad support
   */
  enableGamepad(): void {
    this.gamepadEnabled = true;
  }

  /**
   * Disable gamepad support
   */
  disableGamepad(): void {
    this.gamepadEnabled = false;
    this.stopGamepadPolling();
  }

  private handleGamepadConnected(event: GamepadEvent): void {
    console.log('Gamepad connected:', event.gamepad.id);
    this.gamepadIndex = event.gamepad.index;
    this.startGamepadPolling();
  }

  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log('Gamepad disconnected:', event.gamepad.id);
    if (this.gamepadIndex === event.gamepad.index) {
      this.gamepadIndex = null;
      this.stopGamepadPolling();
    }
  }

  private startGamepadPolling(): void {
    if (this.gamepadPollInterval !== null) return;
    this.gamepadPollInterval = window.setInterval(this.pollGamepad, 16);
  }

  private stopGamepadPolling(): void {
    if (this.gamepadPollInterval !== null) {
      window.clearInterval(this.gamepadPollInterval);
      this.gamepadPollInterval = null;
    }
  }

  private pollGamepad(): void {
    if (this.gamepadIndex === null) return;

    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    if (!gamepad) return;

    let changed = false;

    // Check buttons
    for (const [buttonIndex, action] of Object.entries(GAMEPAD_MAPPINGS)) {
      const button = gamepad.buttons[parseInt(buttonIndex)];
      if (button) {
        const pressed = button.pressed || button.value > 0.5;
        if (this.state[action] !== pressed) {
          this.state[action] = pressed;
          if (pressed) this.addToBuffer(action);
          changed = true;
        }
      }
    }

    // Check analog sticks (left stick)
    const deadzone = 0.3;
    const leftX = gamepad.axes[0] || 0;
    const leftY = gamepad.axes[1] || 0;

    const newLeft = leftX < -deadzone;
    const newRight = leftX > deadzone;
    const newUp = leftY < -deadzone;
    const newDown = leftY > deadzone;

    if (this.state.left !== newLeft) {
      this.state.left = newLeft;
      if (newLeft) this.addToBuffer('left');
      changed = true;
    }
    if (this.state.right !== newRight) {
      this.state.right = newRight;
      if (newRight) this.addToBuffer('right');
      changed = true;
    }
    if (this.state.up !== newUp) {
      this.state.up = newUp;
      if (newUp) this.addToBuffer('up');
      changed = true;
    }
    if (this.state.down !== newDown) {
      this.state.down = newDown;
      if (newDown) this.addToBuffer('down');
      changed = true;
    }

    if (changed) {
      this.notifyCallbacks();
    }
  }

  // ==========================================================================
  // Input Buffering
  // ==========================================================================

  /**
   * Enable input buffering
   */
  enableBuffering(duration: number = 100): void {
    this.bufferingEnabled = true;
    this.bufferDuration = duration;
  }

  /**
   * Disable input buffering
   */
  disableBuffering(): void {
    this.bufferingEnabled = false;
    this.inputBuffer = [];
  }

  /**
   * Add input to buffer
   */
  private addToBuffer(action: keyof InputState): void {
    if (!this.bufferingEnabled) return;

    this.inputBuffer.push({
      action,
      timestamp: Date.now(),
    });

    // Clean old entries
    const cutoff = Date.now() - this.bufferDuration;
    this.inputBuffer = this.inputBuffer.filter((input) => input.timestamp > cutoff);
  }

  /**
   * Check if action was recently pressed (within buffer window)
   */
  wasRecentlyPressed(action: keyof InputState): boolean {
    const cutoff = Date.now() - this.bufferDuration;
    return this.inputBuffer.some(
      (input) => input.action === action && input.timestamp > cutoff
    );
  }

  /**
   * Consume a buffered input (removes it from buffer)
   */
  consumeBufferedInput(action: keyof InputState): boolean {
    const index = this.inputBuffer.findIndex(
      (input) => input.action === action && Date.now() - input.timestamp < this.bufferDuration
    );

    if (index !== -1) {
      this.inputBuffer.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private notifyCallbacks(): void {
    const state = this.getState();
    this.callbacks.forEach((callback) => callback(state));
  }

  /**
   * Check if handler is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if touch is enabled
   */
  isTouchEnabled(): boolean {
    return this.touchEnabled;
  }

  /**
   * Check if gamepad is connected
   */
  isGamepadConnected(): boolean {
    return this.gamepadIndex !== null;
  }

  /**
   * Get connected gamepad info
   */
  getGamepadInfo(): { id: string; index: number } | null {
    if (this.gamepadIndex === null) return null;

    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    if (!gamepad) return null;

    return {
      id: gamepad.id,
      index: gamepad.index,
    };
  }
}
