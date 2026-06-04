# Semordle - Claude Code Build Brief

## Goal

Build the full first version of **Semordle**, a daily browser word game that combines Semantle-style semantic guessing with a Wordle-style unlock challenge.

This repository/folder should become a complete, runnable website based on:

1. The existing project concept/spec in this folder.
2. The provided HTML mockup file: `semordle_mockup.html`.
3. The requirements in this document.

The previous working title was **Boredle**. Rename the product and UI to **Semordle** everywhere.

---

## Core Product Idea

Semordle is a daily word game with one hidden secret word.

Players mainly progress by guessing semantically related words, similar to Semantle. When they get stuck, they can open a Wordle-style challenge that reveals a stronger semantic clue.

The important twist: Wordle is not a limited hint token. It is a second puzzle path inside the same game.

---

## Player Loop

1. Player opens today's Semordle.
2. The game shows:
   - today's puzzle number/date
   - secret word length
   - a semantic input field
   - a semantic landscape / progress area
   - guess history
   - an unlock button
3. Player submits semantic guesses.
4. If the guess is in the top 1000 closest words, show rank and normalized score.
5. If the guess is outside the top 1000, show a cold result.
6. Player can click **Discover a stronger clue** to open a Wordle-style unlock challenge.
7. The Wordle challenge target is a word ranked better than the player's best currently discovered semantic word.
8. If the player wins the Wordle challenge, the target clue word is added to the semantic guess history as an unlocked clue.
9. If the player loses, the game still gives partial help by revealing only green-position letters from the Wordle attempts.
10. The game is won when the player guesses the secret word.

---

## Tone and Design Direction

The UI should feel modern, warm, playful, and mobile-first.

Avoid:

- old-school table-heavy pages
- too many ads
- cluttered banners
- a purely technical NLP-tool feeling
- dark-only hacker aesthetic

Aim for:

- modern word game
- cozy semantic exploration
- soft gradients
- rounded cards
- polished micro-interactions
- clear mobile experience
- simple enough to understand immediately

Design references:

- Wordle for satisfying feedback
- Semantle for semantic guessing
- Duolingo for friendly reward moments
- Spotify Wrapped for shareable result energy
- Linear / modern SaaS for polished visual spacing

The existing `semordle_mockup.html` is the visual reference. Use its layout, palette, card language, and general atmosphere as the starting point.

---

## Monetization Rule

Use exactly **one ad slot** in the UI.

Requirements:

- One tasteful sponsored/ad banner only.
- It must not appear above the main game input.
- It must not appear between guesses.
- It must not be sticky.
- It must not use popups or interstitials.
- It must be visible but calm.
- It should be placed after the main interaction flow on mobile.
- On desktop it may appear in the right-side panel or below the main game content.

Use a placeholder component for now:

```text
Sponsored
One calm banner lives here
Visible, but never between guesses.
```

Make the ad container easy to replace later with a real ad network tag.

---

## Recommended Technical Direction

Prefer a lightweight static-first implementation.

Recommended MVP stack:

- HTML
- CSS
- Vanilla JavaScript
- Local JSON data files
- No framework unless the existing folder already uses one

If the assigned folder already has a framework setup, adapt to it. Otherwise, keep the project simple.

Suggested files:

```text
semordle/
├── index.html
├── style.css
├── game.js
├── generate_data.py
├── README.md
├── data/
│   ├── sample.json
│   └── YYYY-MM-DD.json
└── semordle_mockup.html
```

The final game should run locally with:

