# Galexical (ex-Semordle) — Guide pour Claude

Jeu de mots sémantique quotidien (Semantle × Wordle), bilingue EN/FR, rebrandé
**Galexical** le 2026-07-18 (domaine : https://galexical.com). Déployé sur Netlify
(auto-deploy depuis GitHub `marcandreabouvier-ops/semordle` — le repo garde son
ancien nom). Stack vanilla JS/HTML/CSS + Three.js r158 (CDN importmap), aucun build step.

⚠️ Le préfixe localStorage reste `semordle:` — ne JAMAIS le renommer, ça effacerait
la progression de tous les joueurs.

## Direction artistique « Observatoire » (refonte 2026-07-27)

Refonte visuelle issue du projet Claude Design `510eb626` (`REDESIGN.md` +
`galexical-theme.css`). **Le système solaire 3D n'a pas été touché** — `rankToColor()`
et les points du radar sont inchangés ; seule l'interface autour a changé.

**La règle unique : la couleur ne décore plus, elle mesure.**
1. **Neutre par défaut** — les filets et fonds turquoise ont laissé place à du blanc
   translucide (`--glass-border` .08, `--hairline-strong` .17). Le turquoise ne marque plus
   que **la marque et l'état actif** (h1, langue active, focus, tuiles vertes du Wordle).
2. **La chaleur est une donnée** — le dégradé froid→brûlant est réservé aux orbites, points,
   barres et rangs. Les variables `--cold-c/--cool-c/--warm-c/--hot-c/--scorch-c` **recopient
   désormais `rankToColor()`** : les deux échelles divergeaient, la barre des cartes ne disait
   pas la même chose que le radar. Les erreurs ont leur propre `--burn-c`.
3. **Deux accents, pas cinq** — phosphore (signal) et ambre (soleil/victoire). Le violet des
   suggestions et l'or de la roue ont disparu.
4. **Zéro emoji dans l'UI** — jeu d'icônes SVG 16 px (`ICONS` + `icon()` dans game.js, trait
   1,3, `currentColor`). Les emojis restent **uniquement** dans le texte de partage (ils
   partent dans le presse-papier) et sur les températures des cartes (c'est de la donnée).

Typographie : `--font-ui` **Instrument Sans** (interface) · `--font-mono` **IBM Plex Mono**
(marque, mots, rangs, captions) · `--font-flavor` **Newsreader italique** (messages, faits
stellaires). Plus aucune police codée en dur hors du `:root`.

Un seul **bouton plein** sur l'écran de jeu (« Deviner ») ; dans une modale, l'action
principale est pleine (roue = ambre). Rayons ramenés à 6 / 12 / 20 / 999.

**Écran d'accueil** (`#onboarding`) au premier lancement : marque, promesse en Newsreader,
3 étapes numérotées avec l'échelle de chaleur en exemple. `buildHowToSteps()` est la **source
unique** partagée avec la modale « ? » — elles ne peuvent pas diverger. `isFirstVisit()` ne
l'impose qu'aux vrais nouveaux joueurs : ⚠️ ne pas tester l'existence de `semordle:profile`,
`loadProfile()` en écrit un à chaque chargement — on teste sa **progression** (jetons/étoiles).

⚠️ **Piège CSS à retenir** : la règle partagée `#bottom-tabs button` (spécificité 1,0,1) écrase
un `#wheel-handle { display:none }` (1,0,0) — la languette Roue restait visible en permanence.
D'où les sélecteurs qualifiés `#bottom-tabs #wheel-handle`.

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
- Les 3 languettes du bas (même gris depuis la refonte, distinguées par leur icône SVG) sont dans
  `#bottom-tabs` (flex row centrée). La languette **Roue** est cachée (`display:none`)
  et n'apparaît (`.available`) que quand un spin est dispo (`updateWheelHandle`).
- **Roue de la chance** (`#wheel-handle` → `#wheel-modal`) : 1 spin gagné toutes les
  50 propositions (`WHEEL_SPIN_EVERY`, `gameState.stats.wheelSpinsUsed`). Roue SVG
  12 segments (`buildWheelSvg`), tourne ~4,2 s (CSS transition ease-out sur `_wheelRotation`).
  Les 12 récompenses sont **pré-tirées** (`computeWheelRewards`) dans des **bandes de rangs
  ABSOLUES** par palier (retour joueur 2026-07-24 — la roue ne garantit PLUS un mot meilleur
  que bestRank) : jackpot top 10, great #10-50, good #50-250, modest #250+ (`WHEEL_TIERS.band`,
  pool = tout le vocabulaire non trouvé). Après tirage on trie et on donne le **plus proche au
  palier le plus rare** (`WHEEL_LAYOUT`) → le #rang reste **toujours monotone avec la couleur**
  même après un fallback de bande vide. Chaque récompense garde son `score` (le radar place les
  dots par score — un score manquant expédiait un #2 au fin fond du cosmos jusqu'au reload). Chaque slice
  a un fond **gris neutre** (deux nuances alternées) et porte une petite **planète ombrée**
  (dégradé sphère `light→color→rim` de `WHEEL_TIERS`, taille égale, halo sur great/jackpot) = le
  corps qui gravitera sur le radar une fois gagné, avec le **#rang à gagner** dessous (aligné
  radialement, non retourné). Le noyau (`.wheel-hub`, `--hub`, le plus gros corps) montre
  l'étoile équipée du joueur (`skinById(_profile.equipped)`). **La roue ne se recalcule PAS
  après un spin** : `computeWheelRewards` n'est appelé qu'à l'ouverture (`openWheelModal`),
  `renderWheel` ne fait que dessiner `_wheelRewards` → ce qu'on voit sous le pointeur = ce qu'on
  gagne. `spinWheel` n'atterrit que sur un segment encore donnable (pas de mot déjà gagné, pas
  de slice vide → pas de spin gâché). Le mot est ajouté via `applyWheelUnlock` (unlock marqué 🔓,
  compte dans unlockCount du partage, dot sur le radar). Jackpot/great = feux d'artifice en
  **volley seul** (`launchFireworks(false)`) — le show ambiant infini est réservé à la victoire
  (sinon il ne s'arrêtait jamais sur une partie non résolue, bug joueur 2026-07-24).
- **Météorites** (`#meteor-canvas` + `setupMeteors`) : étoile filante cliquable qui traverse
  le haut de l'écran. Éligibilité (`meteorEligible`) : ≥ 15 propositions (`METEOR_MIN_GUESSES`),
  onglet visible, aucune modale/overlay ouvert, partie non résolue, au moins un palier non
  plafonné (`availableMeteorTiers`). Heartbeat 1 s qui n'accumule que du temps de jeu ACTIF ;
  1re météorite après 45 s-1,5 min (`METEOR_FIRST_MS`, découverte), ensuite 2,5-6 min
  (`METEOR_WAIT_MS`). 3 paliers (`METEOR_TIERS`), **caps PAR PALIER et par jour**
  (`stats.meteorByTier`, retour joueurs 2026-07-27) : bleue 72 % → mot froid (rang ≥ 250),
  **illimitée** ; orange 21 % → tiède (20-250), **5 max** ; rouge 7 % → TOP 20 + feux
  d'artifice, **3 max**. Un palier plafonné **ne spawne plus** (`drawMeteorTier` renormalise
  les poids sur les paliers restants) — jamais de météorite inattrapable. Vitesses
  5,4 s/4,6 s/3,8 s (le mockup était calibré sur une petite fenêtre : mêmes ms = bien plus de
  px/s en plein écran). Hitbox invisible **60 px souris / 76 px tactile autour de TOUTE la
  traînée**, mesurée en distance point-**segment** (`meteorHitDistSq`) : cliquer n'importe où
  sur le trait lumineux attrape. `METEOR_TRAIL_MAX = 34` points (ralentir raccourcit la traînée
  en px, donc on l'allonge pour garder la cible large). Le listener `pointerdown` (capture sur
  window) **ne vole jamais un clic destiné à un contrôle** (`button, a, input, …`) — important
  vu la taille de la hitbox. Le canvas est en `pointer-events:none`, z 30. Trajectoire bornée
  aux ~2/3 hauts (vérifié : max ~61 % de la hauteur, jamais sur les languettes/barre de saisie).
  Capture → burst de particules + toast (`#meteor-toast`) + mot ajouté comme la roue (total dans
  `meteorCatches` pour le partage). Ratée = elle s'envole, aucune pénalité. Debug : flag
  localStorage `semordle:debug` expose `window._gxMeteor(tier)` / `_gxMeteors()`.
