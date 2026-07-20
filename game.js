/* =========================================================
   Galexical – game.js
   Full-screen 3D semantic radar (Three.js r158)
   ========================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ─── Constants ───────────────────────────────────────────
const STORAGE_PREFIX = 'semordle:';
const WORDLE_MAX_ATTEMPTS = 6;

// ─── i18n ─────────────────────────────────────────────────
const I18N = {
  en: {
    subtitle:        'A daily word hunt through meaning and letters.',
    inputPlaceholder:'Type a word…',
    guessBtn:        'Guess',
    journeyTitle:    'Your journey',
    emptyState:      'Your guesses will appear here. Try a word that might be semantically related to the secret!',
    tabSemantic:     'Semantic',
    tabWordle:       'Wordle',
    startTitle:      'Unlock a clue word',
    startBestRank:   (r) => `Your current best rank is <strong style="color:var(--screen-text)">#${r}</strong> — the clue word will be closer than that.`,
    startNoRank:     'Make a semantic guess first to get a better starting clue.',
    startBtn:        'Start challenge',
    wordleHeader:    'Letter world',
    wordleTitle:     'Unlock target',
    wordleDesc:      "Guess this hidden semantic clue — it's closer to the answer than your best word so far.",
    wordleLength:    (n, r) => `Word length: <strong style="color:var(--screen-text)">${n} letters</strong> · ${r} attempts left`,
    wonTitle:        '🎉 You got it!',
    wonBody:         (w) => `"${w}" has been added to your semantic history.`,
    lostTitle:       'Not this time',
    lostBody:        (w, r) => `The word was <strong>${w}</strong> (rank #${r}).`,
    lostHint:        'Green-position letters saved as a clue.',
    backBtn:         '← Back',
    anotherBtn:      'Another Wordle',
    partialTitle:    'Partial clues from lost challenges',
    shareGuessLine:  (n) => `🧠 ${n} semantic guess${n !== 1 ? 'es' : ''}`,
    shareUnlockLine: (n) => `🔓 ${n} unlock${n !== 1 ? 's' : ''}`,
    shareCaption:    'Share your result',
    copyBtn:         '📋 Copy to clipboard',
    copiedOk:        '✓ Copied to clipboard!',
    copiedFail:      'Could not copy — try manually',
    alreadyGuessed:  (w) => `You already guessed "${w}"`,
    lemmaFolded:     (from, to) => `"${from}" counted as "${to}"`,
    tabJourney:      'Journey',
    rankedTitle:     'Ranked guesses',
    tempScorch:      'Scorching',
    tempHot:         'Hot',
    tempWarm:        'Lukewarm',
    tempCold:        'Cold',
    similarityLabel: 'similarity',
    bestRankShort:   (r) => `Best: #${r}`,
    unlockedBadge:   '🔓 Unlocked',
    guessCountLabel: (n) => `${n} ${n > 1 ? 'guesses' : 'guess'}`,
    alreadySolved:   "You already solved today's puzzle!",
    noClue:          'No stronger clue available — keep guessing!',
    needLetters:     (n) => `Need ${n} letters`,
    lettersOnly:     'Letters only please',
    alreadyTried:    'Already tried that word',
    outsideTop:      'outside top 1000',
    unknownWord:     'Unknown word',
    lastGuess:       'Last Guess',
    youFoundIt:      "You found it!",
    solved:          '🎯 Solved',
    inProgress:      '🕹 In progress',
    shareUrl:        'Play at https://galexical.com',
    howToTitle:      'How to play',
    howToBody: `
      <p>Every day there's a secret word. Your goal is to find it by guessing semantically related words.</p>
      <div class="how-to-step"><span class="how-to-icon">🧠</span><div><strong>Semantic search</strong><br>Type any word. You'll see how <em>semantically close</em> it is to the secret — ranked from #1 (closest) down.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🔥</span><div><strong>Temperature</strong><br>Words are color-coded by rank:<br>
        <span style="color:#ff6b6b">■ Scorching</span> top 100 &nbsp;
        <span style="color:#f4a14a">■ Hot</span> top 500 &nbsp;
        <span style="color:#2dd4bf">■ Warm</span> top 1000 &nbsp;
        <span style="color:#6b8fc2">■ Cold</span> beyond
      </div></div>
      <div class="how-to-step"><span class="how-to-icon">🌐</span><div><strong>3D radar</strong><br>Your guesses appear as glowing dots on a semantic sphere. Closer words orbit nearer the center. Drag to rotate, scroll to zoom.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🔡</span><div><strong>Wordle</strong><br>Tap ▲ Wordle to unlock a hidden clue word. Even if you fail, you keep the green letters.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🎯</span><div><strong>Win</strong><br>Type the exact secret word to solve the puzzle. Share your result!</div></div>`,
    howToClose:      'Got it!',
    wellDone:        '🎯 Well done!',
    winTitle:        'You solved it!',
    winSubtitle:     (n) => `You found the word in ${n} guess${n !== 1 ? 'es' : ''}!`,
    keepPlaying:     'Keep playing',
  },
  fr: {
    subtitle:        'Une chasse aux mots quotidienne entre sens et lettres.',
    inputPlaceholder:'Entrez un mot…',
    guessBtn:        'Deviner',
    journeyTitle:    'Votre parcours',
    emptyState:      'Vos propositions apparaîtront ici. Essayez un mot sémantiquement proche du secret !',
    tabSemantic:     'Sémantique',
    tabWordle:       'Wordle',
    startTitle:      'Débloquer un indice',
    startBestRank:   (r) => `Votre meilleur rang actuel est <strong style="color:var(--screen-text)">#${r}</strong> — le mot indice sera plus proche que ça.`,
    startNoRank:     'Faites d\'abord une proposition sémantique pour obtenir un meilleur indice.',
    startBtn:        'Lancer le défi',
    wordleHeader:    'Monde des lettres',
    wordleTitle:     'Débloquer la cible',
    wordleDesc:      'Devinez cet indice caché — il est plus proche de la réponse que votre meilleur mot.',
    wordleLength:    (n, r) => `Longueur : <strong style="color:var(--screen-text)">${n} lettres</strong> · ${r} essais restants`,
    wonTitle:        '🎉 Trouvé !',
    wonBody:         (w) => `"${w}" a été ajouté à votre historique sémantique.`,
    lostTitle:       'Pas cette fois',
    lostBody:        (w, r) => `Le mot était <strong>${w}</strong> (rang #${r}).`,
    lostHint:        'Les lettres bien placées sont sauvegardées comme indice.',
    backBtn:         '← Retour',
    anotherBtn:      'Autre Wordle',
    partialTitle:    'Indices partiels des défis perdus',
    shareGuessLine:  (n) => `🧠 ${n} proposition${n !== 1 ? 's' : ''}`,
    shareUnlockLine: (n) => `🔓 ${n} indice${n !== 1 ? 's' : ''}`,
    shareCaption:    'Partager votre résultat',
    copyBtn:         '📋 Copier dans le presse-papier',
    copiedOk:        '✓ Copié !',
    copiedFail:      'Impossible de copier — essayez manuellement',
    alreadyGuessed:  (w) => `Vous avez déjà proposé "${w}"`,
    lemmaFolded:     (from, to) => `« ${from} » compté comme « ${to} »`,
    tabJourney:      'Parcours',
    rankedTitle:     'Classement',
    tempScorch:      'Brûlant',
    tempHot:         'Chaud',
    tempWarm:        'Tiède',
    tempCold:        'Froid',
    similarityLabel: 'similarité',
    bestRankShort:   (r) => `Meilleur : #${r}`,
    unlockedBadge:   '🔓 Débloqué',
    guessCountLabel: (n) => `${n} proposition${n > 1 ? 's' : ''}`,
    alreadySolved:   'Vous avez déjà résolu le puzzle du jour !',
    noClue:          'Pas d\'indice plus fort disponible — continuez à deviner !',
    needLetters:     (n) => `${n} lettres requises`,
    lettersOnly:     'Lettres uniquement',
    alreadyTried:    'Mot déjà essayé',
    outsideTop:      'hors du top 1000',
    unknownWord:     'Mot inconnu',
    lastGuess:       'Dernière proposition',
    youFoundIt:      'Vous l\'avez trouvé !',
    solved:          '🎯 Résolu',
    inProgress:      '🕹 En cours',
    shareUrl:        'Jouez sur https://galexical.com',
    howToTitle:      'Comment jouer',
    howToBody: `
      <p>Chaque jour, il y a un mot secret. Votre objectif est de le trouver en devinant des mots sémantiquement proches.</p>
      <div class="how-to-step"><span class="how-to-icon">🧠</span><div><strong>Recherche sémantique</strong><br>Entrez n'importe quel mot. Vous verrez à quel point il est <em>sémantiquement proche</em> du secret — classé du #1 (le plus proche) vers le bas.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🔥</span><div><strong>Température</strong><br>Les mots sont colorés selon leur rang :<br>
        <span style="color:#ff6b6b">■ Brûlant</span> top 100 &nbsp;
        <span style="color:#f4a14a">■ Chaud</span> top 500 &nbsp;
        <span style="color:#2dd4bf">■ Tiède</span> top 1000 &nbsp;
        <span style="color:#6b8fc2">■ Froid</span> au-delà
      </div></div>
      <div class="how-to-step"><span class="how-to-icon">🌐</span><div><strong>Radar 3D</strong><br>Vos propositions apparaissent comme des points lumineux sur une sphère sémantique. Les mots proches orbitent près du centre. Faites glisser pour tourner, défilez pour zoomer.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🔡</span><div><strong>Wordle</strong><br>Appuyez sur ▲ Wordle pour débloquer un mot indice caché. Même si vous échouez, vous gardez les lettres vertes.</div></div>
      <div class="how-to-step"><span class="how-to-icon">🎯</span><div><strong>Gagner</strong><br>Tapez le mot secret exact pour résoudre le puzzle. Partagez votre résultat !</div></div>`,
    howToClose:      'Compris !',
    wellDone:        '🎯 Bien joué !',
    winTitle:        'Résolu !',
    winSubtitle:     (n) => `Vous avez trouvé le mot en ${n} proposition${n !== 1 ? 's' : ''} !`,
    keepPlaying:     'Continuer à jouer',
  },
};

// Temperature band definitions (kept for labels/icons; color now computed continuously)
const TEMP = {
  SCORCH: { min: 1,    max: 100,  labelKey: 'tempScorch', icon: '🔥', cssClass: 'scorch', color: '#ff5722' },
  HOT:    { min: 101,  max: 500,  labelKey: 'tempHot',    icon: '☀',  cssClass: 'hot',    color: '#ffc400' },
  WARM:   { min: 501,  max: 1000, labelKey: 'tempWarm',   icon: '🌤', cssClass: 'warm',   color: '#40c4ff' },
  COLD:   { min: 1001, max: Infinity, labelKey: 'tempCold', icon: '❄', cssClass: 'cold',  color: '#6b8fc2' },
};

// Heat gradient: rank 1 = bright green, 2-10 vivid red, …, 1000 light blue, +1000 steel blue
// The cold end stays bright enough to read against the dark background.
function rankToColor(rank) {
  if (rank == null || rank > 1000) return '#6b8fc2';
  if (rank === 1) return '#00e676';

  // Stops: [rank_threshold, r, g, b]
  const stops = [
    [2,   255,  23,  68],  // #ff1744 vivid red
    [11,  255,  87,  34],  // #ff5722 red-orange
    [51,  255, 145,   0],  // #ff9100 orange
    [201, 255, 196,   0],  // #ffc400 amber
    [501,  64, 196, 255],  // #40c4ff light blue
    [1001, 107, 143, 194], // #6b8fc2 steel blue (sentinel)
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [r0, r0r, r0g, r0b] = stops[i];
    const [r1, r1r, r1g, r1b] = stops[i + 1];
    if (rank >= r0 && rank < r1) {
      const t = (rank - r0) / (r1 - r0);
      const r = Math.round(r0r + t * (r1r - r0r));
      const g = Math.round(r0g + t * (r1g - r0g));
      const b = Math.round(r0b + t * (r1b - r0b));
      return `rgb(${r},${g},${b})`;
    }
  }
  return '#6b8fc2';
}

// ─── State ───────────────────────────────────────────────
let puzzle = null;
let gameState = null;
let wordleState = null;
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

function wordToAngle(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = ((hash << 5) - hash) + word.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function getTemperature(rank) {
  if (rank === null || rank === undefined || rank > 1000) return TEMP.COLD;
  if (rank <= 100)  return TEMP.SCORCH;
  if (rank <= 500)  return TEMP.HOT;
  if (rank <= 1000) return TEMP.WARM;
  return TEMP.COLD;
}

function normalizeScore(rawScore, hints) {
  if (!hints || !hints.top1 || hints.top1 === 0) return 0;
  return Math.min(100, Math.max(0, (rawScore / hints.top1) * 100));
}

// Fold diacritics for letter comparison: "séjour" → "sejour".
// NFD splits base char + combining accent; stripping the combining marks
// keeps the string length identical (œ/æ are untouched — single chars).
function deaccent(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// Displayed ranks count the SECRET as #1: its closest neighbor shows #2.
// Internal ranks stay 0-shifted (data files, TEMP bands, bestRank compare,
// localStorage) — only apply this at render time, never in game logic.
function displayRank(rank) {
  return rank == null ? null : rank + 1;
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
    semanticGuesses: [],
    unlocks: [],
    partialUnlockClues: [],
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

  try {
    const res = await fetch(`data/${currentLang}/${today}.json`);
    if (res.ok) loaded = await res.json();
  } catch (e) { /* swallow */ }

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
  const lc = word.toLowerCase().trim().normalize('NFC');
  const idx = puzzle.words.findIndex(w => w.word.toLowerCase().normalize('NFC') === lc);
  if (idx === -1) return null;
  const entry = puzzle.words[idx];
  if (entry.rank == null) return { ...entry, rank: idx + 1 };
  return entry;
}

