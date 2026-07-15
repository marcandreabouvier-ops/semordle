#!/usr/bin/env python3
"""build_vocab.py – Build clean lemma vocabularies + form→lemma maps for Semordle.

Produces (per language):
  vocab/fr_lemmas.txt   frequency-ordered clean lemmas (puzzle candidates)
  vocab/fr_forms.json   inflected form → lemma map (served to the browser)
  vocab/en_lemmas.txt
  vocab/en_forms.json

Sources:
  FR: Lexique 3.83 (models/Lexique383.tsv) — lemmas with POS + frequency.
      Kept: NOM / ADJ / VER / ADV lemmas, alpha-only, len 3-12,
      freq >= FR_MIN_FREQ (per million, films+books), present in frWaC model.
  EN: GoogleNews-slim model vocab (frequency-ordered) filtered through
      WordNet: keep only words WordNet knows as base forms (morphy(w) == w).

Both vocabularies are intersected with their word2vec model so every word
is scorable. Run AFTER downloading models (see README).

Usage:
  python build_vocab.py            # builds FR + EN
  python build_vocab.py --lang fr
"""

import argparse
import json
import unicodedata
from collections import defaultdict
from pathlib import Path

from w2v import load_word2vec_bin

VOCAB_LIMIT = 30000
FR_MIN_FREQ = 0.25          # per-million (films2 + livres lemma freq)
MIN_LEN, MAX_LEN = 3, 12
FR_MODEL = "models/frWac_500_skip_cut100.bin"
EN_MODEL = "models/GoogleNews-slim.bin"
LEXIQUE = "models/Lexique383.tsv"

FR_ALLOWED_CHARS = set("abcdefghijklmnopqrstuvwxyzàâäéèêëîïôöùûüÿçæœ")


def is_clean_fr(word: str) -> bool:
    return MIN_LEN <= len(word) <= MAX_LEN and all(c in FR_ALLOWED_CHARS for c in word)


def is_clean_en(word: str) -> bool:
    return MIN_LEN <= len(word) <= MAX_LEN and word.isascii() and word.isalpha() and word.islower()


# ── French: Lexique 3.83 ──────────────────────────────────────────────────────

def build_fr():
    print("=== FR ===")
    model = load_word2vec_bin(FR_MODEL)
    print(f"  model vocab: {len(model.words):,}")

    lemma_freq: dict[str, float] = {}     # lemma -> freq (lemma-level, per million)
    lemma_pos: dict[str, str] = {}
    form_candidates: list[tuple[str, str]] = []  # (form, lemma)

    keep_pos = {"NOM", "ADJ", "VER", "ADV"}
    with open(LEXIQUE, encoding="utf-8") as f:
        header = f.readline().rstrip("\n").split("\t")
        col = {name: i for i, name in enumerate(header)}
        for line in f:
            parts = line.rstrip("\n").split("\t")
            ortho, lemme, cgram = parts[col["ortho"]], parts[col["lemme"]], parts[col["cgram"]]
            if cgram not in keep_pos:
                continue
            try:
                freq = float(parts[col["freqlemfilms2"]] or 0) + float(parts[col["freqlemlivres"]] or 0)
            except ValueError:
                continue
            islem = parts[col["islem"]] == "1"
            if islem and is_clean_fr(lemme):
                # A lemma can appear under several POS; keep the highest freq
                if freq > lemma_freq.get(lemme, -1):
                    lemma_freq[lemme] = freq
                    lemma_pos[lemme] = cgram
            if ortho != lemme and is_clean_fr(ortho):
                form_candidates.append((ortho, lemme))

    print(f"  Lexique lemmas (NOM/ADJ/VER/ADV, clean): {len(lemma_freq):,}")

    # Filter: min freq + must be in the word2vec model
    vocab = [
        (lem, fr) for lem, fr in lemma_freq.items()
        if fr >= FR_MIN_FREQ and lem in model
    ]
    vocab.sort(key=lambda x: -x[1])
    vocab = vocab[:VOCAB_LIMIT]
    lemmas = [lem for lem, _ in vocab]
    lemma_set = set(lemmas)
    print(f"  final vocab (freq >= {FR_MIN_FREQ}, in model): {len(lemmas):,}")

    # Form → lemma map, restricted to vocab lemmas.
    # Ambiguous forms (e.g. "porte" -> porter/porte) resolve to the most frequent lemma.
    by_form: dict[str, list[str]] = defaultdict(list)
    for form, lemme in form_candidates:
        if lemme in lemma_set and form != lemme:
            by_form[form].append(lemme)
    forms = {}
    for form, lems in by_form.items():
        if form in lemma_set:
            continue  # the form is itself a vocab lemma — exact lookup wins
        forms[form] = max(set(lems), key=lambda l: lemma_freq[l])
    print(f"  form→lemma entries: {len(forms):,}")

    write_outputs("fr", lemmas, forms)


# ── English: GoogleNews vocab × WordNet ──────────────────────────────────────

def build_en():
    print("=== EN ===")
    from nltk.corpus import wordnet as wn
    from lemminflect import getAllInflections

    model = load_word2vec_bin(EN_MODEL)
    print(f"  model vocab: {len(model.words):,}")

    lemmas = []
    seen = set()
    for w in model.words:  # frequency-ordered
        if len(lemmas) >= VOCAB_LIMIT:
            break
        if not is_clean_en(w) or w in seen:
            continue
        seen.add(w)
        # Keep only words WordNet knows as a base form (drops names,
        # misspellings, foreign words, and inflected forms).
        base = wn.morphy(w)
        if base != w:
            continue
        lemmas.append(w)
    lemma_set = set(lemmas)
    print(f"  final vocab (clean, WordNet base forms): {len(lemmas):,}")

    # Form → lemma map: generate inflections for every vocab lemma.
    # Lemmas are processed in frequency order; first writer wins on conflicts.
    forms: dict[str, str] = {}
    for lem in lemmas:
        for tag_forms in getAllInflections(lem).values():
            for form in tag_forms:
                form = form.lower()
                if form != lem and form not in lemma_set and form not in forms:
                    forms[form] = lem
    print(f"  form→lemma entries: {len(forms):,}")

    write_outputs("en", lemmas, forms)


# ── Output ────────────────────────────────────────────────────────────────────

def write_outputs(lang: str, lemmas: list[str], forms: dict[str, str]):
    outdir = Path("vocab")
    outdir.mkdir(exist_ok=True)
    txt = outdir / f"{lang}_lemmas.txt"
    txt.write_text("\n".join(lemmas) + "\n", encoding="utf-8")
    js = outdir / f"{lang}_forms.json"
    with open(js, "w", encoding="utf-8") as f:
        json.dump(forms, f, separators=(",", ":"), ensure_ascii=False)
    print(f"  wrote {txt} ({txt.stat().st_size/1024:.0f} KB) and {js} ({js.stat().st_size/1024:.0f} KB)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["fr", "en"], help="Build only one language")
    args = ap.parse_args()
    if args.lang in (None, "fr"):
        build_fr()
    if args.lang in (None, "en"):
        build_en()


if __name__ == "__main__":
    main()