- **Sonde** (mini-jeu, languette `#transit-handle`) : une sonde tous les `TRANSIT_EVERY` = 20
  mots. **Elle part TOUJOURS tout droit vers le haut** depuis un pas de tir fixe en bas au
  centre : le joueur choisit l'INSTANT, jamais la cible — toute formulation du type « touchez
  une planète » est fausse et a été écartée. Trois anneaux de planètes (`TRANSIT_TIERS`,
  orbites ovales `TRANSIT_OVAL`, ω ∝ r^-1,5 donc l'intérieur va plus vite, toutes dans le même
  sens comme dans un vrai système solaire) : rouge (1 seule, orbite basse) → top 20 + feux
  d'artifice ; orange → #20-100 ; bleue → #100-400. Toucher le soleil ou sortir par le haut =
  sonde perdue, lot de consolation `TRANSIT_LOST_BAND` (mot froid). Tir par clic sur le cadre,
  par le bouton, ou par **la barre d'espace** — cet écouteur est posé à l'ouverture et
  **retiré à la fermeture**, sinon il avalerait les espaces pendant la saisie d'un mot.
  **Le tir est suivi d'une fermeture automatique** (`TRANSIT_CLOSE_MS` = 1,1 s) : le joueur
  doit voir sa planète apparaître dans le système solaire. Le résultat est annoncé par le
  toast des météorites, émis dans `closeTransitModal` — donc **aussi si le joueur ferme
  lui-même** avant le délai, sinon il perdrait l'annonce de son gain. Les feux d'artifice du
  palier rouge sont déclenchés APRÈS la fermeture, sinon la modale les cache.
  **Le soleil du mini-jeu est l'étoile équipée** : mêmes rôles de couleur que la scène 3D
  (`color` = cœur, `emissive` = bord du disque, `glow` = couronne) et mêmes fx (`glowScale`,
  `glowOp`, pulsation, `twinkle`). Deux garde-fous : la couronne est **plafonnée à 0,26·R**,
  sous l'orbite basse (0,34·R) — sans ça Bételgeuse ou Antarès noient la planète rouge, qui
  est la cible la plus payante ; et seule la couronne pulse, le disque garde le rayon `g.sun`
  qui sert aussi de zone de collision. Les planètes ont un liseré sombre pour se détacher
  d'une couronne de la même famille de couleur.
  Refonte visuelle du 2026-07-31 (d'après un mockup de Marc) : badge de sondes dispo, texte
  d'intro en Newsreader, légende construite **depuis `TRANSIT_TIERS`** (`transitLegendHtml`)
  pour que les rangs affichés ne puissent pas mentir — pastille + rang seulement, le nom du
  palier ne survit qu'en `aria-label` pour ne pas reposer uniquement sur la couleur ; elle est
  calquée sur `.wordle-legend` (rangée discrète 10,5 px alignée à gauche **au-dessus** du
  terrain, pas d'encadré) —, et **anneaux de croisement** dessinés
  sur la trajectoire en `y = cy + r·OVAL` — ils montrent où amener une planète, c'est
  l'information utile du jeu. Dimensionnement type Wordle, **aucun scroll** : la chaîne flex
  doit être CONTINUE (`.modal-content` → `#transit-content` → `.transit-wrap` → terrain),
  sinon le div intermédiaire fige la hauteur et le bouton est clippé hors carte. Le terrain
  est le seul élément qui cède (`height: min(340px, 44dvh)` + `flex-shrink`, plancher 150px) ;
  le bouton de tir reprend exactement `#semantic-submit` (pilule 999px, 46px, phosphore) —
  c'est le même geste que « Deviner », il doit avoir la même forme ;
  **pas d'`aspect-ratio`** ici, il l'emporte sur `flex-shrink`. Les `<p>` de la modale doivent
  être qualifiés `.transit-wrap .transit-lede/.transit-foot` : `.how-to-content p` (0,1,1)
  écrase sinon leur taille et leurs marges.
- **Partage** : la ligne 🔓 affiche le total de mots réellement débloqués =
  `wordleWinCount + wheelSpinsUsed + meteorCatches` (`unlockBreakdown()`) avec la répartition
  (🎯 Wordle · 🎡 roue · ☄️ météores, sources non nulles seulement). La ligne d'émojis
  « journey » a été retirée (demande de Marc). Les Wordle perdus (indice partiel) ne comptent
  plus dans le total affiché ; `stats.unlockCount` existe toujours mais n'est plus affiché.
- **Mot au hasard** (remplace la languette « 3 mots », retirée le 2026-07-31 — elle
  n'était pas utilisée). Cliquer **« Deviner » avec le champ vide** envoie un mot tiré
  au sort (`submitRandomGuess` → `pickRandomGuessWord`). Paliers (`RANDOM_ODDS`) :
  1/10 000 rangs 1-10 · 1/1 000 rangs 10-100 · 1/100 rangs 100-1 000 · sinon ~99 % dans
  la bande `RANDOM_COLD_FROM/TO` = index 1000-8000 (au-delà les mots n'ont plus aucun
  rapport avec le secret, donc n'inspirent rien). Le secret et les mots déjà joués sont
  exclus. Anti-rafale `RANDOM_COOLDOWN_MS` = 250 ms. **Seul le CLIC déclenche un tirage** :
  la touche Entrée sur un champ vide ne fait rien (envois accidentels).
  ⚠️ **Compteur séparé, ne jamais fusionner** : les tirages incrémentent
  `stats.randomGuesses` et **pas** `semanticGuessCount` — ce dernier pilote la Sonde (1/20),
  la roue (1/50), les météores, le partage et les stats ; les compter donnerait des
  jetons gratuits en boucle. Partagé sur sa propre ligne (🎲) via `shareRandom`.
  À savoir : `lookupWord` attribue `rank: idx + 1` quand le JSON n'a pas de rang, donc
  **même un mot froid affiche un rang** (#2071…) — spammer cartographie grossièrement la
  bande 1000-8000. Assumé (identique à taper le mot soi-même).
- Wordle : overlay = **carte flottante** (coins arrondis 20px, ombre, marges). La grille
  se dimensionne via `--word-len` + `--rows` (inline) et un
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

**Manifeste Archives** `data/{lang}/archive.json` = `[{date, number}]` trié du plus récent
au plus ancien, **sans aucun mot secret** (sûr à servir). Reconstruit par `build_manifest()`
à la fin de chaque batch `--schedule` (donc le cron du lundi le met à jour tout seul), ou à la
demande via `python generate_puzzle.py --manifest-only`. Le client filtre date ≤ aujourd'hui +
fenêtre glissante 10 j ; lister des dates proches du futur y est inoffensif (ni secret, et les
JSON sont déjà URL-accessibles). Sert la liste du Mode Archives (bouton 🗓️).

**Plomberie de chargement par date (J3)** : `_activeDate` (null = puzzle du jour ; sinon
'YYYY-MM-DD' = rejeu d'archive) ; `activePuzzleDate()` = `_activeDate || getTodayDate()`, lu
uniquement par `loadPuzzle()` (une archive charge sa date EXACTE, sans repli — un fichier
manquant échoue proprement). `reloadForDate(dateStr|null)` sauvegarde l'état courant, pose
`_activeDate`, réinitialise (`resetForReload()` — mutualisé avec le changement de langue) puis
rappelle `init()`. La sauvegarde est par date (`semordle:{lang}:{date}`) → chaque archive a son
propre état, aucune corruption du jour. Les météorites sont désactivées en archive
(`isArchiveActive()`).

**Liste + bandeau (J4)** : la modale 🗓️ (`openArchiveModal`/`populateArchiveList`) lit le
manifeste `data/{lang}/archive.json`, garde les jours `date < aujourd'hui` ET dans la fenêtre
`ARCHIVE_WINDOW_DAYS = 10`, du plus récent au plus ancien. Chaque ligne = #numéro + date
localisée + pastille de statut (`archiveDayStatus` lit `semordle:{lang}:{date}` : résolu /
en cours / à faire). Clic → `reloadForDate(date)`. **Pas de bandeau flottant** : c'est la **pilule `#puzzle-pill`**
elle-même qui devient l'indicateur (`updatePuzzlePill()`, appelée en fin d'`init` et dans
`applyI18n`) — teal `#202` aujourd'hui, **ambre** `🗓️ #199 · ← Revenir au jour J` cliquable en
archive (classe `.pill--archive`, `role=button`, clic/Enter → `reloadForDate(null)`).

**Streak vs archives (J5)** : `computePlayerStats` ne crédite la **série** qu'aux jours résolus
LE JOUR MÊME (`fmt(new Date(st.solvedAt)) === date` du puzzle) — une archive résolue après coup
a un `solvedAt` d'un autre jour et ne remplit donc pas la série. En revanche les archives
comptent bien pour parties/victoires/moyenne/meilleure. **Élagage (J5)** : `prune_old(lang,
keep_days)` supprime les JSON datés plus vieux que N jours (jamais archive.json/sample.json),
appelé avant `build_manifest` ; le workflow passe `--prune-days 14` (marge > fenêtre 10 j) pour
garder `data/` léger. Mode Archives = COMPLET.

**Règle anti-collision bilingue (depuis le 2026-07-24)** : les mots secrets EN et FR
doivent former des **concepts disjoints** — jamais la traduction l'un de l'autre, même à
des jours différents (sinon un joueur bilingue rejoue « lantern » 5 j après « lanterne »).
L'ancien planning était en fait la même liste traduite et décalée de 5 jours ; il a été
assaini pour tout le **futur** (le passé ≤ 2026-07-24 reste figé, il est rejouable en
Archives). En ajoutant des mots au schedule : puiser dans des concepts neufs, non déjà
utilisés dans l'autre langue. **Runway actuel : jusqu'au 2026-08-31** (#240) — à prolonger
avant cette date (banques de concepts frais dans le script de build, cf. session du 24/07).

**Règle anti-cluster thématique (depuis le 2026-07-27)** : au sein d'une langue, des jours
CONSÉCUTIFS ne doivent pas tomber sur des mots du même thème (retour joueur : brume→givre→rosée,
similarité word2vec ~0.46). Le futur a été **réordonné** (glouton : chaque jour minimise la
similarité word2vec pondérée aux 2 jours précédents, `LOOKBACK=2` / `WEIGHT=[1.0, 0.45]`, ancré
sur le dernier jour figé) → FR : 23→3 paires proches (max 0.69→0.37) ; EN : 18→0 (max 0.71→0.28).
Le passé ≤ aujourd'hui reste figé. Cible : similarité adjacente < ~0.30. Quand on régénère/étend
le planning, **relancer ce réordonnancement** (script `reorder_schedule.py` de la session, jetable)
avant de committer, sinon les runs thématiques reviennent.

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
| `openStatsModal()` / `computePlayerStats()` | Modal stats : stats PERSO calculées depuis le localStorage (par langue). Le « mot d'hier » a été RETIRÉ le 2026-07-27 (avec le Mode Archives, la veille reste jouable — la révéler la gâchait ; clés i18n yesterday* conservées). PAS de stats globales — site statique, il faudrait une Netlify Function (idée en attente) |
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

### Victoire & partage (`#win-card`)

À la résolution, une **carte persistante centrée** `#win-card` s'affiche (`showWinCard`,
appelée dans `handleWin` ~1 s après la supernova, et au `restoreState` d'un jour résolu) :
titre « Bien joué ! » + sous-titre + carte de partage (`buildShareCardHTML`) + bouton copier.
Elle **couvre le soleil** pour ne pas spoiler le mot secret (screenshots). Bouton ▾ **Réduire**
(`toggleWinCard`) → replie le corps et révèle le soleil ; préférence mémorisée
(`semordle:winCardCollapsed`). Anti-spoiler robuste : dépliée, elle masque AUSSI le label 3D du
secret (`setSecretLabelHidden`, indépendant du zoom caméra). Remplace l'ancien toast fugace +
la carte de partage du panneau gauche (retirée). `hideWinCard()` au changement de langue/date.

### Liens de recherche par mot (`wordLinksHtml`)

Chaque carte du classement est un **accordéon** : clic/Enter (`role=button`) déplie 2 liens
ouvrant un nouvel onglet — EN : thesaurus.com + en.wikipedia ; FR : cnrtl.fr/synonymie +
fr.wikipedia (mot en `encodeURIComponent`, `rel=noopener noreferrer`). Aide le joueur qui sèche
à chercher synonymes/définition sans quitter le jeu. Le clone « dernière proposition » est
nettoyé de ses liens/caret (`updateLastGuessSection`).

### Wordle — règles spécifiques

- **Choix du mot** (`selectUnlockTarget`) : normalement un mot **plus proche** que ton
  meilleur rang (`w.rank < bestRank`, tirage pondéré vers les mots un peu plus loin pour ne
  pas donner le top d'emblée). Bascule en **mode inverse** dès que ce pool est vide — ce qui
  n'arrive que quand le #2 est trouvé (`bestRank` vaut alors 1, plus rien de plus proche) :
  débloque alors le mot non-trouvé le plus proche vers l'extérieur (#2, puis #3…).
- **Jouable après la victoire** (retour joueur 2026-07-24) : plus de blocage `gameState.solved`
  dans `startWordleChallenge`. Une partie résolue force `bestRank = 0` dans `selectUnlockTarget`
  → mode inverse depuis le secret, pour compléter le top des rangs. ⚠️ Utiliser `?? 1001` et NON
  `|| 1001` (un `bestRank` de 0 = résolu serait sinon transformé en 1001 → mots lointains).
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
