# Role and Objective
You are optimizing and debugging the Android build of "FPV Academy" (Gemini 3.5 Flash High). 
The user tested the app on an Android device and reported several issues regarding UI alignment, non-fullscreen canvas, laggy/stuttering physics loop on mobile, and overlapping text.

# Execution Requirement (CRITICAL)
Apply these fixes directly to the index.html, CSS, and main JavaScript logic. Keep the configuration for building via GitHub Actions intact.

# Task 1: Immersive Fullscreen (Capacitor Android)
The Android status bar and navigation bar are preventing the game from stretching to 100% full screen.
1. Add/Ensure the Capacitor StatusBar plugin is used or configure the app configuration. 
2. In your CSS/JS, make sure the `canvas` and top-level SPA view containers utilize `100dvh` (Dynamic Viewport Height) and `100vw`.
3. Force the body to hide overflow completely: `body { margin: 0; padding: 0; overflow: hidden; width: 100vw; height: 100vh; height: 100dvh; }`.

# Task 2: UI Overlapping & Alignment Fixes
1. **Main Menu:** Update the main menu container CSS. Ensure it uses Flexbox with `display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100dvh; width: 100vw;` to perfectly center the menu panel both vertically and horizontally.
2. **Simulation View UI Layout:** - The debug data text, "Reset" button, and "Camera" button are overlapping.
   - **Fix:** Separate them layout-wise. Move the Debug/Telemetry values panel to the Top-Left corner using `position: absolute; top: 10px; left: 10px;`.
   - Move the "Reset Drone" and "Camera View" buttons to the Top-Right corner using `position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;`.
   - This ensures the top center is completely clear and elements never cross paths.

# Task 3: Fixed Physics Stuttering (High-Hz Mobile Screen Fix)
The stuttering on mobile is caused by `requestAnimationFrame` running at variable refresh rates (e.g., 90Hz or 120Hz on modern phones) while the physics step expects a fixed frame time.
1. Implement a delta-time accumulator logic for the Cannon-es physics step to decouple frame rendering from simulation update rates.
2. Use a fixed time-step inside a `while` loop:
   ```javascript
   const FIXED_TIME_STEP = 1 / 60;
   let timeAccumulator = 0;
   
   // inside render loop:
   timeAccumulator += deltaTime;
   while (timeAccumulator >= FIXED_TIME_STEP) {
       world.step(FIXED_TIME_STEP);
       timeAccumulator -= FIXED_TIME_STEP;
   }