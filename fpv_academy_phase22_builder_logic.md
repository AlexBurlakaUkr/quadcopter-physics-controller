# Role and Objective
You are implementing Phase 22 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to fix mobile scrolling/aspect ratio bugs, deconstruct the base frame to strictly follow a realistic FPV build order (Bottom Deck -> Arms -> ESC -> FC -> VTX/RX -> Top Deck -> Battery), and implement a "Win State" with visual confetti and synthesized ESC startup audio.

# Execution Requirement
Apply these updates directly to the project. Maintain all CI/CD, styling, and simulator view functionality. Keep the local dev server running.

# Task 1: Mobile UX & Aspect Ratio Fixes
1. **Scroll vs Drag Conflict:** Update the `pointerdown` / `pointermove` logic on the inventory `.glass-panel`. 
   - On initial touch, store `startX` and `startY`. 
   - Do NOT instantiate the `draggedItem` mesh until the user's finger has moved UP/OUT of the inventory panel bounds, OR use a distance threshold. If the user moves horizontally (`Math.abs(currentX - startX) > 10`), treat it as scrolling and cancel the item drag.
2. **Landscape Aspect Ratio:** Ensure the `window.addEventListener('resize')` absolutely recalculates `camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();` for BOTH the `simulatorCamera` and `builderCamera`.
3. **UI Scaling:** Add CSS media queries (`@media (orientation: landscape)`) to slightly shrink font sizes and button dimensions in the `#builder-view` to save screen space.

# Task 2: Advanced Assembly Logic & New Inventory
1. **Deconstruct Initial Frame:** The base `Frame` group should now ONLY contain the Bottom Deck plate. Remove the arms from the base mesh.
2. **Update Inventory List:** The inventory must include: `Промінь (Arm)`, `Мотор`, `ESC`, `FC`, `Камера`, `VTX`, `RX Приймач`, `Верхня Дека`, `Пропелер`, `Батарея`. (Combine duplicates: 1 "Arm" button can spawn a mesh that snaps to any of the 4 arm slots).
3. **Define New Slots & Geometry:**
   - 4 Arm Slots on the bottom deck.
   - 1 ESC Slot (center of bottom deck).
   - 1 FC Slot (strictly offset *above* the ESC on the Y-axis).
   - 1 Camera Slot (front).
   - 1 VTX Slot (directly behind the camera).
   - 1 RX Slot (rear of bottom deck). Mesh: flat board with a thin cylinder (antenna) angled 50 degrees backward (`rotation.x = Math.PI * -0.27`).
   - 1 Top Deck Slot (covers everything, aligned with bottom deck but higher on Y-axis).

# Task 3: The Strict Dependency Tree
Update the `pointerup` and Toast notification logic. Enforce these mechanical rules:
1. `Motor` requires `Arm` in that specific quadrant.
2. `Propeller` requires `Motor`.
3. `FC` requires `ESC` to be installed first.
4. `VTX` and `RX` require the Bottom Deck.
5. `Top Deck` can ONLY be installed if `FC`, `VTX`, and `RX` are installed. Toast: "Встановіть всю електроніку перед закриттям рами!"
6. `Battery` can ONLY be installed if the `Top Deck` is installed. Toast: "Батарея кріпиться тільки на верхню деку!"
7. Update the top Progress Tracker UI to reflect all these new components.

# Task 4: Win State (ESC Audio & Visuals)
1. **Assembly Check:** Upon successful placement of the final component (when all tracking numbers max out), trigger a `celebrateBuild()` function.
2. **Synthesized Audio:** Use the browser's `AudioContext` to generate the classic BLHeli/Betaflight startup tones mathematically (do not load external files).
   - Sequence: 3 short, rapid beeps at same frequency (e.g., 800Hz), followed by a lower tone (400Hz) and a higher tone (1200Hz).
3. **Visual FX:** Create a temporary particle system (Confetti or Sparkles) bursting upward from the center of the completed drone. Loop an animation expanding their positions and dropping their opacity over 3 seconds, then remove them from the scene.