#!/usr/bin/env python3
"""
generate_data.py – Semordle puzzle data generator

This script generates the daily JSON puzzle files used by the Semordle game.

── REQUIREMENTS ────────────────────────────────────────────────────────────────

For REAL semantic data you need word embeddings. The recommended approach:

  Option A: gensim + Word2Vec or FastText pretrained model
    pip install gensim
    Download a pretrained model, e.g.:
      - Google News Word2Vec: https://code.google.com/archive/p/word2vec/
      - FastText English: https://fasttext.cc/docs/en/english-vectors.html

  Option B: sentence-transformers (higher quality, slower)
    pip install sentence-transformers
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')

  Option C: Use the OpenAI embeddings API (requires API key)
    pip install openai
    Use model="text-embedding-3-small"

For the MVP, this script provides a mock generator using pre-defined word lists.

── USAGE ────────────────────────────────────────────────────────────────────────

  # Generate mock data for testing
  python generate_data.py --mock --word market --date 2026-06-03 --number 152

  # Generate with gensim (after installing and downloading a model)
  python generate_data.py --gensim --model /path/to/GoogleNews-vectors.bin \\
      --word market --date 2026-06-03 --number 152

  # Output path (defaults to data/YYYY-MM-DD.json)
  python generate_data.py --mock --word ocean --date 2026-01-01 --number 1 \\
      --out data/sample.json

── OUTPUT FORMAT ────────────────────────────────────────────────────────────────

{
  "date": "2026-06-03",
  "puzzleNumber": 152,
  "secret": "market",
  "wordLength": 6,
  "hints": {
    "top1": 0.7812,    <- cosine similarity of closest word
    "top10": 0.6523,   <- cosine similarity of 10th closest word
    "top1000": 0.1045  <- cosine similarity of 1000th closest word
  },
  "words": [
    { "word": "commerce", "score": 0.7812, "rank": 1 },
    ...
  ]
}

⚠  SECURITY NOTE: The secret word is stored in the JSON file.
   This is fine for a local/personal game but NOT secure for production.
   For production, move secret-word validation to a server-side API
   and only serve the words/hints to the client.

────────────────────────────────────────────────────────────────────────────────
"""

import json
import os
import argparse
import random
from datetime import datetime


# ── Mock word lists ──────────────────────────────────────────────────────────
# These are hand-crafted semantic neighbors for testing.
# Replace with real embeddings for production.

MOCK_NEIGHBORS = {
    "market": [
        "commerce", "trade", "economy", "bazaar", "marketplace",
        "vendor", "retail", "wholesale", "merchandize", "exchange",
        "store", "shop", "buyer", "seller", "price", "sales", "profit",
        "demand", "supply", "goods", "product", "service", "customer",
        "business", "capital", "finance", "invest", "stock", "fund", "bond",
        "share", "asset", "wealth", "growth", "sector", "industry", "company",
        "firm", "brand", "consumer", "purchase", "auction", "fair", "stall",
        "booth", "cart", "cashier", "receipt", "discount", "coupon",
    ],
    "ocean": [
        "sea", "water", "wave", "marine", "deep", "tide", "coast", "beach",
        "shore", "bay", "reef", "coral", "fish", "shark", "whale", "dolphin",
        "swim", "sail", "ship", "boat", "island", "tropical", "pacific",
        "atlantic", "blue", "vast", "salty", "current", "depth", "floor",
        "pressure", "submarine", "dive", "surf", "spray", "foam", "seabed",
        "horizon", "voyage", "explorer",
    ],
}


def mock_cosine_similarity(rank: int, total: int = 1000,
                           top_score: float = 0.82,
                           bottom_score: float = 0.11) -> float:
    """
    Fake a monotonically decreasing cosine similarity score
    from rank 1 (top_score) down to rank total (bottom_score).
    Uses a slightly non-linear curve to look more realistic.
    """
    if total <= 1:
        return top_score
    t = (rank - 1) / (total - 1)
    # Exponential decay curve: faster drop at start, slower at end
    score = top_score * ((bottom_score / top_score) ** t)
    return round(score, 4)


def generate_mock_puzzle(secret: str, date: str, puzzle_number: int,
                         top_score: float = None) -> dict:
    """
    Generate a puzzle JSON using the mock neighbor list.
    If the secret is not in MOCK_NEIGHBORS, generates random plausible-looking words.
    """
    neighbors = MOCK_NEIGHBORS.get(secret.lower())

    if not neighbors:
        # Generate random words as stand-in
        print(f"[WARN] No mock neighbors for '{secret}'. Generating synthetic data.")
        neighbors = [f"word{i:03d}" for i in range(1, 51)]

    if top_score is None:
        # Randomize slightly for realism
        top_score = round(random.uniform(0.76, 0.88), 4)

    bottom_score = round(random.uniform(0.10, 0.13), 4)

    words = []
    for rank, word in enumerate(neighbors, start=1):
        score = mock_cosine_similarity(rank, len(neighbors), top_score, bottom_score)
        words.append({
            "word": word,
            "score": score,
            "rank": rank,
        })

    top1_score  = words[0]["score"]  if words else top_score
    top10_score = words[9]["score"]  if len(words) >= 10 else words[-1]["score"]
    top1k_score = words[-1]["score"] if words else bottom_score

    return {
        "date": date,
        "puzzleNumber": puzzle_number,
        "secret": secret.lower(),
        "wordLength": len(secret),
        "hints": {
            "top1":    top1_score,
            "top10":   top10_score,
            "top1000": top1k_score,
        },
        "words": words,
    }


