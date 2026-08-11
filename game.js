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
    kbClose:         'Close',
    journeyTitle:    'Your journey',
    emptyState:      'Your guesses will appear here. Try a word that might be semantically related to the secret!',
    tabSemantic:     'Semantic',
    tabWordle:       'Wordle',
    tabWheel:        'Wheel',
    tabTransit:      'Probe',
    randomSent:      'Random word',
    shareRandom:     (n) => `🎲 ${n} random`,
    transitTitle:    'Launch window',
    // La sonde part TOUJOURS tout droit : le joueur choisit l'instant, pas la cible.
    transitLede:     'Launch at the right moment. The lower the orbit you hit, the closer to the secret the word you win.',
    transitTag:      'Trajectory locked · vertical',
    transitBadge:    (n) => `${n} probe${n > 1 ? 's' : ''}`,
    transitFireBtn:  'Launch the probe',
    transitKbd:      'SPACE',
    transitFoot:     'A miss burns the probe · next one in 20 guesses',
    transitReady:    'Tap the stage or press space',
    transitFlying:   'probe in flight…',
    transitLost:     'Probe lost — only a cold word drifts back',
    transitUnlocked: (r) => `Word #${r} unlocked`,
    transitNone:     'Nothing left to unlock — the whole galaxy is yours!',
    transitSpent:    'No probe ready — keep guessing',
    transitTierRed:    'Low orbit',
    transitTierOrange: 'Mid',
    transitTierBlue:   'High',
    transitTop:      (n) => `top ${n}`,
    wheelTitle:      'Orbit wheel',
    wheelLede:       (n, tot) => `A word is offered at random. ${n} slice out of ${tot} lands you on the red orbit.`,
    wheelBadge:      (n) => `${n} spin${n > 1 ? 's' : ''}`,
    wheelSpent:      'No spin ready — keep guessing',
    wheelDial:       'Dial',
    wheelFoot:       (n, every) => `${n} spin${n > 1 ? 's' : ''} in stock · next one in ${every} guesses`,
    wheelSpinBtn:    'Spin the wheel',
    wheelResult:     (r) => `Unlocked word #${r}!`,
    wheelJackpot:    'JACKPOT! #',
    wheelNoCloser:   'Nothing left to unlock — the whole galaxy is yours!',
    startTitle:      'Unlock a clue word',
    startBestRank:   (r) => `Your current best rank is <strong style="color:var(--screen-text)">#${r}</strong> — the clue word will be closer than that.`,
    startNoRank:     'Make a semantic guess first to get a better starting clue.',
    startBtn:        'Start challenge',
    wordleHeader:    'Letter world',
    wordleTitle:     'Unlock target',
    wordleDesc:      "Guess this hidden semantic clue — it's closer to the answer than your best word so far.",
    wordleLength:    (n, r) => `Word length: <strong style="color:var(--screen-text)">${n} letters</strong> · ${r} attempts left`,
    legendGreen:     'right spot',
    legendYellow:    'in the word, wrong spot',
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
    shareWordle:     (n) => `🎯 ${n} Wordle`,
    shareWheel:      (n) => `🎡 ${n} wheel`,
    shareMeteor:     (n) => `☄️ ${n} meteor${n !== 1 ? 's' : ''}`,
    meteorCatch:     (r) => `☄️ Shooting star! Word #${r} unlocked`,
    meteorCatchHot:  (r) => `🔥 Red meteor! #${r} — top 20!`,
    shareCaption:    'Share your result',
    copyBtn:         'Copy to clipboard',
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
    archiveAria:     'Archives — replay a recent day',
    archiveTitle:    'Archives',
    archiveIntro:    'Missed a day? Replay any of the last 10.',
    archiveEmpty:    'No past days to replay yet — check back tomorrow!',
    archiveReturn:   'Back to today',
    archiveSolved:   'Solved',
    archiveProgress: 'In progress',
    archiveNew:      'Not started',
    tipHowTo:        'About',
    tipStats:        'Statistics',
    tipArchive:      'Archives',
    tipLangEn:       'Play the English puzzle — a different word',
    tipLangFr:       'Play the French puzzle — a different word',
    linkThesaurus:   'Thesaurus',
    linkWikipedia:   'Wikipedia',
    statsTitle:      'Your statistics',
    statsPlayed:     'Played',
    statsWon:        'Won',
    statsWinRate:    'Win rate',
    statsAvg:        'Avg. guesses per win',
    statsBest:       'Best game',
    statsStreak:     'Current streak',
    statsDays:       (n) => `${n} day${n > 1 ? 's' : ''}`,
    statsEmpty:      'Play your first game to fill these!',
    yesterdayTitle:  "Yesterday's word",
    yesterdayLine:   (num, w) => `Puzzle #${num} was`,
    yesterdayNone:   'No previous puzzle found.',
    starsTitle:      'Star collection',
    starsHint:       'Tap the sun anytime to open this. Win puzzles to earn stardust ✦ and unlock stars.',
    starEquip:       'Equip',
    starEquipped:    'Equipped',
    starUnlock:      (p) => `Unlock · ${p} ✦`,
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
    onbPromise:      'One secret word a day. Meaning, not letters.',
    onbPlay:         'Play',
    onbStep1Title:   'Guess a word',
    onbStep1Body:    'Galexical compares <em>meaning</em>, not spelling. Every guess gets a rank — #1 is the secret word itself.',
    onbStep2Title:   'Read the heat',
    onbStep2Body:    'The closer a word sits to the secret, the hotter it runs.',
    onbScaleFar:     'far',
    onbScaleHot:     'scorching',
    onbStep3Title:   'Find the secret',
    onbStep3Body:    'Close words orbit near the sun. Type the exact word to solve it — then share your result.',
    howToClose:      'Got it!',
    wellDone:        'Well done!',
    winCollapse:     'Collapse (reveal the sun)',
    winExpand:       'Show result',
    winTitle:        'You solved it!',
    winSubtitle:     (n) => `You found the word in ${n} guess${n !== 1 ? 'es' : ''}!`,
    keepPlaying:     'Keep playing',
  },
  fr: {
    subtitle:        'Une chasse aux mots quotidienne entre sens et lettres.',
    inputPlaceholder:'Entrez un mot…',
    guessBtn:        'Deviner',
    kbClose:         'Fermer',
    journeyTitle:    'Votre parcours',
    emptyState:      'Vos propositions apparaîtront ici. Essayez un mot sémantiquement proche du secret !',
    tabSemantic:     'Sémantique',
    tabWordle:       'Wordle',
    tabWheel:        'Roue',
    tabTransit:      'Sonde',
    randomSent:      'Mot au hasard',
    shareRandom:     (n) => `🎲 ${n} au hasard`,
    transitTitle:    'Fenêtre de tir',
    // La sonde part TOUJOURS tout droit : le joueur choisit l'instant, pas la cible.
    transitLede:     'Lancez au bon moment. Plus l’orbite touchée est basse, plus le mot offert est proche du secret.',
    transitTag:      'Trajectoire verrouillée · verticale',
    transitBadge:    (n) => `${n} sonde${n > 1 ? 's' : ''}`,
    transitFireBtn:  'Lancer la sonde',
    transitKbd:      'ESPACE',
    transitFoot:     'Tir manqué = sonde perdue · la suivante dans 20 mots',
    transitReady:    'Touchez le cadre ou pressez espace',
    transitFlying:   'sonde en vol…',
    transitLost:     'Sonde perdue — il ne revient qu’un mot froid',
    transitUnlocked: (r) => `Mot #${r} débloqué`,
    transitNone:     'Plus rien à débloquer — toute la galaxie est à toi !',
    transitSpent:    'Aucune sonde prête — continue à jouer',
    transitTierRed:    'Orbite basse',
    transitTierOrange: 'Médiane',
    transitTierBlue:   'Haute',
    transitTop:      (n) => `top ${n}`,
    wheelTitle:      'Roue des orbites',
    wheelLede:       (n, tot) => `Un mot vous est offert au hasard. ${n} part sur ${tot} vous place sur l’orbite rouge.`,
    wheelBadge:      (n) => `${n} tour${n > 1 ? 's' : ''}`,
    wheelSpent:      'Aucun tour prêt — continue à jouer',
    wheelDial:       'Cadran',
    wheelFoot:       (n, every) => `${n} tour${n > 1 ? 's' : ''} en stock · le prochain dans ${every} mots`,
    wheelSpinBtn:    'Tourner la roue',
    wheelResult:     (r) => `Tu débloques le mot #${r} !`,
    wheelJackpot:    'JACKPOT ! #',
    wheelNoCloser:   'Plus rien à débloquer — toute la galaxie est à toi !',
    startTitle:      'Débloquer un indice',
    startBestRank:   (r) => `Votre meilleur rang actuel est <strong style="color:var(--screen-text)">#${r}</strong> — le mot indice sera plus proche que ça.`,
    startNoRank:     'Faites d\'abord une proposition sémantique pour obtenir un meilleur indice.',
    startBtn:        'Lancer le défi',
    wordleHeader:    'Monde des lettres',
    wordleTitle:     'Débloquer la cible',
    wordleDesc:      'Devinez cet indice caché — il est plus proche de la réponse que votre meilleur mot.',
    wordleLength:    (n, r) => `Longueur : <strong style="color:var(--screen-text)">${n} lettres</strong> · ${r} essais restants`,
    legendGreen:     'bien placée',
    legendYellow:    'dans le mot, mal placée',
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
    shareWordle:     (n) => `🎯 ${n} Wordle`,
    shareWheel:      (n) => `🎡 ${n} roue`,
    shareMeteor:     (n) => `☄️ ${n} météore${n !== 1 ? 's' : ''}`,
    meteorCatch:     (r) => `☄️ Étoile filante ! Mot #${r} débloqué`,
    meteorCatchHot:  (r) => `🔥 Météore rouge ! #${r} — top 20 !`,
    shareCaption:    'Partager votre résultat',
    copyBtn:         'Copier dans le presse-papier',
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
    archiveAria:     'Archives — rejouer un jour récent',
    archiveTitle:    'Archives',
    archiveIntro:    'Un jour manqué ? Rejoue un des 10 derniers.',
    archiveEmpty:    'Aucun jour passé à rejouer pour l’instant — reviens demain !',
    archiveReturn:   'Revenir au jour J',
    archiveSolved:   'Résolu',
    archiveProgress: 'En cours',
    archiveNew:      'À faire',
    tipHowTo:        'À propos',
    tipStats:        'Statistiques',
    tipArchive:      'Archives',
    tipLangEn:       'Jouer la grille anglaise — un autre mot',
    tipLangFr:       'Jouer la grille française — un autre mot',
    linkThesaurus:   'Synonymes',
    linkWikipedia:   'Wikipédia',
    statsTitle:      'Vos statistiques',
    statsPlayed:     'Parties jouées',
    statsWon:        'Gagnées',
    statsWinRate:    'Taux de victoire',
    statsAvg:        'Moy. propositions / victoire',
    statsBest:       'Meilleure partie',
    statsStreak:     'Série en cours',
    statsDays:       (n) => `${n} jour${n > 1 ? 's' : ''}`,
    statsEmpty:      'Jouez votre première partie pour les remplir !',
    yesterdayTitle:  "Le mot d'hier",
    yesterdayLine:   (num, w) => `L'énigme #${num} était`,
    yesterdayNone:   'Pas de puzzle précédent trouvé.',
    starsTitle:      'Collection d’étoiles',
    starsHint:       'Clique le soleil à tout moment pour l’ouvrir. Gagne des parties pour de la poussière d’étoile ✦ et débloque des étoiles.',
    starEquip:       'Équiper',
    starEquipped:    'Équipée',
    starUnlock:      (p) => `Débloquer · ${p} ✦`,
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
    onbPromise:      'Un mot secret par jour. Le sens, pas les lettres.',
    onbPlay:         'Jouer',
    onbStep1Title:   'Proposez un mot',
    onbStep1Body:    'Galexical compare le <em>sens</em>, pas l’orthographe. Chaque proposition reçoit un rang — le #1, c’est le mot secret lui-même.',
    onbStep2Title:   'Lisez la chaleur',
    onbStep2Body:    'Plus un mot est proche du secret, plus il est chaud.',
    onbScaleFar:     'loin',
    onbScaleHot:     'brûlant',
    onbStep3Title:   'Trouvez le secret',
    onbStep3Body:    'Les mots proches orbitent près du soleil. Tapez le mot exact pour résoudre — puis partagez votre résultat.',
    howToClose:      'Compris !',
    wellDone:        'Bien joué !',
    winCollapse:     'Réduire (voir le soleil)',
    winExpand:       'Voir le résultat',
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
// null = the live puzzle (today). A 'YYYY-MM-DD' string = an Archive replay of a
// past day. Only loadPuzzle() reads it; today's flow is unchanged when null.
let _activeDate = null;
function activePuzzleDate() { return _activeDate || getTodayDate(); }
function isArchiveActive() { return _activeDate !== null && _activeDate !== getTodayDate(); }

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

// ─── Icon set (refonte « Observatoire ») ──────────────────
// Grille 16 px, trait 1,3, bouts arrondis, `currentColor` → l'icône hérite de la
// couleur du texte. Remplace les emojis d'INTERFACE ; les emojis du partage et
// de la température restent (là, ils sont la donnée).
const ICONS = {
  target:  '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.4"/>',
  copy:    '<rect x="5.5" y="2.5" width="8" height="10" rx="1.6"/><path d="M10.5 13.5H4a1.5 1.5 0 0 1-1.5-1.5V5"/>',
  close:   '<path d="M4 4l8 8M12 4l-8 8"/>',
  share:   '<path d="M8 2.5v11M8 2.5l4.6 2.6M8 2.5L3.4 5.1M8 13.5l4.6-2.6M8 13.5l-4.6-2.6"/>',
  chevron: '<path d="M4 6.5l4 4 4-4"/>',
  spark:   '<path d="M8 2.2l1.5 4.3 4.3 1.5-4.3 1.5L8 13.8l-1.5-4.3L2.2 8l4.3-1.5z"/>',
  tiles:   '<rect x="1.8" y="5.5" width="12.4" height="5" rx="1.2"/><path d="M5.9 5.5v5M10.1 5.5v5"/>',
  wheel:   '<circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12"/>',
  calendar:'<rect x="2" y="3" width="12" height="11" rx="1.6"/><path d="M2 6.4h12M5.2 1.6V4M10.8 1.6V4"/>',
  probe:   '<circle cx="8" cy="8" r="2.2"/><ellipse cx="8" cy="8" rx="6.4" ry="3" transform="rotate(-28 8 8)"/><circle cx="13" cy="5" r="1.1" fill="currentColor" stroke="none"/>',
};

function icon(name, size = 16) {
  return `<svg class="gx-icon" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" ` +
    `stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// ─── Sun skins (famous stars) + player profile ───────────
// Each win grants 1 "stardust". Stardust unlocks skins for the central sun,
// modelled on real named stars with their true colours. Colours are applied
// to the target mesh in resetTarget(). Profile is GLOBAL (cross-day, cross-
// language) — separate localStorage key from the per-puzzle state.

// fx per star: glowScale (corona size), glowOp (base halo opacity), pulseSpeed
// & pulseAmp (breathing rhythm), twinkle (fast flicker).
// Richness scales with rarity — cheap stars are calm recolours, Sirius dazzles.
const STAR_SKINS = [
  { id: 'sun',        price: 0,  color: 0xffffff, emissive: 0xffd873, glow: 0xffcf6a, label: '#ffdf8a',
    glowScale: 62, glowOp: 0.60, pulseSpeed: 1.0, pulseAmp: 0.12, twinkle: false,
    nameEn: 'Sol',        nameFr: 'Soleil',     factEn: 'Our home star — a warm yellow dwarf.',               factFr: 'Notre étoile — une naine jaune bien chaude.' },
  { id: 'polaris',    price: 1,  color: 0xfff4d6, emissive: 0xffe08a, glow: 0xffe9b0, label: '#ffe9b0',
    glowScale: 52, glowOp: 0.55, pulseSpeed: 0.6, pulseAmp: 0.17, twinkle: false,
    nameEn: 'Polaris',    nameFr: 'Polaris',    factEn: 'The North Star — a pulsating Cepheid.',              factFr: 'L’étoile Polaire — une céphéide qui pulse.' },
  { id: 'vega',       price: 2,  color: 0xeaf2ff, emissive: 0x9cc4ff, glow: 0xbcd8ff, label: '#cfe3ff',
    glowScale: 42, glowOp: 0.50, pulseSpeed: 1.3, pulseAmp: 0.07, twinkle: false,
    nameEn: 'Vega',       nameFr: 'Véga',       factEn: 'A crisp blue-white brightness standard.',            factFr: 'Une référence d’éclat, bleu-blanc et nette.' },
  { id: 'arcturus',   price: 3,  color: 0xffe6c2, emissive: 0xffab5c, glow: 0xffb870, label: '#ffb870',
    glowScale: 68, glowOp: 0.60, pulseSpeed: 0.85, pulseAmp: 0.14, twinkle: false,
    nameEn: 'Arcturus',   nameFr: 'Arcturus',   factEn: 'A warm orange giant, 25× the Sun.',                  factFr: 'Une géante orange chaude, 25× le Soleil.' },
  { id: 'antares',    price: 5,  color: 0xffd0c0, emissive: 0xff5a3c, glow: 0xff6b4a, label: '#ff8a70',
    glowScale: 80, glowOp: 0.62, pulseSpeed: 0.55, pulseAmp: 0.18, twinkle: false,
    nameEn: 'Antares',    nameFr: 'Antarès',    factEn: 'The heart of Scorpius — a red supergiant.',          factFr: 'Le cœur du Scorpion — une supergéante rouge.' },
  { id: 'betelgeuse', price: 7,  color: 0xffc4b0, emissive: 0xff4a2c, glow: 0xff5533, label: '#ff7a5a',
    glowScale: 94, glowOp: 0.66, pulseSpeed: 0.4,  pulseAmp: 0.23, twinkle: false,
    nameEn: 'Betelgeuse', nameFr: 'Bételgeuse', factEn: 'A vast, slowly pulsing red supergiant.',             factFr: 'Une supergéante rouge immense qui pulse lentement.' },
  { id: 'sirius',     price: 10, color: 0xf4f8ff, emissive: 0xd0e2ff, glow: 0xeaf2ff, label: '#eaf2ff',
    glowScale: 58, glowOp: 0.70, pulseSpeed: 1.6, pulseAmp: 0.10,  twinkle: true,
    nameEn: 'Sirius',     nameFr: 'Sirius',     factEn: 'The brightest star — it dazzles and twinkles.',      factFr: 'L’étoile la plus brillante — elle scintille et éblouit.' },
];

const PROFILE_KEY = STORAGE_PREFIX + 'profile';
let _profile = null;

function skinById(id) {
  return STAR_SKINS.find(s => s.id === id) || STAR_SKINS[0];
}

// Les trois couleurs d'une étoile en variables CSS, pour que le HTML rende la
// même étoile que la scène 3D (color = cœur, emissive = manteau, glow = halo).
function skinVars(skin) {
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');
  return `--sk-core:${hex(skin.color)};--sk-mid:${hex(skin.emissive)};--sk-glow:${hex(skin.glow)}`;
}

// First-time profile seeds stardust from puzzles already solved on this device.
function countPastWins() {
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || '';
    if (!/^semordle:(en|fr):\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    try { if (JSON.parse(localStorage.getItem(k)).solved) n++; } catch (e) { /* skip */ }
  }
  return n;
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (!Array.isArray(p.unlocked)) p.unlocked = ['sun'];
      if (!p.unlocked.includes('sun')) p.unlocked.unshift('sun');
      if (!p.equipped) p.equipped = 'sun';
      if (typeof p.tokens !== 'number') p.tokens = 0;
      return p;
    }
  } catch (e) { /* fall through to fresh */ }
  const p = { tokens: countPastWins(), unlocked: ['sun'], equipped: 'sun' };
  saveProfile(p);
  return p;
}

function saveProfile(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* quota */ }
}

function grantStardust(n = 1) {
  _profile = _profile || loadProfile();
  _profile.tokens = (_profile.tokens || 0) + n;
  saveProfile(_profile);
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
      wheelSpinsUsed: 0,
      meteorCatches: 0,
      meteorByTier: {},   // per-tier counts drive the per-tier daily caps
      transitShotsUsed: 0,
      randomGuesses: 0,
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
  const target = activePuzzleDate();
  let loaded = null;

  try {
    const res = await fetch(`data/${currentLang}/${target}.json`);
    if (res.ok) loaded = await res.json();
  } catch (e) { /* swallow */ }

  // An Archive replay must load its exact date — no fallbacks (a missing archive
  // file is a caller-visible failure). The fallbacks below are for the live puzzle
  // only (e.g. today's file not generated yet → show the most recent day).
  if (!loaded && _activeDate) return null;

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
  let idx = puzzle.words.findIndex(w => w.word.toLowerCase().normalize('NFC') === lc);
  // Repêchage SANS accent, uniquement si la correspondance exacte a échoué :
  // l'exact garde la priorité, donc « cote » ne peut pas voler la place de
  // « côte ». Sur un clavier mobile, taper « melanger » renvoyait « Mot inconnu »
  // alors que « mélanger » est au vocabulaire — le Wordle tolérait déjà
  // l'absence d'accent (`deaccent`), la proposition sémantique non.
  if (idx === -1) {
    const flat = deaccent(lc);
    idx = puzzle.words.findIndex(w => deaccent(w.word.toLowerCase().normalize('NFC')) === flat);
  }
  if (idx === -1) return null;
  const entry = puzzle.words[idx];
  if (entry.rank == null) return { ...entry, rank: idx + 1 };
  return entry;
}

function isSecretWord(word) {
  if (!puzzle) return false;
  const lc = word.toLowerCase().trim().normalize('NFC');
  const secret = puzzle.secret.toLowerCase().normalize('NFC');
  // Le secret n'est PAS dans puzzle.words : c'est le seul chemin qui le
  // reconnaît. Sans tolérance aux accents ici, un joueur qui tape la bonne
  // réponse sans accent se voyait répondre « Mot inconnu » — le pire échec
  // possible pour ce jeu.
  return lc === secret || deaccent(lc) === deaccent(secret);
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

// Index sans accent du formsMap, construit UNE SEULE FOIS à la première
// retombée. Un balayage linéaire à chaque mot inconnu coûterait des dizaines de
// milliers de normalisations sur le fil principal, à chaque frappe malheureuse.
let _flatForms = null;
function flatFormsMap() {
  if (_flatForms) return _flatForms;
  _flatForms = Object.create(null);
  for (const k in formsMap) {
    const f = deaccent(k);
    if (!(f in _flatForms)) _flatForms[f] = formsMap[k]; // 1re graphie gagne, stable
  }
  return _flatForms;
}

function toLemma(word) {
  if (!formsMap) return null;
  const lc = word.toLowerCase().trim().normalize('NFC');
  if (formsMap[lc]) return formsMap[lc];
  // Repêchage sans accent : le cas courant est le joueur qui tape « decrasses »
  // alors que la clé de la table est « décrasses » — donc on interroge TOUJOURS
  // l'index aplati, sans présumer que le mot saisi porte des accents.
  return flatFormsMap()[deaccent(lc)] || null;
}

// ─── Semantic guess submission ────────────────────────────

// ─── Proposition au hasard (champ vide) ───────────────────
// Remplace l'ancienne languette « 3 mots », peu utilisée : cliquer « Deviner »
// sans rien saisir envoie un mot tiré au sort. Le secret est exclu, et les mots
// utiles sont très rares — c'est de l'INSPIRATION (un mot auquel on n'aurait pas
// pensé), pas une aide au classement.
const RANDOM_ODDS = { top10: 0.0001, top100: 0.001, top1000: 0.01 };
// Le commun n'est PAS tiré dans tout le vocabulaire : au-delà du rang ~8000 les
// mots n'ont plus aucun rapport avec le secret (« trombone », « pamplemousse »)
// et n'inspirent rien. On reste dans le voisinage froid mais thématique.
const RANDOM_COLD_FROM = 1000, RANDOM_COLD_TO = 8000;
const RANDOM_COOLDOWN_MS = 250;   // anti-rafale : évite de noyer radar et panneau
let _lastRandomAt = 0;

function pickRandomGuessWord() {
  const guessed = new Set(gameState.semanticGuesses.map(g => g.word.toLowerCase()));
  const unlocked = new Set(gameState.unlocks.map(w => w.toLowerCase()));
  const secret = puzzle.secret.toLowerCase();
  const free = (w) => !guessed.has(w.word.toLowerCase())
    && !unlocked.has(w.word.toLowerCase()) && w.word.toLowerCase() !== secret;
  const inRank = (lo, hi) => puzzle.words.filter(w => w.rank != null && w.rank > lo && w.rank <= hi && free(w));
  const cold = () => puzzle.words.slice(RANDOM_COLD_FROM, RANDOM_COLD_TO).filter(free);

  const r = Math.random();
  let pool;
  if      (r < RANDOM_ODDS.top10)   pool = inRank(0, 10);
  else if (r < RANDOM_ODDS.top100)  pool = inRank(10, 100);
  else if (r < RANDOM_ODDS.top1000) pool = inRank(100, 1000);
  else                              pool = cold();
  if (!pool.length) pool = cold();                       // bande épuisée
  if (!pool.length) pool = puzzle.words.filter(free);    // fin de partie extrême
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// Envoie un mot au hasard. Ne compte PAS dans semanticGuessCount : ce compteur
// pilote la Roue (1/50), la Sonde (1/20), les météorites et le partage — laisser
// le spam l'alimenter viderait de leur sens toutes les autres bouées.
function submitRandomGuess() {
  if (!gameState || gameState.solved || !puzzle) return;
  const now = Date.now();
  if (now - _lastRandomAt < RANDOM_COOLDOWN_MS) return;
  _lastRandomAt = now;
  const w = pickRandomGuessWord();
  if (!w) return;
  submitSemanticGuess(w.word, true);
  showSemanticMessage(t('randomSent'), 'info');
}

function submitSemanticGuess(rawWord, isRandom = false) {
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
  // Compteur SÉPARÉ pour les tirages au sort (voir submitRandomGuess)
  if (isRandom) gameState.stats.randomGuesses = (gameState.stats.randomGuesses || 0) + 1;
  else gameState.stats.semanticGuessCount++;
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
    showWinCard();
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
  grantStardust(1); // reward: 1 stardust per win (handleWin runs once per solve)

  renderGuessCard(winEntry);
  updateBestRankLabel();
  hideEmptyState();

  updateScene();
  _sunFlash = 1; // bright supernova flash — only on the live win, not on restore
  launchFireworks();
  launchThreeFireworks();
  setTimeout(() => showWinCard(), 1000); // persistent card after the supernova beat
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
// withAmbient: victory keeps the endless ambient show afterwards; short
// celebrations (wheel jackpot, red meteor) fire the volley only — otherwise
// the ambient show never stops on an unsolved game (player bug 2026-07-24).
// Deux régimes seulement, et `withAmbient` les distingue :
//  - true  = découverte du MOT SECRET : 12 salves nourries puis le spectacle ambiant ;
//  - false = gain d'un mini-jeu (roue, sonde, météorite rouge) : 3 salves brèves.
// Un mot débloqué ne doit pas avoir le même poids que la fin de la partie —
// sinon la vraie victoire ne se distingue plus (retour de Marc, 2026-07-31).
function launchFireworks(withAmbient = true) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  _fwEnsure();

  const W = window.innerWidth;
  const H = window.innerHeight;
  const bursts = withAmbient ? [
    { x: W * 0.25, y: H * 0.30, delay: 0,    i: 1.3 },
    { x: W * 0.75, y: H * 0.25, delay: 160,  i: 1.3 },
    { x: W * 0.50, y: H * 0.18, delay: 320,  i: 1.4 },
    { x: W * 0.15, y: H * 0.45, delay: 480,  i: 1.2 },
    { x: W * 0.85, y: H * 0.40, delay: 620,  i: 1.2 },
    { x: W * 0.60, y: H * 0.15, delay: 780,  i: 1.3 },
    { x: W * 0.35, y: H * 0.22, delay: 940,  i: 1.3 },
    { x: W * 0.50, y: H * 0.30, delay: 1150, i: 1.5 }, // big centre burst
    { x: W * 0.20, y: H * 0.28, delay: 1400, i: 1.2 },
    { x: W * 0.80, y: H * 0.30, delay: 1600, i: 1.2 },
    { x: W * 0.45, y: H * 0.16, delay: 1850, i: 1.3 },
    { x: W * 0.65, y: H * 0.42, delay: 2100, i: 1.2 },
  ] : [
    // Volée courte, plus haute et resserrée : on félicite sans occuper l'écran.
    { x: W * 0.36, y: H * 0.26, delay: 0,   i: 0.55 },
    { x: W * 0.64, y: H * 0.22, delay: 190, i: 0.55 },
    { x: W * 0.50, y: H * 0.31, delay: 400, i: 0.7  },
  ];
  bursts.forEach(b => _fwPending.push(setTimeout(() => _fwBurst(b.x, b.y, b.i), b.delay)));

  // Hand over to the subtle ambient show only after the big volley settles
  if (withAmbient) _fwPending.push(setTimeout(() => startAmbientFireworks(), 3600));
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
  renderGuessKeyboard();   // AZERTY/QWERTY + libellés suivent la langue
  const journeyTitle = document.getElementById('journey-title');
  if (journeyTitle) journeyTitle.textContent = t('journeyTitle');
  const emptyState = document.getElementById('guess-empty-state');
  if (emptyState) {
    const p = emptyState.querySelector('p');
    if (p) p.textContent = t('emptyState');
  }

  // Wordle handle label
  // Les quatre languettes du jeu partagent l'habillage de « Parcours » (fond
  // sombre translucide + phosphore) ; c'est l'icône SVG qui les distingue.
  const handleLabel = document.getElementById('wordle-handle-label');
  if (handleLabel) handleLabel.innerHTML = `${icon('tiles', 14)}<span>${t('tabWordle')}</span>`;
  const wheelLabel = document.getElementById('wheel-handle-label');
  if (wheelLabel) wheelLabel.innerHTML = `${icon('wheel', 14)}<span>${t('tabWheel')}</span>`;
  const transitLabel = document.getElementById('transit-handle-label');
  if (transitLabel) transitLabel.innerHTML = `${icon('probe', 14)}<span>${t('tabTransit')}</span>`;

  const archiveBtn = document.getElementById('archive-btn');
  if (archiveBtn) archiveBtn.setAttribute('aria-label', t('archiveAria'));
  const winCopy = document.getElementById('win-card-copy');
  if (winCopy) winCopy.innerHTML = `${icon('copy')}<span>${t('copyBtn')}</span>`;
  // Localized hover tooltips (mouse only — see CSS @media (hover: hover))
  // Les langues portent aussi une infobulle : beaucoup de joueurs croyaient que
  // le sélecteur traduisait la page, alors que c'est une AUTRE grille.
  [['how-to-btn', 'tipHowTo'], ['stats-btn', 'tipStats'], ['archive-btn', 'tipArchive'],
   ['lang-en', 'tipLangEn'], ['lang-fr', 'tipLangFr']]
    .forEach(([id, key]) => document.getElementById(id)?.setAttribute('data-tip', t(key)));
  updatePuzzlePill();   // re-render the pill (its return label is localized)

  // Win modal
  const winH2 = document.querySelector('.win-header h2');
  if (winH2) winH2.textContent = t('winTitle');
  const closeWin = document.getElementById('close-win-btn');
  if (closeWin) closeWin.textContent = t('keepPlaying');
  const winCopyBtn = document.getElementById('win-copy-btn');
  if (winCopyBtn) winCopyBtn.innerHTML = `${icon('copy')}<span>${t('copyBtn')}</span>`;

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

  // Modale « ? » — MÊME contenu que l'écran d'accueil (buildHowToSteps)
  const htContent = document.getElementById('how-to-content');
  if (htContent) {
    htContent.innerHTML = `<div class="how-to-content">` +
      `<h2>${t('howToTitle')}</h2>` +
      `<p class="how-to-promise">${t('onbPromise')}</p>` +
      buildHowToSteps() +
      `<button class="how-to-close-btn how-to-close btn-primary" aria-label="Close">${t('howToClose')}</button>` +
      `</div>`;
  }
  renderOnboarding();   // garde l'écran d'accueil traduit s'il est visible
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

// Look-up links for a guessed word (new tab). EN → thesaurus.com; FR → CNRTL
// (synonymie, la référence). Wikipedia in the current language. Lets a stuck
// player check synonyms/definition without leaving the game.
function wordLinksHtml(word) {
  const w = encodeURIComponent(word);
  const wiki = `https://${currentLang === 'fr' ? 'fr' : 'en'}.wikipedia.org/wiki/${w}`;
  const thes = currentLang === 'fr'
    ? `https://www.cnrtl.fr/synonymie/${w}`
    : `https://www.thesaurus.com/browse/${w}`;
  const a = (href, label) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  return `<div class="guess-links">${a(thes, t('linkThesaurus'))}${a(wiki, t('linkWikipedia'))}</div>`;
}

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
    <div class="guess-rank" style="color: ${cardColor}" aria-label="${rankLabel}">${rankLabel}<span class="guess-caret">${icon('chevron', 11)}</span></div>
    ${wordLinksHtml(entry.word)}
  `;

  // Click/Enter toggles the look-up links (Thesaurus + Wikipedia) for this word.
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-expanded', 'false');
  const toggle = (e) => {
    if (e.target.closest('a')) return; // let the links open normally
    const open = card.classList.toggle('expanded');
    card.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
  });

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
  updateTransitHandle();
  const el = document.getElementById('journey-count');
  if (!el || !gameState) return;
  const n = gameState.semanticGuesses.length;
  el.textContent = n > 0 ? t('guessCountLabel', n) : '';
  updateWheelHandle(); // reveal the Wheel tab once a spin has been earned
}

function updateLastGuessSection(sourceCard) {
  const section = document.getElementById('last-guess-section');
  const container = document.getElementById('last-guess-container');
  const clone = sourceCard.cloneNode(true);
  clone.classList.remove('latest-guess', 'expanded');
  clone.style.removeProperty('--latest-color');
  clone.style.removeProperty('--latest-glow');
  clone.style.animation = 'none';
  // The spotlight is a static preview: drop the interactive look-up links + caret
  clone.removeAttribute('role');
  clone.removeAttribute('tabindex');
  clone.removeAttribute('aria-expanded');
  clone.querySelector('.guess-links')?.remove();
  clone.querySelector('.guess-caret')?.remove();
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
    el.style.color = rankToColor(best);   // le meilleur rang est une DONNÉE : il porte sa chaleur
  } else {
    el.textContent = '';
    el.style.removeProperty('color');
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
let _sunFx = { glowScale: 62, glowOp: 0.60, pulseSpeed: 1.0, pulseAmp: 0.12, twinkle: false };
let _sunWon = false;   // solved → the star "goes supernova" in its own colour
let _sunBloom = 0;     // eased 0→1 bloom factor while won
let _sunFlash = 0;     // brief bright flash at the moment of victory
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

    // Pulse + shimmer the target sun, with per-star personality (_sunFx):
    // rhythm/amplitude, plus optional fast twinkle.
    // On victory the star "goes supernova" in its own colour (_sunBloom / _sunFlash).
    _targetPulse += 0.03;
    const fx = _sunFx;
    const ph = _targetPulse * fx.pulseSpeed;
    const tw = fx.twinkle ? 0.82 + 0.18 * Math.sin(_targetPulse * 9.0) * Math.sin(_targetPulse * 5.3) : 1;
    _sunBloom += ((_sunWon ? 1 : 0) - _sunBloom) * 0.06; // ease toward win/idle
    _sunFlash *= 0.93;                                    // decay the victory flash
    const bloom = _sunBloom;

    _targetMesh.scale.setScalar(1 + fx.pulseAmp * Math.sin(ph) + bloom * 0.22);
    _targetMesh.material.emissiveIntensity =
      (1.6 + 0.45 * Math.sin(ph * 1.7)) * tw * (1 + bloom * 1.1) + _sunFlash * 2.5;
    if (_targetGlow) {
      _targetGlow.material.opacity =
        Math.min(1, (fx.glowOp + 0.12 * Math.sin(ph * 1.3 + 1.2)) * tw * (1 + bloom * 0.5) + _sunFlash * 0.4);
      _targetGlow.scale.setScalar(fx.glowScale * (1 + bloom * 0.55));
    }

    _renderer.render(_scene, _camera);
    _labelRenderer.render(_scene, _camera);
  }
  animate();

  // ── Resize handler ──
  window.addEventListener('resize', resize3D);
  setupViewportKeyboardFix();
  setupSunClick();
}

// The central sun is clickable → opens the star collection. It sits at the
// origin, so we project (0,0,0) to screen and test the pointer against it.
// A drag (orbit) moves the pointer, so we only act on a near-still click.
function sunScreenPos() {
  if (!_camera || !_renderer) return null;
  const v = new THREE.Vector3(0, 0, 0).project(_camera);
  if (v.z >= 1) return null; // behind the camera
  const rect = _renderer.domElement.getBoundingClientRect();
  return {
    x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
  };
}

function isNearSun(clientX, clientY) {
  const p = sunScreenPos();
  return !!p && Math.hypot(clientX - p.x, clientY - p.y) < 46;
}

function setupSunClick() {
  const dom = _renderer?.domElement;
  if (!dom) return;
  let down = null;
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  dom.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved <= 6 && isNearSun(e.clientX, e.clientY)) openStarsModal();
  });
  dom.addEventListener('mousemove', e => {
    dom.style.cursor = isNearSun(e.clientX, e.clientY) ? 'pointer' : '';
  });
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
      }, 3000);
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
  const s = skinById(_profile?.equipped || 'sun'); // the equipped star's colours + fx
  _targetMesh.material.color.setHex(s.color);
  _targetMesh.material.emissive.setHex(s.emissive);
  _targetMesh.material.emissiveIntensity = 1.0;
  if (_targetGlow) {
    _targetGlow.material.color.setHex(s.glow);
    _targetGlow.material.opacity = s.glowOp;
    _targetGlow.scale.setScalar(s.glowScale);
  }
  _sunFx = { glowScale: s.glowScale, glowOp: s.glowOp, pulseSpeed: s.pulseSpeed,
             pulseAmp: s.pulseAmp, twinkle: !!s.twinkle };
  _sunWon = false; _sunBloom = 0; _sunFlash = 0; // fresh puzzle: no supernova
  const labelDiv = _targetLabel.element;
  if (labelDiv) labelDiv.classList.remove('dot-label--won');
  if (labelDiv) {
    labelDiv.style.color = s.label;
    const wordEl = labelDiv.querySelector('.dot-label-word');
    if (wordEl) wordEl.textContent = '?';
    const rankEl = labelDiv.querySelector('.dot-label-rank');
    if (rankEl) rankEl.remove(); // clear a leftover "#1" from a previous solved puzzle
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
    // No more green: the equipped star (colours set by resetTarget) keeps its
    // identity and "goes supernova" — the animate loop ramps _sunBloom and
    // sprouts victory rays. Colours stay the skin's own.
    _sunWon = true;

    const labelDiv = _targetLabel.element;
    if (labelDiv) {
      labelDiv.classList.add('dot-label--won'); // bigger, bolder secret + #1
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
      ensureFreshWordleTarget();   // le bestRank a pu s'améliorer pendant que c'était fermé
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

// ─── Wheel of fortune ─────────────────────────────────────
// A spin is earned every WHEEL_SPIN_EVERY guesses (gated by struggle). The
// wheel ALWAYS lands on a word closer than the player's best rank — never a
// dead result — and rarity decides how close (jackpot = nearly the secret).

const WHEEL_SPIN_EVERY = 50;
// Colours echo the radar's temperature gradient (cold blue → scorching red),
// each segment a planet-like disc (dark core → glowing rim).
// Slices stay neutral grey; the tier colour rides on a little shaded "planet"
// (the very body that will orbit on the radar once won). light→color→rim = sphere shading.
// Bands are ABSOLUTE ranks (player feedback 2026-07-24): the wheel no longer
// guarantees better-than-best — the tier says where the word orbits, full stop.
const WHEEL_TIERS = {
  modest:  { color: '#4aa3e6', light: '#bfe3ff', rim: '#123047', band: [250, Infinity] }, // cold word
  good:    { color: '#e6b23a', light: '#ffe6a3', rim: '#4d3708', band: [50, 250] },
  great:   { color: '#ee7726', light: '#ffc79a', rim: '#4a1f06', band: [10, 50] },
  jackpot: { color: '#ff4a3a', light: '#ffb3ab', rim: '#4d0f0a', band: [1, 10] },         // top 10!
};
// 12 segments (6 modest / 3 good / 2 great / 1 jackpot), interleaved for variety
const WHEEL_SEGMENTS = ['modest','good','modest','great','modest','good','modest','jackpot','modest','good','modest','great'];

const WHEEL_CLOSE_MS = 1600;        // battement avant de rendre la main au radar

let _wheelRotation = 0;
let _wheelSpinning = false;
let _wheelCloseT = null;
let _wheelSpinT = null;             // atterrissage en attente (4,2 s de rotation)
let _wheelRewards = []; // the 12 pre-drawn rewards (one per segment), shown as #ranks

function wheelSpinsEarned() { return Math.floor((gameState?.stats?.semanticGuessCount || 0) / WHEEL_SPIN_EVERY); }
function wheelSpinsAvailable() { return Math.max(0, wheelSpinsEarned() - (gameState?.stats?.wheelSpinsUsed || 0)); }

// Every ranked word not yet found — the wheel draws from the WHOLE galaxy,
// not just words better than the player's best (feedback 2026-07-24).
function eligibleWheelPool() {
  const guessed = new Set(gameState.semanticGuesses.map(g => g.word.toLowerCase()));
  const unlocked = new Set(gameState.unlocks.map(w => w.toLowerCase()));
  const secret = puzzle.secret.toLowerCase();
  return puzzle.words
    .filter(w => w.rank != null
      && !guessed.has(w.word.toLowerCase())
      && !unlocked.has(w.word.toLowerCase())
      && w.word.toLowerCase() !== secret)
    .sort((a, b) => a.rank - b.rank); // closest to the secret first
}

// Show/hide the gold Wheel tab depending on whether a spin is available
function updateWheelHandle() {
  const h = document.getElementById('wheel-handle');
  if (!h) return;
  const show = wheelSpinsAvailable() > 0 && !(gameState && gameState.solved);
  h.classList.toggle('available', show);
}

// Which tier lands on which of the 12 segments (interleaved for visual variety).
// Rarity order, closest→farthest: jackpot → great → good → modest.
const WHEEL_LAYOUT = [
  { tier: 'jackpot', segs: [7] },
  { tier: 'great',   segs: [3, 11] },
  { tier: 'good',    segs: [1, 5, 9] },
  { tier: 'modest',  segs: [0, 2, 4, 6, 8, 10] },
];

// Draw 12 rewards (one per segment), each from its tier's ABSOLUTE rank band.
// We then sort the picks and deal the closest to the rarest tier, so the #rank
// stays monotonic with the planet colour (red jackpot = smallest, blue modest =
// largest) even when a band ran dry and fell back on the leftovers.
function computeWheelRewards() {
  const pool = eligibleWheelPool();           // ascending by rank (closest first)
  const rewards = new Array(12).fill(null);
  if (!pool.length) return rewards;

  const NEED = 12;
  const used = new Set();
  const picks = [];
  for (const { tier, segs } of WHEEL_LAYOUT) {
    const [lo, hi] = WHEEL_TIERS[tier].band;
    for (let k = 0; k < segs.length; k++) {
      let cands = pool.filter(w => !used.has(w.word) && w.rank >= lo && w.rank < hi);
      if (!cands.length) cands = pool.filter(w => !used.has(w.word)); // band empty: anything left
      if (!cands.length) break;               // pool exhausted (very thin endgame)
      const pick = cands[Math.floor(Math.random() * cands.length)];
      used.add(pick.word);
      picks.push(pick);
    }
  }
  picks.sort((a, b) => a.rank - b.rank);       // closest first → rarest tiers
  // thin endgame: pad with the farthest word so ordering (and colours) stay monotonic
  while (picks.length && picks.length < NEED) picks.push(picks[picks.length - 1]);

  let p = 0;
  for (const { tier, segs } of WHEEL_LAYOUT) {
    for (const s of segs) {
      const w = picks[p++];
      // keep the score: the radar places dots by score (a missing score used to
      // strand a #2 word at the far edge until the next reload)
      if (w) rewards[s] = { word: w.word, rank: w.rank, score: w.score, tier };
    }
  }
  return rewards;
}

function buildWheelSvg(rewards) {
  const cx = 50, cy = 50, r = 46;
  const PLANET_R = 4.1;                       // same size for every tier (< the central sun)
  const HALO_TIERS = { great: 1, jackpot: 1 }; // faint glow only on the rare bodies
  const pt = (a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  // one shaded-sphere gradient per tier (specular highlight → base colour → dark rim)
  const defs = Object.entries(WHEEL_TIERS).map(([k, t]) =>
    `<radialGradient id="wg-${k}" cx="36%" cy="32%" r="72%">` +
    `<stop offset="0%" stop-color="${t.light}"/><stop offset="42%" stop-color="${t.color}"/>` +
    `<stop offset="100%" stop-color="${t.rim}"/></radialGradient>`).join('');
  // Voile de palier : la part reste sourde (gris alternés) mais prend une teinte
  // de sa famille. Assez pour lire la roue d'un coup d'œil, pas assez pour
  // redevenir l'arc-en-ciel que Marc avait écarté.
  const TINT = { jackpot: 0.17, great: 0.12, good: 0.08, modest: 0.05 };
  let segs = '', bodies = '', labels = '';
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pt(i * 30), [x2, y2] = pt((i + 1) * 30);
    const tier = WHEEL_SEGMENTS[i];
    // neutral slice — alternating greys so adjacent parts stay distinct
    const fill = i % 2 ? '#242a33' : '#1a1f26';
    const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    segs += `<path d="${d}" fill="${fill}"/>`;
    segs += `<path d="${d}" fill="${WHEEL_TIERS[tier].color}" opacity="${TINT[tier]}" stroke="rgba(255,255,255,0.10)" stroke-width="0.5"/>`;
    const rw = rewards[i];
    if (!rw) continue;
    const midA = (i + 0.5) * 30;
    // Rang à l'EXTÉRIEUR, planète à l'intérieur (comme la maquette). Dans
    // l'autre ordre les douze étiquettes convergeaient vers le moyeu, là où la
    // part est la plus étroite, et se télescopaient sur un petit écran.
    const px = cx + 23 * Math.sin(midA * Math.PI / 180);
    const py = cy - 23 * Math.cos(midA * Math.PI / 180);
    if (HALO_TIERS[tier]) {
      bodies += `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${PLANET_R + (tier === 'jackpot' ? 2.0 : 1.5)}" fill="${WHEEL_TIERS[tier].color}" opacity="${tier === 'jackpot' ? 0.22 : 0.14}"/>`;
    }
    bodies += `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${PLANET_R}" fill="url(#wg-${tier})" stroke="rgba(0,0,0,0.35)" stroke-width="0.4"/>`;
    // #rang aligné sur l'axe de la part (comme à la roulette), côté jante
    const lr = 37;
    const lx = cx + lr * Math.sin(midA * Math.PI / 180);
    const ly = cy - lr * Math.cos(midA * Math.PI / 180);
    labels += `<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" transform="rotate(${midA.toFixed(1)} ${lx.toFixed(2)} ${ly.toFixed(2)})" text-anchor="middle" dominant-baseline="central" font-size="4.4" font-weight="700" fill="#f2f5f8" stroke="rgba(0,0,0,0.6)" stroke-width="0.55" paint-order="stroke" font-family="'IBM Plex Mono', ui-monospace, monospace">#${displayRank(rw.rank)}</text>`;
  }
  return `<svg class="wheel-svg" viewBox="0 0 100 100" aria-hidden="true"><defs>${defs}</defs>${segs}${bodies}${labels}` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.7"/>` +
    `<circle cx="${cx}" cy="${cy}" r="8" fill="#05080a" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/></svg>`;
}

