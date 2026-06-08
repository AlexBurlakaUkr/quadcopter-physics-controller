# Role and Objective
You are implementing Phase 17 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to create the "3D Builder" (Конструктор) module. You will set up a separate Studio 3D scene, a Glassmorphism Inventory UI, and implement a custom Drag-and-Drop system using THREE.Raycaster with visual Slot Highlighting for assembling the drone.

# Execution Requirement
Apply these updates without breaking the Simulator view. The app must switch between the Simulator scene/physics and the Builder scene smoothly. Keep the dev server running.

# Task 1: Builder Scene & View Setup
1. Create a separate `builderScene = new THREE.Scene()` and a `builderCamera`.
2. Add soft studio lighting (`AmbientLight`, multiple `PointLights` for rim lighting).
3. Set up `OrbitControls` for the `builderCamera`.
4. Update your main render loop: if `currentView === 'builder'`, render `builderScene`; if `currentView === 'simulator'`, render the physics `scene`.
5. Spawn a central "Frame" mesh (e.g., a dark grey X-shape) in the `builderScene`.

# Task 2: The Slot System & Highlighting
1. Define Attachment Slots on the Frame. Create small, transparent spheres (`opacity: 0.3, color: 0x00ff00`) at specific local positions on the Frame:
   - 4 Motor Slots (at the ends of the 4 arms).
   - 1 Battery Slot (on top center).
2. Store these slots in an array and give them custom properties: `slot.userData = { type: 'motor', occupied: false }`.
3. Hide all slots by default (`visible = false`).

# Task 3: Inventory UI
1. Create a `.glass-panel` UI at the bottom of the `#builder-view` with horizontal scrolling.
2. Add dummy inventory buttons: "Motor 2806", "LiPo 6S".
3. When an inventory button is touched/clicked:
   - Instantiate a basic 3D mesh representing the item (e.g., a cylinder for a motor, a box for a battery).
   - Set global state `draggedItem` to this new mesh.
   - Loop through all Slots. If `slot.userData.type` matches the dragged item type and is NOT occupied, set `slot.visible = true` to highlight where it can go.

# Task 4: Drag, Drop, and Snap Mechanics (Raycasting)
1. Create an invisible drag plane (`THREE.Plane`) facing the camera at the Frame's depth.
2. Add `pointermove` (touch/mouse) listeners. If `draggedItem` exists, use `THREE.Raycaster` to find the intersection with the drag plane and move `draggedItem.position` to that intersection point.
3. **Snapping Logic:** During `pointermove`, calculate the distance between the `draggedItem` and all visible matching Slots. If the distance is less than a threshold (e.g., `0.5` units):
   - Visually snap the `draggedItem` to the Slot's exact position.
   - Make the Slot glow brighter or change color to indicate a valid connection.
4. Add `pointerup` listener:
   - If released while snapped to a Slot, attach the item to the Slot (add to Frame group), set `slot.userData.occupied = true`, and hide all slots.
   - If released far from any slot, destroy the `draggedItem` mesh and hide all slots.
   - Set `draggedItem = null`.