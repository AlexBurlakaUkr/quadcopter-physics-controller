# Role and Objective
You are optimizing and adding realistic military/combat FPV drone features for "FPV Academy" (Gemini 3.5 Flash High Phase 11). 
Your objective is to fix layout stretching on Xiaomi devices, overhaul the simulation UI, tune flight weight/gravity parameters, and add 3D electrical initiation rods to the front of the drone.

# Execution Requirement
Apply these fixes exactly as described. Maintain the existing physics loop structure, city assets, and CI/CD config. Ensure the server keeps running.

# Task 1: Complete Screen Immersive Mode (Xiaomi Navigation Strip Fix)
The gesture navigation strip is still visible on some Android devices (like Xiaomi).
1. Force the body and the WebGL canvas to fully ignore safe-area restrictions: use style `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; width: 100dvw; height: 100dvh; overflow: hidden; padding: 0; margin: 0;`.
2. In the HTML meta viewport tag, ensure `viewport-fit=cover` is explicitly defined.

# Task 2: UI Overhaul & Absolute Alignment
1. **Telemetry Panel:** Move the telemetry/debug data text panel from the corners to the bottom center of the screen, placed exactly in the gap between the Left and Right virtual joysticks. Style it as a sleek, low-profile horizontal Glassmorphism bar at the absolute bottom.
2. **Top Action Buttons:** Align all top utility buttons along the exact same vertical Y-axis. 
   - Convert them into compact, square buttons (e.g., width 45px, height 45px).
   - Remove ALL text labels from these buttons.
   - Use simple high-contrast icons or unicode symbols instead: '📹' for Camera Cycle, '↺' for Reset Drone, and '✕' for Exit to Main Menu.

# Task 3: Realistic Mass Physics Tuning (Fix Weightlessness)
Currently, the drone feels too floaty and drops too slowly when throttle is cut.
1. Change the drone's `CANNON.Body` mass from `0.7` to `1.3` (representing a true 7-inch combat drone layout with battery).
2. Tweak the engine properties: ensure that when the Left Stick Throttle is at `0`, the calculated thrust force applied to the physics engine is absolute `0` (no residual floating thrust).
3. Set `body.linearDamping = 0.1` and `body.angularDamping = 0.2` to allow the drone to drop rapidly and realistically under gravity when power is disabled.

# Task 4: FPV Initiation Rods & Camera Adjustment
Real combat FPV drones carry two long wire loops/rods in front for electric circuit detonation initiation upon impact.
1. **3D Mesh Additions:** Inside the drone's `THREE.Group`, add two long, thin metal-colored cylinders (diameter ~4-5mm, length 0.35 units in world space) extending directly out from the FRONT of the drone's frame.
2. **Physics Colliders:** Register corresponding static or compound `CANNON.Box` or `CANNON.Cylinder` shapes attached to the main drone body covering these rods. Collision with any obstacle or building must register a crash.
3. **FPV Camera Realignment:** Update the `'FPV'` camera view tracking parameters. Shift the camera positioning slightly backward and higher on the drone's frame, and tilt it slightly down so that the drone's front structure and the two long initiation rods are clearly visible protruding out from the bottom center of the screen during flight.
4. **Chase Camera Alignment:** Ensure the `'CHASE'` camera also locks rigid rotation perfectly matching this new mesh orientation.