function isSecretWord(word) {
  if (!puzzle) return false;
  return word.toLowerCase().trim().normalize('NFC') === puzzle.secret.toLowerCase().normalize('NFC');
}

// ─── Form → lemma map (chevaux → cheval, cats → cat) ─────
// Puzzle vocabularies contain only lemmas; this map folds inflected
// guesses onto their lemma so they still get a score.

let formsMap = null;

async function loadFormsMap() {
  formsMap = null;
  try {
    const res = await fetch(`vocab/${currentLang}_forms.json`);
    if (res.ok) formsMap = await res.json();
  } catch (e) { /* map is optional — exact lookups still work without it */ }
}

function toLemma(word) {
  if (!formsMap) return null;
  const lemma = formsMap[word.toLowerCase().trim().normalize('NFC')];
  return lemma || null;
}

// ─── Semantic guess submission ────────────────────────────

function submitSemanticGuess(rawWord) {
  let word = rawWord.toLowerCase().trim();
  if (!word) return;

  if (isSecretWord(word)) {
    handleWin(word);
    return;
  }

  // Fold inflected forms onto their lemma (chevaux → cheval).
  // Exact vocabulary words always win over the mapping.
  let folded = false;
  let found = lookupWord(word);
  if (!found) {
    const lemma = toLemma(word);
    if (lemma) {
      if (isSecretWord(lemma)) {
        handleWin(lemma);
        return;
      }
      const lemmaEntry = lookupWord(lemma);
      if (lemmaEntry) {
        found = lemmaEntry;
        folded = word !== lemma;
        word = lemma;
      }
    }
  }

  const alreadyGuessed = gameState.semanticGuesses.some(
    g => g.word.toLowerCase().normalize('NFC') === word.normalize('NFC')
  );
  if (alreadyGuessed) {
    showSemanticMessage(t('alreadyGuessed', word), 'error');
    return;
  }

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
    if (inTop1000 && (gameState.stats.bestRank === null || found.rank < gameState.stats.bestRank)) {
      gameState.stats.bestRank = found.rank;
    }
  } else {
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
  if (folded) showSemanticMessage(t('lemmaFolded', rawWord.toLowerCase().trim(), word), 'info');
  else if (!found) showSemanticMessage(t('unknownWord'), 'error');
  renderGuessCard(guessEntry);
  updateBestRankLabel();
  hideEmptyState();
}

