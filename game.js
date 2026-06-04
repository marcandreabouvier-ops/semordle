/* =========================================================
   Semordle – game.js
   Complete game logic for the daily semantic word game.
   ========================================================= */

'use strict';

// ─── Constants ───────────────────────────────────────────
const STORAGE_PREFIX = 'semordle:';
const WORDLE_MAX_ATTEMPTS = 6;

// Temperature band definitions
const TEMP = {
  SCORCH:   { min: 1,    max: 10,   label: 'Scorching', icon: '🔥', cssClass: 'scorch', color: '#ef4444' },
  HOT:      { min: 11,   max: 100,  label: 'Hot',       icon: '☀',  cssClass: 'hot',    color: '#f59e0b' },
  WARM:     { min: 101,  max: 500,  label: 'Warm',      icon: '🌤', cssClass: 'warm',   color: '#22c55e' },
  LUKEWARM: { min: 501,  max: 1000, label: 'Lukewarm',  icon: '❄',  cssClass: 'cold',   color: '#64748b' },
  COLD:     { min: 1001, max: Infinity, label: 'Cold',  icon: '❄',  cssClass: 'cold',   color: '#475569' },
};

// ─── State ───────────────────────────────────────────────
let puzzle = null;          // loaded puzzle JSON
let gameState = null;       // persisted state object
let wordleState = null;     // active wordle challenge (in-memory)

// ─── Utility functions ───────────────────────────────────

function getTodayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function storageKey(puzzleDate) {
  return `${STORAGE_PREFIX}${puzzleDate}`;
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
  if (rank === null || rank === undefined) return TEMP.COLD;
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

  // Try today's date file first
  try {
    const res = await fetch(`data/${today}.json`);
    if (res.ok) {
      loaded = await res.json();
    }
  } catch (e) {
    // swallow
  }

  // Fallback to sample
  if (!loaded) {
    try {
      const res = await fetch('data/sample.json');
      if (res.ok) {
        loaded = await res.json();
      }
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
  return puzzle.words.find(w => w.word.toLowerCase() === lc) || null;
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
    showSemanticMessage(`You already guessed "${word}"`, 'error');
    return;
  }

  // Look up in puzzle words
  const found = lookupWord(word);

  let guessEntry;
  if (found) {
    const displayScore = normalizeScore(found.score, puzzle.hints);
    guessEntry = {
      word: found.word,
      rank: found.rank,
      score: found.score,
      displayScore: displayScore,
      unlocked: false,
    };
    // Update best rank
    if (gameState.stats.bestRank === null || found.rank < gameState.stats.bestRank) {
      gameState.stats.bestRank = found.rank;
    }
  } else {
    guessEntry = {
      word: word,
      rank: null,
      score: null,
      displayScore: 0,
      unlocked: false,
    };
  }

  gameState.semanticGuesses.push(guessEntry);
  gameState.stats.semanticGuessCount++;
  saveState();

  clearSemanticMessage();
  renderGuessCard(guessEntry, true);
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

  renderGuessCard(winEntry, true);
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
    '#22c55e', '#a855f7', '#f59e0b', '#ef4444',
    '#38bdf8', '#f472b6', '#fbbf24', '#86efac',
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

function renderGuessCard(entry, prepend = false) {
  const list = document.getElementById('guess-list');
  const temp = entry.isWin ? TEMP.SCORCH : getTemperature(entry.rank);

  const card = document.createElement('div');
  card.setAttribute('role', 'listitem');

  if (!entry.rank && !entry.isWin) {
    card.className = 'guess-card cold-card';
  } else if (entry.unlocked) {
    card.className = 'guess-card unlocked-card';
  } else {
    card.className = 'guess-card';
  }

  const rankLabel = entry.isWin ? '🎯 Solved!' :
                    entry.rank ? `#${entry.rank}` : 'Outside top 1000';
  const tempLabel = entry.isWin ? 'You found it!' : temp.label;
  const scoreLabel = entry.isWin ? '100.0' :
                     (entry.displayScore > 0 ? entry.displayScore.toFixed(1) : null);

  const unlockBadge = entry.unlocked
    ? '<span class="unlock-badge" aria-label="unlocked via Wordle">🔓 Unlocked</span>'
    : '';

  const metaLine = entry.isWin
    ? `${tempLabel}`
    : scoreLabel
      ? `${temp.icon} ${tempLabel} · similarity ${scoreLabel} ${unlockBadge}`
      : `${temp.icon} ${tempLabel} · outside top 1000`;

  const barFill = entry.displayScore > 0 ? entry.displayScore : 0;

  card.innerHTML = `
    <div>
      <div class="guess-word" style="color: ${entry.isWin ? '#fbbf24' : temp.color}">
        ${entry.isWin ? '🎯' : temp.icon} ${escapeHtml(entry.word)}
      </div>
      <div class="guess-meta">${metaLine}</div>
      ${entry.rank || entry.isWin ? `<div class="bar" aria-hidden="true"><div class="fill" style="width:${barFill}%"></div></div>` : ''}
    </div>
    <div class="guess-rank" style="color: ${entry.isWin ? '#fbbf24' : temp.color}" aria-label="${rankLabel}">${rankLabel}</div>
  `;

  if (prepend) {
    // Insert at top (most recent first)
    const emptyState = document.getElementById('guess-empty-state');
    if (emptyState) list.insertBefore(card, emptyState.nextSibling);
    else list.insertBefore(card, list.firstChild);
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

  const COLORS = ['#22c55e','#a855f7','#f59e0b','#ef4444','#38bdf8','#fbbf24','#86efac','#f472b6'];
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

const TARGET_R = 28;

// Viewport state for pan/zoom
const view = { zoom: 1, panX: 0, panY: 0 };
const VIEW_MIN_ZOOM = 0.5;
const VIEW_MAX_ZOOM = 4;

function updateLandscape() {
  const canvas = document.getElementById('landscape-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
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

  const MARGIN = 56;
  const maxR = Math.min(W, H) / 2 - MARGIN;

  // ── PASS 1: Zone fills ──
  const zoneFracs  = [1.0, 0.72, 0.46, 0.22];
  const zoneColors = [
    'rgba(100,116,139,0.07)',
    'rgba(34,197,94,0.07)',
    'rgba(245,158,11,0.10)',
    'rgba(239,68,68,0.13)',
  ];
  zoneFracs.forEach((frac, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
    ctx.fillStyle = zoneColors[i];
    ctx.fill();
  });

  // ── PASS 2: Dashed ring borders + zone text ──
  const ringFracs  = [0.22, 0.46, 0.72, 1.0];
  const ringLabels = ['Scorching', 'Hot', 'Warm', ''];
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1 / view.zoom;
  ringFracs.forEach((frac, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
    if (ringLabels[i]) {
      ctx.setLineDash([]);
      const fs = clamp(10 / view.zoom, 7, 13);
      ctx.font = `${fs}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelR = maxR * (i === 0 ? 0.11 : (ringFracs[i - 1] + frac) / 2);
      ctx.fillText(ringLabels[i], cx, cy - labelR + 4 / view.zoom);
      ctx.setLineDash([3, 5]);
    }
  });
  ctx.restore();

  // ── Collect dot world positions ──
  const allGuesses = [...gameState.semanticGuesses];
  const rankedGuesses = allGuesses
    .filter(g => g.rank !== null && !g.isWin)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 15);
  const coldGuesses = allGuesses
    .filter(g => g.rank === null && !g.isWin)
    .slice(0, 6);

  const dotItems = [];

  rankedGuesses.forEach(g => {
    const temp     = getTemperature(g.rank);
    const angle    = wordToAngle(g.word);
    const rad      = (angle * Math.PI) / 180;
    const normRank = clamp((g.rank - 1) / 999, 0, 1);
    const distFrac = 0.26 + normRank * 0.70;
    const rawDist  = maxR * distFrac;
    const dist     = Math.max(rawDist, TARGET_R + 18);
    dotItems.push({
      x: cx + dist * Math.cos(rad),
      y: cy + dist * Math.sin(rad),
      word: g.word, rank: g.rank, temp, large: g.rank <= 10,
    });
  });

  coldGuesses.forEach((g, i) => {
    const angle = (wordToAngle(g.word) + i * 37) % 360;
    const rad   = (angle * Math.PI) / 180;
    dotItems.push({
      x: cx + maxR * 0.93 * Math.cos(rad),
      y: cy + maxR * 0.93 * Math.sin(rad),
      word: g.word, rank: null, temp: TEMP.COLD, large: false,
    });
  });

  // Convert world dot positions → screen positions for label placement
  // (labels are drawn in screen space so text stays readable at any zoom)
  const toScreen = (wx, wy) => ({
    sx: (cx0 + view.panX) + wx * view.zoom,
    sy: (cy0 + view.panY) + wy * view.zoom,
  });

  // ── PASS 3: Connector lines (in world space, thin) ──
  dotItems.forEach(d => {
    const sc = toScreen(d.x, d.y);
    const info = computeLabelScreen(ctx, d, sc.sx, sc.sy, W, H, view.zoom);
    if (!info) return;
    const dotR = (d.large ? 8 : 5) * view.zoom;
    const dx = info.cx - sc.sx;
    const dy = info.cy - sc.sy;
    const dist = Math.hypot(dx, dy);
    if (dist < dotR + 8) return;
    const nx = dx / dist, ny = dy / dist;
    // Draw in screen space: reset transform, draw, restore
    ctx.restore(); ctx.save();
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.moveTo(sc.sx + nx * (dotR + 3), sc.sy + ny * (dotR + 3));
    ctx.lineTo(info.cx - nx * 5, info.cy - ny * 5);
    ctx.strokeStyle = d.temp.color + '44';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Re-apply world transform
    ctx.translate(cx0 + view.panX, cy0 + view.panY);
    ctx.scale(view.zoom, view.zoom);
  });

  // ── PASS 4: Dots (world space) ──
  dotItems.forEach(d => drawDot(ctx, d.x, d.y, d.temp, d.large, view.zoom));

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
  const DOT_R    = (d.large ? 8 : 5) * zoom;
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

function drawDot(ctx, x, y, temp, large, zoom) {
  const r = large ? 8 : 5;
  const glowR = r + 9;

  const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  grd.addColorStop(0, temp.color + '66');
  grd.addColorStop(1, temp.color + '00');
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = temp.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = (large ? 1.5 : 1) / zoom;
  ctx.stroke();
}

function drawLabelScreen(ctx, d, info) {
  const { lx, ly, label, w, h, pad } = info;
  ctx.fillStyle = 'rgba(6, 10, 24, 0.93)';
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
  ctx.arc(cx, cy, TARGET_R + 16, 0, Math.PI * 2);
  ctx.fillStyle = solvedWord ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.12)';
  ctx.fill();

  const grad = ctx.createRadialGradient(cx - 6, cy - 6, 3, cx, cy, TARGET_R);
  if (solvedWord) {
    grad.addColorStop(0, '#22c55e');
    grad.addColorStop(1, '#a855f7');
  } else {
    grad.addColorStop(0, '#ef4444');
    grad.addColorStop(1, '#a855f7');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, TARGET_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
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
  const bestLine = best
    ? `<p style="font-size:13px;color:var(--muted);margin:0 0 24px;">Your current best rank is <strong style="color:var(--text)">#${best}</strong> — the clue word will be closer than that.</p>`
    : `<p style="font-size:13px;color:var(--muted);margin:0 0 24px;">Make a semantic guess first to get a better starting clue.</p>`;
  container.innerHTML = `
    <div style="text-align:center;padding:40px 20px 32px;">
      <div style="font-size:38px;margin-bottom:14px;">🔐</div>
      <p style="margin:0 0 8px;font-size:18px;font-weight:900;letter-spacing:-0.03em;color:var(--text);">Unlock a clue word</p>
      ${bestLine}
      <button id="wordle-start-btn" style="width:100%;height:52px;font-size:16px;border-radius:8px;" aria-label="Start Wordle challenge">Start challenge</button>
    </div>`;
  document.getElementById('wordle-start-btn')?.addEventListener('click', startWordleChallenge);
}

function startWordleChallenge() {
  if (gameState.solved) {
    showSemanticMessage('You already solved today\'s puzzle!', 'info');
    closeWordlePanel();
    return;
  }

  const target = selectUnlockTarget();
  if (!target) {
    const c = document.getElementById('wordle-inline-content');
    if (c) showWordleStartPrompt(c);
    showSemanticMessage('No stronger clue available — keep guessing!', 'info');
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
      <button class="close-wordle-btn" style="flex:1;height:44px;font-size:14px;" aria-label="Return to semantic game">← Back</button>
      <button class="new-wordle-btn" style="flex:1;height:44px;font-size:14px;" aria-label="Start another Wordle challenge">Another Wordle</button>
    </div>`;
  let resultSection = '';
  if (solved) {
    resultSection = `
      <div class="wordle-result won" role="status" aria-live="polite">
        <h4>🎉 You got it!</h4>
        <p>"${escapeHtml(target.word)}" has been added to your semantic history.</p>
        ${resultBtns}
      </div>`;
  } else if (failed) {
    const mask = buildPartialMask(target.word, attempts);
    resultSection = `
      <div class="wordle-result lost" role="status" aria-live="polite">
        <h4>Not this time</h4>
        <p>The word was <strong>${escapeHtml(target.word)}</strong> (rank #${target.rank}).</p>
        <div class="revealed-word" aria-label="Partial clue: ${mask}">${mask}</div>
        <p>Green-position letters saved as a clue.</p>
        ${resultBtns}
      </div>`;
  }

  const keyboard = buildKeyboardHTML();

  const messageArea = isActive
    ? `<div class="wordle-message" role="alert" aria-live="polite"></div>`
    : '';

  return `
    <div class="wordle-header">
      <div class="caption">Letter world</div>
      <h3>🗝 Unlock target</h3>
      <p>Guess this hidden semantic clue — it's closer to the answer than your best word so far.</p>
      <p style="font-size:12px;color:var(--muted)">Word length: <strong style="color:var(--text)">${wordLen} letters</strong> · ${WORDLE_MAX_ATTEMPTS - attempts.length} attempts left</p>
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
  const rows = [
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
  } else if (/^[A-Za-z]$/.test(key)) {
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
    showWordleMessage(`Need ${targetWord.length} letters`, 'error');
    shakeActiveRow();
    return;
  }

  if (!/^[A-Z]+$/.test(rawGuess)) {
    showWordleMessage('Letters only please', 'error');
    return;
  }

  const alreadyGuessed = wordleState.attempts.some(a => a.guess === rawGuess);
  if (alreadyGuessed) {
    showWordleMessage('Already tried that word', 'error');
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
  renderGuessCard(unlockEntry, true);
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
  title.textContent = 'Partial clues from lost challenges';
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
    gameState.solved ? '🎯 Solved' : '🕹 In progress',
    journey,
    '',
    'Play at https://semordle.game',
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
    <div>${gameState.solved ? '🎯 Solved' : '🕹 In progress'}</div>
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

function showWinModal() {
  const modal = document.getElementById('win-modal');
  if (!modal) return;

  const subtitle = document.getElementById('win-subtitle');
  if (subtitle) {
    subtitle.textContent = `You found the word in ${gameState.stats.semanticGuessCount} guess${gameState.stats.semanticGuessCount !== 1 ? 'es' : ''}!`;
  }

  const card = document.getElementById('win-share-card');
  if (card) card.innerHTML = buildShareCardHTML();

  modal.classList.remove('hidden');

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
      showWordleStartPrompt(inlineContainer);
    }
  });
}

// ─── Physical keyboard handler ────────────────────────────

function setupKeyboardHandler() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const winModal = document.getElementById('win-modal');
      if (!winModal.classList.contains('hidden')) {
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

  // Re-render all guesses: iterate oldest→newest and prepend each,
  // so the newest ends up at the top of the list.
  [...gameState.semanticGuesses].forEach(g => renderGuessCard(g, true));

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
    return;
  }

  // Load or create game state
  const savedState = loadState(puzzle.date);
  gameState = savedState || createFreshState(puzzle.date);

  // Update header
  document.getElementById('puzzle-pill').textContent = `Daily #${puzzle.puzzleNumber} · ${puzzle.wordLength} letters`;
  document.title = `Semordle #${puzzle.puzzleNumber} – Daily semantic word hunt`;

  // Setup UI bindings
  setupSemanticInput();

  setupModeTabs();
  setupKeyboardHandler();
  setupModalCloseButtons();
  setupShareButtons();
  setupLandscapeInteraction();
  document.getElementById('landscape-reset-btn')?.addEventListener('click', resetView);

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
  });

  // Close win modal button
  document.getElementById('close-win-btn')?.addEventListener('click', () => {
    document.getElementById('win-modal').classList.add('hidden');
  });
}

function setupShareButtons() {
  // Desktop share copy button
  document.getElementById('copy-share-btn')?.addEventListener('click', async () => {
    const ok = await copyShareText();
    const confirm = document.getElementById('copy-confirm');
    if (confirm) {
      confirm.textContent = ok ? '✓ Copied to clipboard!' : 'Could not copy — try manually';
      clearTimeout(confirm._timer);
      confirm._timer = setTimeout(() => { confirm.textContent = ''; }, 3000);
    }
  });

  // Win modal copy button
  document.getElementById('win-copy-btn')?.addEventListener('click', async () => {
    const ok = await copyShareText();
    const confirm = document.getElementById('win-copy-confirm');
    if (confirm) {
      confirm.textContent = ok ? '✓ Copied to clipboard!' : 'Could not copy — try manually';
      clearTimeout(confirm._timer);
      confirm._timer = setTimeout(() => { confirm.textContent = ''; }, 3000);
    }
  });
}

// ─── Bootstrap ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
