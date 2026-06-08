# Role and Objective
You are implementing Phase 20 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to polish the 3D Builder UI and geometry based on user QA. You will implement an animated, glowing gradient background, shrink the oversized central deck, and fix the alignment of the progress tracker panel.

# Execution Requirement
Apply these updates directly to the project. Do not break the drag-and-drop logic or dependencies. Keep the local dev server running.

# Task 1: Animated Glowing Background (CSS)
1. The user wants the `#builder-view` background to match the premium menu background with shifting/glowing light spots.
2. Apply an animated CSS setup to `#builder-view`. Use a combination of a base dark background and pseudo-elements (`::before`, `::after`) with large `radial-gradient` glowing spots (e.g., subtle neon blue, cyan, or violet).
3. Add a CSS `@keyframes` animation to these glowing spots so they slowly move, expand, or shift colors over a 10-15 second infinite loop.
4. Ensure the `z-index` and `opacity` are set so the 3D WebGL canvas (`alpha: true`) renders perfectly on top of this animated background.

# Task 2: Resize the Oversized Frame Deck
1. The central rectangular deck added in the previous phase is way too large and completely covers the X-frame arms.
2. Reduce its `BoxGeometry` dimensions significantly. Change it to roughly `0.35 x 0.04 x 1.0` units (Width x Height x Depth) so it represents only the central core of a real FPV drone frame, leaving the arms fully exposed.
3. Adjust the specific Z-axis positions of the Camera, FC, and ESC slots to fit securely onto this newly shortened deck layout.

# Task 3: Center the Progress Tracker UI
1. The top horizontal assembly progress panel is currently shifted to the right.
2. Target its CSS class/ID. Apply precise absolute horizontal centering: `position: absolute; left: 50%; transform: translateX(-50%);`. 
3. Adjust its `top` or `margin-top` value so it sits neatly just below the "Конструктор дрона" title.
4. Ensure the internal items are evenly spaced (`display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;`).