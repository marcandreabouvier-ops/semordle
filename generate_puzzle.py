#!/usr/bin/env python3
"""
generate_puzzle.py – Semordle puzzle generator using word2vec embeddings.

Uses static word2vec models (the same approach as Cémantix) instead of
sentence-transformer models: single-word similarity is distributional,
not orthographic, so neighbors of "tonnerre" are orage/éclair/foudre —
not tondre/tonique.

SETUP
─────
  pip install numpy
  Models (downloaded once, ~600 MB total, gitignored):
    models/frWac_500_skip_cut100.bin   FR — word2vec frWaC (Fauconnier)
      http://embeddings.net/embeddings/frWac_no_postag_no_phrase_500_skip_cut100.bin
    models/GoogleNews-slim.bin         EN — word2vec GoogleNews slim (300k words)
      https://github.com/eyaler/word2vec-slim
  Vocabularies (committed, rebuilt with build_vocab.py):
    vocab/fr_lemmas.txt  vocab/en_lemmas.txt

USAGE
─────
  # Single puzzle
  python generate_puzzle.py --lang fr --word tonnerre --date 2026-07-15 --number 193

  # All upcoming puzzles from the schedule
  python generate_puzzle.py --schedule schedule.csv --days-ahead 30

SCHEDULE FILE FORMAT (CSV with header)
──────────────────────────────────────
  date,lang,word,number
  2026-06-05,en,forest,153
  2026-06-05,fr,forêt,153

OUTPUT
──────
  data/<lang>/YYYY-MM-DD.json  (or --outdir)

  {
    "date": "2026-06-05",
    "puzzleNumber": 153,
    "lang": "en",
    "secret": "forest",
    "wordLength": 6,
    "hints": { "top1": 0.71, "top10": 0.55, "top1000": 0.21 },
    "words": [ { "word": "woodland", "score": 0.71, "rank": 1 }, ... ]
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
from datetime import datetime, timedelta
from pathlib import Path

from w2v import load_word2vec_bin

MODELS = {
    "fr": "models/frWac_500_skip_cut100.bin",
    "en": "models/GoogleNews-slim.bin",
}

_model_cache = {}


def get_model(lang: str, path_override: str = None):
    path = path_override or MODELS[lang]
    if path not in _model_cache:
        if not Path(path).exists():
            print(f"ERROR: model file not found: {path}")
            print("       See the SETUP section of this script's docstring for download URLs.")
            sys.exit(1)
        print(f"Loading model {path} …")
        _model_cache[path] = load_word2vec_bin(path)
        print(f"  {len(_model_cache[path].words):,} vectors ready.")
    return _model_cache[path]


def load_vocab(lang: str, secret: str, model) -> list[str]:
    """Load the clean lemma vocabulary, excluding the secret and its trivial variants."""
    vocab_path = Path("vocab") / f"{lang}_lemmas.txt"
    if not vocab_path.exists():
        print(f"ERROR: {vocab_path} not found — run: python build_vocab.py --lang {lang}")
        sys.exit(1)
    with open(vocab_path, encoding="utf-8") as f:
        words = [w.strip() for w in f if w.strip()]

    # Remove the secret and obvious morphological variants sharing a long prefix
    # (e.g. secret "marché" also removes "marchand"? no — prefix is len-1, so
    # only "marchés"-style variants; derivatives like "forestier" stay, which
    # is desirable: they are legitimate close neighbors).
    secret_lower = secret.lower()
    prefix = secret_lower[: max(4, len(secret_lower) - 1)]
    words = [w for w in words if w != secret_lower and not w.startswith(prefix)]

    # Safety: only keep words the model can score
    words = [w for w in words if w in model]
    return list(dict.fromkeys(words))


def generate_puzzle(secret: str, lang: str, date: str, puzzle_number: int,
                    topn: int = 1000, model_path: str = None) -> dict:
    model = get_model(lang, model_path)
    secret_lower = secret.lower()

    if secret_lower not in model:
        print(f"ERROR: secret word '{secret_lower}' is not in the {lang} model vocabulary.")
        print("       Pick another word in schedule.csv.")
        sys.exit(1)

    vocab = load_vocab(lang, secret_lower, model)
    print(f"Scoring '{secret_lower}' against {len(vocab):,} {lang} lemmas …")

    scores = model.similarities(secret_lower, vocab)
    ranked = scores.argsort()[::-1]

    words = []
    for position, idx in enumerate(ranked):
        entry = {"word": vocab[idx], "score": round(float(scores[idx]), 4)}
        if position < topn:
            entry["rank"] = position + 1
        words.append(entry)

    top1 = words[0]["score"] if words else 0.0
    top10 = words[9]["score"] if len(words) >= 10 else top1
    top1k = words[topn - 1]["score"] if len(words) >= topn else words[-1]["score"]

    return {
        "date": date,
        "puzzleNumber": puzzle_number,
        "lang": lang,
        "secret": secret_lower,
        "wordLength": len(secret_lower),
        "hints": {"top1": round(top1, 4), "top10": round(top10, 4), "top1000": round(top1k, 4)},
        "words": words,
    }


def save_puzzle(puzzle: dict, outdir: str = None):
    lang = puzzle.get("lang", "en")
    directory = outdir or os.path.join("data", lang)
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, f"{puzzle['date']}.json")
    with open(path, "w", encoding="utf-8") as f:
        # Compact JSON — all-words file is ~1 MB, no need for pretty-print
        json.dump(puzzle, f, separators=(",", ":"), ensure_ascii=False)
    top5 = ", ".join(w["word"] for w in puzzle["words"][:5])
    print(f"Saved: {path}")
    print(f"  Secret: {puzzle['secret']}  #{puzzle['puzzleNumber']}  top5: {top5}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate Semordle puzzle JSON files with word2vec embeddings.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Single-puzzle mode
    parser.add_argument("--word",   help="Secret word")
    parser.add_argument("--lang",   default="en", choices=["en", "fr"], help="Language (default: en)")
    parser.add_argument("--date",   default=datetime.today().strftime("%Y-%m-%d"), help="Date (YYYY-MM-DD)")
    parser.add_argument("--number", type=int, default=1, help="Puzzle number")

    # Batch mode
    parser.add_argument("--schedule", help="CSV file: date,lang,word,number")
    parser.add_argument("--days-ahead", type=int, default=None,
                        help="With --schedule: only generate puzzles whose date falls within "
                             "the next N days AND whose output file does not already exist.")
    parser.add_argument("--force", action="store_true",
                        help="With --schedule: regenerate even if the output file exists.")

    # Options
    parser.add_argument("--topn",   type=int, default=1000, help="Number of ranked neighbors (default 1000)")
    parser.add_argument("--model",  default=None, help="Override model .bin path for the selected language")
    parser.add_argument("--outdir", default=None, help="Output directory (overrides default data/<lang>/)")

    args = parser.parse_args()

    if args.schedule:
        with open(args.schedule, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))

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
                if os.path.exists(path) and not args.force:
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
                model_path=args.model,
            )
            save_puzzle(puzzle, args.outdir)
    elif args.word:
        puzzle = generate_puzzle(
            secret=args.word,
            lang=args.lang,
            date=args.date,
            puzzle_number=args.number,
            topn=args.topn,
            model_path=args.model,
        )
        save_puzzle(puzzle, args.outdir)
    else:
        parser.print_help()
        print("\nERROR: Provide either --word or --schedule.")
        sys.exit(1)


if __name__ == "__main__":
    main()
