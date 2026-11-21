'use strict';

const rewards = {
  5: {
    className: 'flight',
    file: 'busya-dragon',
    title: 'Полёт с драконом',
    speech: 'Пять верных ответов! Полетели!',
    description: 'Буся и дракон летят вместе сквозь облака.',
  },
  10: {
    className: 'balloon',
    file: 'busya-balloon',
    title: 'Звёздный фейерверк',
    speech: 'Все десять! Лови звёзды!',
    description: 'Буся и дракон поднимаются на воздушном шаре и запускают золотые звёзды.',
  },
};
const winterRewards = {
  5: {
    className: 'winter-flight',
    file: 'winter-flight',
    title: 'Сани над снежным лесом',
    speech: 'Пять верных ответов! Повезём подарки!',
    description: 'Дракон везёт Бусю и новогодние подарки на санях над заснеженным лесом.',
  },
  10: {
    className: 'winter-tree',
    file: 'winter-tree',
    title: 'Зажигаем ёлку!',
    speech: 'Все десять! Пусть ёлка засияет!',
    description: 'Буся и дракон украшают ёлку, и вокруг неё загораются золотые огни.',
  },
};

const progress = document.querySelector('#progress');
const speech = document.querySelector('#speech');
const question = document.querySelector('#question');
const modes = document.querySelector('#modes');
const menuButton = document.querySelector('#menu-button');
const tray = document.querySelector('#fruit-tray');
const answers = document.querySelector('#answers');
const feedback = document.querySelector('#feedback');
const action = document.querySelector('#action');
const themeButton = document.querySelector('#theme-button');
const musicButton = document.querySelector('#music-button');
const snowfall = document.querySelector('#snowfall');
const themeColor = document.querySelector('meta[name="theme-color"]');
let counts = [];
let step = 0;
let mistakes = 0;
let solved = false;
let hintTimer;
let nextAction;
let winter = false;
let musicWanted = true;
let musicRevision = 0;
let screenLife = new AbortController();
let cancelScreenView;
let activePrize;
let legacyPrizeStarted;

function asset(name) {
  return `assets/${name}.webp`;
}

function itemImage(item) {
  return asset(winter && item.winterFile ? item.winterFile : item.file);
}

function addSnow(container, count) {
  for (let index = 0; index < count; index += 1) {
    const flake = document.createElement('span');
    const duration = 9 + (index * 7 % 12);
    flake.style.setProperty('--x', `${(index * 37 % 97) + 1}%`);
    flake.style.setProperty('--y', `${(index * 23 % 89) + 5}%`);
    flake.style.setProperty('--size', `${3 + (index * 3 % 7)}px`);
    flake.style.setProperty('--time', `${duration}s`);
    flake.style.setProperty('--delay', `${-(index * .31 % 1) * duration}s`);
    container.append(flake);
  }
}

async function syncMusic() {
  const revision = ++musicRevision;
  const playing = await setJinglePlaying(winter && musicWanted);
  if (revision !== musicRevision) return;
  updateMusicButton(playing);
}

function updateMusicButton(playing) {
  musicButton.setAttribute('aria-pressed', String(playing));
  musicButton.textContent = playing ? 'Музыка играет' : 'Включить музыку';
}