// Draws the current `_wheelRewards` — it does NOT redraw them, so the numbers the
// player sees stay stable across a spin (what you land on = what you win).
// Callers compute _wheelRewards when a fresh wheel is wanted (openWheelModal).
function renderWheel(resultHtml) {
  const content = document.getElementById('wheel-content');
  if (!content) return;
  const avail = wheelSpinsAvailable();
  // "giveable" = a segment whose word isn't null and isn't already won this session.
  // Disabling on this (not just all-null) avoids a dead spin button once every
  // remaining reward has been claimed but spins are still banked.
  const won = new Set((gameState?.unlocks || []).map(w => w.toLowerCase()));
  const noneGiveable = !_wheelRewards.some(r => r && !won.has(r.word.toLowerCase()));
  const skin = skinById(_profile?.equipped || 'sun'); // the player's own star in the core
  const emptyMsg = noneGiveable ? `<span class="wheel-none">${t('wheelNoCloser')}</span>` : '';
  const jackpotSegs = (WHEEL_LAYOUT.find(l => l.tier === 'jackpot')?.segs || []).length;
  content.innerHTML = `
    <div class="how-to-content wheel-wrap">
      <h2>${icon('wheel')}<span>${t('wheelTitle')}</span>
        <span class="gx-badge${avail > 0 ? '' : ' spent'}">${avail > 0 ? t('wheelBadge', avail) : t('wheelSpent')}</span>
      </h2>
      <p class="gx-lede">${t('wheelLede', jackpotSegs, WHEEL_SEGMENTS.length)}</p>
      <div class="wheel-stage">
        <div class="wheel-pointer"></div>
        ${buildWheelSvg(_wheelRewards)}
        <div class="wheel-hub" style="${skinVars(skin)}"></div>
      </div>
      ${wheelDialHtml()}
      <div id="wheel-result" class="wheel-result" aria-live="polite">${resultHtml || emptyMsg}</div>
      <button id="wheel-spin-btn" class="gx-cta" ${avail > 0 && !noneGiveable ? '' : 'disabled'}>
        <span>${t('wheelSpinBtn')}</span><span class="gx-kbd">${t('transitKbd')}</span>
      </button>
      <p class="gx-foot">${t('wheelFoot', avail, WHEEL_SPIN_EVERY)}</p>
    </div>`;
  const svg = content.querySelector('.wheel-svg');
  if (svg) svg.style.transform = `rotate(${_wheelRotation}deg)`;
  content.querySelector('#wheel-spin-btn')?.addEventListener('click', spinWheel);
}

