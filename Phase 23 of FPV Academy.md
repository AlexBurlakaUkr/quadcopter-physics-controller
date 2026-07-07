# Role and Objective
You are implementing Phase 23 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to fix the mobile inventory click bug, correctly mirror the 4 Arm slot positions, build a "Lollipop" RX antenna pointing backward, and implement a strict Guided Assembly sequence (Step-by-Step Tutorial) with a cinematic auto-rotating Win State.

# Execution Requirement
Apply these updates directly to the project. Do not break existing studio lighting, backgrounds, or UI styling. Keep the local dev server running.

# Task 1: Fix Inventory Mobile Click/Scroll Bug
Custom pointer events are destroying native mobile scrolling and tapping.
1. Remove the custom `startX`/`startY` scroll-cancellation logic from the inventory panel.
2. Rely on pure CSS for scrolling: Ensure the inventory `.glass-panel` has `overflow-x: auto; -webkit-overflow-scrolling: touch; pointer-events: auto;`.
3. Change the item generation trigger on the inventory buttons strictly to a standard `click` event. When a user clicks a button, instantiate the `draggedItem` mesh at a default center-screen position (or attached directly to a central raycast plane) ready to be dragged, bypassing touch-scroll interference entirely.

# Task 2: Fix Arm Geometry & "Lollipop" Antenna
1. **Arm Slots (X-Frame Fix):** The arms currently overlap. Explicitly define 4 separate Arm Slots on the bottom deck using perfectly mirrored coordinates. For example:
   - Front-Left: `(-deckWidth/2, 0, -deckDepth/3)`, rotated outwards.
   - Front-Right: `(deckWidth/2, 0, -deckDepth/3)`, rotated outwards.
   - Back-Left: `(-deckWidth/2, 0, deckDepth/3)`, rotated outwards.
   - Back-Right: `(deckWidth/2, 0, deckDepth/3)`, rotated outwards.
2. **RX Antenna Update:** Rotate the RX slot/mesh 180 degrees (`Math.PI`) so the antenna points backwards (towards the +Z axis). Add a small `SphereGeometry` at the very tip of the antenna cylinder to simulate a "Lollipop/Cherry" 5.8GHz/900MHz antenna shape.

# Task 3: Guided Assembly Logic (Step-by-Step Progress)
Create a strict linear progression state machine.
1. Define the assembly sequence array: `const buildSteps = ['Arm', 'Motor', 'ESC', 'FC', 'Camera', 'VTX', 'RX', 'Top Deck', 'Propeller', 'Battery'];`
2. Track the `currentStepIndex` (starting at 0).
3. **Top Progress UI:** Inside the progress tracker, wrap each component text in a `<span>`. The span corresponding to the `currentStepIndex` MUST be styled dynamically: `color: #fbbf24; font-size: 1.2em; font-weight: bold; transition: all 0.3s;`. Other spans remain standard white.
4. **Bottom Inventory UI Lockout:** Loop through all bottom inventory buttons. If a button's type does NOT match the `buildSteps[currentStepIndex]`, disable it (`opacity: 0.4; pointer-events: none;`). If it matches, enable it (`opacity: 1.0; pointer-events: auto;`).
5. **Progression Trigger:** Inside your `pointerup` snap logic, when the required quantity of the current component is reached (e.g., 4 arms, 1 ESC), increment `currentStepIndex++` and instantly update both the Top and Bottom UIs. (You can now remove the old complex dependency rules/toasts, as the UI actively prevents selecting the wrong item).

# Task 4: Cinematic Auto-Rotate Win State
1. When `currentStepIndex` exceeds the final item (Battery is placed), trigger the `celebrateBuild()` function (Audio + Confetti).
2. Inside `celebrateBuild()`, activate camera auto-rotation: `controls.autoRotate = true; controls.autoRotateSpeed = 3.0;`.
3. Add a one-time interaction listener to the WebGL canvas (e.g., `pointerdown` or `touchstart`). When the user touches the screen to inspect their finished drone, immediately stop the rotation: `controls.autoRotate = false;`.