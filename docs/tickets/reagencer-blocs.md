# Réagencer les blocs par glisser-déposer

Statut : spécifié, non réalisé. Décisions prises en séance [cuisine-moi du 2 novembre 2026](../../cuisine-moi/2026-11-02-glisser-deposer-blocs.md), validées par Alex.

## Problème et résultat attendu

Un bloc ne se déplace que d’un rang à la fois, par « Monter » ou « Descendre » dans son éditeur : remonter un bloc de la position 10 à la position 2 demande 8 activations. Un déplacement raté ne s’annule pas.

L’utilisateur réordonne les blocs directement dans la liste « Composants du courriel » :
- à la souris, il fait glisser une entrée par sa poignée ;
- au clavier et au toucher, il garde « Monter » et « Descendre » et dispose de « Déplacer à la position… » pour un déplacement long en une action ;
- après tout déplacement, « Annuler le déplacement » remet le bloc à sa place.

## Existant à réutiliser

- Le déplacement d’un rang passe par `A.State.change` dans `app/source/editor.js` (actions `up` et `down`). Il est suivi d’un placement du focus et d’une annonce : « Bloc … déplacé, position … » (`A.UI.blockPlace`).
- L’annulation du retrait garde un seul retrait par composition (`A.removed`, `state.js`) et l’affiche dans `#undo-remove-zone` (`view.js`). L’annulation du déplacement suit ce modèle.
- La liste est une liste ordonnée de boutons de sélection (`#block-list`, `fr-raw-list`, `role="list"`), dont chaque libellé porte déjà « n. ».

## Comportements et critères d’acceptation

### Glisser-déposer à la souris

- [ ] Chaque entrée de la liste a une poignée visible, dont le nom accessible désigne le bloc : « Déplacer le bloc n « nom » ». Le reste de l’entrée garde son rôle de sélection.
- [ ] Faire glisser une entrée par sa poignée affiche la position d’insertion pendant le glissement. Le dépôt place le bloc à cette position.
- [ ] Un dépôt à la position d’origine, ou hors de la liste, ne change rien et n’enregistre aucun déplacement.
- [ ] Le glissement fait défiler la liste quand elle dépasse la zone visible. À vérifier sur Chrome, Edge et Firefox.
- [ ] Au toucher, la poignée ne lance aucun glissement ; elle reste masquée ou inactive.

### Déplacer à la position, sans glissement

- [ ] Dans l’éditeur du bloc sélectionné, à côté de « Monter » et « Descendre », « Déplacer à la position… » propose les positions possibles, avec le nom du bloc qui l’occupe. Choisir une position y déplace le bloc en une action.
- [ ] « Monter », « Descendre » et « Déplacer à la position… » constituent l’alternative sans glissement exigée par le critère WCAG 2.2 2.5.7 : toute réorganisation possible par glisser-déposer l’est sans glisser.

### Annuler le déplacement

- [ ] Après tout déplacement (glisser-déposer, Monter, Descendre, Déplacer à la position), « Annuler le déplacement du bloc « nom » » remet le bloc à sa position d’origine.
- [ ] Un seul déplacement est mémorisé par composition. Une action suivante sur les blocs (déplacement, retrait, ajout, duplication) remplace ou retire cette annulation, de la même manière que pour le retrait.
- [ ] Les annulations du retrait et du déplacement ne se contredisent pas. Annuler l’une n’applique jamais l’autre, et une annulation devenue sans objet n’est plus proposée.

### Focus, annonces et persistance

- [ ] Après un dépôt ou un « Déplacer à la position… », le bloc déplacé reste sélectionné. Le focus revient sur sa poignée ou sur le contrôle utilisé, et une annonce donne sa nouvelle position, comme l’annonce existante des déplacements d’un rang.
- [ ] L’ordre obtenu est sauvegardé. Il est conservé après rechargement, export puis import, et dans l’aperçu et les fichiers HTML produits.
- [ ] Un déplacement pendant une saisie invalide ou un chargement d’image suit les gardes existantes : il est refusé avec un message, sans perte de saisie.

## Hors périmètre

- Glisser-déposer dans l’aperçu du courriel : l’iframe reste isolée.
- Glisser-déposer au toucher et au stylet ; à reconsidérer si l’usage tactile apparaît.
- Annulation générale à plusieurs niveaux (Ctrl+Z).
- Déplacement de plusieurs blocs à la fois, ou d’un bloc vers une autre composition.

## Vérifications attendues

- Tests navigateur :
  - glisser-déposer simulé à la souris (Playwright `dragTo`) ;
  - « Déplacer à la position… » au clavier ;
  - annulation de chacune des voies ;
  - dépôt sans effet ;
  - garde de saisie invalide ;
  - persistance après rechargement.
- Non-régression des tests de focus des déplacements (`tests/block-actions-focus-browser.test.cjs`) et de l’annulation du retrait (`tests/undo-remove-browser.test.cjs`).
- Requalification ciblée d’accessibilité :
  - nom des poignées et de « Déplacer à la position… » ;
  - annonces ;
  - critère 2.5.7 ;
  - contraste et taille de cible de la poignée (WCAG 2.5.8).
- Test manuel sur Chrome, Edge et Firefox, pour le défilement pendant le glissement.

## Points ouverts

- Forme de « Déplacer à la position… » : liste des positions ou saisie d’un numéro.
- Durée de vie de « Annuler le déplacement » : jusqu’à l’action suivante, ou disparition après un délai.
- Nombre de blocs d’une newsletter réelle, pour confirmer l’intérêt de « Déplacer à la position… » -> Alex.