```bash
python -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

---

## Data Format

Each daily JSON file should look like this:

```json
{
  "date": "2026-06-03",
  "puzzleNumber": 152,
  "secret": "market",
  "wordLength": 6,
  "hints": {
    "top1": 0.7812,
    "top10": 0.6523,
    "top1000": 0.1045
  },
  "words": [
    { "word": "commerce", "score": 0.7812, "rank": 1 },
    { "word": "trade", "score": 0.7654, "rank": 2 },
    { "word": "economy", "score": 0.7211, "rank": 3 }
  ]
}
```

For a static MVP, keeping `secret` in JSON is acceptable, but clearly document that this is not secure. The long-term version should move validation server-side.

---

## Semantic Scoring Rules

- Rank 1 is closest to the secret word.
- Rank 1000 is the furthest visible ranked clue.
- Words outside the top 1000 are cold.
- The secret word is a win and displays 100.

Normalized display score:

```js
const displayScore = (rawScore / hints.top1) * 100;
```

Clamp display score to `0..100`.

Temperature bands:

```text
#1-10       Scorching
#11-100     Hot
#101-500    Warm
#501-1000   Lukewarm
>1000       Cold
```

Suggested labels:

```text
🔥 Scorching
☀ Hot
🌤 Warm
❄ Cold
```

---

## Wordle Unlock Rules

The unlock button should open a Wordle-style challenge.

Label:

```text
Discover a stronger clue
```

### Unlock Target Selection

1. Find the player's best semantic rank so far.
2. If the player has no ranked semantic guesses yet, use 1001 as their current best rank.
3. Build an unlock pool from words with rank lower than the current best rank.
4. Exclude:
   - words already guessed
   - words already unlocked
   - the secret word, unless the player is very close and you intentionally choose to allow it later
5. Pick a semi-random word from the pool.

Recommended MVP behavior:

- Pick a random word from the better-ranked pool.
- Prefer useful jumps, not the immediate next rank every time.
- Example: if current best is #420, reveal something from #1 to #419, not necessarily #419.

Optional improved weighting:

- 60% chance: word between 40% and 80% closer than current best
- 30% chance: word between 10% and 40% closer
- 10% chance: very strong clue in top 10% of available pool

### Wordle Attempts

- 6 attempts.
- Guess length must match the unlock target length.
- Use standard Wordle feedback:
  - correct letter and correct position = green
  - correct letter but wrong position = yellow
  - absent letter = gray
- Handle duplicate letters correctly.

### Unlock Win

If the Wordle challenge is solved:

- Add the unlock target word to semantic history.
- Mark it with a lock/key badge.
- Show its rank and score.
- Close the Wordle modal on mobile.

### Unlock Loss

If the Wordle challenge is lost:

- Reveal a masked version using only green-position letters discovered.
- Example: target `market`, green M and E gives `M _ _ _ E _`.
- Store this partial clue in history or in an unlock-clues area.
- This is important: failure still helps.

---

## Responsive Layout

### Desktop

Use a two-column layout:

- Left/main column:
  - semantic landscape
  - semantic input
  - mode/status chips
  - guess history
- Right column:
  - unlock card
  - one sponsor/ad slot
  - Wordle challenge preview or active panel
  - share card preview

### Mobile

Do not keep the Wordle panel permanently open.

Mobile layout:

- Main game first
- Guess input visible and easy to reach
- Guess history below
- Unlock button opens Wordle as a full-screen modal or bottom sheet
- One ad slot appears below the core game flow, never above the input

Important mobile behavior:

- The Wordle unlock challenge should feel like entering a temporary challenge room.
- After win/loss, return the player to the semantic game.

---

## UI Components to Build

### Header

- Semordle logo/icon
- Daily puzzle number/date
- Short tagline

Example:

```text
Semordle
Daily semantic word hunt
Puzzle #152
```

### Semantic Landscape

The mockup shows a visual map with dots around a hidden target.

For the MVP, this can be illustrative rather than mathematically exact.

Better implementation:

- Plot recent/best guesses around a center target.
- Distance to center should roughly reflect rank/score.
- Position angle can be deterministic based on the word string hash.
- Color indicates temperature.

Do not over-engineer PCA/UMAP for the first version unless the data already exists.

### Guess Cards

Each ranked guess should appear as a card with:

- word
- temperature label
- rank
- normalized score
- progress bar

Example:

```text
🔥 market
Scorching · similarity 82.4
Rank #11
```

### Cold Guesses

Cold guesses should appear but not dominate the UI.

Example:

```text
❄ banana
Cold · outside top 1000
```

### Unlock Card

Contains:

- short explanation
- unlock button
- current best rank

Example:

```text
Open a lock
Solve a letter puzzle to reveal a stronger semantic anchor.
```

### Wordle Modal / Panel

Must include:

- target clue length
- 6 attempt rows
- keyboard optional for MVP
- input field is acceptable for MVP
- feedback tiles
- success/failure state

### Share Card

After solve, show:

```text
Semordle #152
🧠 24 semantic guesses
🔓 3 unlocks
🎯 Solved
❄ 🌤 ☀ 🔥 🎯
```

Add a copy button.

---

## Local Storage

Persist game progress per puzzle.

Suggested key:

```js
semordle:${puzzleId}
```

Suggested shape:

```json
{
  "puzzleId": "2026-06-03",
  "semanticGuesses": [],
  "unlockAttempts": [],
  "partialUnlockClues": [],
  "solved": false,
  "solvedAt": null,
  "stats": {
    "semanticGuessCount": 0,
    "unlockCount": 0,
    "wordleWinCount": 0,
    "bestRank": null
  }
}
```

---

## Accessibility

- All buttons must have visible labels.
- Do not rely on color alone for Wordle feedback.
- Add `aria-label` where helpful.
- Ensure contrast is readable.
- Allow keyboard submission with Enter.
- Respect reduced motion if adding animations.

---

## Claude Code Instructions

Please inspect the current folder before editing.

Then:

1. Identify existing files and preserve anything useful.
2. Rename Boredle references to Semordle.
3. Use `semordle_mockup.html` as the design reference.
4. Create or update the final app files.
5. Implement the game logic in JavaScript.
6. Create a sample playable puzzle.
7. Add README instructions for local running and future daily data generation.
8. Keep the site fast and static-first.
9. Include exactly one ad placeholder slot.
10. Make the mobile layout excellent.

Do not add heavy dependencies unless absolutely necessary.

---

## MVP Acceptance Criteria

The build is complete when:

- The site runs locally using `python -m http.server 8080`.
- The home page is branded Semordle.
- The page looks visually aligned with `semordle_mockup.html`.
- Today's/sample puzzle loads from JSON.
- Player can submit semantic guesses.
- Ranked guesses show rank, normalized score, and temperature.
- Cold guesses are handled clearly.
- Player can open a Wordle unlock challenge.
- Wordle feedback works, including duplicate-letter handling.
- Winning a Wordle unlock adds a stronger semantic clue.
- Losing a Wordle unlock reveals green-position letters only.
- Guess progress persists after refresh.
- Solving the secret word shows a win screen and share card.
- There is exactly one calm ad placeholder.
- Mobile does not show a permanent side Wordle panel.

---

## Nice-to-Have After MVP

- Share-to-clipboard polish
- Streaks
- Puzzle archive
- Theme toggle
- Real semantic embedding generator
- Backend validation to hide secret word
- Admin script for generating daily puzzles
- Lightweight analytics
- Optional supporter mode to remove ads

---

## Important Product Principle

Protect the experience.

Semordle should feel faster, warmer, and less cluttered than existing semantic word games. Monetization should support the game, not swallow it.

One banner. No popups. No sticky ads. No ads between guesses.
