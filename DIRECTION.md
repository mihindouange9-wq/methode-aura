# MÉTHODE AURA — refonte « expérience digitale »

Document de direction rédigé avant la refonte. Il fixe ce que l'on a observé,
ce que l'on garde, ce que l'on change, et pourquoi.

## 1. Ce que l'on a analysé

### Le site actuel (version conservée dans `_v1/`)

- Un site vitrine d'une page, vanilla, ouvrable en double-clic : hero sur vidéo
  de marbre, méthode épinglée (4 piliers), expertises en grille de 6 cartes,
  univers en grille de 6 cartes, réalisation Imora Rituals, manifeste, CTA,
  pied de page classique. Moteur d'animation maison (`core.js`), curseur
  personnalisé, trame de mesure, intro courte.
- Ce qui fonctionne : la charte est respectée, le marbre donne une matière
  singulière, le curseur et la trame sont déjà de niveau studio.
- Ce qui manque face à la référence : un rythme de lecture (tout est empilé),
  des compositions typographiques à grande échelle, des transitions entre
  sections, un portfolio éditorial, un pied de page qui conclut.

### Synchronized (synchronized.studio), observé en navigation

Préchargeur : compteur `0 → 100` et ligne qui se dessine, quatre lignes
géantes disposées en quinconce sur tout l'écran (« We Are / Synchronized /
All About / Digital Experiences »), puis glissement vers le hero.

Hero : titre en corps géant sur trois lignes décalées, paragraphe de
positionnement en petites capitales, navigation empilée à droite (quatre
entrées + « Archive ↘ »), badge ovale « We are… since '18 », ornements
rayonnants, texture de fond animée.

Services : liste centrée dans un ovale, texte circulaire « How we can help /
» qui tourne, alternance romain / italique, un mot en couleur d'accent.

Études de cas : titre « Selected cases » en 173 px, puis une carte claire par
projet — image en haut à gauche, numéro en haut à droite, titre géant,
description en petites capitales — les cartes se succèdent une par écran.

Reconnaissance : listes à filets avec compteurs. Contact : « Don't hesitate
to say Hello to our team » en 120 px, courriel. Pied de page : réseaux en
liste typographique géante, « Let's collaborate », marquee « Watch showreel /
», copyright vertical.

Mouvement : défilement virtuel à inertie (Nuxt, hauteur du document = un
écran), lignes de texte qui se décalent et glissent, apparition par masque,
ornements qui tournent, marquee continu, lien actif coloré. Mobile : la même
structure, verticale, une carte par écran.

## 2. Ce que l'on garde de MÉTHODE AURA (source de vérité : la charte 2026)

- Palette : Obsidienne `#0B0B0D`, Ivoire Aura `#F5F2EA`, Violet Électrique
  `#6C3BFF` (accent digital, 10 %), Or Solaire `#D9A441` (accent premium, 5 %).
  L'or ne porte jamais de texte courant sur fond clair.
- Typographie : Sora seule (300 / 400 / 500 / 600 / 700 / 800).
- Logo : lockup horizontal et symbole, jamais déformés, pivotés ni recolorés
  hors Ivoire / Obsidienne. Le symbole en motif à 5–10 % d'opacité, en camaïeu.
- Ton : vouvoiement, phrases courtes, un point d'exclamation maximum, le
  tiret cadratin pour les ruptures. « Du concept à l'impact. » et
  « Construire une marque qui marque. »
- Contenu : les quatre piliers (Stratégie, Identité, Déploiement,
  Digitalisation), le manifeste, la réalisation Imora Rituals, les six univers.
- Matière : la vidéo (désormais la fresque), le curseur. La trame de mesure et
  les étoiles animées ont été retirées à la demande du client (refonte 2).

## 3. Ce que l'on reprend de Synchronized (les principes, jamais les assets)

