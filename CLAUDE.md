# Semordle — Guide pour Claude

Jeu de mots sémantique quotidien (Semantle × Wordle), bilingue EN/FR. Hébergé sur GitHub Pages. Stack vanilla JS/HTML/CSS + Three.js r158 (CDN importmap), aucun build step.

## Design (redesign 2026-07-09)

Radar sémantique **3D plein écran** (Three.js). Fini le shell GameBoy rétro.
- Sphère 3D navigable (OrbitControls), mots = dots lumineux sur la sphère
- Input bar fixée en bas (glass effect)
- Wordle : overlay slide-up (bouton ▲ Wordle)
- CSS2DRenderer pour labels crisp (HTML au-dessus du WebGL)
- `#guess-list`, `#share-section`, etc. existent dans le DOM mais sont **cachés** (`display:none` via `#hidden-dom`) — conservés pour la logique share/state

## Lancer localement

```bash
cd semordle
python -m http.server 8080
# → http://localhost:8080
```

## Structure des fichiers clés

```
semordle/
├── index.html              # Markup complet — ne contient pas de logique
├── style.css               # Tous les styles (1100+ lignes)
├── game.js                 # Toute la logique (~2400 lignes, vanilla JS)
├── generate_puzzle.py      # Génère les fichiers JSON de puzzle
├── schedule.csv            # Planning des mots (date,lang,word,number)
├── data/
│   ├── en/YYYY-MM-DD.json  # Puzzles anglais
│   └── fr/YYYY-MM-DD.json  # Puzzles français
├── vocab/
│   ├── en_freq.txt         # Vocabulaire anglais pour la génération
│   └── fr_freq.txt         # Vocabulaire français
└── .github/workflows/
    └── generate-puzzles.yml  # Cron GitHub Actions (génération auto)
```

## Architecture game.js

### Constantes importantes

```js
const TEMP = {
  SCORCH: { min: 1,    max: 100,  ... },  // 🔥 top 100
  HOT:    { min: 101,  max: 500,  ... },  // ☀ top 500
  WARM:   { min: 501,  max: 1000, ... },  // 🌤 top 1000
  COLD:   { min: 1001, max: Infinity },   // ❄ au-delà
};
```

```js
const I18N = { en: { ... }, fr: { ... } }  // toutes les strings UI
function t(key)  // récupère la string dans la langue courante
```

### Flux principal

1. `init()` → `loadPuzzle()` → charge `data/{lang}/{date}.json` avec fallback -30 jours
2. `applyI18n()` → met à jour tous les textes statiques du DOM
3. `restoreState()` → recharge la partie en cours depuis localStorage
4. Guess soumis → `submitSemanticGuess()` → `renderGuessCard()` → `updateLandscape()`

### Fonctions clés

| Fonction | Rôle |
|---|---|
| `renderGuessCard(entry)` | Crée une carte de guess et l'insère triée par rang |
| `updateLastGuessSection(card)` | Met à jour l'encart "Last Guess" au-dessus de la liste |
| `updateLandscape()` | Redessine le radar canvas (zones, dots, labels, target) |
| `rankToDist(rank, score)` | Convertit un rang en distance radiale (log scale) |
| `drawDot(ctx, x, y, temp, large, zoom, score, top1Score, isLatest)` | Dessine un dot sur le radar, avec anneau si `isLatest` |
| `getTemperature(rank)` | Retourne la bande TEMP pour un rang donné |
| `showWinModal()` | À la victoire : déclenche `updateShareSection()` (pas de popup) |
| `setupLangSwitcher()` | Gère le switch EN/FR avec reload complet |
| `applyI18n()` | Met à jour tous les textes du DOM selon `currentLang` |

### État persisté (localStorage)

Clé : `semordle:{YYYY-MM-DD}:{lang}`  
Contient : `{ semanticGuesses, solved, stats, wordleState }`

## HTML — éléments importants

| ID | Rôle |
|---|---|
| `#last-guess-section` | Encart "Last Guess" (caché jusqu'au 1er guess) |
| `#last-guess-container` | Contient le clone de la dernière carte |
| `#journey-title` | Titre "Your journey" / "Votre parcours" (mis à jour par applyI18n) |
| `#share-section` | Encart partage — affiché EN HAUT de la liste après victoire |
| `#guess-list` | Liste scrollable de toutes les cartes de guess |
| `#landscape-canvas` | Canvas du radar sémantique |
| `#win-modal` | Modal de victoire — présent dans le DOM mais jamais affiché |

> ⚠️ `#share-section` est positionné **avant** `#guess-list` dans le DOM. Ne pas le déplacer après.
> ⚠️ `#win-modal` existe dans le HTML mais `showWinModal()` ne l'ouvre plus — ne pas le supprimer car `applyI18n()` y écrit des textes.

## CSS — design system

Le shell est un appareil rétro aluminium brossé froid. Tokens principaux :

```css
--phosphor: #2dd4bf    /* vert LCD — couleur principale de l'écran */
--amber:    #f4a14a    /* ambre — accents, Wordle, unlock */
--screen-bg: #080e0b   /* fond de l'écran */
```

Classes shell : `.shell` → `.shell-grain` + `.shell-ridges` + `.shell-speaker`  
Tout ce qui est dans `.panel.main-panel` est "sur l'écran" (fond sombre, texte phosphor).

## Puzzles — format JSON

```json
{
  "date": "2026-07-07",
  "puzzleNumber": 185,
  "secret": "miroir",
  "wordLength": 6,
  "hints": { "top1": 0.82, "top10": 0.71, "top1000": 0.38 },
  "words": [
    { "word": "reflet", "score": 0.82, "rank": 1 },
    ...
  ]
}
```

`words` = top 1000 voisins sémantiques triés par score décroissant.

## Puzzles — génération

```bash
# Générer les N prochains jours depuis le schedule
python generate_puzzle.py --schedule schedule.csv --days-ahead 8

# Générer un mot spécifique
python generate_puzzle.py --word miroir --lang fr --date 2026-07-07 --number 185
```

Le modèle ML utilisé : `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers).  
Temps : ~1-2 min par puzzle. Les fichiers sortent dans `data/{lang}/`.

## Schedule — règle importante

EN et FR ont des mots **intentionnellement différents** (décalage de 5 positions).  
Ne jamais remettre des traductions directes EN/FR sur la même date.

## Déploiement GitHub Pages

Repo : `marcandreabouvier-ops/semordle`  
Push depuis laptop perso (réseau corporate bloque git) :

```bash
gh auth login
git push -u origin master
```

Settings → Pages → Deploy from branch → `master` → `/ (root)`  
URL : `https://marcandreabouvier-ops.github.io/semordle`

Le cron `.github/workflows/generate-puzzles.yml` génère les puzzles automatiquement chaque semaine.
