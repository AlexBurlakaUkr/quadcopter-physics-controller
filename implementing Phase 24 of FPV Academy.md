# Role and Objective
You are implementing Phase 24 of "FPV Academy" (Gemini 3.5 Flash High). 
Your objective is to build the "Knowledge Base" (База знань) module. You will create a new separate UI view with a mobile-responsive grid of category cards, a master-detail article reader using Glassmorphism, and a scalable JSON-like data structure populated with real FPV educational content.

# Execution Requirement
Apply these updates directly to the SPA logic. Ensure smooth view switching between Main Menu, Simulator, Builder, and Knowledge Base. Keep the local dev server running.

# Task 1: View Setup & Navigation
1. Create a new main container `<div id="knowledge-view" class="view hidden">` with the same cinematic animated background as the Builder view.
2. Add a unified Top Bar inside this view containing the title "База знань" and an '✕' (Exit) button to return to the Main Menu.

# Task 2: Data Structure (The Content)
Create a global array of article objects. Populate it with the following comprehensive FPV data (in Ukrainian):
1. **Article 1:** Title: "Класифікація БПЛА". Content: Describe main types: 1. FPV-камікадзе (7-10 inches, one-way, cheap). 2. Скидачі/Бомбери (Heavy lifters like "Vampire/Baba Yaga", reusable). 3. Крила (Fixed-wing, long range reconnaissance/strike like Leleka/Zala). 4. Мавіки (DJI Mavic, quadcopters with gimbal cameras for recon).
2. **Article 2:** Title: "Маркування Моторів". Content: Explain dimensions and speed. E.g., "2806.5 1300KV". '28' is stator diameter in mm. '06.5' is stator height in mm. 'KV' is RPM per 1 Volt. Lower KV = more torque, higher KV = more speed. 
3. **Article 3:** Title: "Маркування Пропелерів". Content: Explain sizes like "7040". '70' means 7.0 inches diameter. '40' means 4.0 inches of pitch (how far it moves forward in one rotation).
4. **Article 4:** Title: "Акумулятори (Батареї)". Content: Explain "6S2P" (6 cells in Series for voltage, 2 in Parallel for capacity). Contrast LiPo (high current burst, good for freestyle) vs Li-Ion (high capacity, good for long-range cruising). Explain 'C-rating' (discharge rate).

# Task 3: The Catalog UI (Grid Layout)
1. Inside `#knowledge-view`, create a scrollable container for the catalog (`padding-top: 80px`, `overflow-y: auto`).
2. Generate a responsive CSS Grid (`grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))`, `gap: 15px`).
3. Loop through the article array and render a `.glass-panel` Card for each article. The card should have a bold title and a short preview snippet of the text.

# Task 4: The Article Reader (Detail Modal)
1. Create an `#article-modal` full-screen glass overlay (hidden by default).
2. Add a '🔙 Назад' button at the top of this modal.
3. When a user clicks a Card in the catalog:
   - Inject the full article Title and Content into the `#article-modal` inner container.
   - For image support, if the article object contains an `imageUrl`, render an `<img>` tag at the top of the content. (Use generic placeholders for now, e.g., `https://via.placeholder.com/600x300?text=FPV+Image`).
   - Show the modal with a smooth fade-in/slide-up CSS transition.
4. Clicking '🔙 Назад' hides the modal and returns to the catalog grid. Ensure article text is cleanly formatted with paragraphs and bullet points.