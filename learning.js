'use strict';

const activity = document.querySelector('#activity');
const activityTools = document.querySelector('#activity-tools');
const seenCards = new Set();
const studiedCards = new Set();

function uiButton(label, callback, className = 'menu-button') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', callback);
  return button;
}

function startLessons() {
  seenCards.clear();
  studiedCards.clear();
  showLessonPicker();
}

function showLessonPicker() {
  showScreen('Выбери число', 'Начнём с одного, двух и трёх?');
  activity.hidden = false;
  const grid = document.createElement('div');
  grid.className = 'lesson-picker';
  lessonCards.forEach((card, number) => {
    const done = studiedCards.has(number);
    const button = uiButton(String(number), () => showLessonCard(number), 'lesson-choice');
    button.setAttribute('aria-label', done ? `${number} — ${card.name}, изучено` : `${number} — ${card.name}`);
    button.classList.toggle('studied', done);
    grid.append(button);
  });
  activity.append(grid);
  question.focus();
}

function finishLesson(number) {
  if (!seenCards.has(number)) return;
  if (studiedCards.has(number)) {
    showLessonPicker();
    return;
  }
  studiedCards.add(number);
  if (studiedCards.size === 1) {
    showPrize('lesson-first', 'card-first', undefined, null, showLessonPicker);
  } else if (studiedCards.size === 3) {
    showPrize('lesson-third', 'card-third', undefined, null, showLessonPicker);
  } else {
    showLessonPicker();
  }
}

function showLessonCard(number, view = 'count') {
  const card = lessonCards[number];
  showScreen(`Число ${number}`, view === 'count' ? 'Давай посмотрим, сколько здесь предметов.' : 'Попробуй написать число.');
  activityTools.hidden = false;
  activityTools.append(uiButton('Все числа', showLessonPicker));
  const tabs = document.createElement('div');
  tabs.className = 'lesson-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Упражнения');
  for (const [key, label] of [['count', 'Считай'], ['watch', 'Посмотри'], ['trace', 'Обведи'], ['free', 'Напиши рядом']]) {
    const tab = uiButton(label, () => {
      if (view !== key) showLessonCard(number, key);
    });
    tab.setAttribute('aria-pressed', String(view === key));
    tabs.append(tab);
  }
  activityTools.append(tabs);
  if (view === 'count') showLessonCount(number, card);
  else showWritingExercise(number, card, view);
  question.focus();
}

function showLessonCount(number, card) {
  tray.hidden = false;
  tray.classList.add('lesson-tray', 'quantity-tray');
  tray.setAttribute('aria-label', `${card.name}. Предметы для счёта`);
  const numeral = lessonFigure(number, card.name);
  const grid = buildFruitGrid(card.item, number, false);
  const basket = document.createElement('div');
  basket.className = 'lesson-basket';
  basket.append(grid);
  if (number === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty-basket';
    empty.textContent = 'Пусто';
    basket.append(empty);
  }
  tray.append(numeral, basket);
  const pieces = [...grid.children];
  const pronounce = uiButton('Назвать число', () => void say(`number-${number}`));
  pronounce.hidden = true;
  const replay = uiButton('Повторить счёт', () => void countTogether());
  activityTools.append(pronounce, replay);
  let counting;
  cancelScreenView = () => counting?.abort();

  function complete() {
    pronounce.hidden = false;
    setAction('Готово', () => finishLesson(number));
  }

  async function countTogether() {
    counting?.abort();
    counting = new AbortController();
    const { signal } = counting;
    setAction('', undefined);
    pronounce.hidden = true;
    replayVoice = countTogether;
    pieces.forEach(piece => piece.classList.remove('revealed', 'lit'));
    await say(`number-${number}`);
    if (signal.aborted) return;
    if (!await waitForScreen(220, signal)) return;
    for (let i = 0; i < pieces.length; i += 1) {
      pieces[i].classList.add('revealed', 'lit');
      const heard = await say(`number-${i + 1}`);
      if (signal.aborted) return;
      if (!await waitForScreen(heard ? 145 : 580, signal)) return;
      pieces[i].classList.remove('lit');
    }
    await say(`total-${number}`);
    if (signal.aborted) return;
    replayVoice = undefined;
    seenCards.add(number);
    complete();
  }

  if (seenCards.has(number)) {
    pieces.forEach(piece => piece.classList.add('revealed'));
    void say(`total-${number}`);
    complete();
  } else {
    void countTogether();
  }
}

function lessonFigure(number, name) {
  const numeral = document.createElement('div');
  numeral.className = 'lesson-numeral';
  const figure = document.createElement('strong');
  figure.textContent = number;
  const word = document.createElement('span');
  word.textContent = name;
  numeral.append(figure, word);
  return numeral;
}