// Cadran : l'étendue des rangs RÉELLEMENT posés sur la roue, sur la rampe de
// chaleur. D'un coup d'œil le joueur voit ce qui est en jeu ce tour-ci.
function wheelDialHtml() {
  const ranks = _wheelRewards.filter(Boolean).map(r => r.rank).sort((a, b) => a - b);
  if (!ranks.length) return '';
  const lo = displayRank(ranks[0]), hi = displayRank(ranks[ranks.length - 1]);
  return `<div class="wheel-dial">
      <span class="wd-label">${t('wheelDial')}</span>
      <span class="wd-bar"></span>
      <span class="wd-range">#${lo} → #${hi}</span>
    </div>`;
}

function applyWheelUnlock(w) {
  const displayScore = normalizeScore(w.score, puzzle.hints);
  const entry = { word: w.word, rank: w.rank, score: w.score, displayScore, unlocked: true };
  gameState.semanticGuesses.unshift(entry);
  gameState.unlocks.push(w.word);
  gameState.stats.unlockCount = (gameState.stats.unlockCount || 0) + 1; // marked in the share
  if (gameState.stats.bestRank === null || w.rank < gameState.stats.bestRank) {
    gameState.stats.bestRank = w.rank;
  }
  saveState();
  renderGuessCard(entry);   // card + dot on the radar + last-guess spotlight
  updateBestRankLabel();
  hideEmptyState();
}

