# [P2] Conserver le focus sur le bloc manipulé après déplacement, duplication ou retrait

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **confirmé par lecture du parcours ; validation navigateur et lecteur d’écran à réaliser**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Après une opération, `draw()` détruit tous les contrôles des blocs, puis le focus est dirigé vers le premier bouton actif de toute la liste. Le contrôle ciblé ne correspond pas au bloc manipulé. Une nouvelle activation peut agir sur un autre bloc.

## Reproduction

1. Charger l’exemple avec ses trois blocs.
2. Au clavier, atteindre « Monter le bloc 3 » et l’activer.
3. Contrôler l’élément qui reçoit le focus.
4. Activer à nouveau le contrôle focalisé. Répéter avec duplication et retrait, notamment du dernier bloc.

**Résultat actuel :** Le code cible « Descendre le bloc 1 », premier bouton non désactivé, plutôt que l’action du bloc déplacé.

**Résultat attendu :** Un focus cohérent conserve le contexte de l’opération, y compris si le bouton correspondant devient désactivé ou le bloc est supprimé.

## Correction recommandée

Capturer l’identifiant stable du bloc et l’action ; retrouver le contrôle après rendu. Pour une suppression, cibler le voisin logique puis le bouton d’ajout si la liste est vide. Annoncer brièvement le résultat et la position avec la région de statut.

## Critères d’acceptation

- [ ] Un déplacement conserve le focus dans le bloc déplacé sur une cible logique.
- [ ] Une duplication place le focus sur une cible documentée du duplicata ou du bloc source.
- [ ] Après retrait, le focus va au voisin pertinent ; retirer le dernier bloc ne le laisse pas sur le document sans cible.
- [ ] Deux activations successives ne manipulent pas un autre bloc à cause d’un saut de focus.
- [ ] Recette Tab/Maj+Tab/Entrée et lecteur d’écran ; examiner RGAA 12.8.2 et WCAG 2.4.3 sans déduire une conformité globale.

## Tests à ajouter

Tests navigateur vérifiant `document.activeElement`, l’identité du bloc et l’ordre des blocs après chaque action. Compléter par une recette avec VoiceOver et, sur le poste cible Windows, le lecteur retenu.

## Références précises

- [prototype/source/editor.js, lignes 31 à 39](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L31-L39)
- [prototype/source/editor.js, lignes 69 à 80](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L69-L80)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
