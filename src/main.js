import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/noto-sans-arabic/arabic-400.css';
import './styles.css';
import { Game, CARD_TIME_MS } from './game.js';
import { Leaderboard } from './leaderboard.js';
import { startParticles } from './particles.js';
import { Sounds } from './audio.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#clear-dialog');
const sounds = new Sounds();
const soundControl = document.querySelector('#sound-control');
function updateSoundControl() {
  soundControl.textContent = sounds.muted ? 'Sound off' : 'Sound on';
  soundControl.setAttribute('aria-label', sounds.muted ? 'Unmute sounds' : 'Mute sounds');
  soundControl.setAttribute('aria-pressed', String(sounds.muted));
}
updateSoundControl();
soundControl.addEventListener('click', () => { sounds.toggle(); updateSoundControl(); });
// Capture the first trusted interaction so the context is available before controls run.
document.addEventListener('pointerdown', () => sounds.unlock(), { capture: true });
document.addEventListener('keydown', () => sounds.unlock(), { capture: true });
document.addEventListener('click', event => {
  const control = event.target.closest('button');
  if (control && !control.disabled && control !== soundControl && !control.classList.contains('answer')) sounds.play('click');
}, { capture: true });
let screen = 'landing';
let previousScreen = 'landing';
let currentResult = null;
let playerName = '';
let frame = null;
let noticeTimer;

function notice(message) {
  clearTimeout(noticeTimer);
  document.querySelector('#notice').textContent = message;
  noticeTimer = setTimeout(() => { document.querySelector('#notice').textContent = ''; }, 10000);
}
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() { throw new Error(); } }; }
const leaderboard = new Leaderboard(storage, notice);
const game = new Game({ onTick: updateTimer, onReveal: reveal });
startParticles(document.querySelector('#particles'));

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(text, className, action) {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function logo() {
  const wrapper = element('div', 'brand');
  const img = element('img');
  img.src = `${import.meta.env.BASE_URL}assets/branding/nawras-name.png`;
  img.alt = 'NawrasEdu';
  img.width = 260; img.height = 87;
  img.addEventListener('error', () => wrapper.replaceChildren(element('span', 'brand-fallback', 'NAWRAS EDU')), { once: true });
  wrapper.append(img); return wrapper;
}
function enterScreen(next) {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  screen = next;
  app.className = `screen ${next}`;
  app.replaceChildren();
  window.scrollTo(0, 0);
}
function heading(text, className = '') {
  const h = element('h1', className, text);
  h.tabIndex = -1;
  return h;
}
function time(ms) { return `${(ms / 1000).toFixed(3)} s`; }

function landing() {
  game.dispose();
  enterScreen('landing');
  app.append(button('Leaderboard', 'corner-button', () => openLeaderboard('landing')));
  const content = element('div', 'landing-content');
  const title = heading('Guess the\nTech Career', 'hero-title');
  const form = element('form', 'name-form');
  const label = element('label', 'input-label', 'PLAYER NAME');
  label.htmlFor = 'player-name';
  const input = element('input');
  input.id = 'player-name'; input.name = 'playerName'; input.autocomplete = 'off';
  input.maxLength = 80; input.required = true; input.dir = 'auto';
  input.placeholder = 'Enter your name'; input.value = playerName;
  const start = element('button', 'primary start-button', 'Start');
  start.type = 'submit'; start.disabled = !input.value.trim();
  input.addEventListener('input', () => { playerName = input.value; start.disabled = !input.value.trim(); input.setCustomValidity(''); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value.trim()) { input.setCustomValidity('Enter your name to start.'); input.reportValidity(); return; }
    playerName = input.value.trim(); currentResult = null;
    game.start(playerName); renderCard();
  });
  form.append(label, input, start);
  content.append(logo(), title, form); app.append(content);
}

