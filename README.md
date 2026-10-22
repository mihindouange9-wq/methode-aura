# MÉTHODE AURA — expérience digitale (refonte 2026)

Site d'une page, vanilla, ouvrable en double-clic ou servi en local. La charte
2026 reste la source de vérité (palette, Sora, logo, ton). Le niveau
d'expérience s'inspire des principes de synchronized.studio (rythme, typographie
géante, épinglages, transitions, curseur) sans en reprendre l'identité :
voir `DIRECTION.md` pour l'analyse et les choix.

La version d'avant refonte (html, css, js) est conservée dans `_v1/`.

## Lancer

Ouvrir `index.html`, ou servir le dossier :

```
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Paramètres d'adresse : `?nointro` (préchargeur court), `?reduced` (tout visible,
rien ne bouge).

Épuration du 15 septembre 2026 : retrait du compteur du préchargeur, du badge
circulaire du hero, des bandeaux défilants, du curseur personnalisé, des boutons
aimantés, de l'inclinaison des titres et des filets d'étiquettes ; les
révélations au défilement se limitent à une montée légère en fondu.

## Parcours

1. **Préchargeur** — « MÉTHODE / AURA / du concept / à l'impact » en
   quinconce, puis le rideau se lève. Version complète une fois par session, courte ensuite.
2. **Hero** — la fresque en vidéo (`assets/fresque-1080.webm`, ralenti
   interpolé 0,6×, 1080p, netteté, boucle intégrée ; repli `fresque.mp4`),
   rendue sur desktop dans une toile WebGL qui ondule sous le pointeur
   (`js/liquid.js` : carte de flux + déplacement d'UV + aberration chromatique).
   Titre géant « Du concept / à l'impact. », positionnement en petites
   capitales, navigation empilée à droite. Le titre s'éloigne au défilement, les couches suivent le pointeur.
4. **Le studio** — phrase révélée en fondu, trois colonnes Branding /
   Identité visuelle / Digitalisation.
5. **Expertises** — section épinglée : 01 Stratégie, 02 Branding, 03 Identité,
   04 Digital, 05 Expérience. Le défilement fait rouler le numéro, allume le
   titre, change le panneau et la lumière de fond. Survol = aperçu.
6. **La méthode** — liste éditoriale : 01 Comprendre, 02 Structurer, 03 Créer,
   04 Déployer, 05 Transformer. La colonne de gauche reste en place pendant la
   lecture ; le temps sous le milieu de l'écran s'allume.
7. **Réalisations** — « Sélection de projets » sur une feuille Ivoire : chaque projet
   est un visuel pleine largeur en format écran d'ordinateur (16/10), suivi d'une
   ligne éditoriale (index, titre, contexte). Imora Rituals joue une vidéo de
   navigation du site (`assets/univers/imora-rituals/navigation-desktop.webm`,
   22 s, 1600 × 1000) et ouvre l'étude de cas plein écran depuis le visuel
   (clip-path). LINKO, LOCAGAB et PAVEN suivent avec la capture de leur page
   d'accueil (`assets/univers/<projet>/desktop-accueil.jpg`, 1600 × 1000) ; les
   deux premiers ouvrent le site en ligne dans un nouvel onglet, PAVEN attend
   sa mise en ligne. Puis les six univers.
8. **Manifeste** — feuille Ivoire qui se déploie, lignes révélées au
   défilement, mot clé en violet sur la ligne courante.
9. **Contact** — deux lignes géantes, bouton, courriel, anneau incliné vers le
   pointeur.
10. **Pied de page** — le marbre revient, liste des réseaux en grand corps,
    « MÉTHODE / AURA ».

## Architecture

```
index.html
css/
  tokens.css       couleurs, typographie, rythme, z-index (charte)
  base.css         reset, fenêtres de découpe (.w / .line), marbre, trame, feuilles
  components.css   kickers, boutons, liens, flèches, préchargeur, navigation, menu
  sections.css     hero, studio, expertises, méthode, réalisations,
                   univers, manifeste, contact, pied de page, étude de cas, responsive
  fonts.css        Sora hébergée sur le site (assets/fonts/, licence OFL)
  print.css        impression / PDF
