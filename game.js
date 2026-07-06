/* =========================================================
   Semordle – game.js
   Complete game logic for the daily semantic word game.
   ========================================================= */

'use strict';

// ─── Constants ───────────────────────────────────────────
const STORAGE_PREFIX = 'semordle:';
const WORDLE_MAX_ATTEMPTS = 6;

// ─── Click sound (Web Audio API — no external files) ─────
const _audioCtx = (() => {
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
})();

function playClick(type = 'key') {
  if (!_audioCtx) return;
  const now = _audioCtx.currentTime;

  if (type === 'submit') {
    // Deeper, satisfying thunk for submit/enter
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now); osc.stop(now + 0.13);

    const osc2 = _audioCtx.createOscillator();
    const gain2 = _audioCtx.createGain();
    osc2.connect(gain2); gain2.connect(_audioCtx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(140, now + 0.05);
    gain2.gain.setValueAtTime(0.10, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.start(now); osc2.stop(now + 0.09);
  } else {
    // Light tactile tick for regular buttons / keyboard keys
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now); osc.stop(now + 0.07);
  }
}

function resumeAudio() {
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
}

// ─── Background floating words ────────────────────────────
const _bgWords = {
  canvas: null,
  ctx: null,
  words: [],     // pool of { text, x, y, vx, vy, alpha, targetAlpha, size, phase, life, maxLife }
  pool: [],      // word strings to draw from
  raf: null,
  lastFrame: 0,
};

const BG_FILLER_WORDS = [
  // Common English nouns / adjectives that feel evocative but aren't cheats
  'light','shadow','mirror','bridge','stone','silver','amber','drift',
  'hollow','garden','thunder','echo','vessel','current','margin','bloom',
  'cipher','signal','tempo','canvas','depth','signal','notion','archive',
  'chapter','circuit','phantom','origin','vertex','solace','prism','motion',
  'fractal','glimmer','syntax','harbor','lantern','spiral','mosaic','tangent',
  'plateau','zenith','vector','lacuna','corona','tremor','stratum','nexus',
  // French equivalents (shown regardless of language — they add atmosphere)
  'lumière','ombre','miroir','pierre','courant','écho','jardin','cipher',
  'origine','spirale','prisme','signal','profond','mosaïque','sommet',
];

function bgWordsInit(puzzleWords) {
  const canvas = document.getElementById('bg-words-canvas');
  if (!canvas) return;
  _bgWords.canvas = canvas;
  _bgWords.ctx = canvas.getContext('2d');
  _bgWords.resize();

  // Build word pool: ~30% from puzzle top-1000, rest from filler
  // Shuffle puzzle words and take a sparse sample from scattered ranks
  const puzzleSample = [];
  if (puzzleWords && puzzleWords.length > 0) {
    // Pick ~15 words from spread ranks (not top 10 — too obvious)
    const candidates = puzzleWords.filter(w => w.rank != null && w.rank > 50 && w.rank <= 1000);
    for (let i = 0; i < Math.min(15, candidates.length); i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      puzzleSample.push(candidates.splice(idx, 1)[0].word);
    }
  }
  _bgWords.pool = [...BG_FILLER_WORDS, ...puzzleSample].sort(() => Math.random() - 0.5);

  window.addEventListener('resize', _bgWords.resize.bind(_bgWords));
  _bgWords.tick(performance.now());
}

_bgWords.resize = function() {
  if (!this.canvas) return;
  this.canvas.width  = window.innerWidth;
  this.canvas.height = window.innerHeight;
};

_bgWords.spawn = function() {
  const W = this.canvas.width, H = this.canvas.height;
  const text = this.pool[Math.floor(Math.random() * this.pool.length)];
  const size = 11 + Math.random() * 14;
  // Spawn anywhere on screen, biased toward edges so they don't crowd center
  const edge = Math.random() < 0.6;
  let x, y;
  if (edge) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0)      { x = Math.random() * W; y = -30; }
    else if (side === 1) { x = W + 30;             y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + 30; }
    else                 { x = -30;                y = Math.random() * H; }
  } else {
    x = Math.random() * W;
    y = Math.random() * H;
  }
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.12 + Math.random() * 0.18;
  const maxLife = 4000 + Math.random() * 6000;
  this.words.push({
    text, x, y, size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    alpha: 0,
    targetAlpha: 0.18 + Math.random() * 0.12,
    life: 0,
    maxLife,
    fadeIn:  maxLife * 0.15,
    fadeOut: maxLife * 0.75,
  });
};

