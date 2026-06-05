import './style.css';
import { GameConfig } from './GameConfig';
import { SimEngine } from './SimEngine';

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
    
    this.valueX = clampedDx / this.maxDistance;
    this.valueY = -clampedDy / this.maxDistance;
    
    this.updateVisualPosition();
    this.onUpdate(this.valueX, this.valueY);
  }
}

// Telemetry DOM elements
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

// SPA View Management
type ViewName = 'main-menu' | 'sim' | 'controller' | 'builder' | 'knowledge';
let currentView: ViewName = 'main-menu';
let simEngine: SimEngine | null = null;

function switchView(targetView: ViewName) {
  currentView = targetView;

  const views: Record<ViewName, HTMLElement | null> = {
    'main-menu': document.getElementById('main-menu-view'),
    'sim': document.getElementById('sim-view'),
    'controller': document.getElementById('controller-view'),
    'builder': document.getElementById('builder-view'),
    'knowledge': document.getElementById('knowledge-view')
  };

  const ambientBg = document.getElementById('ambient-background');

  // Toggle active-view class for all views
  (Object.keys(views) as ViewName[]).forEach((key) => {
    const el = views[key];
    if (!el) return;

    if (key === targetView) {
      el.classList.remove('hidden-view');
      el.classList.add('active-view');
    } else {
      el.classList.remove('active-view');
      el.classList.add('hidden-view');
    }
  });

  // Manage SimEngine and background visuals
  if (targetView === 'sim') {
    ambientBg?.classList.add('hidden');
    simEngine?.start();
    simEngine?.reset();
  } else {
    ambientBg?.classList.remove('hidden');
    simEngine?.stop();
  }

  // Update orientation check for the current view state
  checkOrientation();
}

// Mobile Adaptation: Device Orientation Check
function checkOrientation() {
  const overlay = document.getElementById('orientation-overlay');
  const joystickOverlay = document.getElementById('virtual-controller-overlay');
  
  if (currentView !== 'sim') {
    overlay?.classList.remove('visible');
    overlay?.classList.add('hidden-overlay');
    return;
  }

  // Portrait mode: height > width
  const isPortrait = window.innerHeight > window.innerWidth;

  if (isPortrait) {
    overlay?.classList.remove('hidden-overlay');
    overlay?.classList.add('visible');
    joystickOverlay?.classList.add('hidden');
  } else {
    overlay?.classList.remove('visible');
    overlay?.classList.add('hidden-overlay');
    joystickOverlay?.classList.remove('hidden');
  }
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

  // Back buttons
  const backSim = document.getElementById('back-btn-text-sim');
  const backCtrl = document.getElementById('back-btn-text-ctrl');
  const backBuild = document.getElementById('back-btn-text-build');
  const backKnow = document.getElementById('back-btn-text-know');

  if (backSim) backSim.textContent = GameConfig.localization.btnBack;
  if (backCtrl) backCtrl.textContent = GameConfig.localization.btnBack;
  if (backBuild) backBuild.textContent = GameConfig.localization.btnBack;
  if (backKnow) backKnow.textContent = GameConfig.localization.btnBack;

  // Placeholder texts
  const ctrlTitle = document.getElementById('ctrl-view-title');
  const ctrlDesc = document.getElementById('ctrl-view-desc');
  const buildTitle = document.getElementById('build-view-title');
  const buildDesc = document.getElementById('build-view-desc');
  const knowTitle = document.getElementById('know-view-title');
  const knowDesc = document.getElementById('know-view-desc');

  if (ctrlTitle) ctrlTitle.textContent = GameConfig.localization.viewControllerTitle;
  if (ctrlDesc) ctrlDesc.textContent = GameConfig.localization.comingSoon;
  
  if (buildTitle) buildTitle.textContent = GameConfig.localization.viewBuilderTitle;
  if (buildDesc) buildDesc.textContent = GameConfig.localization.comingSoon;

  if (knowTitle) knowTitle.textContent = GameConfig.localization.viewKnowledgeTitle;
  if (knowDesc) knowDesc.textContent = GameConfig.localization.comingSoon;

  // Orientation prompt
  const orientText = document.getElementById('orientation-text');
  if (orientText) orientText.textContent = GameConfig.localization.orientationPrompt;
}

// App Initialization
function init() {
  initLocalization();

  // Initialize Simulator 3D Engine
  try {
    simEngine = new SimEngine('sim-canvas');
  } catch (err) {
    console.error('Failed to initialize 3D SimEngine:', err);
  }

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

      // Pass throttle state to SimEngine
      simEngine?.updateThrottle(y);
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

  // Setup SPA navigation button bindings with vibration feedback
  const navBindings: Record<string, ViewName> = {
    'btn-simulator': 'sim',
    'btn-controller': 'controller',
    'btn-builder': 'builder',
    'btn-knowledge': 'knowledge'
  };

  Object.entries(navBindings).forEach(([btnId, viewName]) => {
    const el = document.getElementById(btnId);
    el?.addEventListener('click', () => {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(20);
      }
      switchView(viewName);
    });
  });

  // Back button bindings
  const backButtons = [
    { id: 'btn-back-to-menu-sim', target: 'main-menu' as ViewName },
    { id: 'btn-back-to-menu-ctrl', target: 'main-menu' as ViewName },
    { id: 'btn-back-to-menu-build', target: 'main-menu' as ViewName },
    { id: 'btn-back-to-menu-know', target: 'main-menu' as ViewName }
  ];

  backButtons.forEach(({ id, target }) => {
    const el = document.getElementById(id);
    el?.addEventListener('click', () => {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      }
      switchView(target);
    });
  });

  // Orientation and Resize listeners
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  // Render initial display values
  updateTelemetryDisplay();
}

// Run app init once DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
