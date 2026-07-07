import './style.css';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
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

// Screen Wake Lock State
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err: any) {
      console.error(`Wake Lock request failed: ${err.message}`);
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (err: any) {
      console.error(`Wake Lock release failed: ${err.message}`);
    }
  }
}

// Listen to visibility changes to re-request wake lock
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentView === 'sim') {
    requestWakeLock();
  }
});

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

  public reset(initialY?: number) {
    this.valueX = 0;
    this.valueY = initialY !== undefined ? initialY : 0.0;
    this.updateVisualPosition();
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
let joystickLeft: VirtualJoystick | null = null;
let joystickRight: VirtualJoystick | null = null;
let fadeOverlay: HTMLElement | null = null;

const BUILD_STEPS = ['arm', 'esc', 'fc', 'camera', 'vtx', 'rx', 'motor', 'top_deck', 'battery', 'propeller'];

function updateInventoryLockout(stepIndex: number) {
  const activeType = BUILD_STEPS[stepIndex] || '';
  const inventoryPanel = document.getElementById('builder-inventory');
  const inventoryBtns = inventoryPanel?.querySelectorAll('.inventory-item-btn');
  inventoryBtns?.forEach(btn => {
    const type = btn.getAttribute('data-type');
    const htmlBtn = btn as HTMLButtonElement;
    if (type === activeType) {
      htmlBtn.style.opacity = '1.0';
      htmlBtn.style.pointerEvents = 'auto';
    } else {
      htmlBtn.style.opacity = '0.4';
      htmlBtn.style.pointerEvents = 'none';
    }
  });
}

function transitionToView(viewName: ViewName, shouldFullscreen: boolean = false) {
  if (!fadeOverlay) {
    if (shouldFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(e => console.error(e));
    }
    switchView(viewName);
    return;
  }

  fadeOverlay.classList.add('visible');

  setTimeout(() => {
    if (shouldFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(e => console.error(e));
    } else if (!shouldFullscreen && document.exitFullscreen) {
      if (currentView === 'sim') {
        document.exitFullscreen().catch(e => console.error(e));
      }
    }
    
    switchView(viewName);

    setTimeout(() => {
      fadeOverlay?.classList.remove('visible');
    }, 150);
  }, 350);
}

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
  if (targetView === 'sim' || targetView === 'builder') {
    ambientBg?.classList.add('hidden');
    simEngine?.setViewMode(targetView === 'sim' ? 'simulator' : 'builder');
    simEngine?.start();
    if (targetView === 'sim') {
      simEngine?.reset();
      requestWakeLock();
    } else {
      releaseWakeLock();
      updateInventoryLockout(simEngine?.currentStepIndex || 0);
    }
  } else {
    ambientBg?.classList.remove('hidden');
    simEngine?.stop();
    releaseWakeLock();
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
  const resetBtnText = document.getElementById('reset-btn-text');

  if (backSim) backSim.textContent = GameConfig.localization.btnBack;
  if (backCtrl) backCtrl.textContent = GameConfig.localization.btnBack;
  if (backBuild) backBuild.textContent = GameConfig.localization.btnBack;
  if (backKnow) backKnow.textContent = GameConfig.localization.btnBack;
  if (resetBtnText) resetBtnText.textContent = GameConfig.localization.btnReset;

  // Placeholder texts
  const ctrlTitle = document.getElementById('ctrl-view-title');
  const ctrlDesc = document.getElementById('ctrl-view-desc');
  const buildTitle = document.getElementById('build-view-title');
  const knowTitle = document.getElementById('know-view-title');
  const knowDesc = document.getElementById('know-view-desc');

  if (ctrlTitle) ctrlTitle.textContent = GameConfig.localization.viewControllerTitle;
  if (ctrlDesc) ctrlDesc.textContent = GameConfig.localization.comingSoon;
  
  if (buildTitle) buildTitle.textContent = GameConfig.localization.viewBuilderTitle;
  const builderInstructions = document.getElementById('builder-instructions-text');
  if (builderInstructions) builderInstructions.textContent = GameConfig.localization.builderInstructions;
  const builderResetText = document.getElementById('builder-reset-text');
  if (builderResetText) builderResetText.textContent = GameConfig.localization.builderReset;

  const invMotorName = document.getElementById('inv-item-motor-name');
  if (invMotorName) invMotorName.textContent = GameConfig.localization.invItemMotorName;
  const invMotorDesc = document.getElementById('inv-item-motor-desc');
  if (invMotorDesc) invMotorDesc.textContent = GameConfig.localization.invItemMotorDesc;

  const invBatteryName = document.getElementById('inv-item-battery-name');
  if (invBatteryName) invBatteryName.textContent = GameConfig.localization.invItemBatteryName;
  const invBatteryDesc = document.getElementById('inv-item-battery-desc');
  if (invBatteryDesc) invBatteryDesc.textContent = GameConfig.localization.invItemBatteryDesc;

  const invCameraName = document.getElementById('inv-item-camera-name');
  if (invCameraName) invCameraName.textContent = GameConfig.localization.invItemCameraName;
  const invCameraDesc = document.getElementById('inv-item-camera-desc');
  if (invCameraDesc) invCameraDesc.textContent = GameConfig.localization.invItemCameraDesc;

  const invESCName = document.getElementById('inv-item-esc-name');
  if (invESCName) invESCName.textContent = GameConfig.localization.invItemESCName;
  const invESCDesc = document.getElementById('inv-item-esc-desc');
  if (invESCDesc) invESCDesc.textContent = GameConfig.localization.invItemESCDesc;

  const invFCName = document.getElementById('inv-item-fc-name');
  if (invFCName) invFCName.textContent = GameConfig.localization.invItemFCName;
  const invFCDesc = document.getElementById('inv-item-fc-desc');
  if (invFCDesc) invFCDesc.textContent = GameConfig.localization.invItemFCDesc;

  const invPropName = document.getElementById('inv-item-prop-name');
  if (invPropName) invPropName.textContent = GameConfig.localization.invItemPropName;
  const invPropDesc = document.getElementById('inv-item-prop-desc');
  if (invPropDesc) invPropDesc.textContent = GameConfig.localization.invItemPropDesc;

  if (knowTitle) knowTitle.textContent = GameConfig.localization.viewKnowledgeTitle;
  if (knowDesc) knowDesc.textContent = GameConfig.localization.comingSoon;

  // Orientation prompt
  const orientText = document.getElementById('orientation-text');
  if (orientText) orientText.textContent = GameConfig.localization.orientationPrompt;

  // Camera switcher
  const cameraBtnText = document.getElementById('camera-btn-text');
  if (cameraBtnText) cameraBtnText.textContent = GameConfig.localization.lblCameraLOS;

  // Help Modal translations
  const infoTitle = document.getElementById('info-title');
  const lblGimbalLeftV = document.getElementById('lbl-gimbal-left-v');
  const lblGimbalLeftH = document.getElementById('lbl-gimbal-left-h');
  const lblGimbalRightV = document.getElementById('lbl-gimbal-right-v');
  const lblGimbalRightH = document.getElementById('lbl-gimbal-right-h');

  if (infoTitle) infoTitle.textContent = GameConfig.localization.infoTitle;
  if (lblGimbalLeftV) lblGimbalLeftV.textContent = GameConfig.localization.lblGimbalLeftV;
  if (lblGimbalLeftH) lblGimbalLeftH.textContent = GameConfig.localization.lblGimbalLeftH;
  if (lblGimbalRightV) lblGimbalRightV.textContent = GameConfig.localization.lblGimbalRightV;
  if (lblGimbalRightH) lblGimbalRightH.textContent = GameConfig.localization.lblGimbalRightH;

  // Settings Modal translations
  const settingsTitle = document.getElementById('settings-title');
  const lblLOSDistance = document.getElementById('lbl-los-distance');
  const lblChaseDistance = document.getElementById('lbl-chase-distance');
  const lblFPVTilt = document.getElementById('lbl-fpv-tilt');
  const lblLeftJoystickX = document.getElementById('lbl-left-joystick-x');
  const lblRightJoystickX = document.getElementById('lbl-right-joystick-x');

  if (settingsTitle) settingsTitle.textContent = GameConfig.localization.settingsTitle;
  if (lblLOSDistance) lblLOSDistance.textContent = GameConfig.localization.lblLOSDistance;
  if (lblChaseDistance) lblChaseDistance.textContent = GameConfig.localization.lblChaseDistance;
  if (lblFPVTilt) lblFPVTilt.textContent = GameConfig.localization.lblFPVTilt;
  if (lblLeftJoystickX) lblLeftJoystickX.textContent = GameConfig.localization.lblLeftJoystickX;
  if (lblRightJoystickX) lblRightJoystickX.textContent = GameConfig.localization.lblRightJoystickX;
}

// App Initialization
function init() {
  if (Capacitor.isNativePlatform()) {
    StatusBar.hide().catch(err => console.error('Failed to hide status bar:', err));
  }

  initLocalization();
  fadeOverlay = document.getElementById('fade-overlay');

  // Initialize Simulator 3D Engine
  try {
    simEngine = new SimEngine('sim-canvas');
    simEngine.onCrash = () => {
      // Reset logical telemetry variables
      previousTelemetry = { ...currentTelemetry };
      currentTelemetry = {
        throttle: -1.0, // starts at bottom
        yaw: 0.0,
        pitch: 0.0,
        roll: 0.0
      };
      updateTelemetryDisplay();

      // Reset visual joystick knob/handle positions
      joystickLeft?.reset(-1.0); // snaps to bottom
      joystickRight?.reset(0.0); // snaps to center
    };
  } catch (err) {
    console.error('Failed to initialize 3D SimEngine:', err);
  }

  // Initialize Left Joystick (Throttle - sticky vertical, Yaw - self-centering horizontal)
  joystickLeft = new VirtualJoystick('joystick-left', {
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

      // Pass all controls to SimEngine
      simEngine?.updateControls(
        currentTelemetry.throttle,
        currentTelemetry.yaw,
        currentTelemetry.pitch,
        currentTelemetry.roll
      );
    }
  });

  // Initialize Right Joystick (Pitch & Roll - both self-centering)
  joystickRight = new VirtualJoystick('joystick-right', {
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

      // Pass all controls to SimEngine
      simEngine?.updateControls(
        currentTelemetry.throttle,
        currentTelemetry.yaw,
        currentTelemetry.pitch,
        currentTelemetry.roll
      );
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
      const isSim = btnId === 'btn-simulator';
      transitionToView(viewName, isSim);
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
      if (id === 'btn-back-to-menu-sim') {
        const infoModal = document.getElementById('info-modal');
        infoModal?.classList.add('hidden-modal');
        const settingsModal = document.getElementById('settings-modal');
        settingsModal?.classList.add('hidden-modal');
      }
      transitionToView(target, false);
    });
  });

  // Info/Help Modal Toggles
  const btnInfo = document.getElementById('btn-info');
  const btnCloseInfo = document.getElementById('btn-close-info');
  const infoModal = document.getElementById('info-modal');

  const openInfoModal = () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    infoModal?.classList.remove('hidden-modal');
    simEngine?.stop();
  };

  btnInfo?.addEventListener('click', openInfoModal);

  btnCloseInfo?.addEventListener('click', () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    infoModal?.classList.add('hidden-modal');
    simEngine?.start();
  });

  // Settings Modal Toggles
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsModal = document.getElementById('settings-modal');

  const openSettingsModal = () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    settingsModal?.classList.remove('hidden-modal');
    simEngine?.stop();
  };

  btnSettings?.addEventListener('click', openSettingsModal);

  btnCloseSettings?.addEventListener('click', () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    settingsModal?.classList.add('hidden-modal');
    simEngine?.start();
  });

  // Sliders Input Bindings
  const sliderLOS = document.getElementById('slider-los-distance') as HTMLInputElement;
  const readoutLOS = document.getElementById('readout-los-distance');
  const sliderChase = document.getElementById('slider-chase-distance') as HTMLInputElement;
  const readoutChase = document.getElementById('readout-chase-distance');
  const sliderFPVTilt = document.getElementById('slider-fpv-tilt') as HTMLInputElement;
  const readoutFPVTilt = document.getElementById('readout-fpv-tilt');
  const sliderLeftX = document.getElementById('slider-left-joystick-x') as HTMLInputElement;
  const readoutLeftX = document.getElementById('readout-left-joystick-x');
  const sliderRightX = document.getElementById('slider-right-joystick-x') as HTMLInputElement;
  const readoutRightX = document.getElementById('readout-right-joystick-x');

  const joystickLeftEl = document.getElementById('joystick-left');
  const joystickRightEl = document.getElementById('joystick-right');

  // Load saved camera settings from localStorage if they exist
  const savedLOS = localStorage.getItem('fpv_academy_los_distance');
  if (savedLOS !== null) {
    GameConfig.flight.camera.losDistance = parseFloat(savedLOS);
  }
  const savedChase = localStorage.getItem('fpv_academy_chase_distance');
  if (savedChase !== null) {
    GameConfig.flight.camera.chaseDistance = parseFloat(savedChase);
  }
  const savedFPVTilt = localStorage.getItem('fpv_academy_fpv_tilt');
  if (savedFPVTilt !== null) {
    GameConfig.flight.camera.fpvTiltDegrees = parseInt(savedFPVTilt, 10);
  }
  const savedLeftX = localStorage.getItem('fpv_academy_left_joystick_x');
  if (savedLeftX !== null) {
    GameConfig.flight.camera.leftJoystickXOffset = parseInt(savedLeftX, 10);
  }
  const savedRightX = localStorage.getItem('fpv_academy_right_joystick_x');
  if (savedRightX !== null) {
    GameConfig.flight.camera.rightJoystickXOffset = parseInt(savedRightX, 10);
  }

  const updateLOSFromSlider = () => {
    const val = parseFloat(sliderLOS.value);
    GameConfig.flight.camera.losDistance = val;
    localStorage.setItem('fpv_academy_los_distance', val.toString());
    if (readoutLOS) readoutLOS.textContent = `${val.toFixed(1)}m`;
    simEngine?.updateCamera();
  };

  const updateChaseFromSlider = () => {
    const val = parseFloat(sliderChase.value);
    GameConfig.flight.camera.chaseDistance = val;
    localStorage.setItem('fpv_academy_chase_distance', val.toString());
    if (readoutChase) readoutChase.textContent = `${val.toFixed(1)}m`;
    simEngine?.updateCamera();
  };

  const updateFPVTiltFromSlider = () => {
    const val = parseInt(sliderFPVTilt.value, 10);
    GameConfig.flight.camera.fpvTiltDegrees = val;
    localStorage.setItem('fpv_academy_fpv_tilt', val.toString());
    if (readoutFPVTilt) readoutFPVTilt.textContent = `${val}°`;
    simEngine?.updateCamera();
  };

  const updateLeftJoystickXFromSlider = () => {
    const val = parseInt(sliderLeftX.value, 10);
    GameConfig.flight.camera.leftJoystickXOffset = val;
    localStorage.setItem('fpv_academy_left_joystick_x', val.toString());
    if (readoutLeftX) readoutLeftX.textContent = `${val}px`;
    if (joystickLeftEl) joystickLeftEl.style.left = `${val}px`;
  };

  const updateRightJoystickXFromSlider = () => {
    const val = parseInt(sliderRightX.value, 10);
    GameConfig.flight.camera.rightJoystickXOffset = val;
    localStorage.setItem('fpv_academy_right_joystick_x', val.toString());
    if (readoutRightX) readoutRightX.textContent = `${val}px`;
    if (joystickRightEl) joystickRightEl.style.right = `${val}px`;
  };

  sliderLOS?.addEventListener('input', updateLOSFromSlider);
  sliderChase?.addEventListener('input', updateChaseFromSlider);
  sliderFPVTilt?.addEventListener('input', updateFPVTiltFromSlider);
  sliderLeftX?.addEventListener('input', updateLeftJoystickXFromSlider);
  sliderRightX?.addEventListener('input', updateRightJoystickXFromSlider);

  // Initialize slider values
  if (sliderLOS) {
    sliderLOS.value = GameConfig.flight.camera.losDistance.toString();
    updateLOSFromSlider();
  }
  if (sliderChase) {
    sliderChase.value = GameConfig.flight.camera.chaseDistance.toString();
    updateChaseFromSlider();
  }
  if (sliderFPVTilt) {
    sliderFPVTilt.value = GameConfig.flight.camera.fpvTiltDegrees.toString();
    updateFPVTiltFromSlider();
  }
  if (sliderLeftX) {
    sliderLeftX.value = GameConfig.flight.camera.leftJoystickXOffset.toString();
    updateLeftJoystickXFromSlider();
  }
  if (sliderRightX) {
    sliderRightX.value = GameConfig.flight.camera.rightJoystickXOffset.toString();
    updateRightJoystickXFromSlider();
  }

  // Reset Button handler
  const resetBtn = document.getElementById('btn-reset-drone');
  resetBtn?.addEventListener('click', () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(25);
    }
    // Reset logical telemetry variables
    previousTelemetry = { ...currentTelemetry };
    currentTelemetry = {
      throttle: -1.0, // starts at bottom
      yaw: 0.0,
      pitch: 0.0,
      roll: 0.0
    };
    updateTelemetryDisplay();

    // Reset visual joystick knob/handle positions
    joystickLeft?.reset(-1.0); // snaps to bottom
    joystickRight?.reset(0.0); // snaps to center

    // Pass cleared controls to SimEngine
    simEngine?.updateControls(
      currentTelemetry.throttle,
      currentTelemetry.yaw,
      currentTelemetry.pitch,
      currentTelemetry.roll
    );

    // Reset physics body
    simEngine?.reset();
  });

  // Camera View Mode Switcher handler
  const cameraBtn = document.getElementById('btn-camera-mode');
  cameraBtn?.addEventListener('click', () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    if (simEngine) {
      const mode = simEngine.cycleCameraMode();
      cameraBtn.setAttribute('aria-label', `Камера: ${mode}`);
      const txtEl = document.getElementById('camera-btn-text');
      if (txtEl) {
        if (mode === 'LOS') {
          txtEl.textContent = GameConfig.localization.lblCameraLOS;
        } else if (mode === 'CHASE') {
          txtEl.textContent = GameConfig.localization.lblCameraChase;
        } else if (mode === 'FPV') {
          txtEl.textContent = GameConfig.localization.lblCameraFPV;
        }
      }
    }
  });

  // Builder Drag and Drop handlers (Phase 17/18, updated Phase 22, hybrid click/spawn Phase 23)
  const inventoryPanel = document.getElementById('builder-inventory');
  const inventoryBtns = inventoryPanel?.querySelectorAll('.inventory-item-btn');

  let isPendingDrag = false;
  let dragType: 'motor' | 'battery' | 'camera' | 'esc' | 'fc' | 'propeller' | 'arm' | 'vtx' | 'rx' | 'top_deck' | null = null;
  let startX = 0;
  let startY = 0;
  let dragStarted = false;

  const onInventoryPointerDown = (e: PointerEvent, type: 'motor' | 'battery' | 'camera' | 'esc' | 'fc' | 'propeller' | 'arm' | 'vtx' | 'rx' | 'top_deck') => {
    e.stopPropagation(); // Prevent OrbitControls drag start
    
    if (e.pointerType === 'mouse') {
      // Desktop mouse users: start dragging immediately
      e.preventDefault();
      if (simEngine && currentView === 'builder') {
        simEngine.startDragging(type, e.clientX, e.clientY);
      }
    } else {
      // Touch users: defer to allow scrolling
      isPendingDrag = true;
      dragType = type;
      startX = e.clientX;
      startY = e.clientY;
      dragStarted = false;
    }
  };

  window.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isPendingDrag || !dragType) return;

    if (!dragStarted) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      if (dx > 10) {
        // Horizontal movement - treat as scroll, cancel pending drag
        isPendingDrag = false;
        dragType = null;
        return;
      }

      // Check if finger moved out of bounds or beyond vertical threshold
      const rect = inventoryPanel?.getBoundingClientRect();
      const isOut = rect ? (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) : false;

      if (dy > 15 || isOut) {
        dragStarted = true;
        e.preventDefault(); // Lock scroll now that drag has officially started
        if (simEngine && currentView === 'builder') {
          simEngine.startDragging(dragType, e.clientX, e.clientY);
        }
      }
    } else {
      e.preventDefault(); // Prevent scrolling once drag is active
    }
  }, { passive: false });

  window.addEventListener('pointerup', () => {
    if (isPendingDrag && !dragStarted && dragType) {
      // Clean tap on touch device: spawn at screen center
      if (simEngine && currentView === 'builder') {
        simEngine.startDragging(dragType, window.innerWidth / 2, window.innerHeight / 2);
      }
    }
    isPendingDrag = false;
    dragType = null;
    dragStarted = false;
  });

  inventoryBtns?.forEach(btn => {
    const type = btn.getAttribute('data-type') as 'motor' | 'battery' | 'camera' | 'esc' | 'fc' | 'propeller' | 'arm' | 'vtx' | 'rx' | 'top_deck';
    btn.addEventListener('pointerdown', (e) => onInventoryPointerDown(e as PointerEvent, type));
  });

  if (simEngine) {
    simEngine.onStepChange = (index: number) => {
      updateInventoryLockout(index);
    };
  }


  // Reset Builder handler
  const resetBuilderBtn = document.getElementById('btn-reset-builder');
  resetBuilderBtn?.addEventListener('click', () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    simEngine?.resetBuilder();
  });

  const preventOrbitConflict = (e: Event) => {
    e.stopPropagation();
  };
  resetBuilderBtn?.addEventListener('pointerdown', preventOrbitConflict);
  resetBuilderBtn?.addEventListener('mousedown', preventOrbitConflict);

  const backBuildBtn = document.getElementById('btn-back-to-menu-build');
  backBuildBtn?.addEventListener('pointerdown', preventOrbitConflict);
  backBuildBtn?.addEventListener('mousedown', preventOrbitConflict);

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
