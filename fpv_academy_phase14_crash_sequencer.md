# Role and Objective
You are implementing Phase 14 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to upscale and rearrange the layout of the Info/Help panel and implement a timed sequencer for drone crashes to fix particle desynchronization.

# Execution Requirement
Apply these updates directly to the codebase without breaking the physics, landing gear, or CI/CD structures. Ensure the local development server remains active.

# Task 1: Upscale & Rearrange Info Help Panel
The user requests the help screen layout to be larger and more intuitive regarding axis directions.
1. Increase the overall scale of the `#info-modal` container and all inner elements (gimbal circles, arrows, fonts) by 30% using CSS.
2. Rearrange the layout labels for the two gimbal diagrams:
   - For Vertical axes (Throttle on Left, Pitch on Right): Keep the labels centered directly ABOVE or BELOW the circles.
   - For Horizontal axes (Yaw on Left, Roll on Right): Move the text labels strictly to the SIDES (e.g., "Yaw" to the left/right edge of the left circle, "Roll" to the left/right edge of the right circle).
3. Ensure arrow lines point accurately to these new side positions to explicitly communicate horizontal movement.

# Task 2: Timed Crash Sequencer & Spatial Spark Fix
Currently, on collision, the drone instantly teleports to start, causing the spark particles to spawn at the spawn point instead of the impact site.
1. Introduce a global state boolean: `isResetting = false;`.
2. Modify the crash trigger logic inside the animation/physics loop:
   - When a valid crash condition is met (rods or props hit an obstacle) AND `isResetting` is false:
     - Set `isResetting = true;`.
     - **Freeze the drone instantly at the exact impact spot:** Set `body.velocity.set(0,0,0)`, `body.angularVelocity.set(0,0,0)`, and temporarily ignore further gravity or stick forces while `isResetting` is true.
     - **Spawn Spark FX at the current impact position:** Trigger the multi-colored spark particles strictly at the drone's current world coordinates.
     - **Immediate Input Override:** Instantly set the logical control array values to absolute defaults (`Throttle = 0`, `Yaw = 0`, `Pitch = 0`, `Roll = 0`) and visually snap the touch joysticks back to their neutral positions (Throttle to bottom/zero) so the user cannot input movement during the crash view.
3. **The Sequencer Delay:** Implement a `setTimeout` delay of 3.5 seconds (3500ms).
   - While the timer runs, the camera must remain focused on the crashed drone mesh showing the fading spark particles.
   - Once the 3500ms timer finishes, teleport the drone to the safe spawn coordinates `(0, 0.25, 0)`, reset its physical velocities/quaternions to absolute zero, and set `isResetting = false;` to restore flight capabilities.