function showWritingExercise(number, card, view) {
  activity.hidden = false;
  const panel = document.createElement('div');
  panel.className = 'writing-panel';
  const controls = document.createElement('div');
  controls.className = 'writing-controls';
  const result = document.createElement('span');
  result.className = 'writing-result';
  result.setAttribute('role', 'status');
  let confirmWriting;
  const writing = createWriting(number, view, {
    onComplete() {
      result.textContent = 'Дорожка пройдена!';
      void say('writing-done');
    },
    onInk(drawn) {
      if (confirmWriting) confirmWriting.disabled = !drawn;
      if (!drawn) result.textContent = '';
    },
  });
  cancelScreenView = writing.dispose;
  panel.append(lessonFigure(number, card.name), writing.canvas);
  activity.append(panel, controls);
  if (view === 'watch') {
    const play = () => {
      writing.replay();
      void say(`stroke-${number}`, undefined, writing.replay);
    };
    replayVoice = play;
    controls.append(uiButton('Повторить показ', play));
    play();
  } else {
    controls.append(uiButton('Очистить', () => {
      result.textContent = '';
      writing.clear();
    }));
    if (view === 'free') {
      const guides = uiButton('Точки', () => guides.setAttribute('aria-pressed', String(writing.toggleGuides())));
      guides.setAttribute('aria-pressed', 'false');
      confirmWriting = uiButton('Показать результат', () => {
        result.textContent = 'Попытка готова!';
        void say('writing-tried');
      });
      confirmWriting.disabled = true;
      controls.append(guides, confirmWriting);
    }
    void say(view === 'trace' ? 'writing-trace' : 'writing-free');
  }
  controls.append(result);
  if (seenCards.has(number)) setAction('Завершить карточку', () => finishLesson(number));
  else setAction('Посчитать предметы', () => showLessonCard(number));
}

let recognitionLevel = 0;
let recognitionRound = [];
let recognitionStep = 0;
let independent = 0;

function showRecognitionPicker() {
  showScreen('Найди цифру', 'Слушай Бусю и выбирай цифру.');
  activity.hidden = false;
  const levels = document.createElement('div');
  levels.className = 'recognition-levels';
  ['1–3 · Начнём', '0–5 · Ещё цифры', '0–9 · Все цифры'].forEach((label, index) => {
    levels.append(uiButton(label, () => startRecognition(index)));
  });
  activity.append(levels);
  question.focus();
}

function startRecognition(level = recognitionLevel) {
  recognitionLevel = level;
  recognitionRound = [];
  recognitionStep = 0;
  independent = 0;
  const pool = recognitions[level];
  while (recognitionRound.length < 5) {
    const group = shuffle(pool);
    if (group[0] === recognitionRound.at(-1)) [group[0], group[1]] = [group[1], group[0]];
    recognitionRound.push(...group.slice(0, 5 - recognitionRound.length));
  }
  showRecognitionQuestion();
}

function showRecognitionProgress(solvedCurrent = false) {
  updateProgress(5, recognitionStep, solvedCurrent);
}

function showRecognitionQuestion() {
  const target = recognitionRound[recognitionStep];
  const card = lessonCards[target];
  let assisted = false;
  let errors = 0;
  let answered = false;
  showScreen('Найди цифру', 'Какую цифру назвала Буся?');
  showRecognitionProgress();
  activityTools.hidden = false;
  activityTools.append(uiButton('Уровни', showRecognitionPicker));
  const sample = uiButton('Показать образец', showSample);
  activityTools.append(sample);
  activity.hidden = false;
  activity.classList.add('recognition-activity');
  const model = document.createElement('strong');
  model.className = 'recognition-sample';
  model.hidden = true;
  model.textContent = target;
  model.setAttribute('aria-label', `Образец: ${card.name}`);
  activity.append(model);
  answers.hidden = false;
  answers.classList.add('recognition-answers');
  feedback.hidden = false;
  const distractors = shuffle(recognitions[recognitionLevel].filter(number => number !== target))
    .slice(0, recognitionLevel === 0 ? 1 : 2);
  let targetButton;
  for (const number of shuffle([target, ...distractors])) {
    const button = uiButton(String(number), () => answer(number, button), 'choice');
    if (number === target) targetButton = button;
    answers.append(button);
  }
  void say(`find-${target}`);
  question.focus();

  function showSample() {
    if (answered) return;
    assisted = true;
    model.hidden = false;
    targetButton.classList.add('hinted-choice');
  }

  function answer(number, button) {
    if (answered) return;
    if (number !== target) {
      errors += 1;
      button.classList.add('wrong');
      if (errors >= 2) {
        showSample();
        feedback.textContent = 'Вот нужная цифра.';
        void say('pick-hint');
      } else {
        feedback.textContent = 'Давай ещё раз.';
        void say(['try-again', `find-${target}`]);
      }
      return;
    }

    answered = true;
    if (!assisted) independent += 1;
    const final = recognitionStep === 4;
    const milestone = !assisted && (independent === 1 || independent === 3);
    if (final || milestone) {
      const key = final ? 'find-finish' : independent === 1 ? 'find-first' : 'find-third';
      const lines = final ? [`found-${target}`, `recognition-total-${independent}`] : `found-${target}`;
      const next = final ? showRecognitionResult : advanceRecognition;
      showPrize(key, lines, undefined, () => showRecognitionProgress(true), next, final);
      return;
    }
    showRecognitionProgress(true);
    button.classList.add('correct');
    feedback.textContent = card.found;
    sample.hidden = true;
    void say(`found-${target}`);
    setAction('Дальше', advanceRecognition);
    action.focus();
    answers.querySelectorAll('button').forEach(choice => { choice.disabled = true; });
  }
}

function advanceRecognition() {
  recognitionStep += 1;
  showRecognitionQuestion();
}

function showRecognitionResult() {
  showScreen('Ты закончил игру!', recognizedTotals[independent]);
  showRecognitionProgress(true);
  activity.hidden = false;
  const dragon = new Image();
  dragon.className = 'result-dragon';
  dragon.alt = 'Дракон машет лапой';
  dragon.dataset.themedDragon = 'yes';
  dragon.src = asset(winter ? 'dragon-winter' : 'dragon');
  activity.append(dragon);
  activityTools.hidden = false;
  activityTools.append(uiButton('Уровни', showRecognitionPicker));
  rememberVoice(`recognition-total-${independent}`);
  setAction('Сыграть ещё', () => startRecognition());
  question.focus();
}
