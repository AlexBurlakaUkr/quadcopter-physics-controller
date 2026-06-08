# Role and Objective
You are fixing critical mobile-specific bugs for "FPV Academy" (Phase 10).
The user tested the Android build and reported: the Android navigation bar is visible, UI elements overlap in simulation mode, the 3D canvas doesn't resize correctly on screen rotation, and camera modes (LOS, Chase) are jittery and incorrectly smoothed.

# Execution Requirement (CRITICAL)
Apply these fixes exactly as described. Maintain the existing physics loop and GitHub Actions CI/CD setup.

# Task 1: True Fullscreen (Hide Android Nav Bar)
To hide the mobile status and navigation bars without extra Capacitor plugins, utilize the Web Fullscreen API.
1. Update the "Симулятор (3D)" button click listener in the Main Menu.
2. When the user clicks it, execute: `if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen().catch(e => console.log(e)); }`
3. When the user clicks the "Back to Menu" (Exit) button inside the simulation, exit fullscreen: `if (document.exitFullscreen) document.exitFullscreen();`.

# Task 2: Fix Screen Rotation (Resize Handler)
The 3D canvas currently breaks (shows a gray cutoff) when the device rotates from portrait to landscape.
1. Add a global resize event listener to update the Three.js renderer and camera.
2. Logic to add inside the event listener: set `camera.aspect = window.innerWidth / window.innerHeight`, call `camera.updateProjectionMatrix()`, and call `renderer.setSize(window.innerWidth, window.innerHeight)`.

# Task 3: Hard-Anchor UI Elements (Fix Overlapping)
The Debug/Axis values and the Camera/Reset buttons are overlapping on mobile landscape screens.
1. Ensure the container for `#sim-view` has `position: relative;`.
2. Target the Telemetry/Axis panel: apply `position: absolute; top: 15px; left: 15px; max-width: 40%; transform: none;`.
3. Target the Action Buttons container (Camera and Reset): apply `position: absolute; top: 15px; right: 15px; display: flex; gap: 10px; flex-direction: row; max-width: 50%; transform: none;`.

# Task 4: Jitter-Free Rigid Cameras (Rewrite Chase and LOS)
Remove ALL `camera.position.lerp()` calls. Lerp desyncs from the fixed physics step on 120Hz mobile screens, causing massive jitter. All cameras must be rigidly updated every frame.
Inside your render loop (AFTER syncing the droneMesh with the physics body):

**For 'FPV':**
Rigid mount exactly on the nose. Create offset `new THREE.Vector3(0, 0.1, -0.2)`. Apply `droneMesh.quaternion` to it. Add this offset to `droneMesh.position` and copy the result to `camera.position`. Finally, strictly copy drone rotation: `camera.quaternion.copy(droneMesh.quaternion);`.

**For 'CHASE':**
Rigid mount behind and above, mirroring drone rotation perfectly. Create offset `new THREE.Vector3(0, 1.5, 4.0)`. Apply `droneMesh.quaternion` to it. Add this offset to `droneMesh.position` and copy the result to `camera.position`. Finally, strictly copy drone rotation: `camera.quaternion.copy(droneMesh.quaternion);`.

**For 'LOS' (Line of Sight):**
Rigid global offset, completely ignoring drone rotation. Create offset `new THREE.Vector3(0, 3.0, 6.0)`. Add this offset to `droneMesh.position` and copy the result to `camera.position`. Finally, strictly point the camera at the drone: `camera.lookAt(droneMesh.position);`.