js/
  vendor/          gsap.min.js 3.13, ScrollTrigger.min.js, lenis.min.js (locaux)
  core.js          état pointeur / boucle rAF (utilisé par le marbre)
  app.js           Lenis + ScrollTrigger, ancres, découpe typographique,
                   révélations data-anim, parallaxe data-parallax, feuilles claires,
                   marbre qui s'éloigne / revient
  loader.js        préchargeur
  head.js          classes posées avant le premier rendu (intro, mouvement réduit)
  liquid.js        distorsion liquide WebGL (A.liquid(conteneur, média, options))
  marble.js        vidéo de fond (fresque) : lecture, repli mp4 au ralenti, toile liquide
  nav.js           navigation, lien actif, menu mobile
  hero.js          hero
  services.js      expertises épinglées
  methode.js       méthode horizontale
  works.js         carte de cas, étude de cas plein écran, univers
  manifesto.js     manifeste
  contact.js       contact et pied de page
  boot.js          démarrage : armement des modules, refresh, préchargeur
assets/
  fresque-1080.webm / fresque.mp4 / fresque-poster.jpg, lockup_horizontal_white.png,
  logomark_white.svg, univers/imora-rituals/ (navigation-desktop.webm, desktop-accueil.jpg
  en affiche, produit-savon.jpg, produit-huile.jpg)
```

### Système d'animation

- `data-anim="words|lines|up|mask"` sur un élément : révélation à l'entrée
  dans l'écran, une seule fois. Options : `data-anim-delay`, `data-anim-stagger`,
  `data-anim-start`. Les lignes attendent une structure
  `<span class="line"><i>…</i></span>`.
- `data-parallax="0.15"` : déplacement vertical lié au défilement.
- Liquide : `A.liquid(conteneur, média, { radius, dissipate, strength, amount,
  chroma, ripple, focal, dpr, flowSize, via2d, guard })`. Actif seulement avec
  WebGL, pointeur fin et sans mouvement réduit ; sinon la vidéo s'affiche telle
  quelle. Avec `guard`, l'effet se retire seul si le rendu est noir ou trop lent
  (plus de 14 ms par image de façon répétée). `?noliquid` le désactive.
- Tout passe par `transform`, `opacity`, `clip-path`. Avec
  `prefers-reduced-motion` (ou `?reduced`) : tout est visible, rien ne bouge,
  le défilement est natif.
- L'épinglage des expertises est armé au chargement selon la
  largeur (< 900 px : vertical). Un redimensionnement qui traverse ce seuil
  demande un rechargement.

## Réalisation Imora Rituals

- `navigation-desktop.webm` : enregistrement de la navigation sur le site
  Imora Rituals (`imora/site`) en 1600 × 1000. Pour le refaire : servir le site,
  ralentir le site (GSAP ×0,35), défiler par gestes lents en capturant des
  captures d'écran (663 images), puis recomprimer le temps (×2,86) à l'encodage (WebM VP9,
  30 i/s, 10 Mbps, MediaRecorder sur canvas dans Chrome headless : ffmpeg est
  bloqué sur ce poste). Le début du chargement est coupé.
- `desktop-accueil.jpg` sert d'affiche avant lecture ; `produit-*.jpg` sont les
  photos produit du site.
- Pour ajouter une réalisation : dupliquer `<article class="work">` (carte) et
  la scène `.case-stage` de `#caseStudy` ; `works.js` ouvre l'étude de cas
  depuis la carte cliquée et lance la vidéo.
- LINKO (https://linko-s3ve.onrender.com), LOCAGAB (https://locagab.onrender.com)
  et PAVEN (pas encore en ligne) sont présentés par la capture de leur page
  d'accueil à 1600 × 1000 (Chrome headless, 5 s d'attente après le chargement).
  Pour ajouter un site : dupliquer un `<article class="work work--site">`.

## Vidéo de fond

`fresque-1080.webm` est produit par `tools/bake.html` à partir de
`test1/fresque.mp4` (10 s, 1280 × 720, 24 i/s) : ralenti 0,65× avec images
intermédiaires compensées en mouvement, agrandissement 1080p bicubique,
renforcement adaptatif, boucle en fondu de 1,2 s intégrée, VP9 12 Mbps
(≈ 13,3 s, 14 Mo). L'enregistrement est en temps réel : il faut impérativement
un Chrome avec accélération graphique (pas de rendu logiciel), sinon les
images arrivent en retard et la vidéo devient un diaporama. Pour le
régénérer : servir le dossier puis ouvrir dans Chrome
`tools/bake.html?auto=1&src=../../fresque.mp4&slow=0.65&xfade=1.2&bitrate=12` ;
le fichier se télécharge, à renommer `fresque-1080.webm`. Contrôle de fluidité :
deux images consécutives à 1/30 s ne doivent presque jamais être identiques.
Le repli `fresque.mp4` (original) est joué à 0,6× par `marble.js`.

