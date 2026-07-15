# Semordle

A daily browser word game that combines Semantle-style semantic guessing with a Wordle-style unlock challenge. Bilingual (EN/FR), rendered as a full-screen 3D semantic radar (Three.js).

---

## How to run locally

```bash
cd "semordle v01"
python -m http.server 8081
# then open http://localhost:8081
```

> **Why a server?** The game fetches JSON puzzle files via `fetch()`, which requires HTTP. Opening `index.html` directly as a `file://` URL will cause CORS errors.

---

## How to play

1. Type a word semantically related to the hidden secret word and press **Guess**.
2. Each guess appears as a glowing dot on the 3D radar — the closer to the center, the closer in meaning. Reference rings mark the top 10 / 100 / 500 / 1000 neighbors. The left panel lists all your guesses sorted by rank.
3. Inflected forms are folded onto their lemma automatically (*chevaux* counts as *cheval*, *mice* as *mouse*).
4. Open the **▲ Wordle** tab for a Wordle-style challenge: winning adds a strong clue word to your history.
5. Find the secret word to win!

---

## Generating puzzles

### One-time setup

```bash
pip install numpy

# Word2vec models (~630 MB total, kept out of git in models/)
mkdir -p models
curl -L -o models/frWac_500_skip_cut100.bin \
  "http://embeddings.net/embeddings/frWac_no_postag_no_phrase_500_skip_cut100.bin"
curl -L -o models/GoogleNews-slim.bin.gz \
  "https://github.com/eyaler/word2vec-slim/raw/master/GoogleNews-vectors-negative300-SLIM.bin.gz"
gunzip models/GoogleNews-slim.bin.gz
```

### Generate

```bash
# Upcoming puzzles from the schedule (skips existing files; --force regenerates)
python generate_puzzle.py --schedule schedule.csv --days-ahead 10

# A single puzzle
python generate_puzzle.py --lang fr --word tonnerre --date 2026-07-15 --number 193
```

`schedule.csv` format (header required): `date,lang,word,number`. The secret word must exist in the language's word2vec model — the script fails loudly otherwise. Avoid reusing an upcoming word in the same language, and never schedule direct EN/FR translations on the same date.

A GitHub Actions cron (`.github/workflows/generate-puzzles.yml`) runs every Monday and generates the next 10 days automatically (models are cached between runs).

### Why word2vec (and not sentence-transformers)?

Sentence-embedding models are built for sentences; on isolated words they lean on shared subword tokens, so the "closest" words are spelled alike, not related in meaning (*tonnerre* → *tondre*, *tonique*). Static word2vec models capture distributional semantics (*tonnerre* → *orage*, *éclair*, *foudre*) — the same approach as [Cémantix](https://cemantix.certitudes.org/). FR uses the frWaC model (Fauconnier), EN uses a slimmed GoogleNews model.

### Rebuilding vocabularies (rarely needed)

Puzzle candidates come from clean lemma lists in `vocab/` — no proper nouns, plurals, conjugated forms, misspellings, or foreign words:

- **FR**: NOM/ADJ/VER/ADV lemmas from [Lexique 3.83](http://www.lexique.org) intersected with the frWaC model (~23k lemmas), plus a form→lemma map (`fr_forms.json`) served to the browser.
- **EN**: model vocabulary filtered through WordNet base forms (30k lemmas), inflections generated with lemminflect (`en_forms.json`).

```bash
pip install numpy nltk lemminflect
python -c "import nltk; nltk.download('wordnet')"
curl -L -o models/Lexique383.tsv "http://www.lexique.org/databases/Lexique383/Lexique383.tsv"
python build_vocab.py
```

---

## File structure

```
index.html            Main game page (no logic)
style.css             All styles
game.js               All game logic (vanilla JS module + Three.js via CDN importmap)
w2v.py                Minimal word2vec .bin loader (numpy only, no gensim)
build_vocab.py        Builds vocab/*_lemmas.txt and vocab/*_forms.json
generate_puzzle.py    Puzzle JSON generator (word2vec)
schedule.csv          Word schedule (date,lang,word,number)
models/               word2vec models + Lexique (gitignored, ~630 MB)
vocab/                Clean lemma lists + form→lemma maps (committed)
data/{en,fr}/         Daily puzzle JSON files
```

---

## Technical notes

- **Pure vanilla JS**, no build step; Three.js r158 loaded via CDN importmap.
- **Local storage**: progress saved per puzzle under `semordle:{lang}:{YYYY-MM-DD}`.
- **3D radar**: dot distance from center is driven by the *similarity score* (not rank), so spacing is semantically consistent; reference rings use the same mapping.
- **Responsive**: left guess panel collapses by default under 880px.
- **Security note**: the secret word is stored in plain text in the served JSON. Fine for a hobby game; a production deployment should validate guesses server-side.