// ─── Win ─────────────────────────────────────────────────

function handleWin(word) {
  if (gameState.solved) {
    showWinToast();
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
  hideEmptyState();
  updateShareSection();

  updateScene();
  launchFireworks();
  launchThreeFireworks();
  setTimeout(() => showWinToast(), 1400);
}

// ─── Fireworks (full-screen overlay canvas) ───────────────
// Win celebration in two acts: a big opening volley, then a continuous
// but subtle ambient show that keeps the solved screen alive.

const FW_COLORS = [
  '#2dd4bf', '#f4a14a', '#ff6b6b', '#f0ede4',
  '#3db8e8', '#fbbf24', '#7dd96a', '#c084fc',
];

let _fw = null; // { canvas, ctx, particles, rafId, ambientTimer }
let _fwPending = []; // launch timeouts (volley + ambient handoff) not yet fired

function _fwEnsure() {
  if (_fw) return _fw;

  const canvas = document.createElement('canvas');
  canvas.id = 'fireworks-canvas';
  canvas.style.cssText = [
    'position:fixed', 'inset:0', 'width:100%', 'height:100%',
    // Above the game UI (20) but below the wordle overlay (50) and modals (100)
    'pointer-events:none', 'z-index:40',
  ].join(';');
  document.body.appendChild(canvas);
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  _fw = { canvas, ctx: canvas.getContext('2d'), particles: [], rafId: null, ambientTimer: null };

  function frame() {
    const { ctx, particles } = _fw;
    // Follow window resizes (the ambient show can run for a long time)
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
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

      if (p.alpha <= 0) { particles.splice(i, 1); continue; }

      for (let t = 0; t < p.trail.length; t++) {
        const trailAlpha = (p.alpha * t) / p.trail.length * 0.4;
        ctx.beginPath();
        ctx.arc(p.trail[t].x, p.trail[t].y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = trailAlpha;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    _fw.rafId = requestAnimationFrame(frame);
  }
  _fw.rafId = requestAnimationFrame(frame);
  return _fw;
}

// One explosion. intensity 1 = opening volley; ~0.3 = ambient spark.
function _fwBurst(x, y, intensity = 1) {
  const fw = _fwEnsure();
  const count = Math.round((80 + Math.random() * 40) * intensity);
  const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const color2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = (2 + Math.random() * 6) * (0.5 + intensity * 0.5);
    fw.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.5 + intensity * 0.5,
      radius: (2 + Math.random() * 3) * (0.6 + intensity * 0.4),
      color: Math.random() < 0.5 ? color : color2,
      decay: 0.012 + Math.random() * 0.010,
      gravity: 0.12 + Math.random() * 0.08,
      trail: [],
    });
  }
}

// Kill the whole show (canvas, ambient timer, raf loop). Called on every
// game re-init: the language switcher re-initializes IN PLACE (no page
// reload), so an EN win's ambient show must not leak into the FR game.
function stopFireworks() {
  // Pending launch timeouts would re-create the canvas after the cleanup
  _fwPending.forEach(clearTimeout);
  _fwPending = [];
  if (!_fw) return;
  clearTimeout(_fw.ambientTimer);
  cancelAnimationFrame(_fw.rafId);
  _fw.canvas.remove();
  _fw = null;
}

// Act 2: quiet ambient bursts every ~1.5-3.5 s while the solved screen shows
function startAmbientFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fw = _fwEnsure();
  if (fw.ambientTimer) return; // already running

  const schedule = () => {
    fw.ambientTimer = setTimeout(() => {
      const x = window.innerWidth  * (0.10 + Math.random() * 0.80);
      const y = window.innerHeight * (0.10 + Math.random() * 0.45);
      _fwBurst(x, y, 0.22 + Math.random() * 0.18);
      schedule();
    }, 1500 + Math.random() * 2000);
  };
  schedule();
}

// Act 1: the big win volley, then hand over to the ambient show
function launchFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  _fwEnsure();

  const W = window.innerWidth;
  const H = window.innerHeight;
  const bursts = [
    { x: W * 0.25, y: H * 0.30, delay: 0   },
    { x: W * 0.75, y: H * 0.25, delay: 180 },
    { x: W * 0.50, y: H * 0.20, delay: 340 },
    { x: W * 0.15, y: H * 0.45, delay: 520 },
    { x: W * 0.85, y: H * 0.40, delay: 640 },
    { x: W * 0.60, y: H * 0.15, delay: 800 },
    { x: W * 0.35, y: H * 0.20, delay: 950 },
  ];
  bursts.forEach(b => _fwPending.push(setTimeout(() => _fwBurst(b.x, b.y, 1), b.delay)));

  _fwPending.push(setTimeout(() => startAmbientFireworks(), 2200));
}

// ─── 3D Fireworks (Three.js particle burst) ──────────────

function launchThreeFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!_scene) return;

  const COLORS_HEX = [0x2dd4bf, 0xf4a14a, 0xff6b6b, 0xfbbf24, 0xc084fc, 0x7dd96a];
  const fwParticles = [];

  function createBurst(origin, color) {
    const count = 80;
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize().multiplyScalar(3 + Math.random() * 8);

      const geo = new THREE.SphereGeometry(0.7, 5, 5);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);
      _scene.add(mesh);
      fwParticles.push({
        mesh, mat,
        vel: dir,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.01,
      });
    }
  }

  const origin = new THREE.Vector3(0, 0, 0);
  COLORS_HEX.forEach((color, i) => {
    setTimeout(() => createBurst(origin, color), i * 200);
  });

  function animateFw() {
    let anyAlive = false;
    for (let i = fwParticles.length - 1; i >= 0; i--) {
      const p = fwParticles[i];
      p.mesh.position.add(p.vel.clone().multiplyScalar(0.5));
      p.vel.y -= 0.05;
      p.vel.multiplyScalar(0.97);
      p.life -= p.decay;
      p.mat.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        _scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mat.dispose();
        fwParticles.splice(i, 1);
      } else {
        anyAlive = true;
      }
    }
    if (anyAlive) requestAnimationFrame(animateFw);
  }

  animateFw();
}

// ─── Semantic message ─────────────────────────────────────

function applyI18n() {
  const input = document.getElementById('semantic-input');
  if (input) input.placeholder = t('inputPlaceholder');
  const submit = document.getElementById('semantic-submit');
  if (submit) submit.textContent = t('guessBtn');
  const journeyTitle = document.getElementById('journey-title');
  if (journeyTitle) journeyTitle.textContent = t('journeyTitle');
  const emptyState = document.getElementById('guess-empty-state');
  if (emptyState) {
    const p = emptyState.querySelector('p');
    if (p) p.textContent = t('emptyState');
  }

  // Wordle handle label
  const handleLabel = document.getElementById('wordle-handle-label');
  if (handleLabel) handleLabel.textContent = `▲ ${t('tabWordle')}`;

  // Win modal
  const winH2 = document.querySelector('.win-header h2');
  if (winH2) winH2.textContent = t('winTitle');
  const closeWin = document.getElementById('close-win-btn');
  if (closeWin) closeWin.textContent = t('keepPlaying');
  const copyShareBtn = document.getElementById('copy-share-btn');
  if (copyShareBtn) copyShareBtn.textContent = t('copyBtn');
  const winCopyBtn = document.getElementById('win-copy-btn');
  if (winCopyBtn) winCopyBtn.textContent = t('copyBtn');

  // Share section caption
  const shareCaption = document.getElementById('share-caption');
  if (shareCaption) shareCaption.textContent = t('shareCaption');

  // Guess panel captions + tab handle
  updateJourneyCount();
  const lastGuessTitle = document.getElementById('last-guess-title');
  if (lastGuessTitle) lastGuessTitle.textContent = t('lastGuess');
  const rankedTitle = document.getElementById('ranked-title');
  if (rankedTitle) rankedTitle.textContent = t('rankedTitle');
  const panelHandleLabel = document.getElementById('guess-panel-handle-label');
  if (panelHandleLabel) panelHandleLabel.textContent = t('tabJourney');

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // How-to modal content
  const htContent = document.getElementById('how-to-content');
  if (htContent) {
    htContent.innerHTML = `<div class="how-to-content"><h2>${t('howToTitle')}</h2>${t('howToBody')}<button class="how-to-close-btn how-to-close" aria-label="Close">${t('howToClose')}</button></div>`;
  }
}