def generate_gensim_puzzle(secret: str, date: str, puzzle_number: int,
                           model_path: str, topn: int = 1000) -> dict:
    """
    Generate a puzzle JSON using a real gensim word2vec/fasttext model.

    Requirements:
      pip install gensim

    Args:
      secret:       The secret word (plain English)
      date:         Puzzle date string (YYYY-MM-DD)
      puzzle_number: Integer puzzle number
      model_path:   Path to a .bin or .vec word vector file
      topn:         Number of top neighbors to include (default 1000)
    """
    try:
        from gensim.models import KeyedVectors
    except ImportError:
        raise ImportError(
            "gensim is not installed. Run: pip install gensim"
        )

    print(f"Loading model from {model_path} …")
    # Try loading as binary first, then as text
    try:
        wv = KeyedVectors.load_word2vec_format(model_path, binary=True)
    except Exception:
        wv = KeyedVectors.load_word2vec_format(model_path, binary=False)

    if secret not in wv:
        raise ValueError(f"'{secret}' not found in model vocabulary.")

    # Get top N neighbors
    similar = wv.most_similar(secret, topn=topn)
    # similar = [(word, cosine_similarity), ...]

    words = []
    for rank, (word, score) in enumerate(similar, start=1):
        # Skip the secret itself if it appears
        if word.lower() == secret.lower():
            continue
        words.append({
            "word": word.lower(),
            "score": round(float(score), 4),
            "rank": rank,
        })

    top1_score  = words[0]["score"]  if words else 0.0
    top10_score = words[9]["score"]  if len(words) >= 10 else words[-1]["score"]
    top1k_score = words[-1]["score"] if words else 0.0

    return {
        "date": date,
        "puzzleNumber": puzzle_number,
        "secret": secret.lower(),
        "wordLength": len(secret),
        "hints": {
            "top1":    top1_score,
            "top10":   top10_score,
            "top1000": top1k_score,
        },
        "words": words,
    }


def save_puzzle(puzzle: dict, output_path: str):
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(puzzle, f, indent=2, ensure_ascii=False)
    print(f"Puzzle saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate Semordle puzzle JSON files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--word",   required=True,   help="Secret word for the puzzle")
    parser.add_argument("--date",   default=datetime.today().strftime("%Y-%m-%d"),
                        help="Puzzle date (YYYY-MM-DD). Defaults to today.")
    parser.add_argument("--number", type=int, default=1, help="Puzzle number")
    parser.add_argument("--out",    default=None,
                        help="Output JSON path. Defaults to data/YYYY-MM-DD.json")

    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument("--mock",   action="store_true", help="Use built-in mock data")
    mode_group.add_argument("--gensim", action="store_true", help="Use a gensim word2vec model")

    parser.add_argument("--model",  default=None,
                        help="Path to gensim model file (required with --gensim)")
    parser.add_argument("--topn",   type=int, default=1000,
                        help="Number of top neighbors (default 1000)")

    args = parser.parse_args()

    output_path = args.out or f"data/{args.date}.json"

    if args.mock:
        puzzle = generate_mock_puzzle(
            secret=args.word,
            date=args.date,
            puzzle_number=args.number,
        )
    elif args.gensim:
        if not args.model:
            parser.error("--model is required when using --gensim")
        puzzle = generate_gensim_puzzle(
            secret=args.word,
            date=args.date,
            puzzle_number=args.number,
            model_path=args.model,
            topn=args.topn,
        )
    else:
        parser.error("Specify --mock or --gensim")
        return

    save_puzzle(puzzle, output_path)

    print("\nPuzzle summary:")
    print(f"  Secret:        {puzzle['secret']}")
    print(f"  Date:          {puzzle['date']}")
    print(f"  Puzzle #:      {puzzle['puzzleNumber']}")
    print(f"  Word length:   {puzzle['wordLength']}")
    print(f"  Top-1 score:   {puzzle['hints']['top1']}")
    print(f"  Top-10 score:  {puzzle['hints']['top10']}")
    print(f"  Top-1000 score:{puzzle['hints']['top1000']}")
    print(f"  Words count:   {len(puzzle['words'])}")


if __name__ == "__main__":
    main()
