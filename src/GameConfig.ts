export const GameConfig = {
  // Joystick Deadzone (3-5% from center)
  deadzone: 0.04, // 4% deadzone

  // Haptics
  vibrateDuration: 10, // ms
  vibrateEnabled: true,

  // Joystick Visual Settings
  joystickSize: 150, // width/height in px of joystick outer base
  handleSize: 60,    // width/height in px of inner joystick thumb handle
  joystickOffset: 50, // offset in px from screen bottom/sides

  // Physics and Drone parameters (Data-Driven)
  physics: {
    gravity: [0, -9.81, 0] as [number, number, number],
    droneMass: 1.3, // 1.3kg 7-inch combat drone
    droneDimensions: [0.5, 0.1, 0.5] as [number, number, number], // width, height, depth
    maxThrust: 15.0, // max upward force
    resetPosition: [0, 0.25, 0] as [number, number, number], // starting position resting on landing legs
    fixedTimeStep: 1 / 240, // decoupled physics timestep at 240Hz
    linearDamping: 0.1,
    angularDamping: 0.2,
  },

  // Flight Controller & PID Configurations
  flight: {
    maxPitchAngle: 0.6, // radians (~34 degrees)
    maxRollAngle: 0.6,  // radians (~34 degrees)
    maxYawRate: 3.0,    // radians/sec target rotation speed
    pidPitchRoll: {
      kp: 3.0,
      ki: 0.0,
      kd: 0.5,
    },
    camera: {
      lerpFactor: 0.1, // smooth follow interpolation factor
      offsetY: 3.0,    // vertical camera offset from drone
      offsetZ: 7.0,    // backward camera offset from drone
      chaseOffset: [0, 0.8, 3.5] as [number, number, number],
      fpvOffset: [0, 0.12, -0.22] as [number, number, number],
      fpvTilt: 0.20, // tilt camera down by ~11.5 degrees (0.20 rad)
      losOffset: [0, 3.0, 6.0] as [number, number, number]
    }
  },

  // Localization strings
  localization: {
    title: "FPV Academy",
    btnSimulator: "Симулятор (3D)",
    btnController: "Контролер для ПК",
    btnBuilder: "Конструктор дрона",
    btnKnowledge: "База знань",
    lblThrottle: "Throttle",
    lblYaw: "Yaw",
    lblPitch: "Pitch",
    lblRoll: "Roll",
    btnBack: "Назад в меню",
    btnReset: "Скинути дрон",
    lblCameraLOS: "Камера: LOS",
    lblCameraChase: "Камера: Chase",
    lblCameraFPV: "Камера: FPV",
    orientationPrompt: "Будь ласка, поверніть пристрій у горизонтальний режим для польоту.",
    viewControllerTitle: "Контролер для ПК",
    viewBuilderTitle: "Конструктор дрона",
    viewKnowledgeTitle: "База знань",
    comingSoon: "Цей розділ знаходиться в розробці...",
    infoTitle: "Режим керування: Mode 2",
    infoLeftTitle: "Лівий стік (Left Stick)",
    infoLeftItem1: "Газ (Throttle) — Вертикальна вісь (без автоцентрування)",
    infoLeftItem2: "Рискання (Yaw) — Горизонтальна вісь (з автоцентруванням)",
    infoRightTitle: "Правий стік (Right Stick)",
    infoRightItem1: "Тангаж (Pitch) — Вертикальна вісь (з автоцентруванням)",
    infoRightItem2: "Крен (Roll) — Горизонтальна вісь (з автоцентруванням)",
    lblGimbalLeftV: "Throttle (Тяга)",
    lblGimbalLeftH: "Yaw (Поворот)",
    lblGimbalRightV: "Pitch (Тангаж)",
    lblGimbalRightH: "Roll (Крен)",
  }
};

