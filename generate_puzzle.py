#!/usr/bin/env python3
"""
generate_puzzle.py – Semordle puzzle generator using real semantic embeddings.

SETUP
─────
  pip install sentence-transformers torch

  The first run downloads the model (~90 MB). It is cached locally afterward.

USAGE
─────
  # Generate a single puzzle
  python generate_puzzle.py --lang en --word forest --date 2026-06-05 --number 153

  # Generate a French puzzle
  python generate_puzzle.py --lang fr --word forêt --date 2026-06-05 --number 153

  # Generate multiple puzzles from a schedule file
  python generate_puzzle.py --schedule schedule.csv

  # Override output directory (default: data/<lang>/)
  python generate_puzzle.py --lang en --word river --date 2026-06-06 --number 154 --outdir data/en

SCHEDULE FILE FORMAT (CSV, no header)
──────────────────────────────────────
  date,lang,word,number
  2026-06-05,en,forest,153
  2026-06-05,fr,forêt,153
  2026-06-06,en,river,154
  2026-06-06,fr,rivière,154

MODEL
─────
  Uses "paraphrase-multilingual-MiniLM-L12-v2" by default.
  This single model handles both English and French (and 50+ other languages).
  For higher quality at the cost of speed, use "paraphrase-multilingual-mpnet-base-v2".

VOCABULARY
──────────
  The script scores the secret word against a vocabulary of common words.
  Default vocab files expected at:
    vocab/en.txt  – one English word per line
    vocab/fr.txt  – one French word per line

  If vocab files are absent, a small built-in fallback vocab is used (demo only).
  You can find good word lists at:
    EN: https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt
    FR: https://www.lexique.org  (Lexique383)

OUTPUT
──────
  data/<lang>/YYYY-MM-DD.json  (or --outdir)

  {
    "date": "2026-06-05",
    "puzzleNumber": 153,
    "lang": "en",
    "secret": "forest",
    "wordLength": 6,
    "hints": { "top1": 0.812, "top10": 0.671, "top1000": 0.134 },
    "words": [ { "word": "wood", "score": 0.812, "rank": 1 }, ... ]
  }

SECURITY NOTE
─────────────
  The secret word is included in the JSON served to the browser.
  For a public game, move secret validation to a server-side API.
"""

import json
import os
import csv
import argparse
import sys
from datetime import datetime
from pathlib import Path

# Fix SSL certificate verification on Windows corporate machines
try:
    import certifi
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

# ── Built-in fallback vocabularies (demo only, ~50 words each) ───────────────

FALLBACK_VOCAB = {
    "en": [
        "forest","wood","tree","jungle","nature","leaf","branch","bark","root",
        "soil","grass","flower","river","lake","mountain","hill","valley","cave",
        "animal","bird","deer","wolf","bear","fox","rabbit","snake","insect",
        "mushroom","moss","fern","trail","path","camp","hike","wild","green",
        "shade","canopy","trunk","seed","acorn","pine","oak","maple","cedar",
        "ocean","sea","wave","beach","coast","island","rain","sun","wind","cloud",
        "market","trade","shop","store","price","buy","sell","economy","commerce",
        "city","town","street","road","bridge","house","home","door","window",
        "book","word","language","music","art","science","history","culture",
    ],
    "fr": [
        "forêt","bois","arbre","jungle","nature","feuille","branche","écorce",
        "racine","sol","herbe","fleur","rivière","lac","montagne","colline",
        "vallée","grotte","animal","oiseau","cerf","loup","ours","renard",
        "lapin","serpent","insecte","champignon","mousse","fougère","sentier",
        "chemin","camp","randonnée","sauvage","vert","ombre","canopée","tronc",
        "graine","gland","pin","chêne","érable","cèdre","océan","mer","vague",
        "plage","côte","île","pluie","soleil","vent","nuage","marché","commerce",
        "boutique","magasin","prix","acheter","vendre","économie","ville","rue",
        "route","pont","maison","porte","fenêtre","livre","mot","langue","musique",
    ],
}

# ── Vocabulary loader ─────────────────────────────────────────────────────────

