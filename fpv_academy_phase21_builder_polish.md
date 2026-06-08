# Role and Objective
You are implementing Phase 21 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to fix layout offsets, align all builder panels on proper shared axes, introduce a global calibration config object for easy geometry adjustments, and make the background gradient spots smoothly transition and morph in color.

# Execution Requirement
Apply these modifications directly to the project code. Do not break the drag-and-drop system, component slots, or build pipelines. Keep the local dev server active.

# Task 1: Global Calibration Config Object & Deck Shrink
1. Create a global configuration object named `BUILDER_CONFIG` at the top of your builder script file. It must look exactly like this:
   const BUILDER_CONFIG = {
       deckWidth: 0.20,
       deckHeight: 0.03,
       deckDepth: 0.70,
       cameraDistance: 4.5
   };
2. Update the central drone deck creation logic to read directly from `BUILDER_CONFIG.deckWidth`, `BUILDER_CONFIG.deckHeight`, and `BUILDER_CONFIG.deckDepth`. This instantly scales down the giant deck to a realistic compact size, exposing the carbon arms.
3. Update the camera positions and linear slot spacing offsets to dynamically depend on these config properties.

# Task 2: Perfect UI Alignment & Shared Axis Centering
The canvas and UI panels are currently shifted and offset non-symmetrically.
1. Force the `#builder-view` container to have zero padding, zero margin, and hide any accidental overflows: `width: 100vw; height: 100vh; position: relative; overflow: hidden; margin: 0; padding: 0;`. Ensure the WebGL canvas aligns perfectly at `top: 0; left: 0;` without shifting the viewport.
2. **Top Bar Alignment:** Wrap the Top Title, Info button ('ℹ'), Settings button ('⚙'), and Exit button ('✕') inside a single unified top-bar container element. 
   - Apply CSS: `display: flex; justify-content: space-between; align-items: center; width: 95vw; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); z-index: 100;`.
   - Ensure all icons and buttons inside this top bar share the exact same vertical center line (Y-axis alignment).
3. **Progress Panel Centering:** Ensure the assembly progress tracker panel sits cleanly directly underneath this unified top-bar. Apply exact relative layout bounds: `position: absolute; top: 75px; left: 50%; transform: translateX(-50%); margin: 0; width: auto;`. Use flex centering for its internal child text nodes so it looks perfectly symmetrical.

# Task 3: Shifting/Morphing Background Colors (Fluid Animation)
The colorful glowing spots are currently static and do not animate.
1. Update the CSS for the `#builder-view` background glowing spots (or pseudo-elements like `::before` and `::after`).
2. Implement a smooth infinite keyframe animation using `filter: hue-rotate()` or animating background gradient coordinates:
   @keyframes fluidGlow {
       0% { transform: translate(0px, 0px) rotate(0deg); filter: hue-rotate(0deg); }
       50% { transform: translate(30px, -50px) scale(1.2) rotate(180deg); filter: hue-rotate(180deg); }
       100% { transform: translate(0px, 0px) rotate(360deg); filter: hue-rotate(360deg); }
   }
3. Apply this animation to the radial-gradient orbs with a long duration (e.g., `12s ease-in-out infinite alternate`) to create a gorgeous, smooth color-shifting aura effect behind the drone canvas.