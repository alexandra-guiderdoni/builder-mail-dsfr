Glisser-déposer des blocs : notes cuisine-moi
=============================================

Date : 2026-11-02 | Objectif : décider si et comment réagencer les blocs d’une composition par glisser-déposer, sans perdre l’accessibilité acquise.

Cadre : brainstorm demandé par Alex, sans réalisation.

## Résumé / décisions clés

- **Q1, surface : liste des composants.**
  - On fait glisser les entrées de « Composants du courriel » par une poignée visible.
  - « Monter » et « Descendre » restent, et « Déplacer à la position… » s’ajoute pour le clavier.
  - L’aperçu isolé n’est pas touché.
- **Q2, annulation : « Annuler le déplacement ».** Après tout déplacement (glisser-déposer, bouton ou « Déplacer à la position »), un bouton remet le bloc à sa place. Un seul niveau, sur le modèle de « Annuler le retrait du bloc ».
- **Q3, appareils : souris et clavier.** Le glisser-déposer vise la souris sur les postes du parc. Au toucher, Monter, Descendre et « Déplacer à la position… » suffisent ; l’extension à tous les pointeurs viendra si l’usage tactile apparaît.

## Prochaine étape proposée

Spécifier la tranche « réagencer les blocs » :
- poignée de glisser-déposer dans la liste ;
- « Déplacer à la position… » ;
- « Annuler le déplacement » ;
- annonces aux lecteurs d’écran.

Avec ses critères d’acceptation :
- l’ordre est conservé après sauvegarde et rechargement ;
- le focus reste cohérent ;
- WCAG 2.5.7 est respecté grâce aux boutons ;
- aucune régression des tests de focus existants.

Rien n’est réalisé avant validation par Alex.

## État vérifié dans les sources (`main` à `27157fe`)

- **Connu.** Il faut sélectionner un bloc, puis utiliser « Monter » ou « Descendre » dans son éditeur (`app/source/editor.js`). Chaque clic déplace d’un seul rang : remonter un bloc de la position 10 à la position 2 demande 8 activations.
- **Connu.** Après un déplacement, le focus reste sur le bouton utilisé ou passe à son inverse en bout de liste. Ce comportement est testé (`tests/block-actions-focus-browser.test.cjs`, 237 lignes).
- **Connu.** Aucun code de glisser-déposer n’existe : pas d’attribut `draggable`, pas de gestion de pointeur dans l’éditeur.
- **Connu.** Seul le retrait d’un bloc peut être annulé (« Annuler le retrait du bloc »). Un déplacement ne s’annule pas.
- **Connu.** La liste « Composants du courriel » est une liste ordonnée de boutons de sélection (`fr-raw-list`, `role="list"`). L’aperçu est une iframe isolée (`sandbox="allow-scripts"`, sans `allow-same-origin`).
- **Connu, norme.** Le critère WCAG 2.2 2.5.7 « Mouvements de glissement » (niveau AA) exige une alternative à un seul pointeur, sans glissement. Les boutons actuels en tiennent lieu. Le RGAA 4.1.2 repose sur WCAG 2.1 et ne contient pas encore ce critère ; la norme EN 301 549 récente l’intègre.
- **Connu.** Le DSFR ne propose aucun composant de glisser-déposer.
- **Inconnu connu.** Le nombre habituel de blocs par newsletter n’est pas documenté : il conditionne le besoin réel de déplacements longs.
- **Inconnu connu.** L’API HTML de glisser-déposer marche mal au toucher. Une implémentation par événements de pointeur est plus fiable, mais plus lourde.

## Journal questions-réponses

### Q1 - Surface du glisser-déposer
- Question : où le glisser-déposer doit-il agir ?
- Options présentées :
  - Liste des composants.
  - Directement dans l’aperçu, en contournant l’isolation de l’iframe.
  - Sans glisser-déposer : seulement « Déplacer à la position… ».
- Recommandation : liste des composants.
- Capture : Alex retient « Liste des composants ».
  - Le glisser-déposer agit sur les entrées de « Composants du courriel », par une poignée visible.
  - Les boutons « Monter » et « Descendre » restent l’alternative sans glissement exigée par WCAG 2.2 2.5.7.
  - « Déplacer à la position… » s’ajoute pour régler les déplacements longs au clavier en une action.
  - L’aperçu reste isolé : aucun glisser-déposer dans l’iframe.
- Drapeaux :
  - Forme de « Déplacer à la position… » (liste des positions ou saisie d’un numéro) -> conception.
  - Annonce de l’ordre obtenu aux lecteurs d’écran après un dépôt -> conception, réutiliser les annonces existantes.

### Q2 - Annulation d’un déplacement
- Question : que prévoit-on pour un déplacement raté ?
- Options présentées :
  - Annuler le déplacement, sur un seul niveau.
  - Pas d’annulation.
  - Annulation générale à plusieurs niveaux.
- Recommandation : annuler le déplacement.
- Capture : Alex retient « Annuler le déplacement ».
  - Le bouton « Annuler le déplacement » suit tout déplacement, quelle que soit sa voie : glisser-déposer, Monter ou Descendre, « Déplacer à la position… ».
  - Il remet le bloc à sa position d’origine, sur un seul niveau, comme « Annuler le retrait du bloc ».
  - L’annulation générale (Ctrl+Z) reste hors de ce chantier.
- Drapeaux :
  - Durée de vie du bouton : jusqu’à l’action suivante, ou disparition après un délai -> conception, à aligner sur le comportement de l’annulation du retrait.
  - Interaction avec l’annulation du retrait si les deux se suivent -> conception.

### Q3 - Appareils visés
- Question : sur quels appareils le glisser-déposer doit-il fonctionner ?
- Options présentées :
  - Souris et clavier, avec l’API de glisser-déposer du navigateur.
  - Tous les pointeurs, avec des événements de pointeur et un défilement automatique.
- Recommandation : souris et clavier.
- Capture : Alex retient « Souris et clavier ».
  - Le glisser-déposer vise la souris ; le clavier passe par la poignée, les boutons et « Déplacer à la position… ».
  - Au toucher, aucun glisser-déposer : les boutons et « Déplacer à la position… » suffisent.
  - L’extension à tous les pointeurs est reportée, si l’usage tactile apparaît.
- Drapeaux :
  - Défilement pendant le glissement sur une longue liste, l’API native ne le gérant qu’en partie selon le navigateur -> conception, à vérifier sur Chrome, Edge et Firefox.
  - Comportement de la poignée au toucher (masquée ou inactive) -> conception.

## Drapeaux ouverts

- Nombre de blocs typique d’une newsletter réelle -> Alex.