function renderCard() {
  enterScreen('game');
  app.append(logo());
  const content = element('section', 'game-content');
  const stats = element('div', 'stats');
  const progress = element('div', 'progress-group');
  progress.append(element('span', 'eyebrow', `CARD ${String(game.index + 1).padStart(2, '0')} / 05`));
  const dots = element('div', 'progress-dots');
  for (let i = 0; i < 5; i++) {
    const answered = game.answers[i];
    dots.append(element('span', `progress-dot ${i === game.index ? 'active' : ''} ${answered ? (answered.correct ? 'passed' : 'missed') : ''}`));
  }
  progress.append(dots);
  const count = element('div', 'score', `${game.correctCount} / 5 correct`); count.id = 'score';
  const timer = element('div', 'timer'); timer.id = 'timer'; timer.setAttribute('role', 'timer');
  timer.append(element('span', 'timer-icon', '◷'), element('span', '', '30 s'));
  stats.append(progress, count, timer);
  const track = element('div', 'time-track');
  const fill = element('div', 'time-fill'); fill.id = 'time-fill'; track.append(fill);
  const card = element('article', 'career-card'); card.id = 'career-card';
  const inner = element('div', 'card-inner');
  const front = element('div', 'card-face card-front');
  const back = element('div', 'card-face card-back');
  back.setAttribute('aria-hidden', 'true'); back.inert = true;
  front.append(element('span', 'card-label', 'THE CLUE'));
  const clue = element('div', 'arabic clue'); clue.lang = 'ar'; clue.dir = 'rtl';
  game.card.clue.forEach(line => clue.append(element('p', '', line)));
  front.append(clue, element('h1', 'who', 'Who am I?'));
  // Both faces size the same grid cell before the timer starts. The back is hidden
  // visually and from assistive technology until the answer, with no layout shift.
  back.append(element('span', 'card-label', 'CAREER REVEALED'), element('h2', 'career-title', game.card.name));
  const explanation = element('p', 'arabic explanation', game.card.explanation);
  explanation.dir = 'rtl'; explanation.lang = 'ar';
  const skills = element('div', 'skills'); skills.dir = 'ltr';
  skills.append(element('span', 'eyebrow', 'SKILLS'));
  const tags = element('div', 'skill-tags');
  game.card.skills.forEach(skill => tags.append(element('span', 'skill-tag', skill)));
  skills.append(tags); back.append(explanation, skills);
  inner.append(front, back); card.append(inner);
  const options = element('div', 'answers'); options.setAttribute('aria-label', 'Choose a career');
  game.options.forEach((option, i) => {
    const answer = button('', 'answer', () => game.answer(option.id));
    answer.dataset.career = option.id; answer.dir = 'ltr';
    answer.append(element('span', 'answer-key', String(i + 1)), element('span', '', option.name));
    options.append(answer);
  });
  const feedback = element('div', 'feedback'); feedback.id = 'feedback';
  feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  const next = button(game.index === 4 ? 'See results' : 'Next', 'primary next-button', () => {
    if (!game.next()) return;
    if (game.phase === 'complete') finish(); else renderCard();
  });
  next.id = 'next'; next.hidden = true;
  const stage = element('div', 'game-stage');
  const stack = element('div', 'play-stack');
  const continuation = element('div', 'continuation');
  continuation.append(feedback, next);
  stack.append(card, options, continuation); stage.append(stack);
  content.append(stats, track, stage);
  app.append(content);
  options.firstElementChild.focus({ preventScroll: true });
  // Let the DOM paint before starting the deadline. Repeated calls cannot restart it.
  frame = requestAnimationFrame(() => {
    frame = null;
    if (screen === 'game' && game.phase === 'ready') game.beginCard();
  });
}

function updateTimer(remaining) {
  const timer = document.querySelector('#timer');
  if (!timer) return;
  timer.lastElementChild.textContent = `${Math.ceil(remaining / 1000)} s`;
  timer.classList.toggle('urgent', remaining <= 10000);
  document.querySelector('#time-fill').style.width = `${100 * remaining / CARD_TIME_MS}%`;
}

function reveal(answer) {
  sounds.play(answer.correct ? 'correct' : answer.selectedId === null ? 'timeout' : 'wrong');
  document.querySelectorAll('.answer').forEach(node => {
    node.disabled = true;
    if (node.dataset.career === game.card.id) node.classList.add('correct-answer');
    else if (node.dataset.career === answer.selectedId) node.classList.add('wrong-answer');
  });
  const feedback = document.querySelector('#feedback');
  feedback.textContent = answer.correct ? 'Correct! Nicely done.' : answer.selectedId === null ? 'Time’s up. Meet the career below.' : 'Not quite. Meet the career below.';
  feedback.classList.add(answer.correct ? 'success' : 'incorrect');
  document.querySelector('#score').textContent = `${game.correctCount} / 5 correct`;
  updateTimer(answer.selectedId === null ? 0 : CARD_TIME_MS - answer.elapsedMs);
  const card = document.querySelector('#career-card');
  const front = card.querySelector('.card-front');
  const back = card.querySelector('.card-back');
  front.setAttribute('aria-hidden', 'true'); front.inert = true;
  back.removeAttribute('aria-hidden'); back.inert = false;
  back.querySelector('.career-title').classList.add('career-name');
  card.classList.add('flipped');
  document.querySelector('#next').hidden = false;
  document.querySelector('#next').focus({ preventScroll: true });
}