_bgWords.tick = function(now) {
  this.raf = requestAnimationFrame(this.tick.bind(this));
  const dt = Math.min(now - this.lastFrame, 50);
  this.lastFrame = now;

  if (!this.canvas || !this.ctx) return;
  const ctx = this.ctx;
  const W = this.canvas.width, H = this.canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Maintain ~18 words on screen
  while (this.words.length < 18) this.spawn();

  ctx.font = `600 ${12}px 'Inter', sans-serif`;
  ctx.letterSpacing = '0.08em';

  for (let i = this.words.length - 1; i >= 0; i--) {
    const w = this.words[i];
    w.life += dt;
    w.x += w.vx;
    w.y += w.vy;

    // Fade in / sustain / fade out
    if (w.life < w.fadeIn) {
      w.alpha = w.targetAlpha * (w.life / w.fadeIn);
    } else if (w.life < w.fadeOut) {
      w.alpha = w.targetAlpha;
    } else if (w.life < w.maxLife) {
      w.alpha = w.targetAlpha * (1 - (w.life - w.fadeOut) / (w.maxLife - w.fadeOut));
    } else {
      this.words.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = w.alpha;
    ctx.font = `600 ${w.size}px 'Inter', sans-serif`;
    ctx.fillStyle = '#3a3020';
    ctx.fillText(w.text, w.x, w.y);
  }
  ctx.globalAlpha = 1;
};

// ─── i18n ─────────────────────────────────────────────────
const I18N = {
  en: {
    subtitle:        'A daily word hunt through meaning and letters.',
    inputPlaceholder:'Type a word…',
    guessBtn:        'Guess',
    journeyTitle:    'Your guesses',
    emptyState:      'Your guesses will appear here. Try a word that might be semantically related to the secret!',
    tabSemantic:     'Semantic',
    tabWordle:       'Wordle',
    startTitle:      'Unlock a clue word',
    startBestRank:   (r) => `Your current best rank is <strong style="color:var(--text)">#${r}</strong> — the clue word will be closer than that.`,
    startNoRank:     'Make a semantic guess first to get a better starting clue.',
    startBtn:        'Start challenge',
    wordleHeader:    'Letter world',
    wordleTitle:     'Unlock target',
    wordleDesc:      "Guess this hidden semantic clue — it's closer to the answer than your best word so far.",
    wordleLength:    (n, r) => `Word length: <strong style="color:var(--text)">${n} letters</strong> · ${r} attempts left`,
    wonTitle:        '🎉 You got it!',
    wonBody:         (w) => `"${w}" has been added to your semantic history.`,
    lostTitle:       'Not this time',
    lostBody:        (w, r) => `The word was <strong>${w}</strong> (rank #${r}).`,
    lostHint:        'Green-position letters saved as a clue.',
    backBtn:         '← Back',
    anotherBtn:      'Another Wordle',
    partialTitle:    'Partial clues from lost challenges',
    shareCaption:    'Share your result',
    copyBtn:         '📋 Copy to clipboard',
    copiedOk:        '✓ Copied to clipboard!',
    copiedFail:      'Could not copy — try manually',
    alreadyGuessed:  (w) => `You already guessed "${w}"`,
    alreadySolved:   "You already solved today's puzzle!",
    noClue:          'No stronger clue available — keep guessing!',
    needLetters:     (n) => `Need ${n} letters`,
    lettersOnly:     'Letters only please',
    alreadyTried:    'Already tried that word',
    outsideTop:      'outside top 1000',
    youFoundIt:      "You found it!",
    solved:          '🎯 Solved',
    inProgress:      '🕹 In progress',
    shareUrl:        'Play at https://semordle.game',
    howToTitle:      'How to play',
    howToBody: `
      <p>Every day there's a secret word. Your goal is to find it by guessing semantically related words.</p>
      <div class="how-to-step"><span class="how-to-icon">🧠</span><div><strong>Semantic tab</strong><br>Type any word. You'll see how <em>semantically close</em> it is to the secret — ranked from #1 (closest) down.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🔥</span><div><strong>Temperature</strong><br>Words are color-coded by rank:<br>
        <span style="color:#ef4444">■ Scorching</span> top 10 &nbsp;
        <span style="color:#f59e0b">■ Hot</span> top 100 &nbsp;
        <span style="color:#22c55e">■ Warm</span> top 500 &nbsp;
        <span style="color:#64748b">■ Cold</span> beyond
      </div></div>
      <div class="how-to-step"><span class="how-to-icon">🔡</span><div><strong>Wordle tab</strong><br>Unlock a hidden clue word by solving a Wordle-style challenge. Even if you fail, you keep the green letters as a hint.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🗺</span><div><strong>Semantic landscape</strong><br>See your guesses plotted visually. Closer words appear nearer the center. Zoom and pan to explore.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🎯</span><div><strong>Win</strong><br>Type the exact secret word to solve the puzzle. Share your result!</div></div>`,
    howToClose:      'Got it!',
    winTitle:        'You solved it!',
    winSubtitle:     (n) => `You found the word in ${n} guess${n !== 1 ? 'es' : ''}!`,
    keepPlaying:     'Keep playing',
  },
  fr: {
    subtitle:        'Une chasse aux mots quotidienne entre sens et lettres.',
    inputPlaceholder:'Entrez un mot…',
    guessBtn:        'Deviner',
    journeyTitle:    'Vos propositions',
    emptyState:      'Vos propositions apparaîtront ici. Essayez un mot sémantiquement proche du secret !',
    tabSemantic:     'Sémantique',
    tabWordle:       'Wordle',
    startTitle:      'Débloquer un indice',
    startBestRank:   (r) => `Votre meilleur rang actuel est <strong style="color:var(--text)">#${r}</strong> — le mot indice sera plus proche que ça.`,
    startNoRank:     'Faites d\'abord une proposition sémantique pour obtenir un meilleur indice.',
    startBtn:        'Lancer le défi',
    wordleHeader:    'Monde des lettres',
    wordleTitle:     'Débloquer la cible',
    wordleDesc:      'Devinez cet indice caché — il est plus proche de la réponse que votre meilleur mot.',
    wordleLength:    (n, r) => `Longueur : <strong style="color:var(--text)">${n} lettres</strong> · ${r} essais restants`,
    wonTitle:        '🎉 Trouvé !',
    wonBody:         (w) => `"${w}" a été ajouté à votre historique sémantique.`,
    lostTitle:       'Pas cette fois',
    lostBody:        (w, r) => `Le mot était <strong>${w}</strong> (rang #${r}).`,
    lostHint:        'Les lettres bien placées sont sauvegardées comme indice.',
    backBtn:         '← Retour',
    anotherBtn:      'Autre Wordle',
    partialTitle:    'Indices partiels des défis perdus',
    shareCaption:    'Partager votre résultat',
    copyBtn:         '📋 Copier dans le presse-papier',
    copiedOk:        '✓ Copié !',
    copiedFail:      'Impossible de copier — essayez manuellement',
    alreadyGuessed:  (w) => `Vous avez déjà proposé "${w}"`,
    alreadySolved:   'Vous avez déjà résolu le puzzle du jour !',
    noClue:          'Pas d\'indice plus fort disponible — continuez à deviner !',
    needLetters:     (n) => `${n} lettres requises`,
    lettersOnly:     'Lettres uniquement',
    alreadyTried:    'Mot déjà essayé',
    outsideTop:      'hors du top 1000',
    youFoundIt:      'Vous l\'avez trouvé !',
    solved:          '🎯 Résolu',
    inProgress:      '🕹 En cours',
    shareUrl:        'Jouez sur https://semordle.game',
    howToTitle:      'Comment jouer',
    howToBody: `
      <p>Chaque jour, il y a un mot secret. Votre objectif est de le trouver en devinant des mots sémantiquement proches.</p>
      <div class="how-to-step"><span class="how-to-icon">🧠</span><div><strong>Onglet Sémantique</strong><br>Entrez n'importe quel mot. Vous verrez à quel point il est <em>sémantiquement proche</em> du secret — classé du #1 (le plus proche) vers le bas.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🔥</span><div><strong>Température</strong><br>Les mots sont colorés selon leur rang :<br>
        <span style="color:#ef4444">■ Brûlant</span> top 10 &nbsp;
        <span style="color:#f59e0b">■ Chaud</span> top 100 &nbsp;
        <span style="color:#22c55e">■ Tiède</span> top 500 &nbsp;
        <span style="color:#64748b">■ Froid</span> au-delà
      </div></div>
      <div class="how-to-step"><span class="how-to-icon">🔡</span><div><strong>Onglet Wordle</strong><br>Débloquez un mot indice caché en résolvant un défi style Wordle. Même si vous échouez, vous gardez les lettres vertes.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🗺</span><div><strong>Paysage sémantique</strong><br>Visualisez vos propositions sur une carte. Les mots proches apparaissent près du centre. Zoomez et faites glisser pour explorer.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🎯</span><div><strong>Gagner</strong><br>Tapez le mot secret exact pour résoudre le puzzle. Partagez votre résultat !</div></div>`,
    howToClose:      'Compris !',
    winTitle:        'Résolu !',
    winSubtitle:     (n) => `Vous avez trouvé le mot en ${n} proposition${n !== 1 ? 's' : ''} !`,
    keepPlaying:     'Continuer à jouer',
  },
};

// Temperature band definitions
const TEMP = {
  SCORCH:   { min: 1,    max: 10,   label: 'Scorching', icon: '🔥', cssClass: 'scorch', color: '#ff6b6b' },
  HOT:      { min: 11,   max: 100,  label: 'Hot',       icon: '☀',  cssClass: 'hot',    color: '#f4a14a' },
  WARM:     { min: 101,  max: 500,  label: 'Warm',      icon: '🌤', cssClass: 'warm',   color: '#2dd4bf' },
  LUKEWARM: { min: 501,  max: 1000, label: 'Lukewarm',  icon: '❄',  cssClass: 'cold',   color: '#5a8f8a' },
  COLD:     { min: 1001, max: Infinity, label: 'Cold',  icon: '❄',  cssClass: 'cold',   color: '#3d6662' },
};

// ─── State ───────────────────────────────────────────────
let puzzle = null;          // loaded puzzle JSON
let gameState = null;       // persisted state object
let wordleState = null;     // active wordle challenge (in-memory)
let currentLang = localStorage.getItem('semordle:lang') || 'en';
let _initialized = false;

function t(key, ...args) {
  const val = I18N[currentLang]?.[key] ?? I18N.en[key];
  return typeof val === 'function' ? val(...args) : val;
}

// ─── Utility functions ───────────────────────────────────

function getTodayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function storageKey(puzzleDate) {
  return `${STORAGE_PREFIX}${currentLang}:${puzzleDate}`;
}

/**
 * Simple but consistent string hash → 0..359 angle
 */
function wordToAngle(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = ((hash << 5) - hash) + word.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  return Math.abs(hash) % 360;
}

function getTemperature(rank) {
  if (rank === null || rank === undefined || rank > 1000) return TEMP.COLD;
  if (rank <= 10)   return TEMP.SCORCH;
  if (rank <= 100)  return TEMP.HOT;
  if (rank <= 500)  return TEMP.WARM;
  if (rank <= 1000) return TEMP.LUKEWARM;
  return TEMP.COLD;
}

function normalizeScore(rawScore, hints) {
  if (!hints || !hints.top1 || hints.top1 === 0) return 0;
  return Math.min(100, Math.max(0, (rawScore / hints.top1) * 100));
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ─── Local Storage ───────────────────────────────────────

function loadState(puzzleDate) {
  try {
    const raw = localStorage.getItem(storageKey(puzzleDate));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse localStorage state:', e);
  }
  return null;
}

function createFreshState(puzzleDate) {
  return {
    puzzleId: puzzleDate,
    semanticGuesses: [],   // { word, rank, score, displayScore, unlocked }
    unlocks: [],           // words that have been successfully unlocked via wordle
    partialUnlockClues: [], // { target, mask, rank }
    solved: false,
    solvedAt: null,
    stats: {
      semanticGuessCount: 0,
      unlockCount: 0,
      wordleWinCount: 0,
      bestRank: null,
    },
  };
}

function saveState() {
  if (!gameState) return;
  try {
    localStorage.setItem(storageKey(gameState.puzzleId), JSON.stringify(gameState));
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

// ─── Puzzle loading ───────────────────────────────────────

async function loadPuzzle() {
  const today = getTodayDate();
  let loaded = null;

  // Try today's date file for current language
  try {
    const res = await fetch(`data/${currentLang}/${today}.json`);
    if (res.ok) loaded = await res.json();
  } catch (e) { /* swallow */ }

  // Fallback: walk backwards up to 30 days to find the most recent real puzzle
  if (!loaded) {
    const d = new Date();
    for (let i = 1; i <= 30 && !loaded; i++) {
      d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      try {
        const res = await fetch(`data/${currentLang}/${yyyy}-${mm}-${dd}.json`);
        if (res.ok) loaded = await res.json();
      } catch (e) { /* swallow */ }
    }
  }

  // Last resort: language sample, then English sample
  if (!loaded) {
    try {
      const res = await fetch(`data/${currentLang}/sample.json`);
      if (res.ok) loaded = await res.json();
    } catch (e) { /* swallow */ }
  }
  if (!loaded) {
    try {
      const res = await fetch('data/en/sample.json');
      if (res.ok) loaded = await res.json();
    } catch (e) {
      console.error('Failed to load any puzzle data:', e);
    }
  }

  return loaded;
}

// ─── Lookup a word in puzzle.words ───────────────────────

function lookupWord(word) {
  if (!puzzle || !puzzle.words) return null;
  const lc = word.toLowerCase().trim();
  const idx = puzzle.words.findIndex(w => w.word.toLowerCase() === lc);
  if (idx === -1) return null;
  const entry = puzzle.words[idx];
  if (entry.rank == null) return { ...entry, rank: idx + 1 };
  return entry;
}

function isSecretWord(word) {
  if (!puzzle) return false;
  return word.toLowerCase().trim() === puzzle.secret.toLowerCase();
}

// ─── Semantic guess submission ────────────────────────────

function submitSemanticGuess(rawWord) {
  const word = rawWord.toLowerCase().trim();
  if (!word) return;

  // Check for win
  if (isSecretWord(word)) {
    handleWin(word);
    return;
  }

  // Check for duplicate
  const alreadyGuessed = gameState.semanticGuesses.some(
    g => g.word.toLowerCase() === word
  );
  if (alreadyGuessed) {
    showSemanticMessage(t('alreadyGuessed', word), 'error');
    return;
  }

  // Look up in puzzle words
  const found = lookupWord(word);

  let guessEntry;
  if (found) {
    const displayScore = normalizeScore(found.score, puzzle.hints);
    const inTop1000 = found.rank <= 1000;
    guessEntry = {
      word: found.word,
      rank: found.rank,
      score: found.score,
      displayScore: displayScore,
      unlocked: false,
      isCold: !inTop1000,
    };
    // Update best rank only for top-1000 words
    if (inTop1000 && (gameState.stats.bestRank === null || found.rank < gameState.stats.bestRank)) {
      gameState.stats.bestRank = found.rank;
    }
  } else {
    // Word not in vocab at all — truly unknown
    guessEntry = {
      word: word,
      rank: null,
      score: null,
      displayScore: 0,
      unlocked: false,
      isCold: true,
    };
  }

  gameState.semanticGuesses.push(guessEntry);
  gameState.stats.semanticGuessCount++;
  saveState();

  clearSemanticMessage();
  renderGuessCard(guessEntry);
  updateBestRankLabel();

  updateLandscape();
  hideEmptyState();
}

// ─── Win ─────────────────────────────────────────────────

function handleWin(word) {
  if (gameState.solved) {
    showWinModal();
    return;
  }

  const winEntry = {
    word: word,
    rank: 0,
    score: puzzle.hints.top1,
    displayScore: 100,
    unlocked: false,
    isWin: true,
  };
  gameState.semanticGuesses.push(winEntry);
  gameState.stats.semanticGuessCount++;
  gameState.solved = true;
  gameState.solvedAt = new Date().toISOString();
  saveState();

  renderGuessCard(winEntry);
  updateBestRankLabel();

  updateLandscape();
  hideEmptyState();

  launchFireworks();
  launchLandscapeFireworks();
  setTimeout(() => showWinModal(), 1400);
}

// ─── Fireworks ────────────────────────────────────────────

function launchFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'fireworks-canvas';
  canvas.style.cssText = [
    'position:fixed', 'inset:0', 'width:100%', 'height:100%',
    'pointer-events:none', 'z-index:200',
  ].join(';');
  document.body.appendChild(canvas);

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  const particles = [];

  const COLORS = [
    '#2dd4bf', '#f4a14a', '#ff6b6b', '#f0ede4',
    '#3db8e8', '#fbbf24', '#7dd96a', '#c084fc',
  ];

  function createBurst(x, y) {
    const count = 80 + Math.floor(Math.random() * 40);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const color2 = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        radius: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? color : color2,
        decay: 0.012 + Math.random() * 0.010,
        gravity: 0.12 + Math.random() * 0.08,
        trail: [],
      });
    }
  }

  // Fire bursts at different positions and times
  const W = canvas.width;
  const H = canvas.height;
  const bursts = [
    { x: W * 0.25, y: H * 0.30, delay: 0   },
    { x: W * 0.75, y: H * 0.25, delay: 180 },
    { x: W * 0.50, y: H * 0.20, delay: 340 },
    { x: W * 0.15, y: H * 0.45, delay: 520 },
    { x: W * 0.85, y: H * 0.40, delay: 640 },
    { x: W * 0.60, y: H * 0.15, delay: 800 },
    { x: W * 0.35, y: H * 0.20, delay: 950 },
  ];
  bursts.forEach(b => setTimeout(() => createBurst(b.x, b.y), b.delay));

  let animId;
  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.shift();

      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Draw trail
      for (let t = 0; t < p.trail.length; t++) {
        const trailAlpha = (p.alpha * t) / p.trail.length * 0.4;
        ctx.beginPath();
        ctx.arc(p.trail[t].x, p.trail[t].y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = trailAlpha;
        ctx.fill();
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (particles.length > 0) {
      animId = requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  animId = requestAnimationFrame(frame);

  // Hard stop after 5s
  setTimeout(() => {
    cancelAnimationFrame(animId);
    canvas.remove();
  }, 5000);
}

// ─── Semantic message ─────────────────────────────────────

function applyI18n() {
  document.querySelector('.subtitle').textContent      = t('subtitle');
  document.getElementById('semantic-input').placeholder = t('inputPlaceholder');
  document.getElementById('semantic-submit').textContent = t('guessBtn');
  document.querySelector('#semantic-panel .section-title span:first-child').textContent = t('journeyTitle');
  document.getElementById('tab-semantic').textContent  = t('tabSemantic');
  document.getElementById('tab-wordle').textContent    = t('tabWordle');
  document.getElementById('guess-empty-state').querySelector('p').textContent = t('emptyState');
  // Win modal
  document.querySelector('.win-header h2').textContent = t('winTitle');
  document.getElementById('close-win-btn').textContent = t('keepPlaying');
  document.getElementById('copy-share-btn').textContent = t('copyBtn');
  document.getElementById('win-copy-btn').textContent  = t('copyBtn');
  // Share section caption
  const shareCaption = document.querySelector('.share-section .caption');
  if (shareCaption) shareCaption.textContent = t('shareCaption');
  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  // How-to modal content (re-render on lang switch)
  const htContent = document.getElementById('how-to-content');
  if (htContent) {
    htContent.innerHTML = `<div class="how-to-content"><h2>${t('howToTitle')}</h2>${t('howToBody')}<button class="how-to-close-btn how-to-close" aria-label="Close">${t('howToClose')}</button></div>`;
  }
  // Desktop sidebar how-to (same content, no close button)
  const sidebarContent = document.getElementById('sidebar-howto-content');
  if (sidebarContent) {
    sidebarContent.innerHTML = `<h2>${t('howToTitle')}</h2>${t('howToBody')}`;
  }
}

function showSemanticMessage(msg, type = '') {
  const el = document.getElementById('semantic-message');
  el.textContent = msg;
  el.className = 'game-message ' + type;
  // Auto-clear after 3s
  clearTimeout(el._timer);
  el._timer = setTimeout(() => clearSemanticMessage(), 3000);
}

function clearSemanticMessage() {
  const el = document.getElementById('semantic-message');
  el.textContent = '';
  el.className = 'game-message';
}

// ─── Render guess card ────────────────────────────────────

function renderGuessCard(entry) {
  const list = document.getElementById('guess-list');
  if (list.querySelector(`[data-word="${CSS.escape(entry.word)}"]`)) return;

  const temp = entry.isWin ? TEMP.SCORCH : getTemperature(entry.rank);

  const card = document.createElement('div');
  card.setAttribute('role', 'listitem');
  // Sort key: win=0, ranked by rank, unranked-but-scored by inverse score, truly unknown at bottom
  const sortKey = entry.isWin ? 0
    : entry.rank != null ? entry.rank
    : entry.score != null ? 1000 + (1 - entry.score) * 10000
    : 999999;

  card.dataset.rank = String(sortKey);
  card.dataset.word = entry.word;

  if (entry.isCold) {
    card.className = 'guess-card cold-card';
  } else if (entry.unlocked) {
    card.className = 'guess-card unlocked-card';
  } else {
    card.className = 'guess-card';
  }

  const rankLabel = entry.isWin ? '🎯 Solved!'
    : entry.rank != null ? `#${entry.rank}`
    : t('outsideTop');
  const tempLabel = entry.isWin ? t('youFoundIt') : temp.label;
  const scoreLabel = entry.displayScore > 0 ? entry.displayScore.toFixed(1) : null;

  const unlockBadge = entry.unlocked
    ? '<span class="unlock-badge" aria-label="unlocked via Wordle">🔓 Unlocked</span>'
    : '';

  const inTop1000 = !entry.isCold && entry.rank != null;
  const hasRealRank = entry.rank != null; // true for all found words, including beyond top 1000
  const metaLine = entry.isWin
    ? `${tempLabel}`
    : hasRealRank && scoreLabel
      ? `${temp.icon} ${tempLabel} · similarity ${scoreLabel} ${unlockBadge}`
      : `${temp.icon} ${tempLabel}`;

  const barFill = entry.displayScore > 0 ? entry.displayScore : 0;
  const showBar = entry.isWin || inTop1000;

  card.innerHTML = `
    <div>
      <div class="guess-word" style="color: ${entry.isWin ? '#fbbf24' : temp.color}">
        ${entry.isWin ? '🎯' : temp.icon} ${escapeHtml(entry.word)}
      </div>
      <div class="guess-meta">${metaLine}</div>
      ${showBar ? `<div class="bar" aria-hidden="true"><div class="fill" style="width:${barFill}%"></div></div>` : ''}
    </div>
    <div class="guess-rank" style="color: ${entry.isWin ? '#fbbf24' : temp.color}" aria-label="${rankLabel}">${rankLabel}</div>
  `;

  insertCardSorted(list, card, sortKey);

  // Highlight this card as the latest guess (skip on state restore)
  if (!entry._restoring) {
    list.querySelectorAll('.latest-guess').forEach(el => el.classList.remove('latest-guess'));
    card.classList.add('latest-guess');
    card.style.setProperty('--latest-color', temp.color + 'aa');
    card.style.setProperty('--latest-glow',  temp.color + '44');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function insertCardSorted(list, card, rank) {
  const emptyState = document.getElementById('guess-empty-state');
  const cards = [...list.querySelectorAll('.guess-card')];
  const insertBefore = cards.find(c => Number(c.dataset.rank) > rank);
  if (insertBefore) {
    list.insertBefore(card, insertBefore);
  } else if (emptyState) {
    list.insertBefore(card, emptyState);
  } else {
    list.appendChild(card);
  }
}

function hideEmptyState() {
  const el = document.getElementById('guess-empty-state');
  if (el) el.style.display = 'none';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Best rank labels ─────────────────────────────────────

function updateBestRankLabel() {
  const el = document.getElementById('best-rank-label');
  if (!el) return;
  const best = gameState.stats.bestRank;
  if (best) {
    el.textContent = `Best: #${best}`;
  } else {
    el.textContent = '';
  }
}

// ─── Landscape fireworks (burst from center circle) ──────

function launchLandscapeFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('landscape-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  // Center of the canvas in page coordinates
  const originX = rect.left + rect.width  / 2;
  const originY = rect.top  + rect.height / 2;

  // Create a temporary overlay canvas exactly over the landscape
  const fc = document.createElement('canvas');
  fc.style.cssText = [
    `position:fixed`,
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    `pointer-events:none`,
    `z-index:50`,
    `border-radius:26px`,
  ].join(';');
  fc.width  = rect.width  * (window.devicePixelRatio || 1);
  fc.height = rect.height * (window.devicePixelRatio || 1);
  document.body.appendChild(fc);

  const ctx = fc.getContext('2d');
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const W = rect.width;
  const H = rect.height;
  const cx = W / 2;
  const cy = H / 2;

  const COLORS = ['#2dd4bf','#f4a14a','#ff6b6b','#f0ede4','#3db8e8','#fbbf24','#7dd96a','#c084fc'];
  const particles = [];

  function burst(x, y, n) {
    const c1 = COLORS[Math.floor(Math.random() * COLORS.length)];
    const c2 = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: 1.5 + Math.random() * 2.5,
        color: Math.random() < 0.5 ? c1 : c2,
        decay: 0.016 + Math.random() * 0.012,
        gravity: 0.09 + Math.random() * 0.07,
      });
    }
  }

  // Staggered bursts from center, then a few scattered
  burst(cx, cy, 70);
  setTimeout(() => burst(cx, cy, 50), 220);
  setTimeout(() => burst(cx * 0.5, cy * 0.6, 40), 380);
  setTimeout(() => burst(cx * 1.5, cy * 0.6, 40), 500);
  setTimeout(() => burst(cx, cy * 0.4, 40), 650);

  let animId;
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.alpha -= p.decay;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (particles.length > 0) {
      animId = requestAnimationFrame(frame);
    } else {
      fc.remove();
    }
  }
  animId = requestAnimationFrame(frame);
  setTimeout(() => { cancelAnimationFrame(animId); fc.remove(); }, 4000);
}

// ─── Semantic Landscape (Canvas) ─────────────────────────

const TARGET_R = 16;

// Viewport state for pan/zoom
const view = { zoom: 1, panX: 0, panY: 0 };
const VIEW_MIN_ZOOM = 0.5;
const VIEW_MAX_ZOOM = 4;

function updateLandscape() {
  const canvas = document.getElementById('landscape-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const dpr  = window.devicePixelRatio || 1;
  if (canvas.width  !== Math.round(rect.width  * dpr) ||
      canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }

  const ctx = canvas.getContext('2d');
  const W = rect.width;
  const H = rect.height;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  // Apply pan/zoom transform around canvas center
  const cx0 = W / 2;
  const cy0 = H / 2;
  ctx.translate(cx0 + view.panX, cy0 + view.panY);
  ctx.scale(view.zoom, view.zoom);
  // World origin is now at canvas center; cx/cy in world coords = 0,0
  const cx = 0;
  const cy = 0;

  const MARGIN = 28;
  const maxR = Math.min(W, H) / 2 - MARGIN;

  // ── PASS 1: Zone fills — cool (outer) → warm (inner) ──
  const zoneFracs  = [1.0, 0.75, 0.50, 0.25];
  const zoneColors = [
    'rgba(45,100,120,0.09)',    // cold outer — blue-teal tint
    'rgba(45,180,140,0.09)',    // warm — teal-green
    'rgba(220,140,50,0.11)',    // hot — amber
    'rgba(255,90,60,0.15)',     // scorching — red-orange center
  ];
  zoneFracs.forEach((frac, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
    ctx.fillStyle = zoneColors[i];
    ctx.fill();
  });

  // ── PASS 2: Dashed ring borders only (no text labels) ──
  const ringFracs = [0.25, 0.50, 0.75, 1.0];
  const ringAlphas = [0.18, 0.13, 0.10, 0.08]; // inner rings slightly more visible
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1 / view.zoom;
  ringFracs.forEach((frac, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${ringAlphas[i]})`;
    ctx.stroke();
  });
  ctx.restore();

  // ── Collect dot world positions ──
  // Keep chronological order for journey path; score drives radial distance.
  const top1Score = puzzle.hints?.top1 || 1;

  // score-to-distance: log curve so small score differences near the edge
  // are still visible, while high scores compress near the center.
  const scoreToDist = (score) => {
    if (!score || score <= 0) return maxR * 0.93;
    const norm = clamp(score / top1Score, 0, 1); // 0 = far, 1 = closest word
    // log curve: norm=1 → distFrac≈0.08 (near center), norm=0 → distFrac≈0.92
    const distFrac = 0.08 + (1 - Math.pow(norm, 0.45)) * 0.84;
    return Math.max(maxR * distFrac, TARGET_R + 18);
  };

  const allGuesses = gameState.semanticGuesses.filter(g => !g.isWin);
  const dotItems = [];

  // Build dot items in chronological order (for journey path)
  const seen = new Set();
  allGuesses.forEach((g, i) => {
    const key = g.word;
    if (seen.has(key)) return;
    seen.add(key);
    const temp  = g.rank != null ? getTemperature(g.rank) : TEMP.COLD;
    const angle = wordToAngle(g.word);
    const rad   = (angle * Math.PI) / 180;
    const dist  = scoreToDist(g.score);
    const score = g.score || 0;
    dotItems.push({
      x: cx + dist * Math.cos(rad),
      y: cy + dist * Math.sin(rad),
      word: g.word,
      rank: g.rank,
      score,
      temp,
      large: g.rank != null && g.rank <= 10,
      order: i,
    });
  });

  // Convert world dot positions → screen positions for label placement
  // (labels are drawn in screen space so text stays readable at any zoom)
  const toScreen = (wx, wy) => ({
    sx: (cx0 + view.panX) + wx * view.zoom,
    sy: (cy0 + view.panY) + wy * view.zoom,
  });

  // ── PASS 3: Journey path (world space) — faint line through guesses in order ──
  if (dotItems.length >= 2) {
    ctx.save();
    ctx.lineWidth = 1.8 / view.zoom;
    ctx.setLineDash([4, 5]);
    ctx.lineCap = 'round';
    for (let i = 0; i < dotItems.length - 1; i++) {
      const a = dotItems[i], b = dotItems[i + 1];
      // Fade older segments; brighten as score improves along the path
      const t0 = clamp(a.score / top1Score, 0, 1);
      const t1 = clamp(b.score / top1Score, 0, 1);
      const alpha0 = 0.25 + t0 * 0.45;
      const alpha1 = 0.25 + t1 * 0.45;
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, a.temp.color + Math.round(alpha0 * 255).toString(16).padStart(2, '0'));
      grad.addColorStop(1, b.temp.color + Math.round(alpha1 * 255).toString(16).padStart(2, '0'));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── PASS 3b: Connector lines (dot → label, screen space) ──
  dotItems.forEach(d => {
    const sc = toScreen(d.x, d.y);
    const info = computeLabelScreen(ctx, d, sc.sx, sc.sy, W, H, view.zoom);
    if (!info) return;
    const dotR = (d.large ? 5 : 3) * view.zoom;
    const dx = info.cx - sc.sx;
    const dy = info.cy - sc.sy;
    const dist = Math.hypot(dx, dy);
    if (dist < dotR + 8) return;
    const nx = dx / dist, ny = dy / dist;
    // Draw in screen space: reset transform, draw, restore
    ctx.restore(); ctx.save();
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.moveTo(sc.sx + nx * (dotR + 2), sc.sy + ny * (dotR + 2));
    ctx.lineTo(info.cx - nx * 5, info.cy - ny * 5);
    ctx.strokeStyle = d.temp.color + 'aa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Re-apply world transform
    ctx.translate(cx0 + view.panX, cy0 + view.panY);
    ctx.scale(view.zoom, view.zoom);
  });

  // ── PASS 4: Dots (world space) ──
  dotItems.forEach(d => drawDot(ctx, d.x, d.y, d.temp, d.large, view.zoom, d.score, top1Score));

  // ── PASS 5: Target circle (world space, drawn before labels so labels sit on top) ──
  drawTarget(ctx, cx, cy, gameState.solved ? puzzle.secret : null, view.zoom);

  // ── PASS 6: Label pills (screen space — always crisp, always in front) ──
  ctx.restore();
  ctx.save();
  ctx.scale(dpr, dpr);
  dotItems.forEach(d => {
    const sc = toScreen(d.x, d.y);
    const info = computeLabelScreen(ctx, d, sc.sx, sc.sy, W, H, view.zoom);
    if (info) drawLabelScreen(ctx, d, info);
  });

  ctx.restore();

  // ── PASS 7: Zoom hint (screen space, only when default zoom) ──
  if (view.zoom === 1 && view.panX === 0 && view.panY === 0 && dotItems.length === 0) {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Scroll or pinch to zoom · drag to pan', W / 2, H - 8);
    ctx.restore();
  }
}

/**
 * Compute label pill position in screen coordinates.
 * The dot's screen position (sx, sy) is supplied; label is placed outward
 * from canvas center, guaranteed outside the target circle screen footprint.
 */
function computeLabelScreen(ctx, d, sx, sy, W, H, zoom) {
  const PILL_H   = 18;
  const PILL_PAD = 9;
  const DOT_R    = (d.large ? 5 : 3) * zoom;
  const GAP      = 8;

  const label = d.rank ? `${d.word} #${d.rank}` : d.word;
  ctx.font = `bold 11px Inter, sans-serif`;
  const pillW = ctx.measureText(label).width + PILL_PAD * 2;

  // Direction: outward from screen center
  const scx = W / 2 + view.panX;
  const scy = H / 2 + view.panY;
  const dx = sx - scx, dy = sy - scy;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist;

  // Push anchor past dot edge AND past target circle screen footprint
  const targetScreenR = TARGET_R * zoom;
  const anchorDist = Math.max(DOT_R + GAP, targetScreenR + GAP + 4);
  const ax = sx + nx * anchorDist;
  const ay = sy + ny * anchorDist;

  const EDGE = 6;
  const fits = (lx, ly) =>
    lx >= EDGE && lx + pillW <= W - EDGE &&
    ly >= EDGE && ly + PILL_H <= H - EDGE;

  const candidates = [
    { lx: ax,             ly: ay - PILL_H / 2 },
    { lx: ax - pillW,     ly: ay - PILL_H / 2 },
    { lx: ax - pillW / 2, ly: ay },
    { lx: ax - pillW / 2, ly: ay - PILL_H },
    { lx: ax,             ly: ay - PILL_H },
    { lx: ax - pillW,     ly: ay - PILL_H },
    { lx: ax,             ly: ay },
    { lx: ax - pillW,     ly: ay },
  ];

  let chosen = candidates.find(c => fits(c.lx, c.ly));
  if (!chosen) {
    const c = candidates[0];
    chosen = {
      lx: clamp(c.lx, EDGE, W - pillW - EDGE),
      ly: clamp(c.ly, EDGE, H - PILL_H - EDGE),
    };
  }

  return {
    lx: chosen.lx, ly: chosen.ly,
    cx: chosen.lx + pillW / 2, cy: chosen.ly + PILL_H / 2,
    label, w: pillW, h: PILL_H, pad: PILL_PAD,
  };
}

function drawDot(ctx, x, y, temp, large, zoom, score, top1Score) {
  const r = large ? 5 : 3;
  // Glow scales with score: cold word gets bare minimum, hot word gets large halo
  const proximity = top1Score > 0 ? clamp((score || 0) / top1Score, 0, 1) : 0;
  const glowR = r + 4 + proximity * 10;
  const glowAlpha = Math.round((0.25 + proximity * 0.55) * 255).toString(16).padStart(2, '0');
  const coreAlpha = Math.round((0.55 + proximity * 0.45) * 255).toString(16).padStart(2, '0');

  // Outer glow
  const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  grd.addColorStop(0, temp.color + glowAlpha);
  grd.addColorStop(1, temp.color + '00');
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Core dot — brighter for high-score words
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = temp.color + coreAlpha;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + proximity * 0.45})`;
  ctx.lineWidth = (large ? 1.5 : 1) / zoom;
  ctx.stroke();

  // Extra inner specular for top-10 words
  if (large) {
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + proximity * 0.35})`;
    ctx.fill();
  }
}

function drawLabelScreen(ctx, d, info) {
  const { lx, ly, label, w, h, pad } = info;
  ctx.fillStyle = 'rgba(4, 10, 8, 0.94)';
  ctx.strokeStyle = d.temp.color + '88';
  ctx.lineWidth = 1;
  roundRect(ctx, lx, ly, w, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = d.large ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.84)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, lx + pad, ly + h / 2);
}

