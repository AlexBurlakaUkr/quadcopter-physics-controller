import './style.css';
import { GameConfig } from './GameConfig';

// Interfaces for telemetry data
interface TelemetryData {
  throttle: number;
  yaw: number;
  pitch: number;
  roll: number;
}

// Global telemetry state
let currentTelemetry: TelemetryData = {
  throttle: -1.0, // Throttle starts at the bottom
  yaw: 0.0,
  pitch: 0.0,
  roll: 0.0
};

let previousTelemetry: TelemetryData = {
  throttle: -1.0,
  yaw: 0.0,
  pitch: 0.0,
  roll: 0.0
};

// Zero-crossing check function
function crossedZero(prev: number, curr: number): boolean {
  if (prev === curr) return false;
  // Detect sign change: -1 to 0/1, 1 to 0/-1, 0 to 1/-1
  const prevSign = prev < 0 ? -1 : (prev > 0 ? 1 : 0);
  const currSign = curr < 0 ? -1 : (curr > 0 ? 1 : 0);
  return prevSign !== currSign;
}

// Deadzone helper for auto-centering axes
function applyDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) < deadzone ? 0.0 : value;
}

// Haptic feedback trigger
function checkHapticFeedback() {
  if (!GameConfig.vibrateEnabled) return;

  const crossedT = crossedZero(previousTelemetry.throttle, currentTelemetry.throttle);
  const crossedY = crossedZero(previousTelemetry.yaw, currentTelemetry.yaw);
  const crossedP = crossedZero(previousTelemetry.pitch, currentTelemetry.pitch);
  const crossedR = crossedZero(previousTelemetry.roll, currentTelemetry.roll);

  if (crossedT || crossedY || crossedP || crossedR) {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(GameConfig.vibrateDuration);
    }
  }
}

// Virtual Joystick Handler Class
class VirtualJoystick {
  private zone: HTMLElement;
  private ring: HTMLElement;
  private handle: HTMLElement;
  private autoCenterX: boolean;
  private autoCenterY: boolean;
  private onUpdate: (x: number, y: number) => void;

  private activePointerId: number | null = null;
  private ringCenter = { x: 0, y: 0 };
  private maxDistance = 0;

  // Normalized values: -1.0 to 1.0
  public valueX = 0;
  public valueY = 0;

  constructor(
    zoneId: string,
    options: {
      autoCenterX: boolean;
      autoCenterY: boolean;
      initialY: number;
      onUpdate: (x: number, y: number) => void;
    }
  ) {
    const zoneEl = document.getElementById(zoneId);
    if (!zoneEl) throw new Error(`Joystick zone with id ${zoneId} not found`);

    this.zone = zoneEl;
    this.ring = this.zone.querySelector('.joystick-ring') as HTMLElement;
    this.handle = this.zone.querySelector('.joystick-handle') as HTMLElement;

    this.autoCenterX = options.autoCenterX;
    this.autoCenterY = options.autoCenterY;
    this.onUpdate = options.onUpdate;

    this.valueY = options.initialY;

    // Recalculate dimensions on resize
    window.addEventListener('resize', () => this.recalculateDimensions());
    
    // Setup touch/pointer listeners
    this.setupListeners();
    
    // Initial layout setup
    setTimeout(() => {
      this.recalculateDimensions();
      this.updateVisualPosition();
    }, 100);
  }

  private recalculateDimensions() {
    const ringRect = this.ring.getBoundingClientRect();
    const handleRect = this.handle.getBoundingClientRect();
    
    this.ringCenter = {
      x: ringRect.left + ringRect.width / 2,
      y: ringRect.top + ringRect.height / 2
    };
    
    this.maxDistance = (ringRect.width - handleRect.width) / 2;
  }