function switchTheme() {
  winter = !winter;
  document.documentElement.dataset.theme = winter ? 'winter' : 'yellow';
  themeColor.content = winter ? '#12392f' : '#f9df79';
  themeButton.querySelector('span').textContent = winter ? '☀' : '❄';
  themeButton.lastChild.textContent = winter ? ' Жёлтая тема' : ' Новый год';
  musicButton.hidden = !winter;
  snowfall.hidden = !winter;
  if (winter && !snowfall.childElementCount) addSnow(snowfall, 32);
  const grid = tray.querySelector('.fruit-grid');
  if (grid) {
    const url = itemImage(items[grid.dataset.item]);
    grid.querySelectorAll('img').forEach(image => { image.src = url; });
  }
  if (tray.dataset.reward) renderRewardScene(Number(tray.dataset.reward));
  if (activePrize) renderPrizeScene(activePrize);
  const dragon = activity.querySelector('[data-themed-dragon]');
  if (dragon) dragon.src = asset(winter ? 'dragon-winter' : 'dragon');
  void syncMusic();
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function setAction(label, callback) {
  action.hidden = !callback;
  nextAction = callback;
  action.textContent = label;
}

function showScreen(title, message) {
  screenLife.abort();
  screenLife = new AbortController();
  cancelScreenView?.();
  cancelScreenView = undefined;
  activePrize = undefined;
  legacyPrizeStarted = undefined;
  stopHint();
  clearVoice();
  question.textContent = title;
  speech.textContent = message;
  menuButton.hidden = false;
  modes.hidden = true;
  progress.hidden = true;
  tray.hidden = true;
  answers.hidden = true;
  feedback.hidden = true;
  tray.className = 'fruit-tray';
  delete tray.dataset.reward;
  tray.replaceChildren();
  answers.replaceChildren();
  answers.className = 'answers';
  activity.hidden = true;
  activity.className = 'activity';
  activity.replaceChildren();
  activityTools.hidden = true;
  activityTools.replaceChildren();
  feedback.textContent = '';
  setAction('', undefined);
}

function showMenu(moveFocus = true) {
  showScreen('Выбирай, что будем делать', 'Привет! Давай знакомиться с числами.');
  menuButton.hidden = true;
  modes.hidden = false;
  if (moveFocus) question.focus();
}

function buildFruitGrid(itemIndex, count, tilt) {
  const item = items[itemIndex];
  const grid = document.createElement('div');
  grid.className = 'fruit-grid';
  grid.dataset.item = itemIndex;
  grid.classList.toggle('winter-ribbon', item.file === 'pear' || item.file === 'orange');
  if (count > 5) grid.classList.add('fruit-grid--wide');
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('div');
    piece.className = 'fruit';
    if (tilt) piece.style.setProperty('--tilt', `${Math.floor(Math.random() * 23) - 11}deg`);
    const image = new Image(100, 100);
    image.src = itemImage(item);
    image.alt = item.name;
    image.draggable = false;
    piece.append(image);
    grid.append(piece);
  }
  return grid;
}

function updateProgress(length = numbers.length, position = step, finished = solved) {
  progress.hidden = false;
  progress.replaceChildren(...Array.from({ length }, (_, index) => {
    const number = index + 1;
    const dot = document.createElement('li');
    const done = index < position || (index === position && finished);
    dot.textContent = done ? '✓' : number;
    dot.setAttribute('aria-label', done ? `Задание ${number} выполнено` : `Задание ${number}`);
    if (done) dot.classList.add('done');
    if (index === position && !done) dot.setAttribute('aria-current', 'step');
    return dot;
  }));
}

function startTest() {
  counts = shuffle(numbers);
  step = 0;
  showQuestion();
}

function showQuestion() {
  const itemIndex = step % items.length;
  const item = items[itemIndex];
  const count = counts[step];
  showScreen(item.question, 'Посчитай предметы и выбери число.');
  mistakes = 0;
  solved = false;
  updateProgress();
  tray.hidden = false;
  tray.setAttribute('aria-label', 'Предметы для счёта');
  tray.append(buildFruitGrid(itemIndex, count, true));
  answers.hidden = false;
  feedback.hidden = false;
  const alternatives = shuffle(numbers.filter(number => number !== count)).slice(0, 2);
  answers.replaceChildren(...shuffle([count, ...alternatives]).map(number => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = number;
    button.addEventListener('click', () => choose(number, button, count));
    return button;
  }));
  void say('count-instruction');
  question.focus();
}

function stopHint() {
  clearInterval(hintTimer);
  tray.querySelector('.lit')?.classList.remove('lit');
}

function showHint() {
  stopHint();
  const pieces = [...tray.querySelectorAll('.fruit')];
  let index = 0;
  pieces[index].classList.add('lit');
  hintTimer = setInterval(() => {
    pieces[index].classList.remove('lit');
    index += 1;
    if (index === pieces.length) {
      clearInterval(hintTimer);
      return;
    }
    pieces[index].classList.add('lit');
  }, 600);
}

function continueTest() {
  step += 1;
  showQuestion();
}