function drawTarget(ctx, cx, cy, solvedWord, zoom) {
  ctx.beginPath();
  ctx.arc(cx, cy, TARGET_R + 10, 0, Math.PI * 2);
  ctx.fillStyle = solvedWord ? 'rgba(45,212,191,0.18)' : 'rgba(244,161,74,0.14)';
  ctx.fill();

  const grad = ctx.createRadialGradient(cx - 6, cy - 6, 3, cx, cy, TARGET_R);
  if (solvedWord) {
    grad.addColorStop(0, '#2dd4bf');
    grad.addColorStop(1, '#0a6e6e');
  } else {
    grad.addColorStop(0, '#f4a14a');
    grad.addColorStop(1, '#7a3a10');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, TARGET_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5 / zoom;
  ctx.stroke();

  if (solvedWord) {
    const availW = TARGET_R * 1.6;
    let fontSize = 15;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    while (fontSize > 8) {
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      if (ctx.measureText(solvedWord).width <= availW) break;
      fontSize--;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.fillText(solvedWord.toUpperCase(), cx, cy + 1);
  } else {
    ctx.font = `bold ${20}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + 1);
  }
  ctx.textAlign = 'left';
}

// ─── Landscape zoom/pan interaction ──────────────────────

function setupLandscapeInteraction() {
  const canvas = document.getElementById('landscape-canvas');
  if (!canvas) return;

  // ── Scroll to zoom (desktop) ──
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect  = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width  / 2 - view.panX;
    const mouseY = e.clientY - rect.top  - rect.height / 2 - view.panY;
    const delta  = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clamp(view.zoom * delta, VIEW_MIN_ZOOM, VIEW_MAX_ZOOM);
    const scale = newZoom / view.zoom;
    // Zoom toward mouse pointer
    view.panX -= mouseX * (scale - 1);
    view.panY -= mouseY * (scale - 1);
    view.zoom  = newZoom;
    updateLandscape();
    showZoomReset();
  }, { passive: false });

  // ── Drag to pan (desktop) ──
  let dragging = false, dragStartX = 0, dragStartY = 0, panAtDragX = 0, panAtDragY = 0;

  canvas.addEventListener('mousedown', e => {
    dragging   = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panAtDragX = view.panX;
    panAtDragY = view.panY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    view.panX = panAtDragX + (e.clientX - dragStartX);
    view.panY = panAtDragY + (e.clientY - dragStartY);
    updateLandscape();
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    canvas.style.cursor = 'grab';
  });
  canvas.style.cursor = 'grab';

  // ── Pinch to zoom + touch drag (mobile) ──
  let lastTouchDist = null;
  let lastTouchMidX = 0, lastTouchMidY = 0;
  let touchPanStartX = 0, touchPanStartY = 0;
  let panAtTouchX = 0, panAtTouchY = 0;

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      lastTouchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      lastTouchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
      touchPanStartX = e.touches[0].clientX;
      touchPanStartY = e.touches[0].clientY;
      panAtTouchX = view.panX;
      panAtTouchY = view.panY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect  = canvas.getBoundingClientRect();

      if (lastTouchDist) {
        const scale   = dist / lastTouchDist;
        const newZoom = clamp(view.zoom * scale, VIEW_MIN_ZOOM, VIEW_MAX_ZOOM);
        const pinchX  = midX - rect.left - rect.width  / 2 - view.panX;
        const pinchY  = midY - rect.top  - rect.height / 2 - view.panY;
        const zoomRatio = newZoom / view.zoom;
        view.panX -= pinchX * (zoomRatio - 1);
        view.panY -= pinchY * (zoomRatio - 1);
        view.zoom  = newZoom;
      }
      // Also track mid-point pan during pinch
      view.panX += midX - lastTouchMidX;
      view.panY += midY - lastTouchMidY;
      lastTouchDist = dist;
      lastTouchMidX = midX;
      lastTouchMidY = midY;
      updateLandscape();
      showZoomReset();
    } else if (e.touches.length === 1) {
      view.panX = panAtTouchX + (e.touches[0].clientX - touchPanStartX);
      view.panY = panAtTouchY + (e.touches[0].clientY - touchPanStartY);
      updateLandscape();
      showZoomReset();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => { lastTouchDist = null; }, { passive: true });
}

function resetView() {
  view.zoom = 1; view.panX = 0; view.panY = 0;
  updateLandscape();
  const btn = document.getElementById('landscape-reset-btn');
  if (btn) btn.style.opacity = '0';
}

function showZoomReset() {
  const btn = document.getElementById('landscape-reset-btn');
  if (btn) btn.style.opacity = '1';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Wordle unlock flow ───────────────────────────────────

function selectUnlockTarget() {
  const bestRank = gameState.stats.bestRank || 1001;

  // Build pool: rank < bestRank, not already guessed/unlocked, not the secret
  const guessedWords = new Set(gameState.semanticGuesses.map(g => g.word.toLowerCase()));
  const unlockedWords = new Set(gameState.unlocks.map(w => w.toLowerCase()));

  const pool = puzzle.words.filter(w => {
    const lc = w.word.toLowerCase();
    return w.rank < bestRank
      && !guessedWords.has(lc)
      && !unlockedWords.has(lc)
      && lc !== puzzle.secret.toLowerCase();
  });

  if (pool.length === 0) return null;

  // Weighted selection
  // 60%: 40–80% rank improvement zone
  // 30%: 10–40% rank improvement
  // 10%: top 10% of pool (best ranks)
  const sorted = [...pool].sort((a, b) => a.rank - b.rank);
  const n = sorted.length;

  const top10pct   = sorted.slice(0, Math.max(1, Math.floor(n * 0.10)));
  const pct10to40  = sorted.slice(Math.floor(n * 0.10), Math.floor(n * 0.40));
  const pct40to80  = sorted.slice(Math.floor(n * 0.40), Math.floor(n * 0.80));
  const rest       = sorted.slice(Math.floor(n * 0.80));

  const roll = Math.random();
  let chosen;
  if (roll < 0.60 && pct40to80.length > 0) {
    chosen = pct40to80[Math.floor(Math.random() * pct40to80.length)];
  } else if (roll < 0.90 && pct10to40.length > 0) {
    chosen = pct10to40[Math.floor(Math.random() * pct10to40.length)];
  } else if (top10pct.length > 0) {
    chosen = top10pct[Math.floor(Math.random() * top10pct.length)];
  } else {
    chosen = sorted[Math.floor(Math.random() * sorted.length)];
  }

  return chosen;
}

function showWordleStartPrompt(container) {
  if (!container) return;
  const best = gameState && gameState.stats.bestRank;
  const bestLine = best ? t('startBestRank', best) : t('startNoRank');
  container.innerHTML = `
    <div style="text-align:center;padding:40px 20px 32px;">
      <div style="font-size:38px;margin-bottom:14px;">🔐</div>
      <p style="margin:0 0 8px;font-size:18px;font-weight:900;letter-spacing:-0.03em;color:var(--text);">${t('startTitle')}</p>
      <p style="font-size:13px;color:var(--muted);margin:0 0 24px;">${bestLine}</p>
      <button id="wordle-start-btn" style="width:100%;height:52px;font-size:16px;border-radius:8px;" aria-label="${t('startBtn')}">${t('startBtn')}</button>
    </div>`;
  document.getElementById('wordle-start-btn')?.addEventListener('click', startWordleChallenge);
}

function startWordleChallenge() {
  if (gameState.solved) {
    showSemanticMessage(t('alreadySolved'), 'info');
    closeWordlePanel();
    return;
  }

  const target = selectUnlockTarget();
  if (!target) {
    const c = document.getElementById('wordle-inline-content');
    if (c) showWordleStartPrompt(c);
    showSemanticMessage(t('noClue'), 'info');
    closeWordlePanel();
    return;
  }

  wordleState = {
    target: target,
    attempts: [],        // array of { guess, result: [{letter, state}] }
    currentGuess: '',
    solved: false,
    failed: false,
    keyStates: {},       // letter → 'green'|'yellow'|'gray'
  };

  gameState.stats.unlockCount++;
  saveState();


  renderWordleUI();
  openWordlePanel();
}

function openWordlePanel() {
  const tabWordle   = document.getElementById('tab-wordle');
  const tabSemantic = document.getElementById('tab-semantic');
  const panelWordle = document.getElementById('wordle-inline-panel');
  const panelSem    = document.getElementById('semantic-panel');

  tabWordle.classList.add('active');
  tabWordle.setAttribute('aria-selected', 'true');
  tabSemantic.classList.remove('active');
  tabSemantic.setAttribute('aria-selected', 'false');
  panelWordle.classList.remove('hidden');
  panelSem.classList.add('hidden');

  panelWordle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeWordlePanel() {
  const tabSemantic = document.getElementById('tab-semantic');
  const tabWordle   = document.getElementById('tab-wordle');
  const panelSem    = document.getElementById('semantic-panel');
  const panelWordle = document.getElementById('wordle-inline-panel');

  tabSemantic.classList.add('active');
  tabSemantic.setAttribute('aria-selected', 'true');
  tabWordle.classList.remove('active');
  tabWordle.setAttribute('aria-selected', 'false');
  panelSem.classList.remove('hidden');
  panelWordle.classList.add('hidden');
}

// ─── Render Wordle UI ─────────────────────────────────────

function renderWordleUI() {
  const html = buildWordleHTML();
  document.getElementById('wordle-inline-content').innerHTML = html;
  bindWordleEvents('wordle-inline-content');
}

function buildWordleHTML() {
  if (!wordleState) return '';

  const { target, attempts, currentGuess, solved, failed } = wordleState;
  const wordLen = target.word.length;
  const activeRow = attempts.length;
  const isActive = !solved && !failed;

  // Board rows
  let boardRows = '';
  for (let i = 0; i < WORDLE_MAX_ATTEMPTS; i++) {
    const attempt = attempts[i] || null;
    const isCurrentRow = isActive && i === activeRow;
    const gridCols = `grid-template-columns: repeat(${wordLen}, 1fr)`;
    boardRows += `<div class="wordle-row${isCurrentRow ? ' wordle-row-active' : ''}" data-row="${i}" style="${gridCols}" aria-label="Row ${i + 1}">`;
    for (let j = 0; j < wordLen; j++) {
      if (attempt) {
        const cell = attempt.result[j];
        const stateLabel = cell.state === 'green' ? 'correct position' :
                           cell.state === 'yellow' ? 'wrong position' : 'absent';
        boardRows += `<div class="tile ${cell.state}" aria-label="${cell.letter} ${stateLabel}">${cell.letter.toUpperCase()}</div>`;
      } else if (isCurrentRow) {
        const letter = currentGuess[j] || '';
        const filledClass = letter ? ' filled' : '';
        boardRows += `<div class="tile${filledClass}">${letter}</div>`;
      } else {
        boardRows += `<div class="tile"></div>`;
      }
    }
    boardRows += '</div>';
  }

  // Result section
  const resultBtns = `
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="close-wordle-btn" style="flex:1;height:44px;font-size:14px;">${t('backBtn')}</button>
      <button class="new-wordle-btn" style="flex:1;height:44px;font-size:14px;">${t('anotherBtn')}</button>
    </div>`;
  let resultSection = '';
  if (solved) {
    resultSection = `
      <div class="wordle-result won" role="status" aria-live="polite">
        <h4>${t('wonTitle')}</h4>
        <p>${t('wonBody', escapeHtml(target.word))}</p>
        ${resultBtns}
      </div>`;
  } else if (failed) {
    const mask = buildPartialMask(target.word, attempts);
    resultSection = `
      <div class="wordle-result lost" role="status" aria-live="polite">
        <h4>${t('lostTitle')}</h4>
        <div class="revealed-word" aria-label="Partial clue: ${mask}">${mask}</div>
        <p>${t('lostHint')}</p>
        ${resultBtns}
      </div>`;
  }

  const keyboard = buildKeyboardHTML();

  const messageArea = isActive
    ? `<div class="wordle-message" role="alert" aria-live="polite"></div>`
    : '';

  return `
    <div class="wordle-header">
      <div class="caption">${t('wordleHeader')}</div>
      <h3>${t('wordleTitle')}</h3>
      <p>${t('wordleDesc')}</p>
      <p style="font-size:12px;color:var(--muted)">${t('wordleLength', wordLen, WORDLE_MAX_ATTEMPTS - attempts.length)}</p>
    </div>
    <div class="wordle-board" role="grid" aria-label="Wordle guess board">
      ${boardRows}
    </div>
    ${messageArea}
    ${resultSection}
    ${isActive ? keyboard : ''}
  `;
}

function buildPartialMask(word, attempts) {
  const letters = word.toUpperCase().split('');
  const mask = letters.map(() => '_');

  attempts.forEach(attempt => {
    attempt.result.forEach((cell, i) => {
      if (cell.state === 'green') {
        mask[i] = letters[i];
      }
    });
  });

  return mask.join(' ');
}

function buildKeyboardHTML() {
  const rows = currentLang === 'fr' ? [
    ['A','Z','E','R','T','Y','U','I','O','P'],
    ['Q','S','D','F','G','H','J','K','L','M'],
    ['ENTER','W','X','C','V','B','N','⌫'],
  ] : [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];

  let html = '<div class="vkeyboard" aria-label="Virtual keyboard">';
  rows.forEach(row => {
    html += '<div class="vkeyboard-row">';
    row.forEach(key => {
      const state = wordleState.keyStates[key] || '';
      const isWide = key === 'ENTER' || key === '⌫';
      const lc = key === '⌫' ? 'backspace' : key.toLowerCase();
      html += `<button class="vkey ${isWide ? 'wide' : ''} ${state}"
                 data-key="${key}"
                 aria-label="${lc}">${key}</button>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function bindWordleEvents(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Virtual keyboard clicks
  container.querySelectorAll('.vkey').forEach(btn => {
    btn.addEventListener('click', () => {
      handleWordleKey(btn.dataset.key);
    });
  });

  // Close buttons
  container.querySelectorAll('.close-wordle-btn').forEach(btn => {
    btn.addEventListener('click', () => closeWordlePanel());
  });

  // Another Wordle buttons
  container.querySelectorAll('.new-wordle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wordleState = null;
      startWordleChallenge();
    });
  });
}

// Central key handler — called by both virtual keyboard and physical keyboard
function handleWordleKey(key) {
  if (!wordleState || wordleState.solved || wordleState.failed) return;

  const maxLen = wordleState.target.word.length;

  if (key === '⌫' || key === 'Backspace') {
    wordleState.currentGuess = wordleState.currentGuess.slice(0, -1);
    updateActiveTiles();
  } else if (key === 'ENTER' || key === 'Enter') {
    submitWordleGuess();
  } else if (/^[A-Za-zÀ-ÿ]$/.test(key)) {
    if (wordleState.currentGuess.length < maxLen) {
      wordleState.currentGuess += key.toUpperCase();
      updateActiveTiles();
    }
  }
}

// Update only the active row tiles in all Wordle containers (no full re-render)
function updateActiveTiles() {
  if (!wordleState) return;
  const { attempts, currentGuess, target } = wordleState;
  const rowIndex = attempts.length;
  const wordLen = target.word.length;

  const container = document.getElementById('wordle-inline-content');
  if (!container) return;
  const row = container.querySelector(`[data-row="${rowIndex}"]`);
  if (!row) return;
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, j) => {
    const letter = currentGuess[j] || '';
    tile.textContent = letter;
    if (letter) {
      tile.classList.add('filled');
    } else {
      tile.classList.remove('filled');
    }
  });
}

