# Role and Objective
You are debugging, upgrading, and refining the Three.js + Cannon-es integration for "FPV Academy" (Phase 5). 
The user requires a more realistic FPV quadcopter 3D model with spinning rotors, a fix for the drone rolling on the ground, a rewrite of the Yaw logic, and environmental upgrades.

# Execution Requirement (CRITICAL)
Apply these fixes to the existing codebase and keep the dev server running.

# Task 1: Engine Stability & Realistic Ground Physics
1. Disable Cannon-es sleep optimization to prevent the drone from randomly ignoring inputs: `world.allowSleep = false;`
2. Change the drone's `CANNON.Body` shape from a `CANNON.Box` to a `CANNON.Sphere` (radius ~0.3).
3. Increase damping on the drone body to simulate air resistance: `body.linearDamping = 0.3; body.angularDamping = 0.3;`
4. **CRITICAL GROUND CHECK:** Implement a ground detection check in the animation loop before applying PID torques. 
   - Check if the drone is on the ground (e.g., `body.position.y <= 0.35`).
   - If it IS on the ground, strictly IGNORE and DO NOT apply Pitch, Roll, and Yaw torques. The drone must only be allowed to tilt and rotate when it is airborne (or when throttle is sufficient to lift off). This prevents the sphere collider from rolling around like a ball when grounded.

# Task 2: Yaw Logic Rewrite (Rate Mode instead of Angle Mode)
The current Yaw PID causes jerky movements due to Euler angle wrap-around. 
1. Remove the PID controller for Yaw entirely. 
2. Map the Left Stick X-axis directly to a target **Angular Velocity** (Rate) around the drone's local Y-axis.
3. Apply direct torque or directly manipulate `body.angularVelocity.y` based on stick input, ensuring smooth continuous rotation left and right. (Pitch and Roll must remain as PID controllers for self-leveling).

# Task 3: High-Fidelity 3D Drone Model & Animation
Replace the single red box with a realistic quadcopter `THREE.Group`:
1. **Central Body:** A dark grey box.
2. **4 Arms:** Thin cylinders or boxes extending diagonally from the center.
3. **Front Indicator:** Add a bright green element (e.g., a "camera" lens or block) strictly on the FRONT of the central body so the user knows orientation.
4. **4 Rotors (Propellers):** Create 4 flat, semi-transparent cylinders (`opacity: 0.5, transparent: true`) positioned at the ends of the 4 arms. Store references to these 4 meshes in an array (e.g., `droneRotors`).
5. **Rotor Animation:** In the `requestAnimationFrame` loop, rotate the 4 rotor meshes around their local Y-axis. The speed of rotation MUST scale with the current `Throttle` input from the left stick (if throttle is 0, they can spin very slowly to simulate "armed" state, and spin rapidly when throttle increases).

# Task 4: Environment & UI Reset
1. **The Environment:** - Increase the `GridHelper` size: `new THREE.GridHelper(2000, 200, 0x888888, 0x444444)`.
   - Procedurally scatter 50-100 tall `THREE.Mesh` columns (cylinders/boxes, heights 5 to 20) around the grid (X/Z range -200 to +200) with matching static `CANNON.Body` colliders.
2. **UI Reset Button:** Add a Glassmorphism button labeled "Reset Drone" in the `#sim-view`. On click, reset the drone's physical state:
   - `body.position.set(0, 2, 0);`
   - `body.velocity.set(0, 0, 0);`
   - `body.quaternion.set(0, 0, 0, 1);`
   - `body.angularVelocity.set(0, 0, 0);`
   - Reset any integral variables in Pitch/Roll PID controllers to 0.