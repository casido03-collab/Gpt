const MAX_HP = 120;
const HIT_DAMAGE = 15;
const ROUND_SECONDS = 85;
const WORDS = [
  'молния', 'буря', 'меч', 'щит', 'огонь', 'камень', 'ветер', 'атака', 'победа', 'воин',
  'дракон', 'удар', 'скорость', 'арена', 'сила', 'тайфун', 'искры', 'лава', 'туман', 'сталь'
];
const SESSION_NAMES = ['ShadowFox', 'КиберСамурай', 'Молния77', 'BladeCat', 'РусТайпер'];
const DEFAULT_LEADERS = [
  { name: 'КлавоНиндзя', rating: 1420 },
  { name: 'SwordType', rating: 1365 },
  { name: 'Быстрый Палец', rating: 1290 },
  { name: 'TelegramHero', rating: 1210 }
];

const state = {
  mode: 'ai',
  timer: ROUND_SECONDS,
  playerHp: MAX_HP,
  enemyHp: MAX_HP,
  playerWord: '',
  enemyWord: '',
  aiTimeout: 0,
  timerInterval: 0,
  rating: Number(localStorage.getItem('typingKombatRating')) || 1000,
  wins: Number(localStorage.getItem('typingKombatWins')) || 0,
  bestWord: localStorage.getItem('typingKombatBestWord') || '—'
};