function showWordleMessage(msg, type) {
  const container = document.getElementById('wordle-inline-content');
  if (!container) return;
  const el = container.querySelector('.wordle-message');
  if (!el) return;
  el.textContent = msg;
  el.className = 'wordle-message ' + (type || '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = '';
    el.className = 'wordle-message';
  }, 2500);
}

function submitWordleGuess() {
  if (!wordleState || wordleState.solved || wordleState.failed) return;

  const rawGuess = wordleState.currentGuess.toUpperCase();
  const targetWord = wordleState.target.word.toUpperCase();

  if (!rawGuess) return;

  if (rawGuess.length !== targetWord.length) {
    showWordleMessage(t('needLetters', targetWord.length), 'error');
    shakeActiveRow();
    return;
  }

  if (!/^[A-Za-zÀ-ÿ]+$/.test(rawGuess)) {
    showWordleMessage(t('lettersOnly'), 'error');
    return;
  }

  const alreadyGuessed = wordleState.attempts.some(a => a.guess === rawGuess);
  if (alreadyGuessed) {
    showWordleMessage(t('alreadyTried'), 'error');
    shakeActiveRow();
    return;
  }

  const result = evaluateWordleGuess(rawGuess, targetWord);
  wordleState.attempts.push({ guess: rawGuess, result });
  wordleState.currentGuess = '';

  updateKeyStates(result);

  if (rawGuess === targetWord) {
    wordleState.solved = true;
    renderWordleUI();
    handleWordleWin();
  } else if (wordleState.attempts.length >= WORDLE_MAX_ATTEMPTS) {
    wordleState.failed = true;
    renderWordleUI();
    handleWordleLoss();
  } else {
    renderWordleUI();
  }
}