function leaderboardTable(entries, currentId) {
  const wrap = element('div', 'table-wrap');
  if (!entries.length) {
    const empty = element('div', 'empty-state');
    empty.append(element('span', 'empty-icon', '◇'), element('h2', '', 'The board is yours.'), element('p', '', 'Complete a round to set the first score.'));
    wrap.append(empty); return wrap;
  }
  const table = element('table');
  const caption = element('caption', 'sr-only', 'Leaderboard ranked by correct answers, then ranking time');
  const head = element('thead'); const labels = element('tr');
  ['Rank', 'Player', 'Correct', 'Ranking time'].forEach(label => {
    const th = element('th', '', label); th.scope = 'col'; labels.append(th);
  });
  head.append(labels); const body = element('tbody');
  entries.forEach(entry => {
    const row = element('tr', `${entry.rank <= 5 ? 'top-rank' : ''} ${entry.id === currentId ? 'current-attempt' : ''}`);
    if (entry.id === currentId) row.dataset.current = 'true';
    const rank = element('td'); rank.append(element('span', 'rank-badge', String(entry.rank)));
    const name = element('td', 'player-cell');
    const nameText = element('bdi', '', entry.name); nameText.dir = 'auto'; name.append(nameText);
    if (entry.id === currentId) name.append(element('span', 'you-tag', 'THIS ATTEMPT'));
    row.append(rank, name, element('td', 'correct-cell', `${entry.correct} / 5`), element('td', 'time-cell', time(entry.rankingTimeMs)));
    body.append(row);
  });
  table.append(caption, head, body); wrap.append(table); return wrap;
}

function finish() {
  sounds.play('complete');
  currentResult = game.result();
  leaderboard.save(currentResult); // Attempt ID makes this operation idempotent.
  results();
}

function results() {
  enterScreen('results'); app.append(logo());
  const content = element('section', 'results-content');
  const all = leaderboard.all(); const current = all.find(entry => entry.id === currentResult.id);
  const title = heading('Round complete');
  content.append(element('span', 'eyebrow', 'YOUR NEXT CHAPTER STARTS IN TECH'), title);
  const name = element('p', 'result-player', currentResult.name); name.dir = 'auto'; content.append(name);
  const metrics = element('div', 'result-metrics');
  [['Correct answers', `${currentResult.correct} / 5`], ['Ranking time', time(currentResult.rankingTimeMs)], ['Your rank', `#${current?.rank ?? '—'}`]].forEach(([label, value]) => {
    const metric = element('div', 'metric'); metric.append(element('span', 'eyebrow', label), element('strong', '', value)); metrics.append(metric);
  });
  const actions = element('div', 'actions');
  actions.append(button('Play Again', 'primary', landing), button('Full Leaderboard', '', () => openLeaderboard('results')));
  content.append(metrics, actions, element('h2', 'board-title', 'Top 5'));
  const preview = all.filter(entry => entry.rank <= 5);
  if (current && current.rank > 5) preview.push(current);
  content.append(leaderboardTable(preview, currentResult.id));
  content.append(element('p', 'board-note', 'Wrong or timed-out answers add 30 s. Reading time is excluded.'));
  app.append(content); title.focus({ preventScroll: true });
  scrollCurrent();
}
function scrollCurrent() {
  frame = requestAnimationFrame(() => {
    frame = null;
    const row = document.querySelector('[data-current]');
    if (row) row.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}

function openLeaderboard(from) {
  if (from) previousScreen = from;
  enterScreen('leaderboard'); app.append(logo());
  const content = element('section', 'leaderboard-content');
  const top = element('div', 'board-heading');
  const title = heading('Leaderboard');
  top.append(title, button('Back', '', () => previousScreen === 'results' && currentResult ? results() : landing()));
  content.append(top, element('p', 'board-note', 'Five careers. Your best thinking. Every attempt counts.'));
  content.append(leaderboardTable(leaderboard.all(), currentResult?.id));
  const footer = element('div', 'board-footer');
  footer.append(element('p', 'board-note', 'Saved on this browser only. Scores are not shared across devices.'));
  const clear = button('Clear Leaderboard', 'quiet-danger', () => {
    dialog.returnValue = '';
    dialog.showModal();
  });
  clear.disabled = !leaderboard.entries.length; footer.append(clear); content.append(footer);
  app.append(content); title.focus({ preventScroll: true }); scrollCurrent();
}
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'clear' && leaderboard.clear()) {
    openLeaderboard(); notice('Leaderboard cleared.');
  }
});

document.addEventListener('keydown', async event => {
  const typing = event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
  if (typing || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.key.toLowerCase() === 'f') {
    event.preventDefault();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { notice('Fullscreen is unavailable in this browser.'); }
  }
  if (!dialog.open && screen === 'game' && game.phase === 'answering' && /^[1-4]$/.test(event.key)) {
    event.preventDefault(); game.answer(game.options[Number(event.key) - 1].id);
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && game.phase === 'answering') { game.clearTimer(); game.tick(); }
});
window.addEventListener('pagehide', () => { game.dispose(); sounds.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted) landing(); });
landing();
