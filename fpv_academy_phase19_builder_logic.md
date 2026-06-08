# Role and Objective
You are implementing Phase 19 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to upgrade the "3D Builder" module by adding a central frame deck geometry, applying specific material colors, expanding the inventory UI width, adding a visual assembly progress tracker, and enforcing mechanical assembly logic (dependencies) with Toast popups.

# Execution Requirement
Apply these updates directly to the project. Do not break the transition between Simulator and Builder modes. Keep the local dev server running.

# Task 1: Aesthetic & UI Overhaul
1. **Background:** Change the `#builder-view` background to match the cinematic dark gradient theme used in the main menu (replace the plain blue).
2. **Inventory Panel Width:** Target the bottom `.glass-panel` inventory container in CSS. Set its width to `95vw` (or max available space) with `justify-content: space-evenly` so the buttons spread out beautifully across the screen bottom.

# Task 2: Frame Deck Geometry & Linear Slots
The camera and boards cannot float in the air.
1. Add a rectangular flat deck to the Frame `THREE.Group` (e.g., a `BoxGeometry` of `0.8 x 0.05 x 2.2` units, colored dark carbon grey).
2. Reposition the Slot nodes linearly along this new deck's Z-axis:
   - **Camera Slot:** Front edge of the deck.
   - **FC (Flight Controller) Slot:** Middle-front of the deck (behind the camera).
   - **ESC Slot:** Middle-back of the deck (behind the FC).
   - **Battery Slot:** On top of the deck / strapped across the top.
3. Update Mesh Colors when dropped:
   - Propellers MUST be Bright Lime/Salad Green (`0x88ff00`).
   - Motors MUST be Dark Blue (`0x00008b`).
   - FC and ESC boards MUST be Flat Green (`0x008000`).

# Task 3: Assembly Progress Tracker UI
1. Create a new compact, horizontal `.glass-panel` positioned fixed at the top of the screen (just under the "Конструктор дрона" title).
2. Inside it, render a visual checklist or counter: `Мотори: 0/4 | Пропелери: 0/4 | FC: 0/1 | ESC: 0/1 | Камера: 0/1 | Батарея: 0/1`.
3. Update these numbers dynamically inside the `pointerup` drop logic whenever an item is successfully attached to a slot.

# Task 4: Mechanical Assembly Dependencies & Popups
You cannot attach a propeller if there is no motor, and you cannot attach a battery if there is no FC/ESC.
1. **Toast Popup System:** Create a simple HTML/CSS temporary notification element (Toast) centered on the screen. Create a function `showToast(message)` that makes it visible with text for 2 seconds, then fades out.
2. **Dependency Logic inside `pointermove` and `pointerup`:**
   - Modify the slot snapping logic. Link each Propeller slot mechanically to its corresponding Motor slot.
   - **Rule 1:** If the user drags a Propeller and tries to snap it to a Propeller Slot, check if the Motor Slot directly below it is `occupied === true`. If NOT, block the snap, destroy the dragged item on release, and call `showToast("Спочатку встановіть двигун!")`.
   - **Rule 2:** If the user drags a Battery and tries to snap it, check if BOTH the FC and ESC slots are `occupied === true`. If NOT, block the snap, destroy the item, and call `showToast("Спочатку встановіть електроніку (FC та ESC)!")`.