// ─── Guess panel (left side) ──────────────────────────────

function setupGuessPanel() {
  const panel = document.getElementById('guess-panel');
  const handle = document.getElementById('guess-panel-handle');
  if (!panel || !handle) return;

  const saved = localStorage.getItem('semordle:panel');
  const collapsed = saved != null
    ? saved === 'collapsed'
    : window.matchMedia('(max-width: 880px)').matches; // collapsed by default on mobile

  const apply = (isCollapsed) => {
    panel.classList.toggle('collapsed', isCollapsed);
    handle.setAttribute('aria-expanded', String(!isCollapsed));
    localStorage.setItem('semordle:panel', isCollapsed ? 'collapsed' : 'open');
  };
  apply(collapsed);
  handle.addEventListener('click', () => apply(!panel.classList.contains('collapsed')));
}

function showSemanticMessage(msg, type = '') {
  const el = document.getElementById('semantic-message');
  el.textContent = msg;
  el.className = 'game-message ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => clearSemanticMessage(), 3000);
}

function clearSemanticMessage() {
  const el = document.getElementById('semantic-message');
  el.textContent = '';
  el.className = 'game-message';
}

// ─── Render guess card (guess panel list) ─────────────────

function renderGuessCard(entry) {
  const list = document.getElementById('guess-list');
  if (list.querySelector(`[data-word="${CSS.escape(entry.word)}"]`)) return;

  const temp = entry.isWin ? TEMP.SCORCH : getTemperature(entry.rank);

  const card = document.createElement('div');
  card.setAttribute('role', 'listitem');
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

  // rank == null && score == null → word absent from the vocabulary
  const isUnknown = !entry.isWin && entry.rank == null && entry.score == null;

  const rankLabel = entry.isWin ? '🎯 #1'
    : entry.rank != null ? `#${displayRank(entry.rank)}`
    : isUnknown ? '?'
    : t('outsideTop');
  const tempLabel = entry.isWin ? t('youFoundIt') : isUnknown ? t('unknownWord') : t(temp.labelKey);
  const scoreLabel = entry.displayScore > 0 ? entry.displayScore.toFixed(1) : null;

  const unlockBadge = entry.unlocked
    ? `<span class="unlock-badge" aria-label="unlocked via Wordle">${t('unlockedBadge')}</span>`
    : '';

  const inTop1000 = !entry.isCold && entry.rank != null;
  const hasRealRank = entry.rank != null;
  const metaLine = entry.isWin
    ? `${tempLabel}`
    : isUnknown
      ? `❓ ${tempLabel}`
      : hasRealRank && scoreLabel
        ? `${temp.icon} ${tempLabel} · ${t('similarityLabel')} ${scoreLabel} ${unlockBadge}`
        : `${temp.icon} ${tempLabel}`;

  const barFill = entry.displayScore > 0 ? entry.displayScore : 0;
  const showBar = entry.isWin || inTop1000;

  const cardColor = entry.isWin ? '#fbbf24' : isUnknown ? 'var(--screen-muted)' : rankToColor(entry.rank);
  card.innerHTML = `
    <div>
      <div class="guess-word" style="color: ${cardColor}">
        ${entry.isWin ? '🎯' : isUnknown ? '❓' : temp.icon} ${escapeHtml(entry.word)}
      </div>
      <div class="guess-meta">${metaLine}</div>
      ${showBar ? `<div class="bar" aria-hidden="true"><div class="fill" style="width:${barFill}%"></div></div>` : ''}
    </div>
    <div class="guess-rank" style="color: ${cardColor}" aria-label="${rankLabel}">${rankLabel}</div>
  `;

  insertCardSorted(list, card, sortKey);

  // "Last guess" spotlight above the list (guesses arrive in chronological
  // order during restore, so the final call leaves the latest one showing)
  updateLastGuessSection(card);
  updateJourneyCount();

  // Add the 3D dot (skipped during restore — rebuildScene handles that)
  if (!entry._restoring) {
    addDotToScene(entry);
  }
}

function updateJourneyCount() {
  const el = document.getElementById('journey-count');
  if (!el || !gameState) return;
  const n = gameState.semanticGuesses.length;
  el.textContent = n > 0 ? t('guessCountLabel', n) : '';
}

function updateLastGuessSection(sourceCard) {
  const section = document.getElementById('last-guess-section');
  const container = document.getElementById('last-guess-container');
  const clone = sourceCard.cloneNode(true);
  clone.classList.remove('latest-guess');
  clone.style.removeProperty('--latest-color');
  clone.style.removeProperty('--latest-glow');
  clone.style.animation = 'none';
  container.replaceChildren(clone);
  section.classList.remove('hidden');
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
    el.textContent = t('bestRankShort', displayRank(best));
  } else {
    el.textContent = '';
  }
}

// =========================================================
//  THREE.JS SCENE
// =========================================================

let _scene = null;
let _camera = null;
let _renderer = null;
let _labelRenderer = null;
let _controls = null;
let _targetMesh = null;
let _targetGlow = null;
let _targetLabel = null;
let _targetPulse = 0;
let _dotObjects = [];   // { mesh, sprite, labelObj, word, proximity, dotR }
let _latestDotWord = null;
let _animationId = null;
let _autoRotateTimer = null;
let _camAnim = null; // in-flight camera animation { from, to (Spherical), t }