function shakeActiveRow() {
  if (!wordleState) return;
  const rowIndex = wordleState.attempts.length;
  const container = document.getElementById('wordle-inline-content');
  if (!container) return;
  const row = container.querySelector(`[data-row="${rowIndex}"]`);
  if (!row) return;
  row.classList.add('shake');
  row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

/**
 * Standard Wordle evaluation with correct duplicate-letter handling.
 * Two-pass algorithm:
 * Pass 1: mark greens (correct letter, correct position)
 * Pass 2: mark yellows (correct letter, wrong position) using remaining unmatched letters
 */
function evaluateWordleGuess(guess, target) {
  const result = guess.split('').map(letter => ({ letter, state: 'gray' }));
  const targetArr = target.split('');
  const targetRemaining = [...targetArr]; // copy for tracking unmatched target letters

  // Pass 1: greens
  result.forEach((cell, i) => {
    if (cell.letter === targetArr[i]) {
      cell.state = 'green';
      targetRemaining[i] = null; // mark as used
    }
  });

  // Pass 2: yellows
  result.forEach((cell, i) => {
    if (cell.state === 'green') return;
    const matchIdx = targetRemaining.indexOf(cell.letter);
    if (matchIdx !== -1) {
      cell.state = 'yellow';
      targetRemaining[matchIdx] = null; // mark as used
    }
  });

  return result;
}

function updateKeyStates(result) {
  result.forEach(cell => {
    const existing = wordleState.keyStates[cell.letter];
    // Priority: green > yellow > gray
    if (existing === 'green') return;
    if (existing === 'yellow' && cell.state === 'gray') return;
    wordleState.keyStates[cell.letter] = cell.state;
  });
}

function handleWordleWin() {
  const target = wordleState.target;

  // Add to semantic guesses as an unlocked entry
  const displayScore = normalizeScore(target.score, puzzle.hints);
  const unlockEntry = {
    word: target.word,
    rank: target.rank,
    score: target.score,
    displayScore: displayScore,
    unlocked: true,
  };

  gameState.semanticGuesses.unshift(unlockEntry);
  gameState.unlocks.push(target.word);
  gameState.stats.wordleWinCount++;

  if (gameState.stats.bestRank === null || target.rank < gameState.stats.bestRank) {
    gameState.stats.bestRank = target.rank;
  }

  saveState();
  renderGuessCard(unlockEntry);
  updateBestRankLabel();

  updateLandscape();
  hideEmptyState();

  // Check if the unlocked word happens to be the secret (rare edge case)
  if (target.word.toLowerCase() === puzzle.secret.toLowerCase()) {
    setTimeout(() => handleWin(target.word), 600);
  }
}

function handleWordleLoss() {
  const target = wordleState.target;
  const mask = buildPartialMask(target.word, wordleState.attempts);

  const clue = {
    target: target.word,
    mask: mask,
    rank: target.rank,
  };
  gameState.partialUnlockClues.push(clue);
  saveState();

  renderPartialClues();
}

function renderPartialClues() {
  const container = document.getElementById('partial-clues');
  if (!container) return;
  container.innerHTML = '';

  if (gameState.partialUnlockClues.length === 0) return;

  const title = document.createElement('div');
  title.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;';
  title.textContent = t('partialTitle');
  container.appendChild(title);

  gameState.partialUnlockClues.forEach(clue => {
    const item = document.createElement('div');
    item.className = 'partial-clue-item';
    item.setAttribute('aria-label', `Partial clue: ${clue.mask}`);
    item.innerHTML = `
      <span aria-hidden="true">🔑</span>
      <span class="partial-clue-label">${escapeHtml(clue.mask)}</span>
      <span style="color:var(--muted);font-size:12px;">(rank #${clue.rank})</span>
    `;
    container.appendChild(item);
  });
}

// ─── Share card ───────────────────────────────────────────

function buildShareText() {
  const stats = gameState.stats;
  const num   = puzzle.puzzleNumber;

  // Build journey emoji string from guess history
  const journey = gameState.semanticGuesses.slice(0, 10).map(g => {
    if (g.isWin) return '🎯';
    if (!g.rank) return '❄';
    const t = getTemperature(g.rank);
    return t.icon;
  }).join(' ');

  const lines = [
    `Semordle #${num}`,
    `🧠 ${stats.semanticGuessCount} semantic guess${stats.semanticGuessCount !== 1 ? 'es' : ''}`,
    `🔓 ${stats.unlockCount} unlock${stats.unlockCount !== 1 ? 's' : ''}`,
    gameState.solved ? t('solved') : t('inProgress'),
    journey,
    '',
    t('shareUrl'),
  ];

  return lines.join('\n');
}

function buildShareCardHTML() {
  const stats = gameState.stats;
  const num   = puzzle.puzzleNumber;

  const journey = gameState.semanticGuesses.slice(0, 10).map(g => {
    if (g.isWin) return '🎯';
    if (!g.rank) return '❄';
    const t = getTemperature(g.rank);
    return t.icon;
  });

  return `
    <strong>Semordle #${num}</strong>
    <div>🧠 ${stats.semanticGuessCount} semantic guess${stats.semanticGuessCount !== 1 ? 'es' : ''}</div>
    <div>🔓 ${stats.unlockCount} unlock${stats.unlockCount !== 1 ? 's' : ''}</div>
    <div>${gameState.solved ? t('solved') : t('inProgress')}</div>
    <div class="journey" aria-label="Your guessing journey">${journey.join('')}</div>
  `;
}

async function copyShareText() {
  const text = buildShareText();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      document.body.removeChild(ta);
      return false;
    }
  }
}

