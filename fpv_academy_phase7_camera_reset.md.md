# Role and Objective
You are implementing Phase 7 of "FPV Academy" (Gemini 3.5 Flash High). 
The simulation physics, environment, shadows, and 3D drone models are working perfectly. 
Your CURRENT objective is to enhance the Reset mechanism to clear joystick inputs and implement a dynamic Camera View Switching system (LOS, Chase, FPV).

# Execution Requirement (CRITICAL)
Apply these updates directly to the codebase. Do not break the physics loops, ground checks, or the city generation from previous phases. Keep the dev server running.

# Task 1: Joystick Visual and Logical Reset
Currently, the "Reset Drone" button resets the physics body, but the virtual joysticks retain their last touch positions, causing immediate erratic movement after reset.
1. Update the "Reset Drone" button click handler.
2. When clicked, it must reset all logical input values to default: `Throttle = 0.0`, `Yaw = 0.0`, `Pitch = 0.0`, `Roll = 0.0`.
3. **Visual UI Sync:** Forcefully reset the visual state of the on-screen joysticks (whether using `nipplejs` methods or custom DOM manipulation). The joystick knobs/handles must snap back to their absolute visual centers (except Throttle, which snaps to its bottom/zero position).

# Task 2: Camera View Modes System
1. Create a global state variable `cameraMode` which can be `'LOS'`, `'CHASE'`, or `'FPV'`. Default is `'LOS'`.
2. Add a new `.glass-panel` button in the top UI bar labeled "Камера: LOS". Clicking this button must cycle through the modes: `LOS -> CHASE -> FPV -> LOS`, updating the button text dynamically (e.g., "Камера: Chase", "Камера: FPV").

3. **Implement Camera Logic inside the Animation Loop (after physics sync):**
   
   - **Mode 1: 'LOS' (Line of Sight - Current Logic)**
     - Camera stays at a fixed global offset behind/above the drone (e.g., `dronePosition + (0, 2, 5)`).
     - Camera smoothly lerps to this target position and calls `camera.lookAt(droneMesh.position)`.
     - *Behavior:* Camera follows the drone's position but ignores its rotation.
   
   - **Mode 2: 'CHASE' (Third-Person Chase Cam)**
     - Camera must follow both position AND rotation.
     - Calculate the target camera position by taking the drone's current position and offsetting it relative to the drone's *local* coordinate system (behind and slightly above the drone's nose direction).
     - Hint: Create a local offset vector `new THREE.Vector3(0, 1.5, 4)` and apply the drone's current quaternion to it, then add it to the drone's position.
     - Smoothly lerp the camera to this rotated target position.
     - Call `camera.lookAt(droneMesh.position)`.
   
   - **Mode 3: 'FPV' (First-Person View)**
     - Camera is rigidly locked to the front of the drone.
     - Set camera position exactly to the drone's center, plus a tiny forward offset along the drone's local nose direction (e.g., `new THREE.Vector3(0, 0.1, -0.2)` rotated by drone quaternion).
     - **CRITICAL:** Do NOT use lerp for FPV mode. The camera position and rotation must match the drone *instantly* every frame to simulate a hard-mounted camera feed: `camera.quaternion.copy(droneMesh.quaternion);`.

# Expected Output
The user can fly the drone, change views using the top button, and experience true FPV flight rotation. Pressing "Reset Drone" immediately stops the drone, centers it on the grid, and visually centers both joystick UI elements, resetting throttle to 0.