function spinWheel() {
  if (_wheelSpinning || wheelSpinsAvailable() <= 0) return;
  // Land only on a segment that still holds a giveable word (skip empty slices and
  // words already won earlier on this same open wheel) — no wasted spins, no dup wins.
  const alreadyWon = new Set(gameState.unlocks.map(w => w.toLowerCase()));
  const candSegs = [];
  for (let i = 0; i < 12; i++) {
    const rw = _wheelRewards[i];
    if (rw && !alreadyWon.has(rw.word.toLowerCase())) candSegs.push(i);
  }
  if (!candSegs.length) return;                   // nothing closer left to give
  const seg = candSegs[Math.floor(Math.random() * candSegs.length)]; // fair among giveable
  const reward = _wheelRewards[seg];
  _wheelSpinning = true;
  gameState.stats.wheelSpinsUsed = (gameState.stats.wheelSpinsUsed || 0) + 1;
  saveState();
  // Un tour déjà lancé ne doit pas être coupé par la fermeture auto du tour
  // PRÉCÉDENT : sans ça, relancer dans la fenêtre de 1,6 s fait disparaître la
  // roue en pleine rotation.
  clearTimeout(_wheelCloseT); _wheelCloseT = null;
  // Le puzzle visé est figé ici : si le joueur change de langue ou de date
  // pendant les 4,2 s de rotation, l'atterrissage doit être abandonné, pas
  // appliqué à l'autre puzzle (même piège que les météorites en vol).
  const forDate = activePuzzleDate();
  const forLang = currentLang;

  const tier = WHEEL_SEGMENTS[seg];
  // Rotate forward: several full turns, then land the chosen segment on top
  const turns = 5;
  const jitter = (Math.random() * 2 - 1) * 11;
  const desired = (360 - (seg + 0.5) * 30) % 360;
  const currentMod = ((_wheelRotation % 360) + 360) % 360;
  let delta = desired - currentMod; if (delta < 0) delta += 360;
  _wheelRotation += 360 * turns + delta + jitter;

  const svg = document.querySelector('.wheel-svg');
  const btn = document.getElementById('wheel-spin-btn');
  const resultEl = document.getElementById('wheel-result');
  if (btn) btn.disabled = true;
  if (resultEl) resultEl.innerHTML = '';
  if (svg) svg.style.transform = `rotate(${_wheelRotation}deg)`;

  _wheelSpinT = setTimeout(() => {
    _wheelSpinT = null;
    _wheelSpinning = false;
    // Le joueur a changé de puzzle en cours de rotation : on abandonne. Le tour
    // est perdu, mais c'est infiniment préférable à injecter un mot de l'ancien
    // puzzle (voire de l'autre langue) dans la sauvegarde du nouveau.
    if (!gameState || !puzzle || activePuzzleDate() !== forDate || currentLang !== forLang) return;
    applyWheelUnlock(reward);
    updateWheelHandle();
    const isJackpot = tier === 'jackpot';
    const label = isJackpot
      ? `${t('wheelJackpot')}${displayRank(reward.rank)}`
      : t('wheelResult', displayRank(reward.rank));
    const resultHtml = isJackpot
      ? `<span class="wheel-win jackpot">${label}</span>`
      : `<span class="wheel-win" style="color:${WHEEL_TIERS[tier].color}">${label}</span>`;
    renderWheel(resultHtml); // same wheel, pointer stays on the won slice + show result
    // Puis on rend la main au système solaire, comme la Sonde. Délai plus long
    // qu'elle (1,6 s) : après 4,2 s d'attente le résultat mérite d'être lu, et
    // l'animation « jackpot-pop » dure 0,5 s.
    _pendingToast = {
      msg: label,
      color: WHEEL_TIERS[tier].color, // la couleur de la planète qui va apparaître
      fireworks: isJackpot || tier === 'great',
    };
    clearTimeout(_wheelCloseT);
    _wheelCloseT = setTimeout(closeWheelModal, WHEEL_CLOSE_MS);
  }, 4300);
}

// Espace = lancer la roue. Même contrat que la Sonde : posé à l'ouverture,
// RETIRÉ à la fermeture, sinon il avalerait les espaces pendant la saisie.
function wheelKeyHandler(e) {
  if (e.code !== 'Space' && e.key !== ' ') return;
  e.preventDefault();
  spinWheel();
}

function openWheelModal() {
  const modal = document.getElementById('wheel-modal');
  if (!modal) return;
  // Fresh draw when opening — but NEVER mid-spin: recomputing while the wheel is
  // turning would change the numbers under the pointer and desync them from the
  // word actually being awarded when the landing fires.
  if (!_wheelSpinning) _wheelRewards = computeWheelRewards();
  renderWheel();
  modal.classList.remove('hidden');
  lockBodyScroll(true);
  window.addEventListener('keydown', wheelKeyHandler);
}

function closeWheelModal() {
  document.getElementById('wheel-modal')?.classList.add('hidden');
  window.removeEventListener('keydown', wheelKeyHandler);
  clearTimeout(_wheelCloseT); _wheelCloseT = null;
  lockBodyScroll(false);
  flushPendingToast();
}

function setupWheelHandle() {
  document.getElementById('wheel-handle')?.addEventListener('click', openWheelModal);
  document.getElementById('wheel-backdrop')?.addEventListener('click', closeWheelModal);
  document.getElementById('wheel-modal')?.addEventListener('click', e => {
    if (e.target.closest('#wheel-close')) closeWheelModal();
  });
}

// ─── Shooting stars (meteors) ─────────────────────────────
// A meteor streaks across the cosmos at rare, irregular intervals; click it
// before it leaves the screen to unlock a word. Blue = frequent/cold word,
// orange = warm, red = rare/top 20. Rewards attentive presence — the only
// helper that turns the cosmos into a living place that can gift you.

// Seuil d'entrée : assez pour que le joueur soit engagé, assez bas pour que la
// découverte arrive tôt. C'était 15, et c'était LUI le vrai frein, pas le
// chrono — la première météorite n'arrivait qu'après une longue mise en route
// (retour joueurs 2026-07-31 : « il faut les inclure plus tôt »).
const METEOR_MIN_GUESSES = 5;
const METEOR_FIRST_MS    = [40e3, 70e3];    // discovery: ~1 min of ACTIVE play
const METEOR_WAIT_MS     = [150e3, 360e3];  // then every 2.5–6 min of ACTIVE play
const METEOR_TRAIL_MAX   = 34;              // trail points kept — also the click target (see hitbox)
// Durations are a full screen crossing: slower than the mockup, which was tuned
// in a small window (same ms = far more px/s on a real full-screen radar).
// `cap` = catches allowed per day and per tier: blue is free (cold words, low
// value), orange/warm and red/top-20 stay scarce.
const METEOR_TIERS = {
  blue:   { weight: 0.72, cap: Infinity, color: '#4aa3e6', glow: '#8fd0ff', dur: 5400, band: [250, 10000] }, // cold word
  orange: { weight: 0.21, cap: 5,        color: '#ee7726', glow: '#ffc79a', dur: 4600, band: [20, 250] },    // warm word
  red:    { weight: 0.07, cap: 3,        color: '#ff4a3a', glow: '#ffb3ab', dur: 3800, band: [1, 20] },      // top 20!
};

let _meteors = [];            // in-flight meteors
let _meteorParts = [];        // catch-burst particles
let _meteorRAF = null;
let _meteorActiveMs = 0;      // accumulated active-play ms since last spawn
let _meteorNextAt = null;     // active-ms threshold for the next spawn
let _meteorHadFirst = false;  // first-of-session uses the shorter window

function meteorRandWait(range) { return range[0] + Math.random() * (range[1] - range[0]); }

function meteorTierCount(tier) { return gameState?.stats?.meteorByTier?.[tier] || 0; }

// Tiers the player can still earn today. A capped tier must never spawn again —
// an uncatchable meteor would be pure frustration.
function availableMeteorTiers() {
  return Object.keys(METEOR_TIERS).filter(k => meteorTierCount(k) < METEOR_TIERS[k].cap);
}

// Timer only runs while the player is actually here and the sky is clear:
// tab visible, no modal/overlay covering the cosmos, game unsolved, tier left.
function meteorEligible() {
  if (!gameState || gameState.solved) return false;
  // Les archives ont droit aux météorites (demande de Marc, 2026-07-31). Aucun
  // risque de farm : les plafonds vivent dans `stats.meteorByTier`, propre à
  // CHAQUE état de puzzle, et les mots gagnés ne valent que pour ce jour-là.
  if ((gameState.stats.semanticGuessCount || 0) < METEOR_MIN_GUESSES) return false;
  if (!availableMeteorTiers().length) return false;   // everything capped (blue is uncapped, so ~never)
  if (_meteors.length) return false;                  // one at a time
  if (document.visibilityState !== 'visible') return false;
  if (document.querySelector('.modal:not(.hidden)')) return false;
  if (document.getElementById('wordle-overlay')?.classList.contains('open')) return false;
  return true;
}

