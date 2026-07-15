"""Minimal word2vec binary format loader (no gensim dependency).

Loads the classic word2vec .bin format:
  header line: "<vocab_size> <dim>\n"
  then per word: "<word> " followed by dim float32 values (little-endian).
"""

import numpy as np


class Word2Vec:
    def __init__(self, words: list[str], vectors: np.ndarray):
        self.words = words
        self.vectors = vectors  # shape (n, dim), L2-normalized
        self.index = {w: i for i, w in enumerate(words)}

    def __contains__(self, word: str) -> bool:
        return word in self.index

    def vector(self, word: str) -> np.ndarray:
        return self.vectors[self.index[word]]

    def similarities(self, word: str, candidates: list[str]) -> np.ndarray:
        """Cosine similarity of `word` against each candidate (all must be in vocab)."""
        target = self.vector(word)
        idx = [self.index[c] for c in candidates]
        return self.vectors[idx] @ target


def load_word2vec_bin(path: str, max_words: int | None = None) -> Word2Vec:
    with open(path, "rb") as f:
        header = f.readline().decode("utf-8")
        vocab_size, dim = map(int, header.split())
        if max_words:
            vocab_size = min(vocab_size, max_words)

        words = []
        vectors = np.empty((vocab_size, dim), dtype=np.float32)
        vec_bytes = dim * 4

        for i in range(vocab_size):
            # Read word: bytes until space
            chars = []
            while True:
                ch = f.read(1)
                if ch == b" ":
                    break
                if ch == b"":
                    raise EOFError(f"Unexpected EOF at word {i}")
                if ch != b"\n":  # some files have a leading \n before words
                    chars.append(ch)
            word = b"".join(chars).decode("utf-8", errors="replace")
            vectors[i] = np.frombuffer(f.read(vec_bytes), dtype="<f4")
            words.append(word)

    # L2-normalize so dot product == cosine similarity
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors /= norms
    return Word2Vec(words, vectors)