function choose(number, button, count) {
  if (solved) return;
  answers.querySelector('.wrong')?.classList.remove('wrong');
  if (number !== count) {
    mistakes += 1;
    button.classList.add('wrong');
    feedback.textContent = mistakes === 1 ? 'Посчитай ещё раз.' : 'Считай по одному.';
    void say(mistakes === 1 ? 'count-again' : 'count-hint');
    if (mistakes >= 2) showHint();
    return;
  }
  stopHint();
  solved = true;
  const completed = step + 1;
  const lines = ['count-right', `number-${count}`];
  const caption = `Верно! ${lessonCards[count].name}.`;
  const prize = { 3: 'count-third', 7: 'count-seventh' }[completed];
  if (prize) {
    showPrize(prize, lines, caption, updateProgress, continueTest);
    return;
  }
  if (rewards[completed]) {
    showReward(completed, lines, caption);
    return;
  }
  updateProgress();
  button.classList.add('correct');
  feedback.textContent = `Верно! Ответ — ${count}.`;
  void say(lines, caption);
  setAction('Дальше', continueTest);
  action.focus();
  answers.querySelectorAll('button').forEach(choice => { choice.disabled = true; });
}

function showReward(completed, lines, caption) {
  const final = completed === numbers.length;
  showScreen('', '');
  updateProgress();
  tray.hidden = false;
  tray.classList.add('reward-tray');
  tray.dataset.reward = completed;
  renderRewardScene(completed);
  setAction(final ? 'Сыграть ещё' : 'Дальше', final ? startTest : continueTest);
  question.focus();
  narratePrize(final ? [...lines, 'count-finish'] : lines, final ? `${caption} ${voiceScript['count-finish']}` : caption, started => {
    legacyPrizeStarted = started;
  });
}

function renderRewardScene(completed) {
  const final = completed === numbers.length;
  const reward = (winter ? winterRewards : rewards)[completed];
  question.textContent = reward.title;
  speech.textContent = reward.speech;
  tray.setAttribute('aria-label', reward.description);
  const scene = document.createElement('div');
  scene.className = `scene scene--${reward.className}`;
  scene.classList.toggle('scene--waiting', legacyPrizeStarted === undefined);
  scene.setAttribute('aria-hidden', 'true');

  const sky = document.createElement('div');
  sky.className = 'scene-sky';
  if (winter) {
    sky.classList.add('winter-landscape');
    for (let index = 0; index < 7; index += 1) {
      const tree = document.createElement('span');
      tree.className = 'forest-tree';
      tree.style.setProperty('--tree', index);
      tree.style.setProperty('--height', `${20 + (index * 13 % 24)}%`);
      sky.append(tree);
    }
    const snow = document.createElement('div');
    snow.className = 'snowfall scene-snow';
    addSnow(snow, 21);
    scene.append(snow);
  } else {
    for (let index = 0; index < 3; index += 1) {
      const cloud = document.createElement('span');
      cloud.className = `cloud cloud--${index + 1}`;
      sky.append(cloud);
    }
  }
  const cast = document.createElement('div');
  cast.className = 'scene-cast';
  if (final) {
    const stars = document.createElement('div');
    stars.className = 'scene-stars';
    for (let index = 0; index < 6; index += 1) {
      const star = document.createElement('span');
      star.textContent = '✦';
      star.className = 'scene-star';
      star.style.setProperty('--index', index);
      stars.append(star);
    }
    scene.append(stars);
  }
  const sprite = new Image();
  sprite.src = asset(reward.file);
  sprite.alt = '';
  cast.append(sprite);
  scene.prepend(sky, cast);
  tray.replaceChildren(scene);
  if (legacyPrizeStarted !== undefined) resumeSceneAt(scene, legacyPrizeStarted);
}

menuButton.addEventListener('click', () => showMenu());
document.querySelector('#learn-button').addEventListener('click', startLessons);
document.querySelector('#find-button').addEventListener('click', showRecognitionPicker);
document.querySelector('#test-button').addEventListener('click', startTest);
action.addEventListener('click', () => nextAction?.());
themeButton.addEventListener('click', switchTheme);
musicButton.addEventListener('click', () => {
  musicWanted = musicButton.getAttribute('aria-pressed') !== 'true';
  void syncMusic();
});
document.addEventListener('game-audio-state', () => updateMusicButton(winter && musicWanted && isJinglePlaying()));
for (const eventName of ['click', 'pointerup']) {
  document.addEventListener(eventName, event => {
    if (!event.isTrusted) return;
    initGameAudio();
    if (eventName === 'click' && event.target !== voiceButton && event.target !== repeatButton
        && event.target.closest?.('button')) prepareVoiceGesture();
  }, true);
}
showMenu(false);
document.querySelector('#browser-launch-note').hidden = true;