function meteorPool(tier) {
  const [lo, hi] = METEOR_TIERS[tier].band;
  const guessed = new Set(gameState.semanticGuesses.map(g => g.word.toLowerCase()));
  const unlocked = new Set(gameState.unlocks.map(w => w.toLowerCase()));
  const secret = puzzle.secret.toLowerCase();
  const free = (w) => w.rank != null && !guessed.has(w.word.toLowerCase())
    && !unlocked.has(w.word.toLowerCase()) && w.word.toLowerCase() !== secret;
  let cands = puzzle.words.filter(w => free(w) && w.rank >= lo && w.rank < hi);
  if (!cands.length) {
    // band exhausted (endgame): fall back to whatever is left, nearest the band
    const center = (lo + Math.min(hi, 1000)) / 2;
    cands = puzzle.words.filter(free)
      .sort((a, b) => Math.abs(a.rank - center) - Math.abs(b.rank - center))
      .slice(0, 5);
  }
  return cands;
}

// Weighted draw among the tiers still available, weights renormalized so a
// capped orange/red simply gives its share back to the commoner tiers.
function drawMeteorTier() {
  const tiers = availableMeteorTiers();
  if (!tiers.length) return null;
  const total = tiers.reduce((s, k) => s + METEOR_TIERS[k].weight, 0);
  let roll = Math.random() * total;
  for (const k of tiers) {
    roll -= METEOR_TIERS[k].weight;
    if (roll < 0) return k;
  }
  return tiers[tiers.length - 1];
}

function spawnMeteor(tierKey) {
  const tier = tierKey || drawMeteorTier();
  if (!tier) return;                                  // every tier capped
  const pool = meteorPool(tier);
  if (!pool.length) return;                           // nothing left to give
  const word = pool[Math.floor(Math.random() * pool.length)];
  const W = window.innerWidth, H = window.innerHeight;
  const ltr = Math.random() < 0.5;
  const y0 = H * (0.10 + Math.random() * 0.30);
  const y1 = H * (0.35 + Math.random() * 0.35);      // stays in the upper 2/3
  const p0 = { x: ltr ? -60 : W + 60, y: y0 };
  const p1 = { x: ltr ? W + 60 : -60, y: y1 };
  const cp = { x: (p0.x + p1.x) / 2, y: Math.min(y0, y1) - H * 0.12 };
  _meteors.push({ tier, word, t0: performance.now(), dur: METEOR_TIERS[tier].dur, p0, p1, cp, trail: [] });
  startMeteorLoop();
}

function meteorPos(m, t) {
  const u = 1 - t;
  return { x: u * u * m.p0.x + 2 * u * t * m.cp.x + t * t * m.p1.x,
           y: u * u * m.p0.y + 2 * u * t * m.cp.y + t * t * m.p1.y };
}

// Squared distance from (x,y) to the meteor's trail, treated as a polyline —
// distance to each SEGMENT, so the gaps between sampled points are covered too.
function meteorHitDistSq(m, x, y) {
  const pts = m.trail;
  if (!pts.length) return Infinity;
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    if (i === 0) { best = Math.min(best, (a.x - x) ** 2 + (a.y - y) ** 2); continue; }
    const p = pts[i - 1];
    const dx = a.x - p.x, dy = a.y - p.y;
    const len2 = dx * dx + dy * dy;
    // project the click onto the segment, clamped to its ends
    const u = len2 ? Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / len2)) : 0;
    const qx = p.x + u * dx, qy = p.y + u * dy;
    best = Math.min(best, (qx - x) ** 2 + (qy - y) ** 2);
  }
  return best;
}