| Principe | Traduction MÉTHODE AURA |
|---|---|
| Préchargeur compteur + lignes en quinconce | `00 → 100`, ligne ascendante, « MÉTHODE / AURA / du concept / à l'impact » |
| Titre géant décalé | « Du concept / à l'impact. » en Sora 800, 12,5 vw, deux lignes décalées |
| Navigation empilée à droite | La méthode / Expertises / Réalisations / Manifeste / Contact + « Démarrer un projet ↘ » |
| Badge ovale + ornement rayonnant | Ovale « Studio de marque » avec texte circulaire, étoile à quatre branches de la trame |
| Services dans un ovale, texte circulaire | 01 Stratégie … 05 Expérience, section épinglée, numéro qui roule, panneau qui change |
| Cartes de cas claires numérotées | Carte Ivoire « 1 · Imora Rituals », image, titre géant, ouverture en étude de cas plein écran |
| Contact en très grand corps | « Construisons ensemble une marque qui marque. » |
| Pied de page en liste typographique | Instagram / Behance / LinkedIn / Email / Contact, marquee « Du concept à l'impact / » |
| Défilement à inertie | Lenis + GSAP ScrollTrigger, épinglages, défilement horizontal de la méthode |

## 4. Architecture des sections

1. Préchargeur (≤ 2,4 s, une fois par session ; version courte ensuite).
2. Hero — marbre, titre géant, positionnement, badge, navigation.
3. Bandeau marquee — vitesse liée au défilement.
4. Le studio — grande phrase révélée mot à mot, trois colonnes Branding /
   Identité visuelle / Digitalisation.
5. Expertises — épinglé : 01 Stratégie, 02 Branding, 03 Identité, 04 Digital,
   05 Expérience.
6. La méthode — défilement horizontal épinglé : 01 Comprendre, 02 Structurer,
   03 Créer, 04 Déployer, 05 Transformer.
7. Réalisations — titre géant, carte Imora Rituals, étude de cas plein écran
   (huit écrans iPhone 17 Pro et deux produits), puis les six univers en
   liste typographique.
8. Manifeste — feuille Ivoire qui se déploie, lignes révélées au défilement.
9. Contact — deux lignes géantes, courriel, bouton.
10. Pied de page — révélé par-dessous, le marbre revient, liste des réseaux.

## 5. Système d'animation

- `data-anim="words|lines|up|mask"` : révélations génériques (masque, décalage,
  stagger), déclenchées à l'entrée dans l'écran, une seule fois.
- `data-parallax="0.15"` : déplacement vertical lié au défilement.
- Épinglages : expertises (progression → index actif), méthode (horizontal).
- Transitions : marbre qui s'éloigne après le hero et revient au pied de page,
  feuille Ivoire du manifeste qui se déploie, carte de cas qui devient l'étude
  de cas (clip-path), pied de page révélé.
- Curseur : point + cercle, mots « Voir », « Explorer », « Ouvrir ».
- Liquide (refonte 2) : la fresque de fond et l'écran de l'iPhone sont rendus
  en WebGL et ondulent sous le pointeur, comme les visuels de projets de
  Synchronized (carte de flux accumulée, déplacement d'UV, aberration
  chromatique légère). Desktop seulement ; repli : la vidéo telle quelle.
- Skew : les grands titres s'inclinent avec la vélocité du défilement.
- Tout en `transform`, `opacity`, `clip-path`, plus la toile liquide.
  `prefers-reduced-motion` : tout est visible, rien ne bouge.

## 6. Responsive

- ≥ 1100 : expérience complète.
- 900–1100 : mêmes sections, corps réduits, méthode horizontale conservée.
- < 900 : plus d'épinglage ; expertises et méthode en vertical ; navigation
  en menu plein écran ; marquee et parallaxe allégés ; curseur natif.

## 7. Performance

- Trois librairies locales (GSAP 3.13, ScrollTrigger, Lenis), pas de build.
- Images en `loading="lazy"`, vidéo `preload="auto"` seulement sur le hero.
- Une seule boucle `requestAnimationFrame` (GSAP ticker) pilote Lenis, le
  curseur et le marbre. Aucun recalcul de layout dans les boucles.