  private updateVisualPosition() {
    // Convert normalized valueX/valueY back to pixel coordinates
    // valueX: -1.0 (left) to 1.0 (right)
    // valueY: -1.0 (bottom) to 1.0 (top) - note screen Y-axis goes down
    const dx = this.valueX * this.maxDistance;
    const dy = -this.valueY * this.maxDistance;
    
    this.handle.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private setupListeners() {
    this.zone.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  private onPointerDown(e: PointerEvent) {
    if (this.activePointerId !== null) return;
    
    this.activePointerId = e.pointerId;
    this.ring.classList.add('active');
    this.recalculateDimensions();
    
    this.processPointerPosition(e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent) {
    if (this.activePointerId !== e.pointerId) return;
    
    this.processPointerPosition(e.clientX, e.clientY);
  }

  private onPointerUp(e: PointerEvent) {
    if (this.activePointerId !== e.pointerId) return;
    
    this.activePointerId = null;
    this.ring.classList.remove('active');
    
    if (this.autoCenterX) {
      this.valueX = 0;
    }
    if (this.autoCenterY) {
      this.valueY = 0;
    }
    
    this.updateVisualPosition();
    this.onUpdate(this.valueX, this.valueY);
  }

  private processPointerPosition(clientX: number, clientY: number) {
    const dx = clientX - this.ringCenter.x;
    const dy = clientY - this.ringCenter.y;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let clampedDx = dx;
    let clampedDy = dy;
    
    if (distance > this.maxDistance) {
      const angle = Math.atan2(dy, dx);
      clampedDx = Math.cos(angle) * this.maxDistance;
      clampedDy = Math.sin(angle) * this.maxDistance;
    }
    
    // Normalize coordinates
    // valueX: -1.0 to 1.0
    // valueY: -1.0 to 1.0 (invert dy since screen Y increases downwards)
    this.valueX = clampedDx / this.maxDistance;
    this.valueY = -clampedDy / this.maxDistance;
    
    this.updateVisualPosition();
    this.onUpdate(this.valueX, this.valueY);
  }
}

// Telemetry DOM updates
const throttleEl = document.getElementById('telemetry-throttle');
const yawEl = document.getElementById('telemetry-yaw');
const pitchEl = document.getElementById('telemetry-pitch');
const rollEl = document.getElementById('telemetry-roll');

function updateTelemetryDisplay() {
  if (throttleEl) throttleEl.textContent = currentTelemetry.throttle.toFixed(2);
  if (yawEl) yawEl.textContent = currentTelemetry.yaw.toFixed(2);
  if (pitchEl) pitchEl.textContent = currentTelemetry.pitch.toFixed(2);
  if (rollEl) rollEl.textContent = currentTelemetry.roll.toFixed(2);
}

// Setup localized text on UI elements
function initLocalization() {
  const titleEl = document.getElementById('app-title');
  const simBtn = document.getElementById('btn-simulator');
  const ctrlBtn = document.getElementById('btn-controller');
  const buildBtn = document.getElementById('btn-builder');
  const knowBtn = document.getElementById('btn-knowledge');

  if (titleEl) titleEl.textContent = GameConfig.localization.title;
  if (simBtn) simBtn.querySelector('.btn-text')!.textContent = GameConfig.localization.btnSimulator;
  if (ctrlBtn) ctrlBtn.querySelector('.btn-text')!.textContent = GameConfig.localization.btnController;
  if (buildBtn) buildBtn.querySelector('.btn-text')!.textContent = GameConfig.localization.btnBuilder;
  if (knowBtn) knowBtn.querySelector('.btn-text')!.textContent = GameConfig.localization.btnKnowledge;
}

// App Initialization
function init() {
  initLocalization();

  // Initialize Left Joystick (Throttle - sticky vertical, Yaw - self-centering horizontal)
  new VirtualJoystick('joystick-left', {
    autoCenterX: true,
    autoCenterY: false, // sticky vertical Throttle
    initialY: -1.0,     // start throttle at bottom
    onUpdate: (x, y) => {
      // Store previous values for haptics sign-crossing check
      previousTelemetry = { ...currentTelemetry };

      // Left Stick X = Yaw (self-centering, apply deadzone)
      currentTelemetry.yaw = applyDeadzone(x, GameConfig.deadzone);

      // Left Stick Y = Throttle (sticky, no deadzone needed as it doesn't self-center)
      currentTelemetry.throttle = y;

      updateTelemetryDisplay();
      checkHapticFeedback();
    }
  });

  // Initialize Right Joystick (Pitch & Roll - both self-centering)
  new VirtualJoystick('joystick-right', {
    autoCenterX: true,
    autoCenterY: true,
    initialY: 0.0,
    onUpdate: (x, y) => {
      // Store previous values
      previousTelemetry = { ...currentTelemetry };

      // Right Stick X = Roll (self-centering, apply deadzone)
      currentTelemetry.roll = applyDeadzone(x, GameConfig.deadzone);

      // Right Stick Y = Pitch (self-centering, apply deadzone)
      currentTelemetry.pitch = applyDeadzone(y, GameConfig.deadzone);

      updateTelemetryDisplay();
      checkHapticFeedback();
    }
  });

  // Setup simple console.log notification for main navigation buttons
  // Using minimal logging as required by RULE[user_global]
  const buttons = ['btn-simulator', 'btn-controller', 'btn-builder', 'btn-knowledge'];
  buttons.forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('click', () => {
      // Small visual feedback or transition can be triggered here
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(20);
      }
    });
  });

  // Render initial display values
  updateTelemetryDisplay();
}

// Run app init once DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
