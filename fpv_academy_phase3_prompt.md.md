# Role and Objective
You are an advanced AI development agent (Gemini 3.5 Flash High). You are continuing the development of "FPV Academy". 
In Phases 1 & 2, you built the Cinematic-Glass UI and Mode 2 virtual joysticks. 
Your CURRENT objective (Phase 3) is to implement Single Page Application (SPA) view switching, mobile orientation handling, and the foundational 3D physics pipeline using `three` and `cannon-es`.

# Execution Requirement (CRITICAL)
Keep the development server running (`npm run dev`) so the user can preview the changes. Do not destroy the joystick logic from Phase 2.

# Task 1: SPA View Switching Architecture
1. Wrap the current UI into logical containers: `#main-menu-view`, `#sim-view`, etc.
2. Implement simple JS logic to toggle CSS classes (`.visible`, `.hidden`) on these containers based on menu button clicks.
3. When the user clicks "Симулятор (3D)", hide the main menu and show the joysticks. Add a "Back to Menu" button in the `#sim-view`.

# Task 2: Mobile Adaptation & Orientation Lock
1. Ensure all Glassmorphism panels are responsive (use `%`, `vw`, `vh`, and flexbox/grid).
2. Implement an Orientation Check for `#sim-view`: 
   - If the user is in `#sim-view` and the device is in portrait mode (check via window innerWidth/innerHeight or matchMedia `(orientation: portrait)`), display a full-screen Glassmorphism overlay with an icon/text saying: "Please rotate your device to landscape mode to fly."
   - Hide the joysticks while this overlay is active. Remove the overlay when rotated to landscape.

# Task 3: 3D & Physics Engine Integration
1. **Install Dependencies:** `npm install three cannon-es`
2. **Setup Three.js:** - Create a WebGLRenderer attached to a full-screen `<canvas>` positioned behind the UI (`z-index: -1`).
   - Add a PerspectiveCamera, ambient light, and directional light.
   - Add a `GridHelper` so the user has a visual reference for the ground.
3. **Setup Cannon-es:**
   - Create a physics `World` with Earth gravity (`world.gravity.set(0, -9.81, 0)`).
   - Create a static ground plane (Body) to prevent objects from falling infinitely.
4. **The "Drone" Prototype:**
   - Create a simple 3D Box mesh (e.g., `0.5 x 0.1 x 0.5` units) representing the drone.
   - Create a corresponding `CANNON.Body` (Box) with a mass of `0.7` (representing a 700g 7-inch drone). Position it slightly above the ground.
5. **The Physics Loop (Sync & Thrust):**
   - In your `requestAnimationFrame` loop, step the physics world (`world.step(1/60)`).
   - Sync the Three.js mesh position and quaternion with the Cannon-es body.
   - **Thrust Logic:** Read the current `Throttle` value (0.0 to 1.0) from the Phase 2 left joystick. Multiply this by a max thrust constant (e.g., `15.0`). Apply this calculated force upward (along the local Y-axis of the drone body) using `body.applyLocalForce()`.

# Expected Output
When the user clicks "Симулятор (3D)" in landscape mode, they should see a 3D box resting on a grid. Pushing the left stick UP (Throttle) should make the box physically lift off the ground. Letting go should make it fall back down.