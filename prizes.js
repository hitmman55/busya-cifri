'use strict';

const prizeScenes = {
  'lesson-first': {
    duration: 2500,
    yellow: ['Мыльные пузыри', 'Дракон выпускает мыльные пузыри.', 'bubbles', 'float', '○'],
    winter: ['Тёплый фонарик', 'Дракон зажигает фонарик.', 'lantern', 'glow', '✧'],
  },
  'lesson-third': {
    duration: 4500,
    yellow: ['Цветная радуга', 'Буся и дракон раскрашивают радугу.', 'rainbow', 'glow', '✦'],
    winter: ['Снежинки на ёлке', 'Буся и дракон вешают снежинки на ёлку.', 'snowflake-tree', 'glow', '❄'],
  },
  'find-first': {
    duration: 2500,
    yellow: ['Поймай звезду!', 'Дракон ловит золотую звёздочку.', 'catch-star', 'jump', '✦'],
    winter: ['Снежинка на носу', 'Дракон ловит снежинку на нос.', 'catch-snow', 'jump', '❄'],
  },
  'find-third': {
    duration: 4500,
    yellow: ['Воздушный змей', 'Буся и дракон запускают воздушного змея.', 'kite', 'fly', '◆'],
    winter: ['Шарф для снеговика', 'Буся лепит снеговика, а дракон помогает надеть шарф.', 'snowman', 'glow', '❄'],
  },
  'find-finish': {
    duration: 9000,
    yellow: ['Полёт над поляной', 'Буся и дракон летят над поляной с флажками.', 'bunting', 'fly', '✦'],
    winter: ['Гирлянда из подарка', 'Буся и дракон открывают коробку, и из неё вылетает гирлянда.', 'garland-gift', 'glow', '●'],
  },
  'count-third': {
    duration: 2500,
    yellow: ['Яблоко в корзине', 'Дракон ловит яблоко в корзину.', 'catch-apple', 'jump', '✦', 'apple'],
    winter: ['Конфета в носке', 'Дракон ловит конфету в рождественский носок.', 'catch-candy', 'jump', '✧', 'candy'],
  },
  'count-seventh': {
    duration: 4500,
    yellow: ['Пикник с драконом', 'Буся и дракон раскладывают угощения на пикнике.', 'picnic', 'glow', '✦'],
    winter: ['Коробка печенья', 'Буся и дракон собирают коробку печенья для подарка.', 'cookie-gift', 'glow', '✧', 'cookie-tree'],
  },
};

function resumeSceneAt(scene, start) {
  if (typeof scene.getAnimations !== 'function') return;
  const elapsed = performance.now() - start;
  for (const animation of scene.getAnimations({ subtree: true })) {
    if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.currentTime = elapsed;
  }
}

function narratePrize(lines, caption, startAnimation) {
  const signal = screenLife.signal;
  let revision = 0;
  async function explain() {
    const attempt = ++revision;
    await say(lines, caption);
    if (signal.aborted || revision !== attempt) return;
    replayVoice = undefined;
    if (voiceEnabled || (winter && musicWanted)) playPrizeChime();
    const started = performance.now();
    tray.firstElementChild.classList.remove('scene--waiting');
    startAnimation(started, signal);
  }
  replayVoice = explain;
  void explain();
}

function renderPrizeScene(prize) {
  const [title, description, file, motion, symbol, prop] = prizeScenes[prize.key][winter ? 'winter' : 'yellow'];
  question.textContent = title;
  speech.textContent = description;
  tray.setAttribute('aria-label', description);
  const scene = document.createElement('div');
  scene.className = `scene prize-scene prize--${motion} prize--${file}`;
  scene.style.setProperty('--duration', `${prizeScenes[prize.key].duration}ms`);
  scene.setAttribute('aria-hidden', 'true');

  const horizon = document.createElement('div');
  horizon.className = 'prize-horizon';
  const cast = new Image();
  cast.className = 'prize-cast';
  cast.src = asset(file);
  cast.alt = '';
  scene.append(horizon, cast);

  for (let i = 0; i < 8; i += 1) {
    const sparkle = document.createElement('span');
    sparkle.className = 'prize-particle';
    sparkle.style.setProperty('--i', i);
    sparkle.style.setProperty('--x', `${10 + (i * 29 + 17) % 80}%`);
    sparkle.style.setProperty('--y', `${20 + (i * 23) % 70}%`);
    sparkle.textContent = symbol;
    scene.append(sparkle);
  }
  if (prop) {
    const falling = new Image();
    falling.className = 'prize-prop';
    falling.src = asset(prop);
    falling.alt = '';
    scene.append(falling);
  }
  if (winter) {
    const snow = document.createElement('div');
    snow.className = 'snowfall scene-snow';
    addSnow(snow, 12);
    scene.append(snow);
  }
  scene.classList.toggle('scene--waiting', !prize.started);
  tray.replaceChildren(scene);
  if (prize.started) resumeSceneAt(scene, prize.started);
}

function showPrize(key, lines, caption, drawProgress, next) {
  showScreen('', '');
  if (drawProgress) drawProgress();
  tray.classList.add('reward-tray');
  tray.hidden = false;
  activePrize = { key, started: false };
  const prize = activePrize;
  renderPrizeScene(prize);
  setAction('Дальше', next);
  question.focus();
  narratePrize(lines, caption, async (started, signal) => {
    prize.started = started;
    if (await waitForScreen(prizeScenes[key].duration, signal)) next();
  });
}
