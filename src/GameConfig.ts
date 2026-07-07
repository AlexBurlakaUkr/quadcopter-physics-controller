export const GameConfig = {
  // Joystick Deadzone (3-5% from center)
  deadzone: 0.04, // 4% deadzone

  // Haptics
  vibrateDuration: 10, // ms
  vibrateEnabled: true,

  // Joystick Visual Settings
  joystickSize: 150, // width/height in px of joystick outer base
  handleSize: 60,    // width/height in px of inner joystick thumb handle
  joystickOffset: 50, // offset in px from screen bottom/sides

  // Physics and Drone parameters (Data-Driven)
  physics: {
    gravity: [0, -9.81, 0] as [number, number, number],
    droneMass: 1.3, // 1.3kg 7-inch combat drone
    droneDimensions: [0.5, 0.1, 0.5] as [number, number, number], // width, height, depth
    maxThrust: 15.0, // max upward force
    resetPosition: [0, 0.25, 0] as [number, number, number], // starting position resting on landing legs
    fixedTimeStep: 1 / 240, // decoupled physics timestep at 240Hz
    linearDamping: 0.1,
    angularDamping: 0.2,
  },

  // Environmental parameters (Data-Driven Environment Brightening)
  environment: {
    ambientLightIntensity: 1.2,
    dirLightIntensity: 1.8,
    fogColor: 0xe2e8f0,
    fogNear: 100,
    fogFar: 1000,
    skyColorTop: '#1d78c1',
    skyColorBottom: '#e2e8f0',
  },

  // Flight Controller & PID Configurations
  flight: {
    maxPitchAngle: 0.6, // radians (~34 degrees)
    maxRollAngle: 0.6,  // radians (~34 degrees)
    maxYawRate: 3.0,    // radians/sec target rotation speed
    pidPitchRoll: {
      kp: 3.0,
      ki: 0.0,
      kd: 0.5,
    },
    camera: {
      lerpFactor: 0.1, // smooth follow interpolation factor
      offsetY: 3.0,    // vertical camera offset from drone
      offsetZ: 7.0,    // backward camera offset from drone
      chaseOffset: [0, 0.8, 3.5] as [number, number, number],
      fpvOffset: [0, 0.12, -0.22] as [number, number, number],
      fpvTilt: 0.20, // tilt camera down by ~11.5 degrees (0.20 rad)
      losOffset: [0, 3.0, 6.0] as [number, number, number],
      
      // Dynamic camera offsets updated by Settings sliders
      chaseDistance: 3.5,
      losDistance: 6.0,
      fpvTiltDegrees: 25,
      leftJoystickXOffset: 30,
      rightJoystickXOffset: 30,
    }
  },

  // 3D Builder Configurations (Data-Driven Phase 17/18, updated Phase 22)
  builder: {
    snapThreshold: 0.5,
    slots: [
      { id: 'arm_fr', type: 'arm', position: [0.0885, 0.011, -0.0885] as [number, number, number] },
      { id: 'arm_fl', type: 'arm', position: [-0.0885, 0.011, -0.0885] as [number, number, number] },
      { id: 'arm_br', type: 'arm', position: [0.0885, 0.011, 0.0885] as [number, number, number] },
      { id: 'arm_bl', type: 'arm', position: [-0.0885, 0.011, 0.0885] as [number, number, number] },
      
      { id: 'motor_fr', type: 'motor', position: [0.177, 0.015, -0.177] as [number, number, number] },
      { id: 'motor_fl', type: 'motor', position: [-0.177, 0.015, -0.177] as [number, number, number] },
      { id: 'motor_br', type: 'motor', position: [0.177, 0.015, 0.177] as [number, number, number] },
      { id: 'motor_bl', type: 'motor', position: [-0.177, 0.015, 0.177] as [number, number, number] },

      { id: 'esc_bottom', type: 'esc', position: [0.0, 0.020, 0.0] as [number, number, number] },
      { id: 'fc_top', type: 'fc', position: [0.0, 0.035, 0.0] as [number, number, number] },
      { id: 'camera_front', type: 'camera', position: [0.0, 0.041, -0.175] as [number, number, number] },
      { id: 'vtx_slot', type: 'vtx', position: [0.0, 0.020, -0.08] as [number, number, number] },
      { id: 'rx_slot', type: 'rx', position: [0.0, 0.019, 0.09] as [number, number, number] },
      { id: 'top_deck_slot', type: 'top_deck', position: [0.0, 0.060, 0.0] as [number, number, number] },

      { id: 'propeller_fr', type: 'propeller', position: [0.177, 0.05, -0.177] as [number, number, number] },
      { id: 'propeller_fl', type: 'propeller', position: [-0.177, 0.05, -0.177] as [number, number, number] },
      { id: 'propeller_br', type: 'propeller', position: [0.177, 0.05, 0.177] as [number, number, number] },
      { id: 'propeller_bl', type: 'propeller', position: [-0.177, 0.05, 0.177] as [number, number, number] },
      { id: 'battery_center', type: 'battery', position: [0.0, 0.090, 0.0] as [number, number, number] },
    ],
  },

  // FPV Educational Articles (Data-Driven Phase 24)
  knowledgeArticles: [
    {
      id: "uav-classification",
      title: "Класифікація БПЛА",
      preview: "Основні типи безпілотних літальних апаратів та їх призначення.",
      content: `<p>Безпілотні літальні апарати (БПЛА) класифікуються за призначенням, конструкцією та радіусом дії. Основні типи:</p>
<ul>
  <li><strong>FPV-камікадзе</strong> — невеликі квадрокоптери (зазвичай 7-10 дюймів), призначені для польоту в один бік. Вони дуже дешеві у виробництві, маневрені та несуть бойову частину.</li>
  <li><strong>Скидачі / Бомбери</strong> — важкі багаторазові квадрокоптери (наприклад, відомі як "Vampire" або "Баба Яга"). Вони мають велику вантажопідйомність, обладнані тепловізорами та системами для скидання боєприпасів.</li>
  <li><strong>Крила (Літаки) БПЛА</strong> — апарати з фіксованим крилом. Вони мають великий радіус дії та автономність. Використовуються для дальньої розвідки або точкових ударів (наприклад, "Лелека-100", "Zala", "PD-2").</li>
  <li><strong>Мавіки (DJI Mavic та аналоги)</strong> — комерційні квадрокоптери з високоякісними камерами на стабілізаторах. Застосовуються переважно для коригування артилерії та розвідки на близькій відстані.</li>
</ul>`,
      imageUrl: "https://via.placeholder.com/600x300?text=UAV+Classification"
    },
    {
      id: "motor-markings",
      title: "Маркування Моторів",
      preview: "Як читати параметри безколекторних двигунів, такі як 2806.5 1300KV.",
      content: `<p>Маркування безколекторних моторів для FPV дронів вказує на їхні фізичні розміри та електричні характеристики. Розглянемо приклад популярного мотора <strong>2806.5 1300KV</strong>:</p>
<ul>
  <li><strong>28</strong> (перші дві цифри) — діаметр статора двигуна в міліметрах (мм).</li>
  <li><strong>06.5</strong> (наступні цифри після діаметра) — висота статора двигуна в міліметрах (мм). Більший статор означає більшу потужність та вагу двигуна.</li>
  <li><strong>KV (1300KV)</strong> — кількість обертів мотора за хвилину на один Вольт прикладеної напруги без навантаження (RPM per Volt).</li>
</ul>
<p><strong>Важливе правило вибору:</strong></p>
<ul>
  <li><strong>Нижчий показник KV</strong> (наприклад, 1300KV–1500KV) має вищий крутний момент (torque). Такі мотори використовуються на великих рамах (7–10 дюймів) з великими пропелерами та батареями високої напруги (6S).</li>
  <li><strong>Вищий показник KV</strong> (наприклад, 1800KV–2500KV) забезпечує більшу швидкість обертання, але має менший крутний момент. Підходить для менших, легших гоночних дронів (5 дюймів) на батареях 4S–6S.</li>
</ul>`,
      imageUrl: "https://via.placeholder.com/600x300?text=Motor+Markings"
    },
    {
      id: "propeller-markings",
      title: "Маркування Пропелерів",
      preview: "Розуміння геометрії пропелерів, кроку та сумісності з двигунами.",
      content: `<p>Пропелери FPV дронів маркуються за допомогою цифр, які визначають їхній розмір та аеродинамічні властивості. Наприклад, маркування <strong>7040</strong> розшифровується так:</p>
<ul>
  <li><strong>70</strong> (перші дві цифри) — діаметр пропелера. Це означає <strong>7.0 дюймів</strong>.</li>
  <li><strong>40</strong> (останні дві цифри) — крок пропелера (pitch). Це означає <strong>4.0 дюйми</strong>. Крок — це відстань, яку пропелер проходить вперед за один повний оберт у щільному середовищі без ковзання.</li>
</ul>
<p>Інший поширений формат запису — <strong>7x4.0x3</strong>:</p>
<ul>
  <li><strong>7</strong> — діаметр у дюймах.</li>
  <li><strong>4.0</strong> — крок у дюймах.</li>
  <li><strong>3</strong> — кількість лопатей (дволопатеві легші та швидші, трилопатеві дають кращий контроль та плавність).</li>
</ul>
<p><strong>Вплив характеристик:</strong> Більший крок створює більше тяги на високих швидкостях, але вимагає потужніших моторів і споживає більше струму. Менший крок робить політ плавнішим і слухнянішим.</p>`,
      imageUrl: "https://via.placeholder.com/600x300?text=Propeller+Markings"
    },
    {
      id: "battery-guide",
      title: "Акумулятори (Батареї)",
      preview: "Різниця між LiPo та Li-Ion, розуміння маркування 6S2P та C-рейтингу.",
      content: `<p>Акумулятор — це джерело живлення вашого FPV дрона. У сфері БПЛА використовуються два основні типу літієвих батарей:</p>
<ol>
  <li><strong>LiPo (Lithium Polymer)</strong> — здатні віддавати величезний струм за короткий проміжок часу (високий розрядний струм). Вони ідеально підходять для динамічних польотів, фрістайлу та камікадзе, де потрібні різкі прискорення. Проте вони мають меншу густину енергії на одиницю ваги.</li>
  <li><strong>Li-Ion (Lithium Ion)</strong> — мають значно більшу енергоємність та меншу вагу при тій самій ємності, але не можуть віддавати великі струми без перегріву та просідання напруги. Чудово підходять для розвідувальних крил та далеколітів (long-range), які літають у спокійному темпі.</li>
</ol>
<p><strong>Специфікація "6S2P":</strong></p>
<ul>
  <li><strong>6S</strong> (6 cells in Series) — 6 послідовно з'єднаних елементів. Кожен елемент має номінальну напругу 3.7V (повністю заряджений — 4.2V). Загальна напруга 6S батареї: 6 × 3.7V = 22.2V. Більше напруги — вища ефективність на великих дронах.</li>
  <li><strong>2P</strong> (2 cells in Parallel) — 2 паралельно з'єднані групи елементів. Це подвоює загальну ємність батареї (міліампер-години, mAh).</li>
</ul>
<p><strong>C-rating (C-рейтинг):</strong> Показник швидкості розряду (наприклад, 100C). Максимальний струм, який батарея може безпечно віддати, дорівнює: <em>Ємність (Ah) × C-rating</em>. Для LiPo цей показник становить від 75C до 150C, тоді як для Li-Ion зазвичай лише 10C–35C.</p>`,
      imageUrl: "https://via.placeholder.com/600x300?text=Battery+Guide"
    },
    {
      id: "payload-guide",
      title: "Додаткове обладнання: Скиди та Ініціатори",
      preview: "Пояснення роботи корисного навантаження, систем скидання та плат ініціації підриву.",
      content: `<p>Корисне навантаження розширює функціонал FPV дронів, перетворюючи їх на спеціалізовані інструменти для доставки вантажів або бойового застосування. Основними компонентами є системи скиду та плати ініціалізації:</p>
<ul>
  <li><strong>Системи скиду вантажу:</strong>
    <ul>
      <li><em>Механічні скиди</em> — побудовані на базі сервоприводів (сервомашинок). Сервопривід з'єднаний з металевим або пластиковим штифтом (чекою). При отриманні сигналу з польотного контролера сервомашинка повертається, витягує чеку та вивільняє петлю кріплення вантажу. Це проста, надійна та дешева конструкція, що використовується на багаторазових дронах-бомберах (наприклад, "Баба Яга").</li>
      <li><em>Електромагнітні скиди</em> — утримують вантаж за допомогою потужного електромагніту. При відключенні живлення магніт розмагнічується, і вантаж падає. Вони спрацьовують миттєво, але споживають енергію для постійного утримання.</li>
    </ul>
  </li>
  <li><strong>Плати ініціалізації (ініціатори підриву):</strong>
    <ul>
      <li>Електронні плати, які встановлюються безпосередньо на корисне навантаження для безпечного керування детонацією.</li>
      <li><em>Механічний ступінь запобіжника</em> — фізична пластикова або металева чека (pin), яка розмикає живлення плати. Її вручну знімають безпосередньо перед зльотом дрона.</li>
      <li><em>Програмний запобіжник</em> — активація плати (arming) здійснюється пілотом через пульт керування за допомогою перемикання окремого тумблера (сигнал передається через AUX-канал польотника на реле плати).</li>
      <li><em>Замикання вусів</em> — на передній частині дрона розміщуються тонкі гнучкі металевого дроту (\"контакти-вуса\"). При зіткненні з перешкодою вуса деформуються, торкаються один одного і замикають електричне коло, подаючи потужний імпульс струму на електродетонатор для підриву.</li>
    </ul>
  </li>
</ul>`,
      imageUrl: "https://via.placeholder.com/600x300?text=Payload"
    },
    {
      id: "bom-guide",
      title: "Анатомія до гвинтика (Повний склад FPV)",
      preview: "Повний перелік деталей, електроніки та розхідників для збірки 7-дюймового дрона.",
      content: `<p>Створення сучасного 7-дюймового робочого FPV дрона вимагає підбору сумісних компонентів та великої кількості дрібних деталей. Нижче наведено детальний перелік (BOM — Bill of Materials) на основі інженерних специфікацій:</p>
<ol>
  <li><strong>Конструктивні елементи рами:</strong>
    <ul>
      <li>Карбонова рама 7 дюймів (включає промені товщиною 5-6 мм для жорсткості, нижню палубу для монтажу електроніки, середню та верхню палуби).</li>
      <li>Кронштейни та бокові пластини для кріплення курсової камери.</li>
    </ul>
  </li>
  <li><strong>Електроніка та силова частина (Стек):</strong>
    <ul>
      <li><strong>ESC (Electronic Speed Controller) 4-в-1:</strong> регулятор обертів, що витримує струм від 50A до 60A. Керує швидкістю двигунів.</li>
      <li><strong>FC (Flight Controller):</strong> польотний контролер (наприклад, на процесорі F405 або F722) з гіроскопом. Опрацьовує команди пілота та стабілізує дрон.</li>
    </ul>
  </li>
  <li><strong>Мотори та пропелери:</strong>
    <ul>
      <li>4 безколекторні мотори розмірності 2806.5 або 2807 (із низьким KV, наприклад 1300KV).</li>
      <li>4 міцні пропелери розміру 7040 (трилопатеві або дволопатеві).</li>
    </ul>
  </li>
  <li><strong>Відеосистема (FPV):</strong>
    <ul>
      <li>Аналогова курсова FPV-камера високої світлочутливості.</li>
      <li>Відеопередавач (VTX) потужністю 1.6W–2.5W на частоті 5.8GHz.</li>
      <li>Антена відеопередавача (наприклад, Lollipop 4) з круговою поляризацією для стабільного сигналу.</li>
    </ul>
  </li>
  <li><strong>Приймач керування (RX):</strong>
    <ul>
      <li>Приймач системи ExpressLRS (ELRS) працюючий на частоті 915MHz (далекобійний) або 2.4GHz.</li>
      <li>Т-подібна антена приймача (T-antenna), закріплена ззаду дрона на силіконовому кріпленні.</li>
    </ul>
  </li>
  <li><strong>Дрібниці, кріплення та розхідники:</strong>
    <ul>
      <li><strong>Конденсатор Low ESR</strong> (наприклад, 35V 1000uF) — припаюється до силових контактів ESC для поглинання стрибків напруги від моторів.</li>
      <li>Силовий кабель 12AWG або 14AWG з жовтим роз'ємом <strong>XT60</strong> для підключення батареї.</li>
      <li>Тонкі силіконові дроти різного перерізу (для сигнальних ліній камери, VTX, RX).</li>
      <li>Силіконові демпферні гумки для вібророзв'язки польотного контролера.</li>
      <li>Комплект сталевих гвинтів М3 різної довжини, гайки з нейлоновим фіксатором, латунні або пластикові стійки.</li>
      <li>Міцний кевларовий або нейлоновий ремінець (LiPo strap) з силіконовим покриттям проти ковзання для кріплення акумулятора.</li>
      <li>Пластикові стяжки та термоусадочні трубки для фіксації та ізоляції дротів на променях.</li>
    </ul>
  </li>
</ol>`,
      imageUrl: "https://via.placeholder.com/600x300?text=BOM"
    },
    {
      id: "vtol-classification",
      title: "Загальна класифікація БПЛА",
      preview: "Детальний розбір сучасних аеродинамічних схем безпілотників: коптери, крила та VTOL-гібриди.",
      content: `<p>За конструктивним виконанням та принципом польоту безпілотні літальні апарати (БПЛА) поділяються на три основні аеродинамічні класи:</p>
<ul>
  <li><strong>Мультироторні системи (Коптери):</strong>
    <ul>
      <li>Сюди належать квадрокоптери (4 мотори), гексакоптери (6 моторів) та октокоптери (8 моторів). Вони створюють підйомну силу виключно за рахунок гвинтів, що обертаються.</li>
      <li><em>Переваги:</em> здатність здійснювати вертикальний зліт та посадку (VTOL) з будь-якого п'ятачка, зависати в повітрі на одному місці, висока маневреність та можливість пересуватися в будь-якому напрямку.</li>
      <li><em>Недоліки:</em> низька енергоефективність (енергія батареї постійно витрачається на утримання ваги дрона в повітрі), відносно невелика дальність польоту та мала швидкість у порівнянні з літаками.</li>
    </ul>
  </li>
  <li><strong>Літакові системи (Фіксоване крило):</strong>
    <ul>
      <li>Апарати класичної літакової схеми або схеми \"літаюче крило\" (наприклад, \"Лелека\", \"Фурія\", \"Валькірія\").</li>
      <li><em>Переваги:</em> підйомна сила створюється за рахунок крила під час руху вперед. Це забезпечує виняткову енергоефективність, високу швидкість, здатність планувати без двигуна, велику дальність (десятки кілометрів) та тривалість польоту.</li>
      <li><em>Недоліки:</em> потребують спеціальної пускової катапульти або злітно-посадкової смуги, не здатні зависати на одному місці або літати назад.</li>
    </ul>
  </li>
  <li><strong>Гібридні системи (VTOL / Вертикальний зліт-посадка):</strong>
    <ul>
      <li>Комбіновані БПЛА, які поєднують переваги обох попередніх типів. Мають планер літака (крила), але додатково оснащені окремими моторами для вертикального підйому.</li>
      <li><em>Принцип роботи:</em> дрон злітає вертикально вгору як квадрокоптер. Після набору висоти вмикається штовхаючий або тягнучий літаковий гвинт, а коптерні мотори вимикаються. Дрон переходить у швидкий горизонтальний політ на крилі.</li>
      <li><em>Переваги:</em> злітає та сідає вертикально без катапульти та парашута, при цьому долає великі відстані на одному заряді акумулятора.</li>
    </ul>
  </li>
</ul>`,
      imageUrl: "https://via.placeholder.com/600x300?text=VTOL"
    },
    {
      id: "firmware-guide",
      title: "Програмне забезпечення БПЛА (Прошивки та Налаштування)",
      preview: "Огляд софту, що керує залізом квадрокоптера: Betaflight, INAV, ArduPilot.",
      content: `<p>Робота сучасного квадрокоптера залежить від програмного забезпечення, що працює на його борту та використовується для конфігурування. Програмне забезпечення БПЛА поділяється на дві категорії:</p>
<ol>
  <li><strong>Польотні прошивки (Flight Firmware):</strong>
    <ul>
      <li><strong>Betaflight:</strong> найпопулярніша прошивка для гоночних, фрістайл та FPV дронів-камікадзе. Вона оптимізована для забезпечення шаленої швидкості обчислень (цикли PID-регулятора до 8kHz), що дає пілоту миттєвий відгук та максимальну керованість. Має мінімум автономних функцій.</li>
      <li><strong>INAV:</strong> побудована на коді Betaflight, але переорієнтована на автопілот, утримання позиції за допомогою GPS та барометра, а також автоматичне повернення на точку зльоту (Return to Home). Це стандарт для розвідувальних літаків (крил) та важких бомберів.</li>
      <li><strong>ArduPilot / PX4:</strong> промислові платформи з відкритим кодом для повністю автономних місій. Використовуються на великих крилах для аерофотозйомки, 3D-картографування та моніторингу. Мають надскладні налаштування.</li>
    </ul>
  </li>
  <li><strong>Наземні конфігуратори (Ground Control Stations):</strong>
    <ul>
      <li>Спеціальне програмне забезпечення для комп'ютерів чи смартфонів для налаштування дрона перед польотом.</li>
      <li>Найпоширенішими є <strong>Betaflight Configurator</strong> та мобільний додаток <strong>SpeedyBee</strong> (підключається через OTG-кабель або Bluetooth). Вони дозволяють налаштовувати напрямок обертання моторів, частоти сітки відеопередавача (VTX), кути нахилу камери, режими польоту (Angle, Horizon, Acro) та параметри PID-стабілізації.</li>
    </ul>
  </li>
</ol>`,
      imageUrl: "https://via.placeholder.com/600x300?text=Firmware"
    },
    {
      id: "radio-guide",
      title: "Системи радіокерування та Протоколи зв'язку",
      preview: "Як пульт передає команди на дрон без затримок та під впливом засобів РЕБ.",
      content: `<p>Для передачі команд з пульта керування на дрон використовуються високочастотні радіосистеми, що працюють за сучасними протоколами передачі даних:</p>
<ul>
  <li><strong>ExpressLRS (ELRS):</strong>
    <ul>
      <li>Сучасний відкритий протокол зв'язку, який став світовим стандартом у сфері Defense Tech та FPV. Працює на базі чипів LoRa (Long Range).</li>
      <li><em>Частота 915MHz</em> — має чудову пробивну здатність через перешкоди (дерева, стіни, рельєф), що робить її ідеальною для польотів на низькій висоті.</li>
      <li><em>Частота 2.4GHz</em> — пропонує надзвичайно високу частоту оновлення пакетів даних (до 1000Hz), забезпечуючи максимально плавну реакцію на рухи стіків.</li>
      <li>ELRS гарантує екстремальну дальність (десятки кілометрів) та високу завадостійкість до ворожих засобів радіоелектронної боротьби (РЕБ).</li>
    </ul>
  </li>
  <li><strong>TBS Crossfire / Tracer:</strong>
    <ul>
      <li>Потужні та надійні комерційні закриті системи від компанії Team BlackSheep. Працюють на частотах 868/915 MHz (Crossfire) та 2.4GHz (Tracer). Відомі своєю стабільністю лінку та простотою використання.</li>
    </ul>
  </li>
  <li><strong>Внутрішні протоколи зв'язку (FC-RX Protocols):</strong>
    <ul>
      <li>Після того, як радіоприймач (RX) на борту дрона отримує сигнал з пульта, він передає його на польотний контролер (FC). Для цього використовуються надшвидкісні шини передачі даних, такі як <strong>CRSF (Crossfire Protocol)</strong> або <strong>SBUS/IBUS</strong>.</li>
      <li>Протокол CRSF зводить затримку передачі даних на борту до мінімуму (менше 5 мілісекунд), що життєво необхідно для точного пілотування.</li>
    </ul>
  </li>
</ul>`,
      imageUrl: "https://via.placeholder.com/600x300?text=Radio+Control"
    }
  ],

  // Localization strings
  localization: {
    title: "FPV Academy",
    btnSimulator: "Симулятор (3D)",
    btnController: "Контролер для ПК",
    btnBuilder: "Конструктор дрона",
    btnKnowledge: "База знань",
    lblThrottle: "Throttle",
    lblYaw: "Yaw",
    lblPitch: "Pitch",
    lblRoll: "Roll",
    btnBack: "Назад в меню",
    btnReset: "Скинути дрон",
    lblCameraLOS: "Камера: LOS",
    lblCameraChase: "Камера: Chase",
    lblCameraFPV: "Камера: FPV",
    orientationPrompt: "Будь ласка, поверніть пристрій у горизонтальний режим для польоту.",
    viewControllerTitle: "Контролер для ПК",
    viewBuilderTitle: "Конструктор дрона",
    viewKnowledgeTitle: "База знань",
    comingSoon: "Цей розділ знаходиться в розробці...",
    infoTitle: "Режим керування: Mode 2",
    infoLeftTitle: "Лівий стік (Left Stick)",
    infoLeftItem1: "Газ (Throttle) — Вертикальна вісь (без автоцентрування)",
    infoLeftItem2: "Рискання (Yaw) — Горизонтальна вісь (з автоцентруванням)",
    infoRightTitle: "Правий стік (Right Stick)",
    infoRightItem1: "Тангаж (Pitch) — Вертикальна вісь (з автоцентруванням)",
    infoRightItem2: "Крен (Roll) — Горизонтальна вісь (з автоцентруванням)",
    lblGimbalLeftV: "Throttle (Тяга)",
    lblGimbalLeftH: "Yaw (Поворот)",
    lblGimbalRightV: "Pitch (Тангаж)",
    lblGimbalRightH: "Roll (Крен)",
    
    // Settings modal localizations
    settingsTitle: "Налаштування камери",
    lblLOSDistance: "LOS Дистанція",
    lblChaseDistance: "Chase Дистанція",
    lblFPVTilt: "FPV Кут Нахилу",
    lblLeftJoystickX: "Лівий стік X-зсув",
    lblRightJoystickX: "Правий стік X-зсув",

    // Builder localizations
    builderInstructions: "Перетягуйте компоненти з панелі на раму дрона для збірки.",
    builderReset: "Скинути",
    invItemArmName: "Промінь (Arm)",
    invItemArmDesc: "Карбоновий промінь",
    invItemMotorName: "Мотор 2806",
    invItemMotorDesc: "Для тяги",
    invItemESCName: "Регулятор (ESC)",
    invItemESCDesc: "Контроль моторики",
    invItemFCName: "Польотник (FC)",
    invItemFCDesc: "Мозок дрона",
    invItemVTXName: "Відеопередавач (VTX)",
    invItemVTXDesc: "Передача відео",
    invItemRXName: "Приймач (RX)",
    invItemRXDesc: "Прийом сигналу",
    invItemCameraName: "FPV Камера",
    invItemCameraDesc: "Курсова камера",
    invItemTopDeckName: "Верхня Дека",
    invItemTopDeckDesc: "Кришка рами",
    invItemPropName: "Пропелери",
    invItemPropDesc: "Гвинти 5 дюймів",
    invItemBatteryName: "LiPo 6S",
    invItemBatteryDesc: "Живлення",

    // Builder Progress Tracker Labels
    trackerArms: "Промені",
    trackerMotors: "Мотори",
    trackerPropellers: "Пропелери",
    trackerFC: "FC",
    trackerESC: "ESC",
    trackerVTX: "VTX",
    trackerRX: "RX",
    trackerCamera: "Камера",
    trackerTopDeck: "Верхня Дека",
    trackerBattery: "Батарея",

    // Mechanical Assembly Dependency Toasts
    toastNeedArm: "Спочатку встановіть промінь у цей слот!",
    toastNeedMotor: "Спочатку встановіть двигун!",
    toastNeedESC: "Спочатку встановіть ESC!",
    toastNeedElectronics: "Встановіть всю електроніку перед закриттям рами!",
    toastNeedTopDeck: "Батарея кріпиться тільки на верхню деку!",
  }
};