function meteorCanvasCtx() {
  const cv = document.getElementById('meteor-canvas');
  if (!cv) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== innerWidth * dpr || cv.height !== innerHeight * dpr) {
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function startMeteorLoop() {
  if (_meteorRAF) return;
  const frame = (now) => {
    const ctx = meteorCanvasCtx();
    if (!ctx) { _meteorRAF = null; return; }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = _meteors.length - 1; i >= 0; i--) {
      const m = _meteors[i];
      const t = (now - m.t0) / m.dur;
      if (t >= 1) { _meteors.splice(i, 1); continue; } // missed — it just flies away
      const pos = meteorPos(m, t);
      m.trail.push(pos);
      if (m.trail.length > METEOR_TRAIL_MAX) m.trail.shift();
      const tc = METEOR_TIERS[m.tier];
      for (let k = 1; k < m.trail.length; k++) {
        const a = k / m.trail.length;
        ctx.globalAlpha = a * 0.75;
        ctx.strokeStyle = tc.color;
        ctx.lineWidth = a * 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.trail[k - 1].x, m.trail[k - 1].y); ctx.lineTo(m.trail[k].x, m.trail[k].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = tc.color; ctx.shadowBlur = 16;
      ctx.fillStyle = tc.glow;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 4.2, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 1.8, 0, 6.28); ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (let i = _meteorParts.length - 1; i >= 0; i--) {
      const p = _meteorParts[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= 0.025;
      if (p.life <= 0) { _meteorParts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * p.life + 0.6, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (_meteors.length || _meteorParts.length) {
      _meteorRAF = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      _meteorRAF = null;
    }
  };
  _meteorRAF = requestAnimationFrame(frame);
}

// Annonce différée d'un gain, partagée par la Roue et la Sonde : la modale se
// referme pour laisser voir la planète apparaître, et le toast prend le relais.
// Elle est vidée À LA FERMETURE, d'où qu'elle vienne — si le joueur ferme
// lui-même avant le délai, il ne perd pas l'annonce de son gain.
let _pendingToast = null;

function flushPendingToast() {
  if (!_pendingToast) return;
  const p = _pendingToast;
  _pendingToast = null;
  showMeteorToast(p.msg, p.color);
  if (p.fireworks) launchFireworks(false); // après fermeture : la modale les cachait
}

function showMeteorToast(html, color) {
  const el = document.getElementById('meteor-toast');
  if (!el) return;
  el.innerHTML = html;
  el.style.setProperty('--tc', color);
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function catchMeteor(m, x, y) {
  if (meteorTierCount(m.tier) >= METEOR_TIERS[m.tier].cap) return;
  _meteors = _meteors.filter(o => o !== m);
  const tc = METEOR_TIERS[m.tier];
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * 6.28, v = 1 + Math.random() * 3.2;
    _meteorParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: i % 3 ? tc.color : tc.glow });
  }
  startMeteorLoop();
  const w = m.word;
  const displayScore = normalizeScore(w.score, puzzle.hints);
  const entry = { word: w.word, rank: w.rank, score: w.score, displayScore, unlocked: true };
  gameState.semanticGuesses.unshift(entry);
  gameState.unlocks.push(w.word);
  gameState.stats.meteorCatches = (gameState.stats.meteorCatches || 0) + 1; // total, for the share
  const byTier = gameState.stats.meteorByTier || (gameState.stats.meteorByTier = {});
  byTier[m.tier] = (byTier[m.tier] || 0) + 1;                                // per-tier, for the caps
  if (gameState.stats.bestRank === null || w.rank < gameState.stats.bestRank) {
    gameState.stats.bestRank = w.rank;
  }
  saveState();
  renderGuessCard(entry);
  updateBestRankLabel();
  hideEmptyState();
  const msg = m.tier === 'red' ? t('meteorCatchHot', displayRank(w.rank)) : t('meteorCatch', displayRank(w.rank));
  showMeteorToast(msg, tc.color);
  if (m.tier === 'red') launchFireworks(false); // volley only, no endless ambient
}

function setupMeteors() {
  // heartbeat: accumulate active-play time, spawn when the threshold is crossed
  setInterval(() => {
    if (!meteorEligible()) return;
    if (_meteorNextAt === null) {
      _meteorNextAt = meteorRandWait(_meteorHadFirst ? METEOR_WAIT_MS : METEOR_FIRST_MS);
      _meteorHadFirst = true;
    }
    _meteorActiveMs += 1000;
    if (_meteorActiveMs >= _meteorNextAt) {
      _meteorActiveMs = 0;
      _meteorNextAt = meteorRandWait(METEOR_WAIT_MS);
      spawnMeteor();
    }
  }, 1000);

  // Generous invisible hitbox: the WHOLE trail counts, measured as distance to
  // each trail SEGMENT (not just to sampled points), so clicking anywhere along
  // the glowing streak catches it — that's how players actually aim.
  window.addEventListener('pointerdown', (e) => {
    if (!_meteors.length) return;
    // Never steal a click meant for a real control (the hitbox is wide now).
    // target isn't guaranteed to be an Element (window/document), hence ?.
    if (e.target?.closest?.('button, a, input, textarea, select, [role="button"]')) return;
    const hitR = e.pointerType === 'touch' ? 76 : 60;
    const r2 = hitR * hitR;
    for (const m of _meteors) {
      if (meteorHitDistSq(m, e.clientX, e.clientY) < r2) {
        e.preventDefault(); e.stopPropagation();
        catchMeteor(m, e.clientX, e.clientY);
        break;
      }
    }
  }, true);

  // debug hooks, only with localStorage flag (never advertised)
  if (localStorage.getItem('semordle:debug')) {
    window._gxMeteor = spawnMeteor;
    window._gxMeteors = () => _meteors;
    // Permet de comparer les deux régimes de feux d'artifice sans résoudre le
    // puzzle du jour — c'est-à-dire sans se spoiler le mot secret.
    window._gxFireworks = launchFireworks;
    window._gxSelectTarget = selectUnlockTarget;
    window._gxWordle = () => wordleState;
    window._gxState = () => gameState;
  }
}

// ─── Transit : lancer une sonde à travers les orbites ─────
// 5e bouée, axe ADRESSE. Une sonde toutes les 20 propositions, un seul tir.
// Les anneaux tournent TOUS dans le même sens (comme le vrai système solaire)
// et leur vitesse suit la 3e loi de Kepler (ω ∝ r^-1.5) : la planète la plus
// proche du soleil est la plus rapide, donc la plus dure à toucher — la
// difficulté découle de l'astronomie au lieu d'être arbitraire.
// Toucher = un mot de la bande correspondante. Rater (soleil ou hors-champ) =
// la sonde est perdue, il ne reste qu'un mot froid en consolation.

const TRANSIT_EVERY = 20;
const TRANSIT_TIERS = {
  blue:   { n: 10, rf: 1.00, pf: 0.055, band: [100, 400],   color: '#4aa3e6', light: '#bfe3ff', rim: '#123047' },
  orange: { n: 7,  rf: 0.66, pf: 0.060, band: [20, 100],    color: '#ee7726', light: '#ffc79a', rim: '#4a1f06' },
  red:    { n: 1,  rf: 0.34, pf: 0.077, band: [1, 20],      color: '#ff4a3a', light: '#ffb3ab', rim: '#4d0f0a' },
};
const TRANSIT_LOST_BAND = [1000, 100000];   // consolation : un mot froid
const TRANSIT_OVAL = 0.82;                  // orbites légèrement elliptiques
const TRANSIT_BASE_SP = 0.0087;             // vitesse de l'anneau extérieur (réglage « rapide »)

const TRANSIT_CLOSE_MS = 1100;              // battement avant de rendre la main au radar

let _trPhase = {}, _trProbe = null, _trTrail = [], _trRAF = null, _trResult = null, _trFired = false;
let _trCloseT = null;

function transitShotsAvailable() {
  const earned = Math.floor((gameState?.stats?.semanticGuessCount || 0) / TRANSIT_EVERY);
  return Math.max(0, earned - (gameState?.stats?.transitShotsUsed || 0));
}

function updateTransitHandle() {
  const h = document.getElementById('transit-handle');
  if (!h) return;
  const show = transitShotsAvailable() > 0 && !(gameState && gameState.solved) && !isArchiveActive();
  h.classList.toggle('available', show);
  updateTabsLayout();
}

// Un mot non trouvé dans une bande de rangs donnée (même principe que la roue).
function pickWordInBand(lo, hi) {
  const guessed = new Set(gameState.semanticGuesses.map(g => g.word.toLowerCase()));
  const unlocked = new Set(gameState.unlocks.map(w => w.toLowerCase()));
  const secret = puzzle.secret.toLowerCase();
  const free = (w) => w.rank != null && !guessed.has(w.word.toLowerCase())
    && !unlocked.has(w.word.toLowerCase()) && w.word.toLowerCase() !== secret;
  let pool = puzzle.words.filter(w => free(w) && w.rank >= lo && w.rank < hi);
  if (!pool.length) {                      // bande épuisée : le plus proche de la bande
    const center = (lo + Math.min(hi, 1000)) / 2;
    pool = puzzle.words.filter(free).sort((a, b) => Math.abs(a.rank - center) - Math.abs(b.rank - center)).slice(0, 6);
  }
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// Géométrie recalculée à chaque frame : la modale peut changer de taille.
function transitGeom(w, h) {
  const R = Math.min(w * 0.42, h * 0.40);
  return { cx: w / 2, cy: h * 0.46, R, sun: R * 0.13, launch: { x: w / 2, y: h - 20 }, speed: R * 0.019 };
}
function transitPlanets(g, key) {
  const T = TRANSIT_TIERS[key], out = [], r = g.R * T.rf;
  for (let k = 0; k < T.n; k++) {
    const a = (_trPhase[key] || 0) + k * 6.283 / T.n;
    out.push({ x: g.cx + Math.cos(a) * r, y: g.cy + Math.sin(a) * r * TRANSIT_OVAL, r: g.R * T.pf });
  }
  return out;
}

function transitCanvas() {
  const cv = document.getElementById('transit-cv');
  if (!cv) return null;
  const rect = cv.getBoundingClientRect();
  const w = Math.round(rect.width), h = Math.round(rect.height);
  if (!w || !h) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function transitLand(key) {
  _trProbe = null;
  const won = !!key;
  const band = won ? TRANSIT_TIERS[key].band : TRANSIT_LOST_BAND;
  const w = pickWordInBand(band[0], band[1]);
  if (w) {
    const displayScore = normalizeScore(w.score, puzzle.hints);
    const entry = { word: w.word, rank: w.rank, score: w.score, displayScore, unlocked: true };
    gameState.semanticGuesses.unshift(entry);
    gameState.unlocks.push(w.word);
    if (gameState.stats.bestRank === null || w.rank < gameState.stats.bestRank) gameState.stats.bestRank = w.rank;
    renderGuessCard(entry);
    updateBestRankLabel();
    hideEmptyState();
  }
  saveState();
  updateTransitHandle();
  _trResult = {
    won, key,
    color: won ? TRANSIT_TIERS[key].color : '#6b8fc2',
    text: w ? t('transitUnlocked', displayRank(w.rank)) : t('transitNone'),
    sub: won ? '' : t('transitLost'),
  };
  renderTransitStatus();
  // On rend la main au système solaire : le joueur doit VOIR sa planète
  // apparaître. Court battement pour lire l'impact, puis fermeture + toast (le
  // même que les météorites, déjà connu du joueur). Les feux d'artifice du
  // palier rouge sont déclenchés APRÈS la fermeture, sinon la modale les cache.
  // Le `sub` porte le « sonde perdue » : sans lui, un tir raté était annoncé
  // par le toast comme un déblocage réussi et le joueur ne savait jamais qu'il
  // venait de griller sa sonde pour un lot de consolation.
  _pendingToast = {
    msg: _trResult.sub ? `${_trResult.sub} — ${_trResult.text}` : _trResult.text,
    color: _trResult.color,
    fireworks: won && key === 'red',
  };
  clearTimeout(_trCloseT);
  _trCloseT = setTimeout(closeTransitModal, TRANSIT_CLOSE_MS);
}

function transitStep(g) {
  for (const k of Object.keys(TRANSIT_TIERS)) {
    // ω ∝ r^-1.5 : même sens pour tous, l'intérieur va plus vite
    _trPhase[k] = (_trPhase[k] || 0) + TRANSIT_BASE_SP * Math.pow(1 / TRANSIT_TIERS[k].rf, 1.5);
  }
  if (!_trProbe) return;
  for (let s = 0; s < 2; s++) {
    _trProbe.y -= g.speed * 0.5;
    for (const k of Object.keys(TRANSIT_TIERS)) {
      for (const p of transitPlanets(g, k)) {
        if (Math.hypot(_trProbe.x - p.x, _trProbe.y - p.y) < p.r + 3.2) return transitLand(k);
      }
    }
    if (Math.hypot(_trProbe.x - g.cx, _trProbe.y - g.cy) < g.sun + 3) return transitLand(null);
    if (_trProbe.y < -30) return transitLand(null);
  }
  _trTrail.push({ x: _trProbe.x, y: _trProbe.y });
  if (_trTrail.length > 240) _trTrail.shift();
}

function transitDraw(c, g) {
  const { ctx, w, h } = c;
  ctx.clearRect(0, 0, w, h);
  for (const k of Object.keys(TRANSIT_TIERS)) {
    const T = TRANSIT_TIERS[k], r = g.R * T.rf;
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, r, r * TRANSIT_OVAL, 0, 0, 6.28);
    ctx.strokeStyle = T.color; ctx.globalAlpha = 0.13; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // La trajectoire s'arrête au bord du soleil, qui détruit la sonde : la
  // prolonger au-delà laisserait croire qu'on peut le traverser.
  ctx.beginPath(); ctx.moveTo(g.launch.x, g.launch.y); ctx.lineTo(g.cx, g.cy + g.sun);
  ctx.strokeStyle = 'rgba(45,212,191,0.20)'; ctx.lineWidth = 1; ctx.setLineDash([2, 8]); ctx.stroke(); ctx.setLineDash([]);
  // Points de croisement : la trajectoire étant verticale en x = cx, elle coupe
  // chaque ellipse en y = cy + r·OVAL. Ces anneaux disent exactement où amener
  // une planète — c'est l'information utile d'un jeu de timing.
  for (const k of Object.keys(TRANSIT_TIERS)) {
    const T = TRANSIT_TIERS[k];
    ctx.beginPath(); ctx.arc(g.cx, g.cy + g.R * T.rf * TRANSIT_OVAL, g.R * T.pf * 0.62, 0, 6.28);
    ctx.strokeStyle = T.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Le soleil du mini-jeu EST l'étoile équipée : mêmes rôles de couleur que la
  // scène 3D (color = cœur, emissive = halo interne, glow = couronne) et mêmes
  // fx (glowScale, glowOp, pulsation, scintillement). Seule la COURONNE pulse :
  // le disque garde le rayon g.sun, qui sert aussi de zone de collision.
  const skin = skinById(_profile?.equipped || 'sun');
  const rgba = (v, a) => `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
  const now = performance.now() / 1000;
  const tw = skin.twinkle ? 0.82 + 0.18 * Math.sin(now * 9.0) * Math.sin(now * 5.3) : 1;
  const k = (skin.glowOp / 0.6) * tw;
  // Couronne PLAFONNÉE sous l'orbite basse (0,34·R) : sans ce plafond une étoile
  // à grande couronne (Bételgeuse, Antarès) noie la planète rouge, qui est la
  // cible la plus payante. La lisibilité du jeu passe avant le spectacle du skin.
  const corona = Math.min(g.sun * (1.5 + skin.glowScale / 90), g.R * 0.26)
    * (1 + skin.pulseAmp * 0.5 * Math.sin(now * skin.pulseSpeed));
  const rg = ctx.createRadialGradient(g.cx, g.cy, 1, g.cx, g.cy, corona);
  rg.addColorStop(0, `rgba(255,255,255,${Math.min(1, k)})`);
  rg.addColorStop(0.15, rgba(skin.color, Math.min(1, k)));
  rg.addColorStop(0.36, rgba(skin.emissive, Math.min(1, 0.9 * k)));
  // La couronne s'éteint vers sa PROPRE couleur transparente : viser le noir
  // transparent creuserait un anneau sombre autour de l'étoile.
  rg.addColorStop(0.66, rgba(skin.glow, 0.40 * k));
  rg.addColorStop(1, rgba(skin.glow, 0));
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(g.cx, g.cy, corona, 0, 6.28); ctx.fill();
  // Disque : cœur en `color`, bord en `emissive` — comme le matériau 3D, dont la
  // couleur blanche du Soleil n'est chaude que grâce à son émissif.
  const core = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, g.sun);
  core.addColorStop(0, rgba(skin.color, 1));
  core.addColorStop(0.55, rgba(skin.color, 1));
  core.addColorStop(1, rgba(skin.emissive, 1));
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.sun, 0, 6.28); ctx.fill();
  for (const k of Object.keys(TRANSIT_TIERS)) {
    const T = TRANSIT_TIERS[k];
    for (const p of transitPlanets(g, k)) {
      if (k === 'red') { ctx.globalAlpha = 0.20; ctx.fillStyle = T.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 7, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
      const pg = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, 1, p.x, p.y, p.r);
      pg.addColorStop(0, T.light); pg.addColorStop(0.44, T.color); pg.addColorStop(1, T.rim);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
      // Liseré sombre : détache la planète d'une couronne de la même famille de
      // couleur (une rouge sur Antarès se confondrait sans lui).
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.1; ctx.stroke();
    }
  }
  if (_trTrail.length > 1) {
    ctx.beginPath(); ctx.moveTo(_trTrail[0].x, _trTrail[0].y);
    for (let i = 1; i < _trTrail.length; i++) ctx.lineTo(_trTrail[i].x, _trTrail[i].y);
    ctx.strokeStyle = 'rgba(45,212,191,0.6)'; ctx.lineWidth = 1.8; ctx.stroke();
  }
  if (_trProbe) {
    ctx.shadowColor = 'var(--phosphor)'; ctx.shadowColor = '#2dd4bf'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(_trProbe.x, _trProbe.y, 3.4, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
  }
  // Pas de tir : disque phosphore + anneau, tant que la sonde est armée.
  if (!_trFired) { ctx.shadowColor = '#2dd4bf'; ctx.shadowBlur = 14; }
  ctx.fillStyle = _trFired ? 'rgba(45,212,191,0.30)' : '#2dd4bf';
  ctx.beginPath(); ctx.arc(g.launch.x, g.launch.y, 7, 0, 6.28); ctx.fill();
  ctx.shadowBlur = 0;
  if (!_trFired) {
    ctx.globalAlpha = 0.32; ctx.beginPath(); ctx.arc(g.launch.x, g.launch.y, 13, 0, 6.28);
    ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function transitLoop() {
  const c = transitCanvas();
  if (!c || document.getElementById('transit-modal')?.classList.contains('hidden')) { _trRAF = null; return; }
  const g = transitGeom(c.w, c.h);
  transitStep(g);
  transitDraw(c, g);
  _trRAF = requestAnimationFrame(transitLoop);
}

function renderTransitStatus() {
  const el = document.getElementById('transit-status');
  if (!el) return;
  if (_trResult) {
    el.innerHTML = `<span class="transit-res" style="color:${_trResult.color}">${_trResult.text}</span>` +
      (_trResult.sub ? `<span class="transit-sub">${_trResult.sub}</span>` : '');
  } else {
    el.innerHTML = `<span class="transit-sub">${_trFired ? t('transitFlying') : t('transitReady')}</span>`;
  }
  updateTransitFireBtn();
}

function transitFire() {
  if (_trFired || _trResult) return;
  const c = transitCanvas(); if (!c) return;
  const g = transitGeom(c.w, c.h);
  _trFired = true;
  // La sonde est consommée AU TIR, pas à l'atterrissage. Comptée à l'arrivée,
  // il suffisait de refermer la modale en plein vol dès que la trajectoire
  // était perdue pour la récupérer et recommencer à l'infini — ce qui vidait de
  // son sens le « tir manqué = sonde perdue » annoncé au joueur.
  gameState.stats.transitShotsUsed = (gameState.stats.transitShotsUsed || 0) + 1;
  saveState();
  updateTransitHandle();
  _trProbe = { x: g.launch.x, y: g.launch.y };
  _trTrail = [];
  renderTransitStatus();
}

// Légende construite DEPUIS TRANSIT_TIERS : les rangs affichés ne peuvent pas
// mentir sur les bandes réellement tirées, même si on les rééquilibre plus tard.
function transitLegendHtml() {
  return ['red', 'orange', 'blue'].map(k => {
    const T = TRANSIT_TIERS[k], [lo, hi] = T.band;
    // `band` est en rangs INTERNES et `pickWordInBand` prend [lo, hi[ ; le rang
    // montré au joueur est décalé de +1. Sans displayRank la légende promettait
    // un #20 que la bande orange ne peut jamais donner.
    const sub = lo <= 1 ? t('transitTop', hi) : `#${displayRank(lo)}–#${hi}`;
    // Le rang suffit ; le nom du palier ne survit qu'en aria-label, pour que la
    // légende ne repose pas uniquement sur la couleur.
    const name = t('transitTier' + k[0].toUpperCase() + k.slice(1));
    return `<span class="tl-item" style="--tl-c:${T.color}" aria-label="${name} — ${sub}">
        <span class="tl-dot"></span><span class="tl-sub">${sub}</span>
      </span>`;
  }).join('');
}

function updateTransitFireBtn() {
  const btn = document.getElementById('transit-fire');
  if (btn) btn.disabled = _trFired || !!_trResult;
}

// Espace = tirer. Écouteur posé à l'ouverture et RETIRÉ à la fermeture, sinon
// la barre d'espace resterait captée pendant la saisie d'un mot.
function transitKeyHandler(e) {
  if (e.code !== 'Space' && e.key !== ' ') return;
  e.preventDefault();
  transitFire();
}

function openTransitModal() {
  const modal = document.getElementById('transit-modal');
  const content = document.getElementById('transit-content');
  if (!modal || !content) return;
  const shots = transitShotsAvailable();
  const ready = shots > 0;
  _trPhase = {}; Object.keys(TRANSIT_TIERS).forEach(k => { _trPhase[k] = Math.random() * 6.283; });
  // Une annonce encore en attente (roue fermée juste avant) est ÉMISE, jamais
  // jetée : le joueur a gagné le mot, il doit l'apprendre.
  flushPendingToast();
  _trProbe = null; _trTrail = []; _trResult = null; _trFired = !ready;
  content.innerHTML = `
    <div class="how-to-content transit-wrap">
      <h2>${icon('probe')}<span>${t('transitTitle')}</span>
        <span class="gx-badge${ready ? '' : ' spent'}">${ready ? t('transitBadge', shots) : t('transitSpent')}</span>
      </h2>
      <p class="gx-lede">${t('transitLede')}</p>
      <div class="transit-legend">${transitLegendHtml()}</div>
      <div class="transit-stage">
        <span class="transit-stage-tag">${t('transitTag')}</span>
        <canvas id="transit-cv" aria-hidden="true"></canvas>
      </div>
      <div id="transit-status" class="transit-status" aria-live="polite"></div>
      <button id="transit-fire" class="gx-cta" type="button">
        <span>${t('transitFireBtn')}</span><span class="gx-kbd">${t('transitKbd')}</span>
      </button>
      <p class="gx-foot">${t('transitFoot')}</p>
    </div>`;
  modal.classList.remove('hidden');
  lockBodyScroll(true);
  renderTransitStatus();
  updateTransitFireBtn();
  document.getElementById('transit-cv')?.addEventListener('pointerdown', transitFire);
  document.getElementById('transit-fire')?.addEventListener('click', transitFire);
  window.addEventListener('keydown', transitKeyHandler);
  if (!_trRAF) _trRAF = requestAnimationFrame(transitLoop);
}

function closeTransitModal() {
  document.getElementById('transit-modal')?.classList.add('hidden');
  if (_trRAF) { cancelAnimationFrame(_trRAF); _trRAF = null; }
  clearTimeout(_trCloseT); _trCloseT = null;
  window.removeEventListener('keydown', transitKeyHandler);
  _trProbe = null; _trTrail = [];
  lockBodyScroll(false);
  flushPendingToast();
}

function setupTransitHandle() {
  document.getElementById('transit-handle')?.addEventListener('click', openTransitModal);
  document.getElementById('transit-backdrop')?.addEventListener('click', closeTransitModal);
  document.getElementById('transit-modal')?.addEventListener('click', e => {
    if (e.target.closest('#transit-close')) closeTransitModal();
  });
  window.addEventListener('resize', updateTabsLayout);
}

// Les languettes passent en ICÔNES SEULES quand la rangée déborderait — on
// mesure au lieu de compter, pour garder les libellés sur desktop où il y a
// la place, et ne compacter que là où c'est nécessaire (mobile à 4 onglets).
function updateTabsLayout() {
  const tabs = document.getElementById('bottom-tabs');
  if (!tabs) return;
  tabs.classList.remove('compact');
  if (tabs.getBoundingClientRect().width > window.innerWidth - 24) tabs.classList.add('compact');
}

// ─── Wordle unlock flow ───────────────────────────────────

// Long targets get extra rows to stay fair (see wordleMaxAttempts).
function wordleMaxAttempts(word) {
  return WORDLE_MAX_ATTEMPTS + (word.length > 8 ? 1 : 0);
}

function selectUnlockTarget() {
  // Solved? The secret (rank 0) becomes your "best", so every Wordle unlocks the
  // next-closest word you're still missing (#2, #3, …) — same reverse path as
  // having found #2, letting you complete the top ranks after winning.
  // Unsolved: your real best rank (?? not ||, so a legit bestRank of 0 isn't
  // silently turned into 1001).
  const bestRank = gameState.solved ? 0 : (gameState.stats.bestRank ?? 1001);
  const guessedWords = new Set(gameState.semanticGuesses.map(g => g.word.toLowerCase()));
  const unlockedWords = new Set(gameState.unlocks.map(w => w.toLowerCase()));

  const eligible = (w) => {
    const lc = w.word.toLowerCase();
    return !guessedWords.has(lc)
      && !unlockedWords.has(lc)
      && lc !== puzzle.secret.toLowerCase();
  };

  // Primary: a word CLOSER than your best rank — helps you progress.
  const pool = puzzle.words.filter(w => w.rank < bestRank && eligible(w));

  if (pool.length === 0) {
    // Nothing closer left (e.g. you already found #2): unlock outward instead —
    // the nearest ranked word you DON'T have yet (#3, then #4, …), so the
    // Wordle never dead-ends once you've reached the closest neighbour.
    const gaps = puzzle.words.filter(w => w.rank != null && eligible(w));
    if (gaps.length === 0) return null;
    gaps.sort((a, b) => a.rank - b.rank);
    return gaps[0];
  }

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

// La cible est choisie UNE fois puis stockée dans wordleState. Or le bestRank
// peut s'améliorer pendant que le Wordle est fermé (proposition, roue, météorite)
// — la cible devenait alors plus LOINTAINE que le meilleur mot, ce qui casse la
// promesse « le Wordle rapproche toujours » (bug remonté par les joueurs).
// On revalide à la réouverture, mais UNIQUEMENT si la grille est encore vierge :
// hors de question de jeter des essais que le joueur a déjà investis.
function ensureFreshWordleTarget() {
  if (!wordleState || wordleState.solved || wordleState.failed) return;
  if (wordleState.attempts.length || wordleState.currentGuess) return;

  const tw = wordleState.target.word.toLowerCase();
  const owned = gameState.semanticGuesses.some(g => g.word.toLowerCase() === tw)
             || gameState.unlocks.some(w => w.toLowerCase() === tw);
  const best = gameState.solved ? 0 : (gameState.stats.bestRank ?? 1001);
  // Périmée = déjà obtenue autrement, ou plus meilleure que le meilleur rang
  if (!owned && wordleState.target.rank < best) return;

  const candidate = selectUnlockTarget();
  if (!candidate) return;
  // Sans ce garde, rouvrir la modale permettrait de « relancer les dés »
  // jusqu'à tomber sur un mot court.
  if (!owned && candidate.rank >= wordleState.target.rank) return;

  wordleState = {
    target: candidate,
    attempts: [],
    currentGuess: '',
    solved: false,
    failed: false,
    keyStates: {},
    maxAttempts: wordleMaxAttempts(candidate.word),
  };
  renderWordleUI();
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
  // Still playable after the win: reverse Wordles let you complete the top ranks
  // (selectUnlockTarget treats a solved puzzle as best = the secret).
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
    maxAttempts: wordleMaxAttempts(target.word), // +1 bonus row for words > 8 letters
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
  const maxAttempts = wordleState.maxAttempts || WORDLE_MAX_ATTEMPTS;
  const activeRow = attempts.length;
  const isActive = !solved && !failed;

  let boardRows = '';
  for (let i = 0; i < maxAttempts; i++) {
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
      <p style="font-size:12px;color:var(--screen-muted)">${t('wordleLength', wordLen, maxAttempts - attempts.length)}</p>
      <div class="wordle-legend">
        <span><i class="wl-swatch wl-green"></i>${t('legendGreen')}</span>
        <span><i class="wl-swatch wl-yellow"></i>${t('legendYellow')}</span>
      </div>
    </div>
    <div class="wordle-board" role="grid" aria-label="Wordle guess board" style="--word-len:${wordLen};--rows:${maxAttempts}">
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

// ─── Clavier maison de saisie ─────────────────────────────
// Le clavier système mobile occupait plus de la moitié de l'écran (barre
// d'autofill Android + barre d'outils Gboard, dont AUCUNE n'est contrôlable
// depuis une page web). Celui-ci est dans le thème, deux fois plus court, et
// reste ancré en bas pour laisser le système solaire respirer. Il n'apparaît
// qu'au TOUCHER du champ et se referme par sa propre touche : il n'y a donc
// qu'un seul « Deviner » à l'écran, celui de la barre de saisie.
let _kbOpen = false;

// Tactile uniquement : sur un ordinateur le clavier physique fait déjà le
// travail. `semordle:kb` force l'un ou l'autre (test en preview).
function useCustomKeyboard() {
  const forced = localStorage.getItem('semordle:kb');
  if (forced === 'on') return true;
  if (forced === 'off') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function renderGuessKeyboard() {
  const el = document.getElementById('gx-keyboard');
  const input = document.getElementById('semantic-input');
  if (!el) return;
  if (!useCustomKeyboard()) {
    el.classList.add('hidden');
    document.body.classList.remove('gx-kb');
    input?.removeAttribute('inputmode');
    syncKeyboardHeight();
    return;
  }
  // `inputmode="none"` plutôt que `readonly` : le champ garde son curseur et
  // reste modifiable par nos touches, mais le clavier système ne s'ouvre plus.
  // Posé même clavier fermé, sinon le tout premier toucher le ferait surgir.
  input?.setAttribute('inputmode', 'none');
  if (!_kbOpen) {
    el.classList.add('hidden');
    document.body.classList.remove('gx-kb');
    syncKeyboardHeight();
    return;
  }
  el.classList.remove('hidden');
  document.body.classList.add('gx-kb');
  // La rangée partagée porte ENTER (pour le Wordle) ; ici cette place sert à
  // FERMER — valider se fait avec le bouton « Deviner », juste au-dessus.
  const rows = keyboardRows().map(row =>
    `<div class="gxk-row">${row.map(k => {
      if (k === 'ENTER') {
        return `<button type="button" class="gxk-key wide close" data-key="CLOSE" aria-label="${t('kbClose')}">`
          + `${icon('chevron', 14)}<span>${t('kbClose')}</span></button>`;
      }
      return `<button type="button" class="gxk-key${k === '⌫' ? ' wide' : ''}" data-key="${k}">${k}</button>`;
    }).join('')}</div>`).join('');
  el.innerHTML = `<div class="gxk-keys">${rows}</div>`;
  syncKeyboardHeight();
}

// Hauteur réservée = hauteur RÉELLEMENT rendue. Posée sur <body> et non sur
// <html> : `--gxk-h` est héritée, une valeur sur la racine serait masquée par
// toute règle portant sur body. Sans cette mesure, un écart d'un pixel entre la
// valeur codée en dur et le rendu laissait un filet vide au-dessus du clavier.
function syncKeyboardHeight() {
  const el = document.getElementById('gx-keyboard');
  const open = el && !el.classList.contains('hidden');
  document.body.style.setProperty('--gxk-h', open ? `${el.offsetHeight}px` : '0px');
}

function openGuessKeyboard() {
  if (!useCustomKeyboard() || _kbOpen) return;
  _kbOpen = true;
  renderGuessKeyboard();
  resize3D();
}

function closeGuessKeyboard() {
  if (!_kbOpen) return;
  _kbOpen = false;
  renderGuessKeyboard();
  resize3D();
  document.getElementById('semantic-input')?.blur();
}

function setupGuessKeyboard() {
  const el = document.getElementById('gx-keyboard');
  if (!el) return;
  // ⚠️ Le champ est CLONÉ puis remplacé par setupInputBar (cloneNode + replaceChild)
  // pour purger ses écouteurs. Le capturer ici donnerait une référence détachée :
  // on le relit donc à chaque frappe.
  const field = () => document.getElementById('semantic-input');

  // Ouverture au TOUCHER du champ, délégué depuis #input-bar : le champ est
  // remplacé par un clone, un écouteur posé dessus serait perdu. Sur pointerdown
  // et non sur `focus`, pour que les focus PROGRAMMÉS (après chaque proposition,
  // au chargement sur grand écran) ne rouvrent pas un clavier volontairement fermé.
  document.getElementById('input-bar')?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#semantic-input')) openGuessKeyboard();
  });

  // La hauteur des touches change au point de rupture 380 px : on re-mesure.
  window.addEventListener('resize', syncKeyboardHeight);

  // Un seul écouteur délégué pour les touches : le contenu est reconstruit à
  // chaque langue et à chaque ouverture, des écouteurs par touche fuiraient.
  el.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.gxk-key');
    if (!key) return;
    // preventDefault : sans lui le focus quitte le champ et, sur iOS, l'input
    // perd son curseur entre deux touches.
    e.preventDefault();
    const k = key.dataset.key;
    if (k === 'CLOSE') { closeGuessKeyboard(); return; }
    const input = field();
    if (!input) return;
    if (k === '⌫') input.value = input.value.slice(0, -1);
    else input.value += k.toLowerCase();
  });
}

// Source unique des rangées : le Wordle et le clavier de saisie s'en servent
// tous les deux, ils ne peuvent donc pas diverger sur l'AZERTY/QWERTY.
function keyboardRows() {
  return currentLang === 'fr' ? [
    ['A','Z','E','R','T','Y','U','I','O','P'],
    ['Q','S','D','F','G','H','J','K','L','M'],
    ['ENTER','W','X','C','V','B','N','⌫'],
  ] : [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];
}

function buildKeyboardHTML() {
  const rows = keyboardRows();

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
  } else if (wordleState.attempts.length >= (wordleState.maxAttempts || WORDLE_MAX_ATTEMPTS)) {
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

// Words actually unlocked, split by source (won Wordles / wheel spins / meteor
// catches). Failed Wordles only yield a partial clue, so they don't count here.
function unlockBreakdown() {
  const s = gameState.stats;
  const parts = [
    { n: s.wordleWinCount || 0, key: 'shareWordle' },
    { n: s.wheelSpinsUsed || 0, key: 'shareWheel' },  // every spin lands a word
    { n: s.meteorCatches || 0,  key: 'shareMeteor' },
  ].filter(p => p.n > 0);
  return { total: parts.reduce((a, p) => a + p.n, 0), parts };
}

function buildShareText() {
  const stats = gameState.stats;
  const num   = puzzle.puzzleNumber;
  const { total, parts } = unlockBreakdown();
  const unlockLine = t('shareUnlockLine', total) +
    (parts.length ? ` — ${parts.map(p => t(p.key, p.n)).join(' · ')}` : '');

  return [
    `Galexical #${num}`,
    t('shareGuessLine', stats.semanticGuessCount),
    // Les tirages au sort ont leur propre ligne : ils ne gonflent pas le compte
    // de propositions, mais les taire serait malhonnête.
    ...(stats.randomGuesses ? [t('shareRandom', stats.randomGuesses)] : []),
    unlockLine,
    gameState.solved ? t('solved') : t('inProgress'),
    '',
    t('shareUrl'),
  ].join('\n');
}

function buildShareCardHTML() {
  const stats = gameState.stats;
  const num   = puzzle.puzzleNumber;
  const { total, parts } = unlockBreakdown();
  const breakdown = parts.length
    ? `<div class="unlock-breakdown">${parts.map(p => t(p.key, p.n)).join(' · ')}</div>`
    : '';

  return `
    <strong>Galexical #${num}</strong>
    <div>${t('shareGuessLine', stats.semanticGuessCount)}</div>
    ${stats.randomGuesses ? `<div>${t('shareRandom', stats.randomGuesses)}</div>` : ''}
    <div>${t('shareUnlockLine', total)}</div>
    ${breakdown}
    <div>${gameState.solved ? t('solved') : t('inProgress')}</div>
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

// ─── Victory card (persistent, centered over the sun; collapsible) ────────────
// Replaces the old fleeting toast + left-panel share: a "Bien joué !" card with
// the share glued below, covering the sun so the secret isn't spoiled (e.g. in a
// screenshot). Collapse it to admire the sun.
// ⚠️ Le repli est VOLATILE, jamais persisté. Il l'était, et le réglage était lu
// une seule fois au chargement du module : un joueur qui repliait la carte une
// fois ne revoyait plus jamais son résultat, à AUCUNE victoire suivante. Le
// repli ne vaut donc que pour la partie en cours.
let _winCardCollapsed = false;

// Belt-and-suspenders anti-spoiler: also hide the secret's 3D label while the card
// is expanded, so nothing leaks even if the card doesn't perfectly cover it.
function setSecretLabelHidden(hidden) {
  if (_targetLabel?.element) _targetLabel.element.style.visibility = hidden ? 'hidden' : '';
}

function applyWinCardState() {
  const card = document.getElementById('win-card');
  if (!card) return;
  card.classList.toggle('collapsed', _winCardCollapsed);
  const toggle = document.getElementById('win-card-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', _winCardCollapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', t(_winCardCollapsed ? 'winExpand' : 'winCollapse'));
  }
  setSecretLabelHidden(!_winCardCollapsed && !card.classList.contains('hidden'));
}

function showWinCard() {
  if (!gameState?.solved) return;
  const card = document.getElementById('win-card');
  if (!card) return;
  // Toujours DÉPLIÉE à l'affichage : trouver le mot est l'aboutissement de la
  // partie, le résultat doit se voir sans rien avoir à rouvrir. Un repli
  // hérité d'une partie précédente ne doit pas le masquer.
  _winCardCollapsed = false;
  const title = document.getElementById('win-card-title');
  if (title) title.innerHTML = `${icon('target', 18)}<span>${t('wellDone')}</span>`;
  const sub = document.getElementById('win-card-subtitle');
  if (sub) sub.textContent = t('winSubtitle', gameState.stats.semanticGuessCount);
  const share = document.getElementById('win-card-share');
  if (share) share.innerHTML = buildShareCardHTML();
  card.classList.remove('hidden');
  applyWinCardState();
}

function hideWinCard() {
  document.getElementById('win-card')?.classList.add('hidden');
  setSecretLabelHidden(false);
}

function toggleWinCard() {
  _winCardCollapsed = !_winCardCollapsed;
  applyWinCardState();
}

function setupWinCard() {
  document.getElementById('win-card-toggle')?.addEventListener('click', toggleWinCard);
  document.getElementById('win-card-copy')?.addEventListener('click', async () => {
    const ok = await copyShareText();
    const confirm = document.getElementById('win-card-confirm');
    if (confirm) {
      confirm.textContent = ok ? t('copiedOk') : t('copiedFail');
      clearTimeout(confirm._timer);
      confirm._timer = setTimeout(() => { confirm.textContent = ''; }, 3000);
    }
  });
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
    showWinCard();
    // Returning to an already-solved puzzle: quiet celebration, no big volley
    startAmbientFireworks();
  } else {
    hideWinCard();
  }
}

// ─── Initialization ───────────────────────────────────────

async function init() {
  _profile = loadProfile(); // global stardust/skins profile (before resetTarget runs)
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
    setupStatsModal();
    setupArchiveModal();
    setupStarsModal();
    setupLangSwitcher();
    setupWordleHandle();
    setupWheelHandle();
    setupTransitHandle();
    setupMeteors();
    setupGuessKeyboard();     // écouteur délégué, posé une seule fois
    setupKeyboardHandler();
    setupModalCloseButtons();
    setupShareButtons();
    setupWinCard();
    setupOnboarding();
    _initialized = true;
  }

  setupSemanticInput();
  restoreState();
  updatePuzzlePill();   // teal today / amber "back to today" in archive mode
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

  // Champ vide = tirage au sort (remplace l'ancienne languette « 3 mots »)
  const fire = () => {
    const word = newInput.value.trim();
    if (word) { submitSemanticGuess(word); newInput.value = ''; }
    else submitRandomGuess();
    newInput.focus();
  };
  newSubmit.addEventListener('click', fire);
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

// ─── Player statistics modal ──────────────────────────────
// All figures come from THIS browser's localStorage (per language) —
// the site is static, there are no global/server-side stats.

function computePlayerStats() {
  const out = { played: 0, won: 0, totalGuessesWon: 0, best: null, streak: 0 };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const wonDays = new Set();   // for the streak — SAME-DAY solves only
  const keyRe = new RegExp(`^${STORAGE_PREFIX}${currentLang}:(\\d{4}-\\d{2}-\\d{2})$`);
  for (let i = 0; i < localStorage.length; i++) {
    const m = (localStorage.key(i) || '').match(keyRe);
    if (!m) continue;
    try {
      const st = JSON.parse(localStorage.getItem(m[0]));
      const n = st?.semanticGuesses?.length || 0;
      if (n === 0) continue;
      out.played++;   // archives count toward played/won/avg/best…
      if (st.solved) {
        out.won++;
        out.totalGuessesWon += n;
        if (out.best == null || n < out.best) out.best = n;
        // …but the STREAK only credits days solved on that very day: an archive
        // replayed later has solvedAt on a different date, so it doesn't fill it.
        const solvedSameDay = !st.solvedAt || fmt(new Date(st.solvedAt)) === m[1];
        if (solvedSameDay) wonDays.add(m[1]);
      }
    } catch (e) { /* corrupted entry — skip */ }
  }
  // Streak: consecutive same-day wins ending today (or yesterday if today is unplayed)
  const d = new Date();
  if (!wonDays.has(fmt(d))) d.setDate(d.getDate() - 1);
  while (wonDays.has(fmt(d))) { out.streak++; d.setDate(d.getDate() - 1); }
  return out;
}

async function openStatsModal() {
  const modal = document.getElementById('stats-modal');
  const content = document.getElementById('stats-content');
  if (!modal || !content) return;

  const s = computePlayerStats();
  const winRate = s.played ? Math.round((s.won / s.played) * 100) + '%' : '–';
  const avg = s.won ? (s.totalGuessesWon / s.won).toFixed(1) : '–';
  const tiles = [
    [s.played || '0', t('statsPlayed')],
    [s.won || '0', t('statsWon')],
    [winRate, t('statsWinRate')],
    [avg, t('statsAvg')],
    [s.best != null ? t('guessCountLabel', s.best) : '–', t('statsBest')],
    [s.streak ? t('statsDays', s.streak) : '–', t('statsStreak')],
  ];

  // Le « mot d'hier » a été retiré (2026-07-27) : depuis le Mode Archives, la
  // veille est une grille qu'on peut encore vouloir jouer — la révéler ici la
  // gâchait. Les clés i18n yesterday* sont conservées au cas où on le remette.
  content.innerHTML = `
    <div class="how-to-content">
      <h2>${t('statsTitle')}</h2>
      ${s.played === 0 ? `<p class="stats-empty">${t('statsEmpty')}</p>` : ''}
      <div class="stats-grid">
        ${tiles.map(([v, l]) => `<div class="stat-tile"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>`).join('')}
      </div>
    </div>`;

  modal.classList.remove('hidden');
  lockBodyScroll(true);
}

function setupStatsModal() {
  const btn = document.getElementById('stats-btn');
  const modal = document.getElementById('stats-modal');
  const backdrop = document.getElementById('stats-backdrop');
  const closeModal = () => { modal?.classList.add('hidden'); lockBodyScroll(false); };
  btn?.addEventListener('click', openStatsModal);
  backdrop?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target.closest('#stats-close')) closeModal();
  });
}

// ─── Archive modal (replay recent days) ───────────────────
// Phase 1: styled 🗓️ button + modal shell. The scrollable day list + loading a
// past date land in the next steps (manifest data/{lang}/archive.json, loadPuzzle
// with an explicit date, "Archive #N" banner). See CLAUDE.md / roadmap.
const ARCHIVE_WINDOW_DAYS = 10;   // rolling window: the last N days are replayable

function openArchiveModal() {
  const modal = document.getElementById('archive-modal');
  const content = document.getElementById('archive-content');
  if (!modal || !content) return;
  content.innerHTML = `
    <div class="how-to-content">
      <h2>${icon('calendar')}<span>${t('archiveTitle')}</span></h2>
      <p class="archive-intro">${t('archiveIntro')}</p>
      <div id="archive-list" class="archive-list" aria-live="polite"></div>
    </div>`;
  modal.classList.remove('hidden');
  lockBodyScroll(true);
  populateArchiveList();
}

// Status of a past day, read from its own saved state (no network).
function archiveDayStatus(date) {
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return 'new';
    const s = JSON.parse(raw);
    if (s.solved) return 'solved';
    const played = (s.semanticGuesses && s.semanticGuesses.length)
      || (s.stats && s.stats.semanticGuessCount);
    return played ? 'progress' : 'new';
  } catch (e) { return 'new'; }
}

function formatArchiveDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    currentLang === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'short', day: 'numeric', month: 'short' });
}

async function populateArchiveList() {
  const listEl = document.getElementById('archive-list');
  if (!listEl) return;
  let manifest = [];
  try {
    const res = await fetch(`data/${currentLang}/archive.json`, { cache: 'no-store' });
    if (res.ok) manifest = await res.json();
  } catch (e) { /* offline — show empty */ }

  const today = getTodayDate();
  const c = new Date(); c.setDate(c.getDate() - ARCHIVE_WINDOW_DAYS);
  const cutoff = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
  // Past days only (today is the live puzzle), within the rolling window, newest first.
  const days = manifest
    .filter(e => e.date < today && e.date >= cutoff)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, ARCHIVE_WINDOW_DAYS);

  if (!days.length) {
    listEl.innerHTML = `<p class="archive-empty">${t('archiveEmpty')}</p>`;
    return;
  }
  const statusKey = { solved: 'archiveSolved', progress: 'archiveProgress', new: 'archiveNew' };
  listEl.innerHTML = days.map(e => {
    const st = archiveDayStatus(e.date);
    const active = _activeDate === e.date ? ' is-active' : '';
    return `<button class="archive-row${active}" data-date="${e.date}">
        <span class="archive-row-left">
          <span class="archive-row-num">#${e.number}</span>
          <span class="archive-row-date">${formatArchiveDate(e.date)}</span>
        </span>
        <span class="archive-status s-${st}">${t(statusKey[st])}</span>
      </button>`;
  }).join('');
  listEl.querySelectorAll('.archive-row').forEach(row => {
    row.addEventListener('click', () => {
      document.getElementById('archive-modal')?.classList.add('hidden');
      lockBodyScroll(false);
      reloadForDate(row.dataset.date);
    });
  });
}

// The puzzle pill IS the archive indicator: teal "#202" when live, amber and
// clickable ("🗓️ #199 · ← back to today") when replaying a past day.
function updatePuzzlePill() {
  const pill = document.getElementById('puzzle-pill');
  if (!pill || !puzzle) return;
  if (isArchiveActive()) {
    pill.innerHTML = `#${puzzle.puzzleNumber} · <span class="pill-return">← ${t('archiveReturn')}</span>`;
    pill.classList.add('pill--archive');
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('aria-label', t('archiveReturn'));
  } else {
    pill.textContent = `#${puzzle.puzzleNumber}`;
    pill.classList.remove('pill--archive');
    pill.removeAttribute('role');
    pill.removeAttribute('tabindex');
    pill.removeAttribute('aria-label');
  }
}

function setupArchiveModal() {
  const btn = document.getElementById('archive-btn');
  const modal = document.getElementById('archive-modal');
  const backdrop = document.getElementById('archive-backdrop');
  const closeModal = () => { modal?.classList.add('hidden'); lockBodyScroll(false); };
  btn?.addEventListener('click', openArchiveModal);
  backdrop?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target.closest('#archive-close')) closeModal();
  });
  // The amber pill returns to today (click or keyboard) while in archive mode.
  const pill = document.getElementById('puzzle-pill');
  pill?.addEventListener('click', () => { if (isArchiveActive()) reloadForDate(null); });
  pill?.addEventListener('keydown', e => {
    if (isArchiveActive() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); reloadForDate(null); }
  });
  if (localStorage.getItem('semordle:debug')) window._gxLoadDate = reloadForDate; // gated debug
}