function lockBodyScroll(lock) {
  document.body.style.overflow = lock ? 'hidden' : '';
}

function showWinModal() {
  const modal = document.getElementById('win-modal');
  if (!modal) return;

  const subtitle = document.getElementById('win-subtitle');
  if (subtitle) {
    subtitle.textContent = t('winSubtitle', gameState.stats.semanticGuessCount);
  }

  const card = document.getElementById('win-share-card');
  if (card) card.innerHTML = buildShareCardHTML();

  modal.classList.remove('hidden');
  lockBodyScroll(true);

  // Also update desktop share section
  updateShareSection();
}

function updateShareSection() {
  if (!gameState.solved) return;

  const section = document.getElementById('share-section');
  if (section) section.style.display = 'block';

  const preview = document.getElementById('share-card-preview');
  if (preview) preview.innerHTML = buildShareCardHTML();
}

// ─── Mobile mode tabs ─────────────────────────────────────

function setupModeTabs() {
  const tabSemantic = document.getElementById('tab-semantic');
  const tabWordle   = document.getElementById('tab-wordle');
  const panelSem    = document.getElementById('semantic-panel');
  const panelWordle = document.getElementById('wordle-inline-panel');

  if (!tabSemantic || !tabWordle) return;

  tabSemantic.addEventListener('click', () => {
    tabSemantic.classList.add('active');
    tabSemantic.setAttribute('aria-selected', 'true');
    tabWordle.classList.remove('active');
    tabWordle.setAttribute('aria-selected', 'false');
    panelSem.classList.remove('hidden');
    panelWordle.classList.add('hidden');
  });

  tabWordle.addEventListener('click', () => {
    tabWordle.classList.add('active');
    tabWordle.setAttribute('aria-selected', 'true');
    tabSemantic.classList.remove('active');
    tabSemantic.setAttribute('aria-selected', 'false');
    panelWordle.classList.remove('hidden');
    panelSem.classList.add('hidden');

    const inlineContainer = document.getElementById('wordle-inline-content');
    if (!inlineContainer) return;

    if (wordleState) {
      if (!inlineContainer.innerHTML.trim()) renderWordleUI();
    } else {
      startWordleChallenge();
    }
  });
}

