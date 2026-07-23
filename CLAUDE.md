# Galexical (ex-Semordle) — Guide pour Claude

Jeu de mots sémantique quotidien (Semantle × Wordle), bilingue EN/FR, rebrandé
**Galexical** le 2026-07-18 (domaine : https://galexical.com). Déployé sur Netlify
(auto-deploy depuis GitHub `marcandreabouvier-ops/semordle` — le repo garde son
ancien nom). Stack vanilla JS/HTML/CSS + Three.js r158 (CDN importmap), aucun build step.

⚠️ Le préfixe localStorage reste `semordle:` — ne JAMAIS le renommer, ça effacerait
la progression de tous les joueurs.

## Design (redesign 2026-07-09, ajusté 2026-07-15/16)

Radar sémantique **3D plein écran** (Three.js). Fini le shell GameBoy rétro — tout l'ancien design system (shell aluminium, phosphor screen) a été supprimé du CSS.
- Sphère 3D navigable (OrbitControls), mots = dots lumineux ; anneaux de référence
  top 10/100/500/1000 DÉSACTIVÉS (flag `SHOW_RANK_RINGS` dans initThreeScene — jugés trop chargés)
- Cible centrale = **soleil blanc-doré animé** (pulse + shimmer emissive/halo) — blanc chaud
  volontairement HORS du dégradé de température pour ne pas confondre avec les mots ambrés ~top 100
- **Éparpillement dramatique** : top 10 collé au centre (r 14-30), zone de jeu 30-130, mots froids 130-240, inconnus 250
- **Recentrage caméra** : à chaque guess la caméra glisse (flyToDot) pour amener le nouveau dot au premier plan, ~un peu sous le centre écran ; annulé si l'utilisateur drag ; auto-rotation en pause 7 s
- **Panneau gauche** ouvert/fermé par une **languette verticale « Parcours »** (même design que la languette Wordle) ; séparation nette entre « dernière proposition » et la liste « Classement » ; replié par défaut sur mobile ≤880px, état persisté dans `localStorage['semordle:panel']`
- Input bar fixée en bas (glass effect)
- **3 mots** (ex-Suggestions) : languette ▲ 3 mots / ▲ 3 words (violet #c084fc) à
  DROITE de Wordle (Wordle décalée à gauche, les deux centrées en paire). Carte
  flottante au-dessus des languettes : 3 mots « dispersés » (`pickSuggestions` — un
  par bande égale sur la plage éligible = tiède/moyen/lointain), toujours STRICTEMENT
  plus loin que bestRank (floor = bestRank || 100) et non déjà joués → ne peuvent
  JAMAIS faire gagner (le secret n'est pas dans puzzle.words). Cliquables : auto-submit
  puis SEUL le mot cliqué est remplacé (pickOneSuggestion) ; pour tout renouveler on
  ferme/rouvre. Pas de bouton reroll. Fermeture ✕ / clic-extérieur (composedPath) / switch langue.
- Wordle : overlay = **carte flottante** (coins arrondis 20px, ombre, marges — comme le
  panneau « 3 mots »). La grille se dimensionne via `--word-len` + `--rows` (inline) et un
  budget hauteur en `dvh` (`/ var(--rows) * var(--word-len)`), clavier compressé
  (`@media max-height 760/600px`) → grille + clavier tiennent TOUJOURS sans scroll.
  **Cibles > 8 lettres = +1 ligne bonus** (`wordleMaxAttempts` : 6 essais, 7 si >8 lettres,
  stocké dans `wordleState.maxAttempts`). Le joueur peut taper n'importe quelles lettres
  (pas de validation « mot réel » — choix assumé).
- Top bar : passe sur 2 lignes sous 640px (sinon le switch EN/FR déborde de l'écran)
- **Clavier mobile** : la scène 3D reste visible quand le clavier virtuel s'ouvre —
  Android via `interactive-widget=resizes-content` (meta viewport) + `resize3D()` ;
  iOS via `setupViewportKeyboardFix()` (API visualViewport : le stage 3D et l'input bar
  sont recalés sur la zone visible au-dessus du clavier, classe `kb-open` sur body)
- CSS2DRenderer pour labels crisp (HTML au-dessus du WebGL)
- **Pas de sons** (retirés le 2026-07-16 — ne pas les réintroduire)

## Lancer localement

```bash
cd "semordle v01"
python -m http.server 8081
# → http://localhost:8081
```

(Config preview Claude Code : `semordle-v01` dans `.claude/launch.json` du projet parent.)

## Structure des fichiers clés

```
semordle v01/
├── index.html              # Markup complet — ne contient pas de logique
├── style.css               # Tous les styles (~970 lignes)
├── game.js                 # Toute la logique (~2100 lignes, vanilla JS module)
├── w2v.py                  # Loader word2vec .bin minimal (numpy, sans gensim)
├── build_vocab.py          # Construit vocab/*_lemmas.txt + *_forms.json
├── generate_puzzle.py      # Génère les fichiers JSON de puzzle (word2vec)
├── schedule.csv            # Planning des mots (date,lang,word,number)
├── models/                 # Modèles word2vec + Lexique (gitignoré, ~630 MB)
├── data/
│   ├── en/YYYY-MM-DD.json  # Puzzles anglais
│   └── fr/YYYY-MM-DD.json  # Puzzles français
├── vocab/
│   ├── {en,fr}_lemmas.txt  # Lemmes propres, triés par fréquence (candidats puzzle)
│   └── {en,fr}_forms.json  # Mapping forme fléchie → lemme (servi au navigateur)
└── .github/workflows/
    └── generate-puzzles.yml  # Cron GitHub Actions (génération auto, modèles en cache)
```

## Pipeline de génération (refonte 2026-07-15)

**Modèles = word2vec statiques** (même approche que Cémantix). Les modèles de phrases
type sentence-transformers sont INADAPTÉS aux mots isolés : ils donnent des voisins
orthographiques (« tonnerre » → tondre, tonique) au lieu de sémantiques (orage, foudre).
Ne pas revenir en arrière là-dessus.

- FR : `models/frWac_500_skip_cut100.bin` — word2vec frWaC (J.-P. Fauconnier), la source de Cémantix
  http://embeddings.net/embeddings/frWac_no_postag_no_phrase_500_skip_cut100.bin
- EN : `models/GoogleNews-slim.bin` — word2vec GoogleNews slim 300k mots (eyaler/word2vec-slim)
- Chargés par `w2v.py` (parser .bin maison, pas de gensim — incompatible Python 3.13)

**Vocabulaire = lemmes propres uniquement** (pas de pluriels/conjugués/noms propres/fautes) :
- FR : lemmes NOM/ADJ/VER/ADV de Lexique 3.83 (`models/Lexique383.tsv`,
  http://www.lexique.org/databases/Lexique383/Lexique383.tsv), fréquence ≥ 0.25/million,
  intersectés avec le modèle → ~23k lemmes
- EN : vocab du modèle (trié par fréquence) filtré par WordNet (`wn.morphy(w) == w`) → 30k lemmes
- Rebuild : `python build_vocab.py` (deps : `pip install numpy nltk lemminflect` + corpus wordnet)

**Mapping forme→lemme côté jeu** : `vocab/{lang}_forms.json`, chargé par `loadFormsMap()`
au init. `submitSemanticGuess()` replie « chevaux » sur « cheval » (message « compté comme »),
y compris pour la victoire (taper une flexion du secret gagne). Sans ce fichier le jeu
fonctionne mais les formes fléchies sortent « froides ».

```bash
# Générer les N prochains jours depuis le schedule (--force pour régénérer l'existant)
python generate_puzzle.py --schedule schedule.csv --days-ahead 10

# Générer un mot spécifique
python generate_puzzle.py --word miroir --lang fr --date 2026-07-07 --number 185
```

Temps : ~5 s par puzzle (chargement modèle amorti en batch). Sortie dans `data/{lang}/`.
Le mot secret DOIT exister dans le modèle (le script échoue sinon) — vérifier avant
d'ajouter un mot au schedule.

## Architecture game.js

### Constantes importantes

```js
const TEMP = { SCORCH: 1-100 🔥, HOT: 101-500 ☀, WARM: 501-1000 🌤, COLD: 1001+ ❄ };
function rankToColor(rank)  // dégradé continu ; bout froid = #6b8fc2 (lisible sur fond sombre)
const I18N = { en: {...}, fr: {...} }  // toutes les strings UI ; t(key, ...args)
```

### Flux principal

1. `init()` → `loadFormsMap()` + `loadPuzzle()` → charge `data/{lang}/{date}.json` avec fallback -30 jours
2. `applyI18n()` → met à jour tous les textes statiques du DOM
3. `restoreState()` → recharge la partie en cours depuis localStorage
4. Guess soumis → `submitSemanticGuess()` (repli lemme) → `renderGuessCard()` → `addDotToScene()`
5. Mot hors vocabulaire (rank & score null) → carte « ❓ Mot inconnu », message d'erreur,
   JAMAIS de dot sur le radar (early return dans addDotToScene)

### Fonctions clés

| Fonction | Rôle |
|---|---|
| `scoreToRadius(score, rank)` | **Distance radiale basée sur le SCORE**, ancrée sur les hints : ≥top10 → r 14-30 ; top1000..top10 → 30-130 (pow 0.8) ; plus froid → 130-240 ; inconnu → 250 |
| `wordToSpherePosition(word, rank, score)` | Position 3D : rayon via scoreToRadius, angles par hash du mot |
| `flyToDot(pos)` | Anime la caméra (lerp sphérique + easeInOutCubic) : le dot atterrit AU-DESSUS du centre écran (phi cible +0.30 — lisible sur mobile), avec zoom adaptatif clamp(r×2.2+90, 110, 460) pour le mettre au premier plan |
| `updateJourneyCount()` | Compteur « N propositions » dans l'en-tête du panneau (i18n guessCountLabel) |
| `openStatsModal()` / `computePlayerStats()` | Modal 📊 : stats PERSO calculées depuis le localStorage (par langue) + mot d'hier (fetch du JSON de la veille). PAS de stats globales — site statique, il faudrait une Netlify Function (idée en attente) |
| `addDotToScene(entry)` | Dot + glow sprite + label CSS2D, highlight du dernier guess, déclenche flyToDot |
| `initThreeScene()` | Scène, caméra (vue plongeante 0,150,420), étoiles rondes additives (texture glow), anneaux derrière `SHOW_RANK_RINGS=false` |
| `renderGuessCard(entry)` | Carte de guess insérée triée par rang dans `#guess-list` + appelle `updateLastGuessSection` |
| `setupGuessPanel()` | Repli/dépli du panneau gauche via la languette `#guess-panel-handle` |
| `toLemma(word)` / `loadFormsMap()` | Repli forme fléchie → lemme |
| `handleWin(word)` | Victoire : win entry + `updateShareSection()` + fireworks + toast (pas de popup) |
| `launchFireworks()` / `startAmbientFireworks()` | Feux d'artifice en 2 actes : grosse salve à la victoire, puis show ambiant discret continu (petites salves toutes les 1,5-3,5 s ; aussi relancé au retour sur un puzzle résolu ; respecte prefers-reduced-motion) |
| `setupLangSwitcher()` | Switch EN/FR par ré-init EN PLACE (pas de reload page !) : reset DOM + clearScene + init(). Tout état global (timers, canvas, animations) doit être nettoyé dans restoreState() |

### État persisté (localStorage)

Clé : `semordle:{lang}:{YYYY-MM-DD}` → `{ semanticGuesses, solved, solvedAt, stats, unlocks }`
Autres clés : `semordle:lang`, `semordle:panel`, `semordle:profile`.
⚠️ Le `wordleState` (défi en cours) n'est PAS persisté — un reload le perd (amélioration possible).

### Profil global (skins/jetons) — `semordle:profile`

GLOBAL (cross-date, cross-langue) : `{ tokens, unlocked: [ids], equipped: id }`. 1 « poussière d'étoile » (stardust ✦)
par victoire (`grantStardust(1)` dans `handleWin`, une seule fois par solve). Au 1er chargement, le profil
est amorcé avec autant de jetons que de puzzles déjà résolus sur l'appareil (`countPastWins`).
`STAR_SKINS` = étoiles réelles (Soleil/Polaris/Véga/Arcturus/Antarès/Bételgeuse/Sirius) avec vraies couleurs +
prix croissants. **Chaque skin porte aussi des paramètres d'effet** (glowScale, glowOp, pulseSpeed, pulseAmp,
twinkle) — la richesse visuelle monte avec la rareté : Véga = halo net et serré, Bételgeuse = couronne
immense à pulsation lente, **Sirius = scintillement (twinkle) + gros halo brillant**. (Les aigrettes de
diffraction ont été retirées le 2026-07-22, jugées too much.) Le skin équipé colore ET anime le soleil
central via `resetTarget()` (couleur/emissive/glow/label + `_sunFx` lu par la boucle animate) — hook
« apparence live » appelé à chaque chargement de puzzle. Les orbes de la modale rejouent ces effets en CSS
(pulsation `orb-pulse`, halo via `--glow`, `.fx-twinkle`) pour prévisualiser avant achat. Sur victoire, le soleil **ne passe plus au vert** : il garde la couleur de son skin et fait une
**supernova** (`_sunWon`/`_sunBloom`/`_sunFlash` lus par la boucle animate → bloom + éclat + aigrettes
de victoire pour TOUTES les étoiles, dans leur propre couleur). Le label du mot secret + « #1 » prend
la classe `.dot-label--won` (plus gros/gras/glow + pop). `resetTarget()` remet ces flags à zéro au puzzle suivant. Accès : **clic sur le soleil** (`setupSunClick` → projette
l'origine à l'écran, teste la proximité du pointeur ; ignore les drags OrbitControls) → modale `#stars-modal`
(achat/équipement). Pas d'icône top-bar ajoutée.

### Affichage des rangs

`displayRank(rank) = rank + 1` : le mot SECRET est affiché **#1**, son voisin le plus
proche **#2**. Les rangs internes (fichiers data, bandes TEMP, bestRank, tri, localStorage)
restent 0-décalés (voisin le plus proche = rank 1). N'appliquer le décalage QU'À l'affichage.

### Wordle — règles spécifiques

- Comparaison **insensible aux accents** : `deaccent()` replie guess ET cible
  (« séjour » se joue « SEJOUR », le E compte pour É). L'écran de fin révèle le mot accentué.
- Le handler « clic hors overlay → ferme » utilise `e.composedPath()` (PAS `contains(e.target)`) :
  les boutons internes qui re-render l'overlay (ENTER du clavier virtuel, « Autre wordle »)
  détachent la cible du DOM avant l'exécution du handler document.

## HTML — éléments importants

| ID | Rôle |
|---|---|
| `#guess-panel` | Panneau gauche (`.collapsed` = replié) |
| `#guess-panel-handle` | Languette verticale « Parcours » qui ouvre/ferme le panneau |
| `#ranked-title` | Caption « Classement » au-dessus de `#guess-list` |
| `#last-guess-section` | Encart "Last Guess" (classe `hidden` jusqu'au 1er guess) |
| `#share-section` | Encart partage — `display:none` inline, affiché par `updateShareSection()` après victoire |
| `#guess-list` | Liste scrollable des cartes de guess |
| `#win-modal` | Présent dans le DOM mais jamais affiché — ne pas supprimer, `applyI18n()` y écrit |

> ⚠️ `#share-section` est positionné **avant** `#guess-list` dans le panneau. Ne pas le déplacer après.

## Puzzles — format JSON

```json
{
  "date": "2026-07-15", "puzzleNumber": 193, "lang": "fr",
  "secret": "tonnerre", "wordLength": 8,
  "hints": { "top1": 0.5178, "top10": 0.4314, "top1000": 0.2585 },
  "words": [ { "word": "orage", "score": 0.5178, "rank": 1 }, ... ]
}
```

`words` = TOUT le vocabulaire trié par score décroissant (~23-30k entrées, ~1 MB) ;
seuls les 1000 premiers ont un champ `rank`. `lookupWord()` reconstitue le rang des
autres via leur position.

## Schedule — règles importantes

- EN et FR ont des mots **intentionnellement différents** (décalage de 5 positions).
  Ne jamais remettre des traductions directes EN/FR sur la même date.
- Pas de doublons de mots à venir dans une même langue (vérifier avant d'ajouter).
- Le mot doit exister dans le modèle word2vec de sa langue.

## Déploiement GitHub Pages

Repo : `marcandreabouvier-ops/semordle`
Push depuis laptop perso (réseau corporate bloque git) :

```bash
gh auth login
git push -u origin master
```

Settings → Pages → Deploy from branch → `master` → `/ (root)`
URL : `https://marcandreabouvier-ops.github.io/semordle`

Le cron `.github/workflows/generate-puzzles.yml` génère les puzzles chaque lundi
(modèles word2vec téléchargés au premier run puis mis en cache actions/cache).
