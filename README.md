# Semordle

A daily browser word game that combines Semantle-style semantic guessing with a Wordle-style unlock challenge.

---

## How to run locally

1. Open a terminal and navigate to this folder:

   ```bash
   cd semordle
   ```

2. Start a local HTTP server (Python 3 required):

   ```bash
   python -m http.server 8080
   ```

3. Open your browser and visit:

   ```
   http://localhost:8080
   ```

> **Why a server?** The game fetches JSON puzzle files via `fetch()`, which requires HTTP. Opening `index.html` directly as a `file://` URL will cause CORS errors in most browsers.

---

## How to play

1. Type a word you think is semantically related to the hidden secret word and press **Guess** or **Enter**.
2. Words in the top 1000 closest neighbors show a rank and similarity score:
   - 🔥 Rank 1–10: Scorching
   - ☀ Rank 11–100: Hot
   - 🌤 Rank 101–500: Warm
   - ❄ Rank 501–1000: Lukewarm
   - ❄ Outside top 1000: Cold
3. Click **🗝 Discover a stronger clue** to start a Wordle-style challenge. Winning adds a better-ranked word to your history. Losing still reveals the green-position letters.
4. Find the secret word to win!

---

## Adding new daily puzzles

### Option 1: Manual (quick)

Create a new file in the `data/` folder named `YYYY-MM-DD.json` (e.g. `data/2026-06-04.json`) following this format:

```json
{
  "date": "2026-06-04",
  "puzzleNumber": 153,
  "secret": "forest",
  "wordLength": 6,
  "hints": {
    "top1": 0.8100,
    "top10": 0.6800,
    "top1000": 0.1100
  },
  "words": [
    { "word": "woodland", "score": 0.8100, "rank": 1 },
    { "word": "jungle",   "score": 0.7900, "rank": 2 }
  ]
}
```

The game will automatically load today's file (based on the user's local date).

### Option 2: Using generate_data.py (mock)

```bash
python generate_data.py --mock --word forest --date 2026-06-04 --number 153
```

This uses built-in word lists. Output goes to `data/2026-06-04.json`.

### Option 3: Using generate_data.py with real embeddings (gensim)

```bash
pip install gensim
# Download a pretrained model, e.g. Google News Word2Vec
python generate_data.py --gensim \
    --model /path/to/GoogleNews-vectors-negative300.bin \
    --word forest --date 2026-06-04 --number 153
```

This produces semantically accurate neighbor lists.

---

## File structure

```
semordle/
├── index.html          Main game page
├── style.css           All styles
├── game.js             All game logic (vanilla JS)
├── generate_data.py    Python script for generating puzzle JSON
├── README.md           This file
├── data/
│   ├── 2026-06-03.json Today's puzzle (secret: "market")
│   └── sample.json     Fallback sample puzzle (secret: "ocean")
└── Semordle preview.html  Original UI mockup (do not modify)
```

---

## Puzzle data security note

The secret word is stored in plain text inside the JSON file. This is acceptable for a local or hobby game, but **is not secure for a public-facing production deployment**:

- Any player can open the JSON file in their browser or DevTools and see the answer.
- For production: move the secret-word validation to a server-side API. The client only receives the hint scores and word list — the secret is never sent to the browser until the game is won.

---

## Technical notes

- **Pure vanilla JS**: no frameworks, no build step required.
- **Local storage**: game progress is saved per puzzle date under `semordle:YYYY-MM-DD`.
- **Canvas landscape**: the semantic map uses HTML Canvas to draw guess positions.
- **Responsive**: two-column layout on desktop (>880px), single column + modal Wordle on mobile.
- **Accessibility**: ARIA labels, keyboard navigation, Enter to submit, focus management.