def load_vocab(lang: str, secret: str, min_len: int = 3, max_len: int = 12) -> list[str]:
    """Load vocabulary from vocab/<lang>_freq.txt (preferred) or vocab/<lang>.txt."""
    secret_lower = secret.lower()

    # Prefer frequency-ranked list (better quality, fewer obscure words)
    for fname in [f"{lang}_freq.txt", f"{lang}.txt"]:
        vocab_path = Path("vocab") / fname
        if vocab_path.exists():
            print(f"Loading vocab from {vocab_path} …")
            with open(vocab_path, encoding="utf-8") as f:
                words = [w.strip().lower() for w in f if w.strip()]
            break
    else:
        print(f"[WARN] No vocab file found for '{lang}' — using built-in fallback.")
        words = FALLBACK_VOCAB.get(lang, FALLBACK_VOCAB["en"])

    # Length filter
    words = [w for w in words if min_len <= len(w) <= max_len]

    # Character filter: allow letters and accented chars
    words = [w for w in words if all(c.isalpha() or c in "àâäéèêëîïôùûüÿçæœ" for c in w)]

    # Remove secret itself and any word that starts with the same 4+ chars
    # (removes obvious morphological variants like market→markets, marché→marchés)
    prefix_len = max(4, len(secret_lower) - 1)
    secret_prefix = secret_lower[:prefix_len]
    words = [w for w in words if not w.startswith(secret_prefix)]

    # Deduplicate preserving order
    words = list(dict.fromkeys(words))

    print(f"  {len(words):,} words after filtering.")
    return words

def _has_accents(word: str) -> bool:
    return all(c.isalpha() or c in "àâäéèêëîïôùûüÿçæœ" for c in word)

# ── Embedding model ───────────────────────────────────────────────────────────

_model_cache = {}