const lerp = (a, b, k) => a + (b - a) * k;
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// OS-level "reduce motion": no camera glides, no auto-rotation.
// (CSS @media rules cannot reach these rAF-driven Three.js animations.)
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Glide the camera so `pos` ends up in the foreground, slightly ABOVE the
// screen center — readable on mobile where the input bar (and keyboard)
// cover the bottom half. The camera also zooms to frame the dot: close
// words pull it in, far/cold words push it out.
function flyToDot(pos) {
  if (!_camera || !_controls || pos.lengthSq() === 0) return;
  const from = new THREE.Spherical().setFromVector3(_camera.position);
  const target = new THREE.Spherical().setFromVector3(pos);
  // Camera a bit BELOW the dot's direction → the dot lands above center
  const phi = clamp(target.phi + 0.30, 0.30, Math.PI - 0.30);
  // Adaptive distance: r=14 (top-1) → ~120, r=100 → ~310, cold 240 → 460
  const dist = clamp(target.radius * 2.2 + 90, 110, 460);
  // Shortest angular path for the azimuth
  let dTheta = target.theta - from.theta;
  dTheta = ((dTheta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const to = new THREE.Spherical(dist, phi, from.theta + dTheta);

  if (prefersReducedMotion()) {
    // Instant cut instead of a glide — same end state, no motion
    _camera.position.setFromSpherical(to);
    return;
  }
  _camAnim = { from, to, t: 0 };
}
let _glowTexture = null;

function makeCircleTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grd = ctx.createRadialGradient(c, c, 0, c, c, c);
  grd.addColorStop(0,   'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.3)');
  grd.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function initThreeScene() {
  const container = document.getElementById('three-canvas-container');
  const labelContainer = document.getElementById('css2d-container');
  if (!container) return;

  // ── Renderer ──
  _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  _renderer.setPixelRatio(window.devicePixelRatio);
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.setClearColor(0x050a07, 1);
  container.appendChild(_renderer.domElement);

  // ── CSS2D label renderer ──
  _labelRenderer = new CSS2DRenderer();
  _labelRenderer.setSize(window.innerWidth, window.innerHeight);
  _labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
  labelContainer.appendChild(_labelRenderer.domElement);

  // ── Scene ──
  _scene = new THREE.Scene();
  _scene.add(new THREE.AmbientLight(0x334444, 0.4));
  const dirLight = new THREE.DirectionalLight(0x2dd4bf, 0.8);
  dirLight.position.set(50, 100, 50);
  _scene.add(dirLight);

  // ── Camera ──
  _camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
  // Slightly elevated view so the rank rings read as an ellipse (cf. mockup)
  _camera.position.set(0, 150, 420);

  // ── OrbitControls ──
  _controls = new OrbitControls(_camera, _renderer.domElement);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.06;
  _controls.minDistance = 80;
  _controls.maxDistance = 550; // stay inside the starfield shell (r ≥ 600)
  _controls.autoRotate = !prefersReducedMotion();
  _controls.autoRotateSpeed = 0.4;
  _controls.enablePan = false;
  _controls.addEventListener('start', () => {
    _controls.autoRotate = false;
    _camAnim = null; // user grabbed the view — cancel any fly-to
    clearTimeout(_autoRotateTimer);
  });
  _controls.addEventListener('end', () => {
    clearTimeout(_autoRotateTimer);
    _autoRotateTimer = setTimeout(() => { _controls.autoRotate = !prefersReducedMotion(); }, 3000);
  });

  // ── Shared glow texture (circular radial gradient) ──
  _glowTexture = makeCircleTexture(128);

  // ── Starfield ──
  {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 600 + Math.random() * 200;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Circular sprite texture — without it, close-up stars render as squares.
    // Additive blending + full opacity keep them bright despite the soft texture.
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 5, map: _glowTexture,
      transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    _scene.add(new THREE.Points(geo, mat));
  }

  // ── Target sphere — a living white-gold "sun" ──
  // Warm white sits OUTSIDE the temperature gradient (green/red/orange/amber/blue),
  // so the target can never be confused with a ~top-100 amber word dot.
  {
    const geo = new THREE.SphereGeometry(8, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff2cc,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.1,
    });
    _targetMesh = new THREE.Mesh(geo, mat);
    _targetMesh.position.set(0, 0, 0);
    _scene.add(_targetMesh);

    // Outer glow sprite for target (circular texture)
    const spriteMat = new THREE.SpriteMaterial({
      map: _glowTexture,
      color: 0xfff6e0,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    _targetGlow = new THREE.Sprite(spriteMat);
    _targetGlow.scale.setScalar(70); // clearly larger than any word-dot glow
    _targetMesh.add(_targetGlow);

    // Target label (? or secret word after win)
    const labelDiv = document.createElement('div');
    labelDiv.className = 'dot-label dot-label--target';
    labelDiv.style.color = '#ffe9c2';
    labelDiv.innerHTML = '<span class="dot-label-word">?</span>';
    _targetLabel = new CSS2DObject(labelDiv);
    _targetLabel.position.set(0, 12, 0);
    _targetMesh.add(_targetLabel);
  }

  // ── Rank rings: reference circles at top 10 / 100 / 500 / 1000 ──
  // Radii use the same score→radius mapping as the dots, so a dot's
  // position can be read against the rings directly.
  // Disabled 2026-07-16 (jugés trop chargés) — remettre à true pour les ravoir.
  const SHOW_RANK_RINGS = false;
  if (SHOW_RANK_RINGS && puzzle?.words?.length) {
    // Each label sits at its own azimuth so neighboring rings don't overlap
    const bands = [
      { rank: 10,   color: 0xff5722, angle: Math.PI * 0.25 },
      { rank: 100,  color: 0xff9100, angle: Math.PI * 0.75 },
      { rank: 500,  color: 0xffc400, angle: Math.PI * 1.25 },
      { rank: 1000, color: 0x6b8fc2, angle: Math.PI * 1.75 },
    ];
    bands.forEach(band => {
      const entry = puzzle.words[band.rank - 1];
      if (!entry) return;
      const r = scoreToRadius(entry.score, band.rank);
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: band.color, transparent: true, opacity: 0.25 });
      _scene.add(new THREE.Line(geo, mat));

      const tag = document.createElement('div');
      tag.className = 'ring-label';
      tag.style.color = rankToColor(band.rank);
      tag.textContent = `top ${band.rank}`;
      const tagObj = new CSS2DObject(tag);
      tagObj.position.set(r * Math.cos(band.angle), 0, r * Math.sin(band.angle));
      _scene.add(tagObj);
    });
  }

  // ── Animation loop ──
  function animate() {
    _animationId = requestAnimationFrame(animate);

    if (_camAnim) {
      _camAnim.t += 0.022;
      const k = easeInOutCubic(Math.min(_camAnim.t, 1));
      _camera.position.setFromSpherical(new THREE.Spherical(
        lerp(_camAnim.from.radius, _camAnim.to.radius, k),
        lerp(_camAnim.from.phi,    _camAnim.to.phi,    k),
        lerp(_camAnim.from.theta,  _camAnim.to.theta,  k)
      ));
      if (_camAnim.t >= 1) _camAnim = null;
    }
    _controls.update();

    // Pulse + shimmer the target sun (two offset sine waves so the
    // breathing never looks mechanical)
    _targetPulse += 0.03;
    const s = 1 + 0.12 * Math.sin(_targetPulse);
    _targetMesh.scale.setScalar(s);
    _targetMesh.material.emissiveIntensity = 1.6 + 0.45 * Math.sin(_targetPulse * 1.7);
    if (_targetGlow) {
      _targetGlow.material.opacity = 0.55 + 0.15 * Math.sin(_targetPulse * 1.3 + 1.2);
    }

    _renderer.render(_scene, _camera);
    _labelRenderer.render(_scene, _camera);
  }
  animate();

  // ── Resize handler ──
  window.addEventListener('resize', resize3D);
  setupViewportKeyboardFix();
}

// Size the renderer from the stage container (not the window): the container
// can be shrunk to the visual viewport while the mobile keyboard is open.
function resize3D() {
  if (!_camera || !_renderer) return;
  const container = document.getElementById('three-canvas-container');
  const w = container?.clientHeight ? container.clientWidth : window.innerWidth;
  const h = container?.clientHeight ? container.clientHeight : window.innerHeight;
  _camera.aspect = w / h;
  _camera.updateProjectionMatrix();
  _renderer.setSize(w, h);
  _labelRenderer.setSize(w, h);
}

// Mobile keyboard handling (iOS overlays the keyboard instead of resizing the
// page): track the visual viewport and pin both the 3D stage and the input
// bar inside the area that remains visible above the keyboard. Android is
// covered by <meta viewport interactive-widget=resizes-content> + resize3D.
function setupViewportKeyboardFix() {
  const vv = window.visualViewport;
  if (!vv) return;
  const stage = document.getElementById('three-canvas-container');
  const labels = document.getElementById('css2d-container');
  const inputBar = document.getElementById('input-bar');

  const apply = () => {
    const kbInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    const kbOpen = kbInset > 80; // heuristic: anything smaller is browser chrome
    document.body.classList.toggle('kb-open', kbOpen);
    for (const el of [stage, labels]) {
      if (!el) continue;
      el.style.top = kbOpen ? `${Math.round(vv.offsetTop)}px` : '';
      el.style.height = kbOpen ? `${Math.round(vv.height)}px` : '';
    }
    if (inputBar) inputBar.style.bottom = kbOpen ? `${kbInset}px` : '';
    resize3D();
  };
  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
}

// ─── Word → sphere position (3D) ─────────────────────────

// Radial distance is driven by SCORE (semantic similarity), anchored on the
// puzzle hints so the visual bands are guaranteed regardless of distribution:
//   score ≥ top10 hint  → r = 14..30   (inner sanctum: the top-10 hugs the target)
//   top1000..top10      → r = 30..130  (main play zone, eased spread)
//   colder than top1000 → r = 130..240 (cold words drift far out)
//   unknown word (null) → r = 250      (outermost)
function scoreToRadius(score, rank) {
  if (rank === 0) return 0; // the target itself
  if (score == null) return 250;
  const h = puzzle?.hints || {};
  const top1  = h.top1 ?? 1;
  const top10 = h.top10 ?? top1 * 0.8;
  const top1k = h.top1000 ?? 0;
  if (score >= top10) {
    const n = clamp((top1 - score) / Math.max(top1 - top10, 1e-6), 0, 1);
    return 14 + n * 16;
  }
  if (score >= top1k) {
    const n = clamp((top10 - score) / Math.max(top10 - top1k, 1e-6), 0, 1);
    return 30 + Math.pow(n, 0.8) * 100;
  }
  const n = clamp((top1k - score) / Math.max(top1k, 0.15), 0, 1);
  return 130 + n * 110;
}

function wordToSpherePosition(word, rank, score) {
  const r = scoreToRadius(score, rank);

  // Angular distribution: use word hash for theta, and a second hash for phi
  // Spread phi more uniformly by mixing two independent hashes
  const h1 = wordToAngle(word);
  const h2 = wordToAngle(word.split('').reverse().join(''));
  const theta = (h1 / 360) * Math.PI * 2;
  // Map phi to [0.15π, 0.85π] to avoid poles where dots cluster visually
  const phi = (h2 / 360) * Math.PI * 0.7 + Math.PI * 0.15;

  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Add a dot to the 3D scene ────────────────────────────

function addDotToScene(entry) {
  if (!_scene) return;

  // Win entry uses the target sphere — no separate dot needed
  if (entry.isWin) return;

  // Unknown words (absent from the vocabulary) have no meaningful
  // position — they stay in the list but never appear on the radar
  if (entry.rank == null && entry.score == null) return;

  // Avoid duplicates
  if (_dotObjects.find(d => d.word === entry.word)) return;

  const temp = getTemperature(entry.rank);
  const dotColor = rankToColor(entry.rank);
  const pos = wordToSpherePosition(entry.word, entry.rank, entry.score ?? null);
  const proximity = puzzle?.hints?.top1 > 0
    ? clamp((entry.score || 0) / puzzle.hints.top1, 0, 1)
    : 0;

  const isLarge = entry.rank != null && entry.rank <= 100;
  const dotR = isLarge ? 4 : 2.5;

  // Core sphere
  const geo = new THREE.SphereGeometry(dotR, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(dotColor),
    emissive: new THREE.Color(dotColor),
    emissiveIntensity: 0.8 + proximity * 1.2,
    roughness: 0.3,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  _scene.add(mesh);

  // Glow sprite (billboard, circular texture, additive)
  const spriteMat = new THREE.SpriteMaterial({
    map: _glowTexture,
    color: new THREE.Color(dotColor),
    transparent: true,
    opacity: 0.45 + proximity * 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.setScalar(dotR * 6 + proximity * 10);
  sprite.position.copy(pos);
  _scene.add(sprite);

  // CSS2D label
  const labelDiv = buildDotLabel(entry, temp);
  const labelObj = new CSS2DObject(labelDiv);
  labelObj.position.copy(pos);
  labelObj.position.y += dotR + 10; // clear the glow sprite so the orb stays visible
  _scene.add(labelObj);

  _dotObjects.push({ mesh, sprite, labelObj, word: entry.word, proximity, dotR });

  // Pause autorotate briefly when new dot arrives
  if (!entry._restoring) {
    // Dé-highlight le précédent
    if (_latestDotWord) {
      const prev = _dotObjects.find(d => d.word === _latestDotWord);
      if (prev) {
        prev.mesh.material.emissiveIntensity = 0.8 + prev.proximity * 1.2;
        prev.sprite.scale.setScalar(prev.dotR * 6 + prev.proximity * 10);
        prev.labelObj.element.classList.remove('dot-label--latest');
      }
    }
    // Highlight le nouveau
    mesh.material.emissiveIntensity = 2.0;
    sprite.scale.setScalar(dotR * 14);
    labelDiv.classList.add('dot-label--latest');
    _latestDotWord = entry.word;

    if (_controls) {
      _controls.autoRotate = false;
      clearTimeout(_autoRotateTimer);
      _autoRotateTimer = setTimeout(() => {
        if (_controls) _controls.autoRotate = !prefersReducedMotion();
      }, 7000);
    }

    // Bring the fresh guess to the foreground, slightly below center
    flyToDot(pos);
  }
}

function buildDotLabel(entry, temp) {
  const div = document.createElement('div');
  div.className = 'dot-label';
  div.style.color = rankToColor(entry.rank);
  const rankStr = entry.isWin ? '🎯 #1' : entry.rank != null ? `#${displayRank(entry.rank)}` : '+1000';
  const wordStyle = entry.unlocked ? ' style="color:#f4a14a"' : '';
  div.innerHTML = `<span class="dot-label-word"${wordStyle}>${escapeHtml(entry.word)}</span><span class="dot-label-rank">${rankStr}</span>`;
  return div;
}

function resetTarget() {
  if (!_targetMesh || !_targetLabel) return;
  _targetMesh.material.color.set(0xf4a14a);
  _targetMesh.material.emissive.set(0xf4a14a);
  _targetMesh.material.emissiveIntensity = 1.0;
  for (const c of _targetMesh.children) {
    if (c instanceof THREE.Sprite) {
      c.material.color.set(0xf4a14a);
      c.material.opacity = 0.55;
      c.scale.setScalar(50);
    }
  }
  const labelDiv = _targetLabel.element;
  if (labelDiv) {
    labelDiv.style.color = '#f4a14a';
    const wordEl = labelDiv.querySelector('.dot-label-word');
    if (wordEl) wordEl.textContent = '?';
  }
}

function clearScene() {
  if (!_scene) return;
  _dotObjects.forEach(({ mesh, sprite, labelObj }) => {
    _scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    _scene.remove(sprite);
    sprite.material.map = null;
    sprite.material.dispose();
    _scene.remove(labelObj);
  });
  _dotObjects = [];
  _latestDotWord = null;
  resetTarget();
}

function rebuildScene() {
  clearScene();
  if (!gameState) return;
  gameState.semanticGuesses.forEach(g => addDotToScene({ ...g, _restoring: true }));
  updateScene();

  // Re-highlight the last guess after restore
  const guesses = gameState.semanticGuesses;
  if (guesses.length > 0) {
    const last = guesses[guesses.length - 1];
    const d = _dotObjects.find(o => o.word === last.word);
    if (d) {
      d.mesh.material.emissiveIntensity = 2.0;
      d.sprite.scale.setScalar(d.dotR * 14);
      d.labelObj.element.classList.add('dot-label--latest');
      _latestDotWord = last.word;
    }
  }
}

function updateScene() {
  if (!_targetMesh || !_targetLabel) return;

  if (gameState && gameState.solved) {
    _targetMesh.material.color.set(0x00e676);
    _targetMesh.material.emissive.set(0x00e676);
    _targetMesh.material.emissiveIntensity = 1.4;

    const children = _targetMesh.children;
    for (const c of children) {
      if (c instanceof THREE.Sprite) {
        c.material.color.set(0x00e676);
        c.material.opacity = 0.7;
        c.scale.setScalar(70);
      }
    }

    const labelDiv = _targetLabel.element;
    if (labelDiv) {
      labelDiv.style.color = '#00e676';
      const wordEl = labelDiv.querySelector('.dot-label-word');
      if (wordEl && puzzle) wordEl.textContent = puzzle.secret;
      // The secret is #1 in the displayed ranking
      let rankEl = labelDiv.querySelector('.dot-label-rank');
      if (!rankEl) {
        rankEl = document.createElement('span');
        rankEl.className = 'dot-label-rank';
        labelDiv.appendChild(rankEl);
      }
      rankEl.textContent = '#1';
    }
  }
}

// =========================================================
//  WORDLE OVERLAY
// =========================================================

function setupWordleHandle() {
  const handle = document.getElementById('wordle-handle');
  const closeBtn = document.getElementById('wordle-overlay-close');

  handle?.addEventListener('click', () => {
    const overlay = document.getElementById('wordle-overlay');
    if (overlay?.classList.contains('open')) {
      closeWordlePanel();
      return;
    }
    const inlineContainer = document.getElementById('wordle-inline-content');
    if (wordleState) {
      if (!inlineContainer?.innerHTML?.trim()) renderWordleUI();
      openWordlePanel();
    } else {
      startWordleChallenge();
    }
  });

  closeBtn?.addEventListener('click', () => closeWordlePanel());

  // Clic hors overlay → ferme.
  // composedPath() (capturé au dispatch) plutôt que overlay.contains(e.target) :
  // un clic sur un bouton interne qui re-render l'overlay (ENTER du clavier
  // virtuel, « Autre wordle ») détache e.target du DOM avant que ce handler
  // ne s'exécute, et contains() concluait à tort « clic extérieur ».
  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('wordle-overlay');
    if (!overlay?.classList.contains('open')) return;
    const path = e.composedPath();
    if (!path.includes(overlay) && !path.includes(handle)) {
      closeWordlePanel();
    }
  });

  // Swipe down to close
  const overlay = document.getElementById('wordle-overlay');
  let touchStartY = 0;
  overlay?.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  overlay?.addEventListener('touchmove', e => {
    if (overlay.scrollTop === 0 && e.touches[0].clientY - touchStartY > 60) {
      closeWordlePanel();
    }
  }, { passive: true });
}

function openWordlePanel() {
  const overlay = document.getElementById('wordle-overlay');
  overlay?.classList.add('open');
  document.getElementById('wordle-handle')?.classList.add('overlay-open');
  lockBodyScroll(true);
  if (_controls) _controls.autoRotate = false;
}

function closeWordlePanel() {
  const overlay = document.getElementById('wordle-overlay');
  overlay?.classList.remove('open');
  document.getElementById('wordle-handle')?.classList.remove('overlay-open');
  lockBodyScroll(false);
  if (_controls) {
    clearTimeout(_autoRotateTimer);
    _autoRotateTimer = setTimeout(() => { _controls.autoRotate = !prefersReducedMotion(); }, 1000);
  }
}

// ─── Wordle unlock flow ───────────────────────────────────

function selectUnlockTarget() {
  const bestRank = gameState.stats.bestRank || 1001;
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

  const sorted = [...pool].sort((a, b) => a.rank - b.rank);
  const n = sorted.length;

  const top10pct  = sorted.slice(0, Math.max(1, Math.floor(n * 0.10)));
  const pct10to40 = sorted.slice(Math.floor(n * 0.10), Math.floor(n * 0.40));
  const pct40to80 = sorted.slice(Math.floor(n * 0.40), Math.floor(n * 0.80));

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
  const bestLine = best ? t('startBestRank', displayRank(best)) : t('startNoRank');
  container.innerHTML = `
    <div style="text-align:center;padding:40px 20px 32px;">
      <div style="font-size:38px;margin-bottom:14px;">🔐</div>
      <p style="margin:0 0 8px;font-size:18px;font-weight:900;letter-spacing:-0.03em;color:var(--screen-text);">${t('startTitle')}</p>
      <p style="font-size:13px;color:var(--screen-muted);margin:0 0 24px;">${bestLine}</p>
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
    attempts: [],
    currentGuess: '',
    solved: false,
    failed: false,
    keyStates: {},
  };

  gameState.stats.unlockCount++;
  saveState();

  renderWordleUI();
  openWordlePanel();
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
        boardRows += `<div class="tile${letter ? ' filled' : ''}">${letter}</div>`;
      } else {
        boardRows += `<div class="tile"></div>`;
      }
    }
    boardRows += '</div>';
  }

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
  const messageArea = isActive ? `<div class="wordle-message" role="alert" aria-live="polite"></div>` : '';

  return `
    <div class="wordle-header">
      <div class="caption">${t('wordleHeader')}</div>
      <h3>${t('wordleTitle')}</h3>
      <p>${t('wordleDesc')}</p>
      <p style="font-size:12px;color:var(--screen-muted)">${t('wordleLength', wordLen, WORDLE_MAX_ATTEMPTS - attempts.length)}</p>
    </div>
    <div class="wordle-board" role="grid" aria-label="Wordle guess board" style="--word-len:${wordLen}">
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
      if (cell.state === 'green') mask[i] = letters[i];
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
      html += `<button class="vkey ${isWide ? 'wide' : ''} ${state}" data-key="${key}" aria-label="${lc}">${key}</button>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function bindWordleEvents(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.vkey').forEach(btn => {
    btn.addEventListener('click', () => handleWordleKey(btn.dataset.key));
  });
  container.querySelectorAll('.close-wordle-btn').forEach(btn => {
    btn.addEventListener('click', () => closeWordlePanel());
  });
  container.querySelectorAll('.new-wordle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wordleState = null;
      startWordleChallenge();
    });
  });
}

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

function updateActiveTiles() {
  if (!wordleState) return;
  const { attempts, currentGuess, target } = wordleState;
  const rowIndex = attempts.length;

  const container = document.getElementById('wordle-inline-content');
  if (!container) return;
  const row = container.querySelector(`[data-row="${rowIndex}"]`);
  if (!row) return;
  row.querySelectorAll('.tile').forEach((tile, j) => {
    const letter = currentGuess[j] || '';
    tile.textContent = letter;
    tile.classList.toggle('filled', !!letter);
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
  el._timer = setTimeout(() => { el.textContent = ''; el.className = 'wordle-message'; }, 2500);
}

function submitWordleGuess() {
  if (!wordleState || wordleState.solved || wordleState.failed) return;

  // Accent-insensitive: the AZERTY/QWERTY vkeys type plain letters, so a
  // target like "séjour" must match a typed "SEJOUR" (E counts for É).
  const rawGuess = deaccent(wordleState.currentGuess).toUpperCase();
  const targetWord = deaccent(wordleState.target.word).toUpperCase();

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
  if (wordleState.attempts.some(a => a.guess === rawGuess)) {
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

function evaluateWordleGuess(guess, target) {
  const result = guess.split('').map(letter => ({ letter, state: 'gray' }));
  const targetArr = target.split('');
  const targetRemaining = [...targetArr];

  result.forEach((cell, i) => {
    if (cell.letter === targetArr[i]) {
      cell.state = 'green';
      targetRemaining[i] = null;
    }
  });
  result.forEach((cell, i) => {
    if (cell.state === 'green') return;
    const matchIdx = targetRemaining.indexOf(cell.letter);
    if (matchIdx !== -1) {
      cell.state = 'yellow';
      targetRemaining[matchIdx] = null;
    }
  });
  return result;
}

function updateKeyStates(result) {
  result.forEach(cell => {
    const existing = wordleState.keyStates[cell.letter];
    if (existing === 'green') return;
    if (existing === 'yellow' && cell.state === 'gray') return;
    wordleState.keyStates[cell.letter] = cell.state;
  });
}

function handleWordleWin() {
  const target = wordleState.target;
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
  hideEmptyState();

  if (target.word.toLowerCase() === puzzle.secret.toLowerCase()) {
    setTimeout(() => handleWin(target.word), 600);
  }
}

function handleWordleLoss() {
  const target = wordleState.target;
  const mask = buildPartialMask(target.word, wordleState.attempts);
  gameState.partialUnlockClues.push({ target: target.word, mask, rank: target.rank });
  saveState();
  renderPartialClues();
}

function renderPartialClues() {
  const container = document.getElementById('partial-clues');
  if (!container) return;
  container.innerHTML = '';
  if (gameState.partialUnlockClues.length === 0) return;

  const title = document.createElement('div');
  title.style.cssText = 'font-size:12px;color:var(--screen-muted);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;';
  title.textContent = t('partialTitle');
  container.appendChild(title);

  gameState.partialUnlockClues.forEach(clue => {
    const item = document.createElement('div');
    item.className = 'partial-clue-item';
    item.setAttribute('aria-label', `Partial clue: ${clue.mask}`);
    item.innerHTML = `
      <span aria-hidden="true">🔑</span>
      <span class="partial-clue-label">${escapeHtml(clue.mask)}</span>
      <span style="color:var(--screen-muted);font-size:12px;">(rank #${clue.rank})</span>
    `;
    container.appendChild(item);
  });
}

// ─── Share card ───────────────────────────────────────────

function buildShareText() {
  const stats = gameState.stats;
  const num   = puzzle.puzzleNumber;
  const journey = gameState.semanticGuesses.slice(0, 10).map(g => {
    if (g.isWin) return '🎯';
    if (!g.rank) return '❄';
    return getTemperature(g.rank).icon;
  }).join(' ');

  return [
    `Galexical #${num}`,
    t('shareGuessLine', stats.semanticGuessCount),
    t('shareUnlockLine', stats.unlockCount),
    gameState.solved ? t('solved') : t('inProgress'),
    journey,
    '',
    t('shareUrl'),
  ].join('\n');
}

function buildShareCardHTML() {
  const stats = gameState.stats;
  const num   = puzzle.puzzleNumber;
  const journey = gameState.semanticGuesses.slice(0, 10).map(g => {
    if (g.isWin) return '🎯';
    if (!g.rank) return '❄';
    return getTemperature(g.rank).icon;
  });

  return `
    <strong>Galexical #${num}</strong>
    <div>${t('shareGuessLine', stats.semanticGuessCount)}</div>
    <div>${t('shareUnlockLine', stats.unlockCount)}</div>
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
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
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

function showWinToast() {
  updateShareSection();
  const existing = document.getElementById('win-toast');
  if (existing) return;

  const toast = document.createElement('div');
  toast.id = 'win-toast';
  toast.textContent = t('wellDone');
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

function updateShareSection() {
  if (!gameState.solved) return;
  const section = document.getElementById('share-section');
  if (section) section.style.display = 'block';
  const preview = document.getElementById('share-card-preview');
  if (preview) preview.innerHTML = buildShareCardHTML();
}

function updateWinModal() {
  const subtitle = document.getElementById('win-subtitle');
  if (subtitle) subtitle.textContent = t('winSubtitle', gameState.stats.semanticGuessCount);
  const winShareCard = document.getElementById('win-share-card');
  if (winShareCard) winShareCard.innerHTML = buildShareCardHTML();
}

// ─── Physical keyboard handler ────────────────────────────

function setupKeyboardHandler() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('wordle-overlay');
      const howTo = document.getElementById('how-to-modal');
      const winModal = document.getElementById('win-modal');
      if (overlay?.classList.contains('open')) {
        closeWordlePanel();
      } else if (!winModal?.classList.contains('hidden')) {
        winModal.classList.add('hidden');
        lockBodyScroll(false);
      } else if (!howTo?.classList.contains('hidden')) {
        howTo.classList.add('hidden');
        lockBodyScroll(false);
      }
      return;
    }

    // Route keys to Wordle when overlay is open
    if (wordleState && !wordleState.solved && !wordleState.failed) {
      const overlayOpen = document.getElementById('wordle-overlay')?.classList.contains('open');
      if (overlayOpen) {
        if (/^[A-Za-z]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter') {
          const focused = document.activeElement;
          if (!focused || focused.id !== 'semantic-input') {
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

  // A previous game's celebration must not survive a re-init (lang switch);
  // the solved branch below restarts the ambient show when appropriate
  stopFireworks();

  // Re-lookup ranks for entries missing them; preserve all entries (don't filter)
  gameState.semanticGuesses.forEach(g => {
    if (g.isWin) return;
    const found = lookupWord(g.word);
    if (found && (g.rank == null || g.score == null)) {
      g.rank = found.rank;
      g.score = found.score;
      g.displayScore = normalizeScore(found.score, puzzle.hints);
      g.isCold = found.rank > 1000;
    }
  });

  [...gameState.semanticGuesses].forEach(g => renderGuessCard({ ...g, _restoring: true }));

  if (gameState.semanticGuesses.length > 0) hideEmptyState();

  updateBestRankLabel();
  renderPartialClues();
  rebuildScene();

  if (gameState.solved) {
    updateShareSection();
    // Returning to an already-solved puzzle: quiet celebration, no big volley
    startAmbientFireworks();
  }
}

// ─── Initialization ───────────────────────────────────────

async function init() {
  const formsPromise = loadFormsMap(); // non-blocking; awaited below
  puzzle = await loadPuzzle();
  await formsPromise;

  if (!puzzle) {
    document.getElementById('puzzle-pill').textContent = 'Failed to load puzzle';
    document.getElementById('semantic-input')?.setAttribute('disabled', 'true');
    document.getElementById('semantic-submit')?.setAttribute('disabled', 'true');
    return;
  }

  const savedState = loadState(puzzle.date);
  gameState = savedState || createFreshState(puzzle.date);

  document.getElementById('puzzle-pill').textContent = `#${puzzle.puzzleNumber}`;
  document.title = `Galexical #${puzzle.puzzleNumber} – Daily semantic word hunt`;

  applyI18n();

  if (!_initialized) {
    initThreeScene();
    setupGuessPanel();
    setupHowTo();
    setupLangSwitcher();
    setupWordleHandle();
    setupKeyboardHandler();
    setupModalCloseButtons();
    setupShareButtons();
    _initialized = true;
  }

  setupSemanticInput();
  restoreState();
}

function setupSemanticInput() {
  const input  = document.getElementById('semantic-input');
  const submit = document.getElementById('semantic-submit');
  if (!input || !submit) return;

  // Remove old listeners by cloning
  const newSubmit = submit.cloneNode(true);
  submit.parentNode.replaceChild(newSubmit, submit);
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

  newSubmit.addEventListener('click', () => {
    const word = newInput.value.trim();
    if (word) { submitSemanticGuess(word); newInput.value = ''; newInput.focus(); }
  });
  newInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const word = newInput.value.trim();
      if (word) { submitSemanticGuess(word); newInput.value = ''; }
    }
  });
  if (window.innerWidth > 880) newInput.focus();
}

