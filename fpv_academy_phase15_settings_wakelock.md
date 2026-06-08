# Role and Objective
You are implementing Phase 15 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to brighten the 3D scene environment, create a full-screen Glassmorphism Settings panel with dynamic camera property sliders (LOS/Chase distance and FPV tilt angle), and integrate the Web Wake Lock API to prevent the mobile screen from dimming or blocking during flight.

# Execution Requirement
Apply these updates directly to the project scripts and UI layout without altering the core physics loop, landing gear behaviors, or crash sequencers. Keep the local dev server running.

# Task 1: Environment Brightening & Fog Adjustment
The 3D scene is currently too dark and silhouettes objects harshly.
1. Increase the intensity of the `AmbientLight` to `1.2` and the `DirectionalLight` to `1.8` to illuminate all object faces properly.
2. Update the `scene.fog` configurations: Change the fog color to a very light grey or near-white (`0xe2e8f0`). 
3. If using linear fog, increase the near and far distances (e.g., `near = 100`, `far = 1000`) so the view is clear, open, and bright near the drone, fading naturally into a clean white horizon in the distance.

# Task 2: Fullscreen Settings Panel & Dynamic Sliders
1. **UI Navigation:** Add a new compact square Glassmorphism button labeled with the unicode symbol '⚙' on the top bar, positioned directly next to the 'ℹ' (Info) button on the same Y-axis line.
2. **Settings Modal Layout:** Clicking '⚙' must toggle open a full-screen Glassmorphism panel (`#settings-modal`) with a clear '✕' close button at the top corner.
3. **Sliders Integration:** Inside this modal, create 3 styled HTML range sliders with visible text readouts showing current values:
   - **Slider 1: LOS Camera Distance.** Range: `3.0` to `15.0`, step `0.5`. Default: `6.0`. Controls the Z/Y global offset distance of the Line of Sight camera.
   - **Slider 2: Chase Camera Distance.** Range: `2.0` to `8.0`, step `0.2`. Default: `3.5`. Controls the local Z offset backing away from the drone.
   - **Slider 3: FPV Camera Tilt Angle.** Range: `0` to `50` degrees, step `5`. Default: `25` degrees.
4. **Camera Matrix Calculations Update:** - Tie Sliders 1 and 2 directly to the distance offset vectors in your camera update loop.
   - **FPV Tilt Angle Logic:** In `'FPV'` mode, before copying the final quaternion to the camera, apply an extra local X-axis rotation offset based on the tilt angle slider value. Convert degrees to radians: `tiltRad = degrees * (Math.PI / 180)`. This tilts the camera gaze UP relative to the drone's nose, allowing the user to see the horizon clearly while pitched forward.

# Task 3: Screen Wake Lock Logic
Prevent the smartphone screen from locking or sleeping while the simulator scene is active.
1. Implement a global function `requestWakeLock()` utilizing the native Web API: `navigator.wakeLock.request('screen')`.
2. Automatically trigger this wake lock request whenever the user enters the `#sim-view`.
3. Handle visibility changes: If the user minimizes the app and returns, re-request the wake lock automatically: listen to the `visibilitychange` event, and if `document.visibilityState === 'visible'` and the view is `#sim-view`, call the lock function again.
4. Release the wake lock when the user exits the simulation back to the main menu.