# Role and Objective
You are continuing the development of "FPV Academy" (Phase 4). 
Currently, the SPA has a working UI, Mode 2 joysticks, and a Three.js + Cannon-es 3D scene where the joystick controls the upward thrust of a box.
Your CURRENT objective is to implement the "Flight Controller" logic using a PID controller for stabilization (Pitch, Roll) and Yaw rotation, and to make the camera follow the drone.

# Execution Requirement (CRITICAL)
Keep the development server running (`npm run dev`). DO NOT break the existing UI, View Switching, or the base Thrust logic.

# Task 1: Basic PID Controller Implementation
1. Create a simple `PIDController` class or function that stores `P`, `I`, and `D` gains, and an `integral` and `previousError` state.
2. It should have a `calculate(setpoint, measured, dt)` method that returns the required correction force.

# Task 2: Flight Dynamics (Pitch, Roll, Yaw)
In the main animation loop, implement the flight controller logic before stepping the physics world:
1. **Target Angles:** - Map the Right Stick Y-axis (Pitch) to a target angle (e.g., -0.6 to 0.6 radians).
   - Map the Right Stick X-axis (Roll) to a target angle (e.g., -0.6 to 0.6 radians).
   - Map the Left Stick X-axis (Yaw) to a target rotation rate.
2. **Current Angles:** Extract the current Pitch and Roll (Euler angles) from the `CANNON.Body` quaternion.
3. **Calculate Torques:** - Instantiate three PID controllers (for Pitch, Roll, and Yaw). Use safe default values (e.g., P=3.0, I=0.0, D=0.5) to avoid explosive physics glitches.
   - Feed the target angles and current angles into the PID controllers to get the required torque for each axis.
4. **Apply Torques:** Use `body.applyLocalTorque(new CANNON.Vec3(pitchTorque, yawTorque, rollTorque))` to apply the rotational forces to the drone body.

# Task 3: Camera Follow System
1. Update the Three.js camera position in the animation loop so it follows behind and slightly above the drone body.
2. Calculate a target position for the camera based on the drone's position (e.g., offset by `z = +5`, `y = +2`).
3. Use `camera.position.lerp(targetPosition, 0.1)` for smooth camera tracking.
4. Ensure the camera always looks at the drone: `camera.lookAt(droneMesh.position)`.

# Expected Output
When testing in `#sim-view`:
1. Pushing the right stick forward should tilt the box forward (Pitch) without flipping over completely. It should stabilize at an angle.
2. Releasing the right stick should automatically level the box back to 0 degrees.
3. Pushing the left stick up (Thrust) while tilting should make the box fly forward.
4. The camera should smoothly follow the box as it flies around the 3D grid.