function setupModalCloseButtons() {
  // Win modal close
  document.getElementById('win-modal-backdrop')?.addEventListener('click', () => {
    document.getElementById('win-modal').classList.add('hidden');
    lockBodyScroll(false);
  });
  document.getElementById('close-win-btn')?.addEventListener('click', () => {
    document.getElementById('win-modal').classList.add('hidden');
    lockBodyScroll(false);
  });
}

function setupShareButtons() {
  document.getElementById('copy-share-btn')?.addEventListener('click', async () => {
    const ok = await copyShareText();
    const confirm = document.getElementById('copy-confirm');
    if (confirm) {
      confirm.textContent = ok ? t('copiedOk') : t('copiedFail');
      clearTimeout(confirm._timer);
      confirm._timer = setTimeout(() => { confirm.textContent = ''; }, 3000);
    }
  });
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

  const openModal  = () => { modal.classList.remove('hidden'); lockBodyScroll(true); };
  const closeModal = () => { modal.classList.add('hidden');    lockBodyScroll(false); };

  openBtn?.addEventListener('click', openModal);
  backdrop?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    // Matches both the bottom "Got it" button (.how-to-close, re-rendered by
    // applyI18n) and the ✕ in the corner (id how-to-close, class modal-close)
    if (e.target.closest('.how-to-close, #how-to-close')) closeModal();
  });
}

function setupLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn._langBound) return;
    btn._langBound = true;
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      saveState(); // persist current lang state before switching
      currentLang = lang;
      localStorage.setItem('semordle:lang', lang);

      wordleState = null;
      gameState   = null;
      puzzle      = null;

      // Reset hidden DOM
      document.getElementById('guess-list').innerHTML =
        `<div class="guess-list-empty" id="guess-empty-state"><p>${t('emptyState')}</p></div>`;
      document.getElementById('wordle-inline-content').innerHTML = '';
      document.getElementById('partial-clues').innerHTML = '';
      document.getElementById('share-section').style.display = 'none';
      document.getElementById('best-rank-label').textContent = '';

      // Clear 3D scene
      clearScene();

      // Close overlay if open
      closeWordlePanel();

      init();
    });
  });
}

// ─── Bootstrap ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
