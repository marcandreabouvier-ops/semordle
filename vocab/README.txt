Vocabulary files (built by build_vocab.py — do not edit by hand):

  fr_lemmas.txt   Clean French lemmas, frequency-ordered (puzzle candidates).
                  Source: Lexique 3.83 (NOM/ADJ/VER/ADV lemmas) ∩ frWaC word2vec model.
  fr_forms.json   Inflected form → lemma map served to the browser
                  (chevaux → cheval). Source: Lexique 3.83.
  en_lemmas.txt   Clean English lemmas, frequency-ordered.
                  Source: GoogleNews-slim model vocab filtered through WordNet base forms.
  en_forms.json   Inflected form → lemma map (mice → mouse).
                  Generated with lemminflect.

Rebuild: python build_vocab.py   (requires models/ — see README.md)