def get_model(model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
    if model_name not in _model_cache:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            print("ERROR: sentence-transformers not installed.")
            print("       Run: pip install sentence-transformers torch")
            sys.exit(1)
        print(f"Loading model '{model_name}' (downloaded on first run) …")
        _model_cache[model_name] = SentenceTransformer(model_name)
        print("  Model ready.")
    return _model_cache[model_name]

# ── Cosine similarity ─────────────────────────────────────────────────────────

def cosine_similarity(a, b):
    import numpy as np
    a, b = np.array(a), np.array(b)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0

# ── Core puzzle generator ─────────────────────────────────────────────────────

def generate_puzzle(
    secret: str,
    lang: str,
    date: str,
    puzzle_number: int,
    topn: int = 1000,
    model_name: str = "paraphrase-multilingual-MiniLM-L12-v2",
) -> dict:
    import numpy as np

    model = get_model(model_name)
    secret_lower = secret.lower()
    vocab = load_vocab(lang, secret_lower)

    print(f"Encoding secret word '{secret}' …")
    secret_vec = model.encode(secret, normalize_embeddings=True)

    print(f"Encoding {len(vocab):,} vocabulary words (this may take a minute) …")
    BATCH = 512
    all_vecs = []
    for i in range(0, len(vocab), BATCH):
        batch = vocab[i:i+BATCH]
        vecs = model.encode(batch, normalize_embeddings=True, show_progress_bar=False)
        all_vecs.append(vecs)
        if (i // BATCH) % 10 == 0:
            pct = min(100, int((i + BATCH) / len(vocab) * 100))
            print(f"  {pct}%", end="\r", flush=True)

    all_vecs = np.vstack(all_vecs)
    print("  100% — done.")

    # Cosine similarities (dot product of normalized vectors)
    scores = all_vecs @ secret_vec  # shape: (vocab_size,)

    # Sort descending — all words ranked
    ranked_indices = scores.argsort()[::-1]

    # Top-N get a rank number; the rest get only a score (rank: null in JSON)
    words = []
    for position, idx in enumerate(ranked_indices):
        rank = position + 1
        entry = {
            "word": vocab[idx],
            "score": round(float(scores[idx]), 4),
        }
        if rank <= topn:
            entry["rank"] = rank
        words.append(entry)

    top1_score  = words[0]["score"]  if words else 0.0
    top10_score = words[9]["score"]  if len(words) >= 10 else (words[-1]["score"] if words else 0.0)
    top1k_score = words[topn - 1]["score"] if len(words) >= topn else (words[-1]["score"] if words else 0.0)

    return {
        "date": date,
        "puzzleNumber": puzzle_number,
        "lang": lang,
        "secret": secret_lower,
        "wordLength": len(secret),
        "hints": {
            "top1":    round(top1_score, 4),
            "top10":   round(top10_score, 4),
            "top1000": round(top1k_score, 4),
        },
        "words": words,
    }

# ── Output ────────────────────────────────────────────────────────────────────

def save_puzzle(puzzle: dict, outdir: str = None):
    lang = puzzle.get("lang", "en")
    date = puzzle["date"]
    directory = outdir or os.path.join("data", lang)
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, f"{date}.json")
    with open(path, "w", encoding="utf-8") as f:
        # Compact JSON — all-words file can be 1-2 MB, no need for pretty-print
        json.dump(puzzle, f, separators=(',', ':'), ensure_ascii=False)
    print(f"\nSaved: {path}")
    print(f"  Secret:      {puzzle['secret']}  ({puzzle['wordLength']} letters)")
    print(f"  Puzzle #:    {puzzle['puzzleNumber']}")
    print(f"  Words:       {len(puzzle['words'])}")
    print(f"  Top-1:       {puzzle['hints']['top1']}")
    print(f"  Top-10:      {puzzle['hints']['top10']}")
    print(f"  Top-1000:    {puzzle['hints']['top1000']}")

# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate Semordle puzzle JSON files with real semantic embeddings.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Single-puzzle mode
    parser.add_argument("--word",     help="Secret word")
    parser.add_argument("--lang",     default="en", choices=["en", "fr"], help="Language (default: en)")
    parser.add_argument("--date",     default=datetime.today().strftime("%Y-%m-%d"), help="Date (YYYY-MM-DD)")
    parser.add_argument("--number",   type=int, default=1, help="Puzzle number")

    # Batch mode
    parser.add_argument("--schedule", help="CSV file: date,lang,word,number")
    parser.add_argument("--days-ahead", type=int, default=None,
                        help="With --schedule: only generate puzzles whose date falls within "
                             "the next N days AND whose output file does not already exist.")

    # Options
    parser.add_argument("--topn",     type=int, default=1000, help="Number of neighbors (default 1000)")
    parser.add_argument("--model",    default="paraphrase-multilingual-MiniLM-L12-v2", help="sentence-transformers model name")
    parser.add_argument("--outdir",   default=None, help="Output directory (overrides default data/<lang>/)")

    args = parser.parse_args()

    if args.schedule:
        # Batch mode
        from datetime import timedelta
        with open(args.schedule, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if args.days_ahead is not None:
            today = datetime.today().date()
            cutoff = today + timedelta(days=args.days_ahead)
            filtered = []
            for row in rows:
                d = datetime.strptime(row["date"].strip(), "%Y-%m-%d").date()
                if d < today or d > cutoff:
                    continue
                outdir = args.outdir or os.path.join("data", row["lang"].strip())
                path = os.path.join(outdir, f"{row['date'].strip()}.json")
                if os.path.exists(path):
                    print(f"  Skipping {path} (already exists)")
                    continue
                filtered.append(row)
            rows = filtered

        print(f"Batch mode: {len(rows)} puzzles to generate.")
        for row in rows:
            puzzle = generate_puzzle(
                secret=row["word"].strip(),
                lang=row["lang"].strip(),
                date=row["date"].strip(),
                puzzle_number=int(row["number"]),
                topn=args.topn,
                model_name=args.model,
            )
            save_puzzle(puzzle, args.outdir)
    elif args.word:
        puzzle = generate_puzzle(
            secret=args.word,
            lang=args.lang,
            date=args.date,
            puzzle_number=args.number,
            topn=args.topn,
            model_name=args.model,
        )
        save_puzzle(puzzle, args.outdir)
    else:
        parser.print_help()
        print("\nERROR: Provide either --word or --schedule.")
        sys.exit(1)


if __name__ == "__main__":
    main()