## Responsive (téléphone et tablette)

Le format téléphone a été repris après analyse du site de référence en 390 px :
une idée par écran, des titres qui occupent toute la largeur, des gouttières
constantes, des listes compactes, aucun débordement horizontal, des animations
allégées. Paliers : ≤ 1100 px (petit desktop, tablette paysage), ≤ 900 px
(tablette portrait et téléphone : plus d'épinglage), ≤ 640 px (téléphone),
paysage court (≤ 520 px de haut). Tout est dans le bloc « Responsive » de
`css/sections.css` et la fin de `css/components.css` (préchargeur, navigation).

- **Préchargeur** — les quatre mots empilés en bas à gauche.
- **Hero** — titre à 14 vw, texte d'intro sous la navigation ;
  pas de flou au défilement sur écran tactile.
- **Le studio** — les trois colonnes deviennent trois blocs compacts (numéro,
  titre, prestations séparées par des points).
- **Expertises** — liste-accordéon : chaque panneau est déplacé sous son titre
  par `js/services.js`, le toucher ouvre ou ferme, le premier est ouvert, le
  texte circulaire tourne derrière la liste.
- **La méthode** — la colonne de gauche passe au-dessus de la liste.
- **Réalisations** — visuel en tête, puis titre et contexte à la suite.
- **Univers** — la phrase de chaque univers reste visible (pas de survol).
- **Manifeste, contact, pied de page** — moins de vide, mêmes proportions.
- **Vidéo de fond** — `js/marble.js` choisit la source : WebM 1080p (14 Mo)
  sur ordinateur, `fresque.mp4` (3,6 Mo, 720p, ralenti + boucle par fondu)
  sur écran tactile ou étroit. Le filtre couleur de la vidéo est retiré sur
  écran tactile.
- **Navigation** — sur la feuille Ivoire (manifeste), le logo et le bouton
  passent en Obsidienne (`html.on-light`).

## Livrables

- `index.html` — le site complet. Vérifié à 360, 390, 820 (portrait), 1024, 1440 px et en téléphone paysage (844 × 390), en Chrome headless (émulation tactile).
- `METHODE-AURA-site.pdf` — le site en pages paysage (`css/print.css`).
  Régénérer après modification :

```
chrome --headless=new --disable-gpu --allow-file-access-from-files --window-size=1440,900 --virtual-time-budget=12000 --no-pdf-header-footer --print-to-pdf=METHODE-AURA-site.pdf "file:///CHEMIN/index.html?nointro&reduced"
```

- `assets/greek-marble-poster.jpg` — image d'affiche (hero avant lecture, PDF).
- `tools/bake.html` — génération du WebM de marbre (voir `_v1/README.md`).

## Sécurité

- Aucun script ni style en ligne : tout est dans `js/` et `css/` (le script
  d'en-tête est `js/head.js`). Aucune ressource externe : polices, vidéos et
  librairies sont servies par le site.
- Politique de sécurité du contenu (CSP) en `<meta>` dans la page et en en-tête
  HTTP (`render.yaml`), avec X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS.
- Pas de formulaire ni de saisie : le contact passe par `mailto:`. Aucune donnée
  n'est stockée hors d'un drapeau de session (`aura-intro`).
- Les paramètres d'adresse de mise au point (`?debug`, `?y=`) ont été retirés.

## Mise en ligne (Render)

- Hébergé sur Render en site statique : `render.yaml` décrit le service
  `methode-aura`. Le dépôt GitHub `mihindouange9-wq/methode-aura` (privé) est
  suivi sur la branche `main` ; chaque push redéploie en moins d'une minute.
- La commande de build ne copie dans `dist/` que les fichiers publics :
  `index.html`, `robots.txt`, `css/`, `js/`, `assets/`. README, DIRECTION.md,
  le PDF et `tools/` ne sont jamais servis.
- Adresse provisoire : https://methode-aura.onrender.com (canonical et Open
  Graph dans `index.html`). Au rattachement du domaine définitif, remplacer
  cette adresse dans `index.html` et ajouter le domaine au service Render.