// ─── Physical keyboard handler ────────────────────────────

function setupKeyboardHandler() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const howTo = document.getElementById('how-to-modal');
      const winModal = document.getElementById('win-modal');
      const sidebar = document.querySelector('.sidebar-howto');
      if (sidebar?.classList.contains('open')) {
        sidebar.classList.remove('open');
      } else if (!howTo.classList.contains('hidden')) {
        howTo.classList.add('hidden');
      } else if (!winModal.classList.contains('hidden')) {
        winModal.classList.add('hidden');
      } else {
        closeWordlePanel();
      }
      return;
    }

    // Route keys to Wordle when an unlock challenge is active
    if (wordleState && !wordleState.solved && !wordleState.failed) {
      const wordleVisible =
        !document.getElementById('wordle-inline-panel').classList.contains('hidden');

      if (wordleVisible) {
        // Prevent default for letter keys so they don't land in other inputs
        if (/^[A-Za-z]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter') {
          // Only intercept if the focused element is NOT the semantic input
          const focused = document.activeElement;
          const isSemanticInput = focused && focused.id === 'semantic-input';
          if (!isSemanticInput) {
            e.preventDefault();
            handleWordleKey(e.key);
          }
        }
      }
    }
  });
}

// ─── Restore state on load ────────────────────────────────

