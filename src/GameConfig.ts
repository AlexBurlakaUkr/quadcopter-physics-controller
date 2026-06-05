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
    droneMass: 0.7, // 700g 7-inch drone prototype
    droneDimensions: [0.5, 0.1, 0.5] as [number, number, number], // width, height, depth
    maxThrust: 15.0, // max upward force
    resetPosition: [0, 2.0, 0] as [number, number, number], // starting position above the ground
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
    orientationPrompt: "Будь ласка, поверніть пристрій у горизонтальний режим для польоту.",
    viewControllerTitle: "Контролер для ПК",
    viewBuilderTitle: "Конструктор дрона",
    viewKnowledgeTitle: "База знань",
    comingSoon: "Цей розділ знаходиться в розробці...",
  }
};

