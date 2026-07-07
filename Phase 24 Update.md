# Role and Objective
You are expanding the "Knowledge Base" (База знань) module for "FPV Academy" (Gemini 3.5 Flash High Phase 25). 
Your objective is to inject 3 new highly detailed educational articles into the global data array, including a comprehensive component breakdown (down to wires/screws), a defense-tech equipment guide, and an advanced UAV structural classification.

# Execution Requirement
Cleanly append these objects to your existing articles database array. Ensure the UI grid system dynamically renders the new cards. Keep the local dev server running.

# Task 1: Comprehensive Data Array Expansion
Add the following 3 articles with full rich text (use paragraphs and bullet points in Ukrainian) into your knowledge array:

1. Article 5: "Додаткове обладнання: Скиди та Ініціатори"
- Content: Пояснення роботи корисного навантаження.
- Системи скиду: Механічні (на базі сервоприводів, що звільняють чеку) та електромагнітні. Використовуються для доставки вантажів або багаторазових бомберів.
- Плати ініціалізації (ініціатори підриву): Електронні плати захисту та замикання. Мають механічні ступені запобіжників (чека, яку знімають перед зльотом) та програмні (активація тумблером на пульті). При зіткненні контакти-вуса замикають електричне коло, подаючи струм на детонатор.

2. Article 2: "Анатомія до гвинтика (Повний склад FPV)"
- Content: Детальний перелік усього необхідного для збірки 7-дюймового дрона-камікадзе на основі інженерних специфікацій:
- Карбонова рама (нижня і верхня палуби, промені, кріплення камери).
- Стек електроніки: Регулятор обертів (ESC 4-в-1) та Польотний контролер (FC).
- Силова установка: 4 безколекторні мотори та 4 пропелери.
- Відеосистема: FPV-камера та відеопередавач (VTX) з антеною (наприклад, Lollipop).
- Система зв'язку: Радіоприймач (RX, наприклад, ExpressLRS 915MHz/2.4GHz) з Т-подібною антеною.
- Дрібниці та розхідники: Конденсатор Low ESR (для гасіння скачків струму), силовий кабель з роз'ємом XT60, силіконові AWG дроти, термоусадка, ремінець для кріплення акумулятора (Lipo strap), сталеві гвинти М3 та М5, пластикові стійки, силіконові демпферні гумки під польотник та пластикові стяжки.

3. Article 3: "Загальна класифікація БПЛА"
- Content: Розбір сучасних аеродинамічних схем безпілотників:
- Мультироторні (Коптери): Квадро-, гекса-, октокоптери. Плюси: вертикальний зліт, зависання, маневреність. Мінуси: низька енергоефективність, малий час польоту.
- Літакові (Фіксоване крило): Класичні літаки та схеми "Літаюче крило" (наприклад, Лелека, Фурія). Плюси: висока дальність, ширяючий політ, велика автономність. Мінуси: потребують злітної смуги або катапульти, не можуть зависати.
- Гібридні (Змішані типи / VTOL): БПЛА літакового типу з додатковими вертикальними моторами (як у коптера). Поєднують найкраще: злітають вертикально без катапульти, а в повітрі переходять у горизонтальний політ на крилі для економії батареї.

# Task 2: Card UI and Navigation Integration
1. Ensure the image placeholder support handles these new additions smoothly (use specific placeholder paths, e.g., text values "Payload", "BOM", "VTOL").
2. Verify that clicking any of the 3 new cards correctly updates the text content inside the master-detail article viewer view (`#article-modal`) and scrolls elegantly to the top.
3. Disabled/enabled state cleanups: Make sure that exiting the knowledge section clears out layout modal instances to prevent DOM memory leaks on mobile devices.