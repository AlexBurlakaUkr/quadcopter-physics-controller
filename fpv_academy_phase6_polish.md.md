# Role and Objective
You are optimizing and polishing the Three.js + Cannon-es integration for "FPV Academy" (Phase 6). 
The user reported camera jitter, unrealistic physics when falling upside down, lack of shadows, poor static object performance, and requested a better environment (a basic city/street layout).

# Execution Requirement (CRITICAL)
Apply these fixes directly to the codebase. Ensure the development server keeps running.

# Task 1: FixedUpdate Physics Sync & Camera Jitter Fix
The camera stutters because the physics step and camera tracking are out of sync.
1. Implement a proper fixed time step in your `requestAnimationFrame` loop using `clock.getDelta()`. Use `world.step(1/60, deltaTime, 3);`.
2. **Execution Order is CRITICAL:**
   - Step 1: Run `world.step()`.
   - Step 2: Sync the `droneMesh` position and quaternion from the `CANNON.Body`.
   - Step 3: ONLY AFTER the mesh is synced, calculate the camera's target position and apply `camera.position.lerp()`.
   - Step 4: Call `camera.lookAt(droneMesh.position)`.

# Task 2: Grounded "Upside Down" Crash Fix
Because the drone uses a Sphere collider, it rolls indefinitely when it crashes upside down.
1. In the animation loop, calculate the drone's local Up vector (e.g., apply the body's quaternion to `new THREE.Vector3(0,1,0)`).
2. Check if the drone is on the ground (`body.position.y <= 0.4`).
3. If grounded AND the Up vector's Y component is less than 0.2 (meaning it is tilted extremely or upside down), forcefully kill the rolling motion by setting `body.angularVelocity.set(0,0,0)` and drastically increase `body.linearDamping = 0.9` to simulate the drone scraping the ground and stopping.

# Task 3: Lighting, Shadows & Realism
1. Enable shadows in the renderer: `renderer.shadowMap.enabled = true;` and set `renderer.shadowMap.type = THREE.PCFSoftShadowMap;`.
2. Configure the `DirectionalLight`:
   - Set `light.castShadow = true;`.
   - Set light position high and angled (e.g., `(50, 100, 50)`).
   - Expand the shadow camera frustum to cover the play area: `light.shadow.camera.left = -50; light.shadow.camera.right = 50; light.shadow.camera.top = 50; light.shadow.camera.bottom = -50;`.
   - Set `mapSize.width` and `mapSize.height` to 2048 for crisp shadows.
3. Enable `castShadow = true` on all drone components.
4. Enable `receiveShadow = true` on the Ground plane.

# Task 4: Procedural Street Generation & Static Optimization
1. Replace the random columns with a `buildCity()` function.
2. Generate 30-50 "Buildings" (wide and tall boxes) forming a loose street layout.
3. Generate 5-10 "Arches" or "Gates" (two vertical boxes and one horizontal top box) that the drone can fly through.
4. **CRITICAL PERFORMANCE FIX:** For ALL static environment meshes (buildings, arches, ground):
   - Set `mesh.castShadow = true` and `mesh.receiveShadow = true`.
   - Set `mesh.matrixAutoUpdate = false;` and immediately call `mesh.updateMatrix();` after setting their position/scale. This prevents Three.js from recalculating static matrices every frame.
   - Create corresponding static `CANNON.Box` bodies for collision.