const el = {
  menuScreen: document.querySelector('#menuScreen'),
  battleScreen: document.querySelector('#battleScreen'),
  ratingValue: document.querySelector('#ratingValue'),
  winsValue: document.querySelector('#winsValue'),
  bestWordValue: document.querySelector('#bestWordValue'),
  leaderboard: document.querySelector('#leaderboard'),
  sessionList: document.querySelector('#sessionList'),
  sessionStatus: document.querySelector('#sessionStatus'),
  battleMode: document.querySelector('#battleMode'),
  timer: document.querySelector('#timer'),
  playerHealthBar: document.querySelector('#playerHealthBar'),
  enemyHealthBar: document.querySelector('#enemyHealthBar'),
  playerHpText: document.querySelector('#playerHpText'),
  enemyHpText: document.querySelector('#enemyHpText'),
  playerWord: document.querySelector('#playerWord'),
  enemyWord: document.querySelector('#enemyWord'),
  currentWord: document.querySelector('#currentWord'),
  typingForm: document.querySelector('#typingForm'),
  typingInput: document.querySelector('#typingInput'),
  typingHint: document.querySelector('#typingHint'),
  playerFighter: document.querySelector('#playerFighter'),
  enemyFighter: document.querySelector('#enemyFighter'),
  hitFlash: document.querySelector('#hitFlash'),
  backToMenu: document.querySelector('#backToMenu')
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function nextWord(exceptWord = '') {
  let word = randomItem(WORDS);
  while (word === exceptWord) {
    word = randomItem(WORDS);
  }
  return word;
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function saveProfile() {
  localStorage.setItem('typingKombatRating', String(state.rating));
  localStorage.setItem('typingKombatWins', String(state.wins));
  localStorage.setItem('typingKombatBestWord', state.bestWord);
}

function renderProfile() {
  el.ratingValue.textContent = state.rating;
  el.winsValue.textContent = state.wins;
  el.bestWordValue.textContent = state.bestWord;
}

function renderLeaderboard() {
  const leaders = [
    ...DEFAULT_LEADERS,
    { name: 'YOU', rating: state.rating }
  ].sort((a, b) => b.rating - a.rating);

  el.leaderboard.innerHTML = leaders.map((leader, index) => `
    <li class="leaderboard__item ${leader.name === 'YOU' ? 'leaderboard__item--you' : ''}">
      <span>${index + 1}. ${leader.name}</span>
      <strong>${leader.rating}</strong>
    </li>
  `).join('');
}

function renderSessions(mode = 'idle') {
  const sessions = SESSION_NAMES.map((name, index) => ({
    name,
    status: index % 2 === 0 ? 'ищет бой' : 'дуэль по ссылке',
    rating: 970 + index * 86
  }));

  el.sessionStatus.textContent = mode === 'random' ? 'Идет поиск…' : 'Готов';
  el.sessionList.innerHTML = sessions.map(session => `
    <button class="session-card" type="button" data-mode="friend">
      <span><strong>${session.name}</strong><small>${session.status}</small></span>
      <em>${session.rating}</em>
    </button>
  `).join('');
}

function setScreen(screen) {
  el.menuScreen.classList.toggle('screen--active', screen === 'menu');
  el.battleScreen.classList.toggle('screen--active', screen === 'battle');
}

function renderBattle() {
  el.timer.textContent = formatTimer(state.timer);
  el.playerHpText.textContent = `${state.playerHp}/${MAX_HP}`;
  el.enemyHpText.textContent = `${state.enemyHp}/${MAX_HP}`;
  el.playerHealthBar.style.width = `${(state.playerHp / MAX_HP) * 100}%`;
  el.enemyHealthBar.style.width = `${(state.enemyHp / MAX_HP) * 100}%`;
  el.playerWord.textContent = state.playerWord;
  el.enemyWord.textContent = state.enemyWord;
  el.currentWord.textContent = state.playerWord;
}

function resetAnimations() {
  [el.playerFighter, el.enemyFighter].forEach(fighter => {
    fighter.classList.remove('fighter--attack', 'fighter--hurt', 'fighter--fall');
  });
  el.hitFlash.classList.remove('hit-flash--active', 'hit-flash--enemy', 'hit-flash--player');
}

function playHit(attacker, defender) {
  resetAnimations();
  const attackerEl = attacker === 'player' ? el.playerFighter : el.enemyFighter;
  const defenderEl = defender === 'player' ? el.playerFighter : el.enemyFighter;
  el.hitFlash.classList.add('hit-flash--active', defender === 'enemy' ? 'hit-flash--enemy' : 'hit-flash--player');
  attackerEl.classList.add('fighter--attack');
  defenderEl.classList.add('fighter--hurt');

  window.setTimeout(() => {
    defenderEl.classList.remove('fighter--hurt');
    defenderEl.classList.add('fighter--fall');
  }, 420);

  window.setTimeout(() => {
    resetAnimations();
  }, 2000);
}

function finishBattle(result) {
  window.clearInterval(state.timerInterval);
  window.clearTimeout(state.aiTimeout);
  el.typingInput.disabled = true;
  const won = result === 'win';
  el.typingHint.textContent = won ? 'Победа! Рейтинг +25.' : 'Поражение. Попробуй реванш!';
  if (won) {
    state.wins += 1;
    state.rating += 25;
  } else {
    state.rating = Math.max(100, state.rating - 12);
  }
  saveProfile();
  renderProfile();
  renderLeaderboard();
}

function damage(target) {
  if (target === 'enemy') {
    state.enemyHp = Math.max(0, state.enemyHp - HIT_DAMAGE);
    playHit('player', 'enemy');
    state.bestWord = state.playerWord.length > state.bestWord.length || state.bestWord === '—' ? state.playerWord : state.bestWord;
    state.playerWord = nextWord(state.enemyWord);
    el.typingInput.value = '';
    if (state.enemyHp === 0) {
      finishBattle('win');
    }
  } else {
    state.playerHp = Math.max(0, state.playerHp - HIT_DAMAGE);
    playHit('enemy', 'player');
    state.enemyWord = nextWord(state.playerWord);
    if (state.playerHp === 0) {
      finishBattle('lose');
    }
  }
  saveProfile();
  renderProfile();
  renderBattle();
}

function scheduleAiHit() {
  window.clearTimeout(state.aiTimeout);
  if (state.mode !== 'ai' || state.playerHp === 0 || state.enemyHp === 0) {
    return;
  }
  const delay = 2100 + Math.random() * 2300;
  state.aiTimeout = window.setTimeout(() => {
    damage('player');
    scheduleAiHit();
  }, delay);
}

function startTimer() {
  window.clearInterval(state.timerInterval);
  state.timerInterval = window.setInterval(() => {
    state.timer -= 1;
    el.timer.textContent = formatTimer(state.timer);
    if (state.timer <= 0) {
      finishBattle(state.enemyHp < state.playerHp ? 'win' : 'lose');
    }
  }, 1000);
}

function startBattle(mode) {
  state.mode = mode;
  state.timer = ROUND_SECONDS;
  state.playerHp = MAX_HP;
  state.enemyHp = MAX_HP;
  state.playerWord = nextWord();
  state.enemyWord = nextWord(state.playerWord);
  el.battleMode.textContent = mode === 'ai' ? 'Бой с ИИ' : mode === 'friend' ? 'Дуэль с другом' : 'Случайный соперник';
  el.typingInput.disabled = false;
  el.typingInput.value = '';
  el.typingHint.textContent = mode === 'ai'
    ? 'ИИ тоже печатает: успей первым.'
    : 'Сетевая сессия готова к подключению через Telegram WebApp.';
  resetAnimations();
  renderBattle();
  setScreen('battle');
  el.typingInput.focus();
  startTimer();
  scheduleAiHit();
}

function backToMenu() {
  window.clearInterval(state.timerInterval);
  window.clearTimeout(state.aiTimeout);
  renderSessions();
  setScreen('menu');
}

function bootTelegramMiniApp() {
  const telegram = window.Telegram?.WebApp;
  if (!telegram) {
    return;
  }
  telegram.ready();
  telegram.expand();
  document.body.classList.add('telegram-webapp');
}

document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    if (mode === 'random') {
      renderSessions('random');
      window.setTimeout(() => startBattle('random'), 900);
      return;
    }
    startBattle(mode);
  });
});

el.typingForm.addEventListener('submit', event => event.preventDefault());
el.typingInput.addEventListener('input', () => {
  const value = el.typingInput.value.trim().toLowerCase();
  el.typingInput.classList.toggle('typing-input--match', state.playerWord.startsWith(value) && value.length > 0);
  if (value === state.playerWord) {
    damage('enemy');
  }
});
el.backToMenu.addEventListener('click', backToMenu);

renderProfile();
renderLeaderboard();
renderSessions();
bootTelegramMiniApp();
