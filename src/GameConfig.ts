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
  }
};
