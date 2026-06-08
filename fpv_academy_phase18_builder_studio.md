# Role and Objective
You are upgrading the "3D Builder" module for "FPV Academy" (Gemini 3.5 Flash High Phase 18). 
Your objective is to transform the builder scene into a brightly lit studio with a gradient background, enable 360-degree camera inspection using OrbitControls without conflicting with drag actions, and expand the inventory with 4 new components: FPV Camera, Propellers, Flight Controller (FC), and ESC.

# Execution Requirement
Apply these modifications cleanly to the builder view state. Ensure switching between the Simulator and Builder remains seamless. Keep the local dev server active.

# Task 1: Studio Lighting & Gradient Background
1. Configure the WebGL renderer for the builder view to enable transparency: `alpha: true` or clear alpha parameters so the HTML background shines through.
2. Update the `#builder-view` CSS container to display a premium cinematic gradient background: `background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);`.
3. Brighten the studio space: Remove harsh shadows or dark directional setups in the builder scene. Add an `AmbientLight(0xffffff, 0.9)` and two `DirectionalLight` sources: one from the front-top-left `(5, 10, 5)` at intensity `1.2`, and a rim light from behind `(-5, 5, -5)` at intensity `0.8` to catch component edges cleanly.

# Task 2: Inspection Orbit Controls & Drag Conflict Fix
1. Instantiate `OrbitControls` tied specifically to the `builderCamera` and the renderer DOM element.
2. **Conflict Prevention Logic:** Orbiting and dragging items simultaneously will break the UX. 
   - When a user selects/touches an inventory item to begin dragging (`pointerdown` / `touchstart`), set `controls.enabled = false;`.
   - When the user releases the item (`pointerup` / `touchend`), set `controls.enabled = true;`.
3. This setup ensures that if a user swipes empty studio space, they rotate the camera smoothly to examine the drone, but if they pull a component, they drag it fluidly.

# Task 3: Inventory Expansion & New Slot Definitions
Expand the inventory array and define matching physical slots on the main Frame model group.
1. **Update UI List:** Add 4 new inventory item buttons to the bottom list: "FPV Камера", "Пропелери", "Польотний Контролер (FC)", "Регулятор Обертів (ESC)".
2. **Define New Slot Nodes on the Frame:**
   - **Camera Slot:** 1 slot at the absolute FRONT of the frame body. Visual mesh placeholder: a small blue sphere indicator.
   - **ESC Slot:** 1 slot at the bottom-center deck of the frame. Visual placeholder mesh: small purple sphere indicator.
   - **FC Slot:** 1 slot positioned directly ABOVE the ESC slot (creating the electronic stack) in the center. Visual placeholder mesh: small orange sphere indicator.
   - **4 Propeller Slots:** 4 slots located vertically slightly ABOVE the 4 existing Motor slots. Set `slot.userData = { type: 'propeller', occupied: false }`.

# Task 4: Component Meshes Custom Geometry
When dragging these items, generate simple distinctive geometric structures instead of plain boxes:
1. **FPV Камера:** A small cylinder/cube combo mimicking a camera lens lens pointing forward.
2. **Регулятор (ESC) & Польотник (FC):** Flat square boards (e.g., `0.3 x 0.02 x 0.3` units). ESC colored dark green, FC colored blue with tiny pins.
3. **Пропелери:** Thin, long flattened oval boxes representing a 2-blade or 3-blade prop shape.
4. Ensure the snap-to-slot logic correctly scales and aligns these meshes upon connection release.