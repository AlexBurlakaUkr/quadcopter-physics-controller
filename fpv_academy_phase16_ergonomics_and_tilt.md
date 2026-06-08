# Role and Objective
You are implementing Phase 16 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to overhaul the Line-of-Sight (LOS) camera behavior to smoothly track the drone's direction without tilting, expand the full-screen Settings panel with horizontal joystick position adjusters, and mechanically link the 3D initiation rods to the FPV camera tilt angle.

# Execution Requirement
Apply these updates directly to the project code without disrupting the physics step loops, crash sequencers, or automated landing gear retraction. Keep the local dev server active.

# Task 1: Horizontal-Locked LOS Camera Tracking
The current rigid global static offset for LOS mode is non-intuitive. Change it to an intelligent directional tracking camera.
1. In `'LOS'` camera mode, the camera must actively follow behind the drone's position based on the drone's horizontal movement vector.
2. **Rotation Constraint:** The camera must rotate smoothly around the world Y-axis (Yaw) to always face the rear/back of the drone frame as it changes course. 
3. **Horizon Lock:** Strictly ignore the drone's Pitch (X-axis rotation) and Roll (Z-axis rotation) inside the LOS calculation loop. The camera orientation matrix must remain completely level with the world ground grid horizon at all times.

# Task 2: Joystick Ergonomics (X-Axis Position Sliders)
Add custom positioning variables to allow players to adjust joystick placement away from screen edges for better thumb reach.
1. **Settings Panel Update:** Inside the `#settings-modal`, add 2 new HTML range sliders with live numeric value text feedback:
   - **Slider 4: Left Joystick X-Offset.** Range: `10px` to `120px`, step `5px`. Default: `30px`. Controls the CSS `left` styling property of the Left joystick DOM container.
   - **Slider 5: Right Joystick X-Offset.** Range: `10px` to `120px`, step `5px`. Default: `30px`. Controls the CSS `right` styling property of the Right joystick DOM container.
2. **DOM Event Binding:** Attach input listeners to these sliders. As the user moves the sliders, instantly update the corresponding CSS `.style.left` and `.style.right` pixel positions of the target joystick containers so the user can visually calibrate their alignment.

# Task 3: Syncing Detonation Rods with FPV Camera Tilt
Currently, when tilting the FPV camera upward via the settings slider, the detonation rods disappear below the screen view. They must be linked to the camera tilt vector.
1. In your 3D drone initialization logic, group the two long thin metal initiation rod meshes together or isolate them so their local orientation can be altered.
2. **Tilt Synchronization Loop:** In the main render loop, read the current FPV Camera Tilt Angle value from the settings slider state.
3. Apply the exact same target tilt rotation angle (radians calculated from the slider degrees) around the local X-axis of the initiation rods group.
4. When the user increases the FPV tilt angle to look up, the rods must tilt upward simultaneously by the same angle. This ensures that in `'FPV'` camera view, the tips of the initiation rods remain perfectly visible protruding from the bottom of the user's screen layout.