// ─── Star collection (sun skins) modal ────────────────────

function closeStarsModal() {
  document.getElementById('stars-modal')?.classList.add('hidden');
  lockBodyScroll(false);
}

function renderStarsModal() {
  const content = document.getElementById('stars-content');
  if (!content) return;
  _profile = _profile || loadProfile();
  const nameKey = currentLang === 'fr' ? 'nameFr' : 'nameEn';
  const factKey = currentLang === 'fr' ? 'factFr' : 'factEn';

  const cards = STAR_SKINS.map(s => {
    const owned = _profile.unlocked.includes(s.id);
    const equipped = _profile.equipped === s.id;
    const affordable = _profile.tokens >= s.price;
    let action;
    if (equipped)      action = `<span class="star-state equipped">★ ${t('starEquipped')}</span>`;
    else if (owned)    action = `<button class="star-btn equip" data-equip="${s.id}">${t('starEquip')}</button>`;
    else if (affordable) action = `<button class="star-btn buy" data-buy="${s.id}">${t('starUnlock', s.price)}</button>`;
    else               action = `<span class="star-state locked">🔒 ${s.price} ✦</span>`;
    const swatch = '#' + s.glow.toString(16).padStart(6, '0');
    // Preview the star's fx on the modal orb (CSS mirrors the 3D personality)
    const glowPx = Math.round(s.glowScale * 0.28);
    const pdur = (2.6 / s.pulseSpeed).toFixed(2);
    const fxClass = `${s.twinkle ? ' fx-twinkle' : ''}`;
    const orbStyle = `--orb:${swatch};--glow:${glowPx}px;--pdur:${pdur}s;--pamp:${s.pulseAmp}`;
    return `
      <div class="star-card${equipped ? ' is-equipped' : ''}">
        <div class="star-orb${fxClass}" style="${orbStyle}"></div>
        <div class="star-info">
          <div class="star-name">${escapeHtml(s[nameKey])}</div>
          <div class="star-fact">${escapeHtml(s[factKey])}</div>
        </div>
        <div class="star-action">${action}</div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <div class="how-to-content">
      <div class="stars-header">
        <h2>${t('starsTitle')}</h2>
        <span class="stardust-balance" aria-label="stardust">✦ ${_profile.tokens}</span>
      </div>
      <p class="stars-hint">${t('starsHint')}</p>
      <div class="stars-grid">${cards}</div>
    </div>`;

  content.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
    const s = skinById(b.dataset.buy);
    if (_profile.tokens < s.price) return;
    _profile.tokens -= s.price;
    _profile.unlocked.push(s.id);
    _profile.equipped = s.id;      // auto-equip on unlock
    saveProfile(_profile);
    if (!(gameState && gameState.solved)) resetTarget();
    renderStarsModal();
  }));
  content.querySelectorAll('[data-equip]').forEach(b => b.addEventListener('click', () => {
    _profile.equipped = b.dataset.equip;
    saveProfile(_profile);
    if (!(gameState && gameState.solved)) resetTarget();
    renderStarsModal();
  }));
}

