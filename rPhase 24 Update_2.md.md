# Role and Objective
You are implementing Phase 26 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to finalize the 3D Builder UI (Guided Step Tutorial highlighting with disabled states and cinematic rotation) and append 2 new comprehensive educational articles into the Knowledge Base array covering Flight Firmware, Ground Control Software, and Radio Control Systems.

# Execution Requirement
Apply these updates cleanly to the code files without breaking previous asset definitions or the simulator physical scene. Keep the local dev server running.

# Task 1: Finalizing Guided Assembly UX (Builder View)
Implement the precise tutorial flow and fix slot positioning for the arms as requested during the previous QA.
1. Ensure the 4 Arm Slots are perfectly mirrored on the bottom deck across 4 quadrants.
2. **Visual Step Guide Highlight:** Target the Top Progress Tracker UI. The `<span>` element matching the current active component type (e.g., `buildSteps[currentStepIndex]`) MUST have its style modified dynamically: `color: #f59e0b; font-size: 1.25em; font-weight: bold; text-shadow: 0 0 10px rgba(245, 158, 11, 0.5); transform: scale(1.1); display: inline-block;`.
3. **Button Lockout:** Explicitly loop through the bottom inventory list. If a button's component type is NOT equal to `buildSteps[currentStepIndex]`, force styles: `opacity: 0.2; pointer-events: none; filter: grayscale(1);`. Enable ONLY the single exact button needed for the current step.
4. **Cinematic View Rotation:** Once the final step (Battery) is mounted, execute `controls.autoRotate = true; controls.autoRotateSpeed = 3.0;`. Break this rotation loop completely on the first canvas touch/interaction event: `controls.autoRotate = false;`.

# Task 2: Knowledge Base Content Expansion
Append these 2 massive, well-formatted text blocks (Ukrainian) into your global articles data array:

1. Article 6: "Програмне забезпечення БПЛА (Прошивки та Налаштування)"
- Content: Огляд софту, що керує залізом квадрокоптера.
- Польотні прошивки (Flight Firmware): 
  1. **Betaflight** — найпопулярніша прошивка для FPV-дронів та камікадзе. Оптимізована під шалену швидкість обчислень (цикли PID до 8kHz), забезпечує миттєвий відгук.
  2. **INAV** — відгалуження Betaflight, але з фокусом на автопілот, утримання позиції по GPS та повернення додому. Ставиться на розвідувальні крила та великі дрони.
  3. **ArduPilot / PX4** — важкі промислові системи для складних автономних місій, картографії та великих БПЛА літакового типу.
- Конфігуратори (Ground Control Stations): Програми для ПК та смартфонів (**Betaflight Configurator**, **SpeedyBee**), які через USB або Bluetooth дозволяють налаштовувати реверси моторів, частоти відеопередавача, кути камери та параметри PID-стабілізації.

2. Article 7: "Системи радіокерування та Протоколи зв'язку"
- Content: Як пульт передає команди на дрон без затримок та глушіння.
- **ExpressLRS (ELRS):** Сучасний відкритий протокол (стандарт для Defense Tech). Працює на частотах 915MHz (краща пробивна здатність через перешкоди та дерева) або 2.4GHz (вища швидкість оновлення даних). Використовує модулі LoRa для екстремальної дальності зв'язку та стійкості до завад РЕБ.
- **TBS Crossfire / Tracer:** Потужні комерційні закриті системи від Team BlackSheep. Відомі своєю надійністю та плавністю лінку, працюють на частотах 868/915 MHz.
- Внутрішні протоколи (Receiver Protocols): Зв'язок між радіоприймачем (RX) та польотником (FC) на борту здійснюється через надшвидкісні цифрові шини даних **CRSF (Crossfire Protocol)** або **SBUS/IBUS**, що зводить затримку керування майже до нуля (менше 5 мілісекунд).

# Task 3: Render and UI Synchronization
1. Verify that the new cards display cleanly in the Grid Layout component inside `#knowledge-view`.
2. Ensure that inside `#article-modal`, text parsing handles headers (`<h3>`) or bold tags elegantly within the glass modal wrapper container