function restoreState() {
  if (!gameState) return;

  // Back-fill rank/score for cold guesses saved before the real-rank feature
  gameState.semanticGuesses.forEach(g => {
    if (g.isCold && g.rank == null) {
      const found = lookupWord(g.word);
      if (found) {
        g.rank = found.rank;
        g.score = found.score;
        g.displayScore = normalizeScore(found.score, puzzle.hints);
      }
    }
  });

  // Re-render all guesses sorted by rank (closest first); flag as restoring so no highlight
  [...gameState.semanticGuesses].forEach(g => renderGuessCard({ ...g, _restoring: true }));

  if (gameState.semanticGuesses.length > 0) {
    hideEmptyState();
  }

  updateBestRankLabel();

  renderPartialClues();
  updateLandscape();

  if (gameState.solved) {
    updateShareSection();
  }
}

// ─── Initialization ───────────────────────────────────────

async function init() {
  puzzle = await loadPuzzle();

  if (!puzzle) {
    document.getElementById('puzzle-pill').textContent = 'Failed to load puzzle';
    document.getElementById('semantic-input')?.setAttribute('disabled', 'true');
    document.getElementById('semantic-submit')?.setAttribute('disabled', 'true');
    return;
  }

  // Load or create game state
  const savedState = loadState(puzzle.date);
  gameState = savedState || createFreshState(puzzle.date);

  // Update header
  document.getElementById('puzzle-pill').textContent = `Daily #${puzzle.puzzleNumber} · ${puzzle.wordLength} letters`;
  document.title = `Semordle #${puzzle.puzzleNumber} – Daily semantic word hunt`;

  // Apply translations and setup UI bindings
  applyI18n();
  if (!_initialized) {
    setupHowTo();
    setupLangSwitcher();
    setupModeTabs();
    setupKeyboardHandler();
    setupModalCloseButtons();
    setupShareButtons();
    setupLandscapeInteraction();
    setupClickSounds();
    document.getElementById('landscape-reset-btn')?.addEventListener('click', resetView);
    _initialized = true;
  }

  // Start background floating words (re-init with new puzzle words on lang switch)
  if (_bgWords.raf) cancelAnimationFrame(_bgWords.raf);
  _bgWords.words = [];
  bgWordsInit(puzzle.words);
  setupSemanticInput();

  // Restore previous session
  restoreState();

  // Draw initial landscape
  updateLandscape();

  // Handle window resize for canvas
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateLandscape, 150);
  });
}

function setupClickSounds() {
  // Resume AudioContext on first user gesture (browser autoplay policy)
  document.addEventListener('pointerdown', resumeAudio, { once: true });

  // Delegate: every pointerdown on a button/tab/vkey plays a click
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('button, .vkey');
    if (!el) return;
    const isSubmit = el.id === 'semantic-submit' || el.classList.contains('wordle-submit');
    playClick(isSubmit ? 'submit' : 'key');
  });
}

function setupSemanticInput() {
  const input  = document.getElementById('semantic-input');
  const submit = document.getElementById('semantic-submit');

  if (!input || !submit) return;

  submit.addEventListener('click', () => {
    const word = input.value.trim();
    if (word) {
      submitSemanticGuess(word);
      input.value = '';
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const word = input.value.trim();
      if (word) {
        submitSemanticGuess(word);
        input.value = '';
      }
    }
  });

  // Auto-focus semantic input on load (desktop)
  if (window.innerWidth > 880) {
    input.focus();
  }
}


function setupModalCloseButtons() {
  // Win modal backdrop click
  document.getElementById('win-modal-backdrop')?.addEventListener('click', () => {
    document.getElementById('win-modal').classList.add('hidden');
    lockBodyScroll(false);
  });

  // Close win modal button
  document.getElementById('close-win-btn')?.addEventListener('click', () => {
    document.getElementById('win-modal').classList.add('hidden');
    lockBodyScroll(false);
  });
}

function setupShareButtons() {
  // Desktop share copy button
  document.getElementById('copy-share-btn')?.addEventListener('click', async () => {
    const ok = await copyShareText();
    const confirm = document.getElementById('copy-confirm');
    if (confirm) {
      confirm.textContent = ok ? t('copiedOk') : t('copiedFail');
      clearTimeout(confirm._timer);
      confirm._timer = setTimeout(() => { confirm.textContent = ''; }, 3000);
    }
  });

  // Win modal copy button
  document.getElementById('win-copy-btn')?.addEventListener('click', async () => {
    const ok = await copyShareText();
    const confirm = document.getElementById('win-copy-confirm');
    if (confirm) {
      confirm.textContent = ok ? t('copiedOk') : t('copiedFail');
      clearTimeout(confirm._timer);
      confirm._timer = setTimeout(() => { confirm.textContent = ''; }, 3000);
    }
  });
}

function setupHowTo() {
  const openBtn  = document.getElementById('how-to-btn');
  const modal    = document.getElementById('how-to-modal');
  const backdrop = document.getElementById('how-to-backdrop');
  const sidebar  = document.querySelector('.sidebar-howto');

  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

  const openModal    = () => { modal.classList.remove('hidden'); lockBodyScroll(true); };
  const closeModal   = () => { modal.classList.add('hidden');    lockBodyScroll(false); };
  const closeSidebar = () => sidebar?.classList.remove('open');

  openBtn?.addEventListener('click', () => {
    if (isDesktop()) {
      sidebar?.classList.toggle('open');
    } else {
      openModal();
    }
  });

  backdrop?.addEventListener('click', closeModal);
  sidebarCloseBtn?.addEventListener('click', closeSidebar);

  // Close sidebar when clicking outside it on desktop
  document.addEventListener('click', e => {
    if (isDesktop() && sidebar?.classList.contains('open')) {
      if (!sidebar.contains(e.target) && e.target !== openBtn) {
        closeSidebar();
      }
    }
  });

  // Delegate close for the in-content modal button (re-rendered on lang switch)
  modal?.addEventListener('click', e => {
    if (e.target.classList.contains('how-to-close')) closeModal();
  });
}

function setupLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn._langBound) return;
    btn._langBound = true;
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem('semordle:lang', lang);
      // Reload puzzle + game state for new language; reset Wordle
      wordleState = null;
      gameState   = null;
      puzzle      = null;
      document.getElementById('guess-list').innerHTML =
        '<div class="guess-list-empty" id="guess-empty-state"><p></p></div>';
      document.getElementById('wordle-inline-content').innerHTML = '';
      document.getElementById('partial-clues').innerHTML = '';
      document.getElementById('share-section').style.display = 'none';
      document.getElementById('best-rank-label').textContent = '';
      // Switch back to semantic tab
      document.getElementById('tab-semantic').click();
      init();
    });
  });
}

// ─── Bootstrap ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