function openStarsModal() {
  const modal = document.getElementById('stars-modal');
  if (!modal) return;
  renderStarsModal();
  modal.classList.remove('hidden');
  lockBodyScroll(true);
}

function setupStarsModal() {
  const modal = document.getElementById('stars-modal');
  document.getElementById('stars-backdrop')?.addEventListener('click', closeStarsModal);
  modal?.addEventListener('click', e => {
    if (e.target.closest('#stars-close')) closeStarsModal();
  });
}

// ─── Onboarding & « Comment jouer » ───────────────────────
// UNE seule source pour les deux surfaces : l'écran d'accueil du premier
// lancement et la modale « ? » affichent exactement le même contenu.
function buildHowToSteps() {
  const step = (n, titleKey, bodyKey, extra = '') => `
    <div class="how-to-step">
      <span class="how-to-num">${n}</span>
      <div><strong>${t(titleKey)}</strong>${t(bodyKey)}${extra}</div>
    </div>`;
  // L'échelle de chaleur en exemple : la même rampe que les barres et le radar
  const scale = `
    <div class="how-to-scale" aria-hidden="true"><span></span></div>
    <div class="how-to-scale-legend"><span>${t('onbScaleFar')}</span><span>${t('onbScaleHot')}</span></div>`;
  return step('01', 'onbStep1Title', 'onbStep1Body')
       + step('02', 'onbStep2Title', 'onbStep2Body', scale)
       + step('03', 'onbStep3Title', 'onbStep3Body');
}

// Un « nouveau » joueur n'a encore aucune partie ni profil : inutile d'imposer
// l'écran d'accueil à quelqu'un qui joue déjà depuis des semaines.
function isFirstVisit() {
  try {
    if (localStorage.getItem('semordle:seen-intro')) return false;
    // Une partie déjà enregistrée (n'importe quel jour, n'importe quelle langue)
    for (let i = 0; i < localStorage.length; i++) {
      if (/^semordle:(en|fr):\d{4}-\d{2}-\d{2}$/.test(localStorage.key(i) || '')) return false;
    }
    // Le profil est créé d'office au chargement : ne pas se fier à son existence,
    // mais à sa PROGRESSION (jetons gagnés ou étoile achetée au-delà du Soleil).
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if ((p.tokens || 0) > 0 || (p.unlocked || []).length > 1) return false;
    }
    return true;
  } catch (e) { return false; }
}

function renderOnboarding() {
  const el = document.getElementById('onboarding');
  if (!el) return;
  const promise = document.getElementById('onb-promise');
  if (promise) promise.textContent = t('onbPromise');
  const steps = document.getElementById('onb-steps');
  if (steps) steps.innerHTML = buildHowToSteps();
  const play = document.getElementById('onb-play');
  if (play) play.textContent = t('onbPlay');
}

function setupOnboarding() {
  const el = document.getElementById('onboarding');
  if (!el) return;
  renderOnboarding();
  document.getElementById('onb-play')?.addEventListener('click', () => {
    try { localStorage.setItem('semordle:seen-intro', '1'); } catch (e) { /* ignore */ }
    el.classList.add('hidden');
    lockBodyScroll(false);
    document.getElementById('semantic-input')?.focus();
  });
  if (isFirstVisit()) {
    el.classList.remove('hidden');
    lockBodyScroll(true);
  }
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

// Tear down the current game (state, hidden DOM, 3D scene, overlays) so init()
// can rebuild it for a different language OR a different date. Shared by the
// language switcher and the Archive date loader.
function resetForReload() {
  wordleState = null;
  gameState   = null;
  puzzle      = null;

  const gl = document.getElementById('guess-list');
  if (gl) gl.innerHTML = `<div class="guess-list-empty" id="guess-empty-state"><p>${t('emptyState')}</p></div>`;
  const wc = document.getElementById('wordle-inline-content'); if (wc) wc.innerHTML = '';
  const pc = document.getElementById('partial-clues');         if (pc) pc.innerHTML = '';
  const br = document.getElementById('best-rank-label');       if (br) br.textContent = '';

  // Une météorite EN VOL porte un mot du puzzle qu'on quitte : l'attraper après
  // le changement l'injecterait dans l'état du nouveau. Le bug existait déjà
  // pour le changement de langue ; il devient atteignable par les archives
  // maintenant qu'elles ont droit aux météorites.
  _meteors = [];
  _meteorParts = [];
  _meteorActiveMs = 0;
  _meteorNextAt = null;
  _meteorHadFirst = false;   // chaque puzzle a droit à sa fenêtre de découverte

  // Même raisonnement pour la Roue et la Sonde : un atterrissage en attente, une
  // annonce non encore émise ou des récompenses pré-tirées appartiennent AU
  // PUZZLE QU'ON QUITTE. `_wheelSpinning` doit aussi retomber, sinon la
  // réouverture de la roue réutiliserait les 12 récompenses de l'autre puzzle.
  clearTimeout(_wheelSpinT);  _wheelSpinT = null;
  clearTimeout(_wheelCloseT); _wheelCloseT = null;
  clearTimeout(_trCloseT);    _trCloseT = null;
  _wheelSpinning = false;
  _wheelRewards = [];
  _pendingToast = null;

  clearScene();
  closeWordlePanel();
  hideWinCard();   // don't let a solved-day card linger when switching lang/date
}

// Switch the whole game to a given date. dateStr = 'YYYY-MM-DD' replays an
// archived past day; dateStr = null returns to today's live puzzle.
async function reloadForDate(dateStr) {
  if (gameState) saveState();          // persist current day before leaving it
  _activeDate = (dateStr && dateStr !== getTodayDate()) ? dateStr : null;
  resetForReload();
  await init();
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
      resetForReload();
      init();
    });
  });
}

// ─── Bootstrap ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
