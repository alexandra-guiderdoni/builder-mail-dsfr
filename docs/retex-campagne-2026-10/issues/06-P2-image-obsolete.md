# [P2] Ignorer une image chargée pour un document ou une sélection devenus obsolètes

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **confirmé par la simulation indépendante Astra ASTRA_T01_STALE_IMAGE_APPLIED_AFTER_REPLACE**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Le chargement d’image ne retient que l’identifiant du bloc avant les opérations asynchrones FileReader et decode. Après remplacement du document, le même identifiant peut désigner un bloc neuf. Le résultat ancien est alors appliqué et autosauvegardé dans ce nouveau document.

## Reproduction

1. Charger l’exemple et sélectionner une image pour le bloc `image-1`.
2. Retenir la résolution de `Image.decode()` dans un test contrôlé.
3. Activer « Charger l’exemple » avant la fin du décodage.
4. Laisser se terminer le chargement d’image initial et inspecter le nouveau document et sa sauvegarde.

**Résultat actuel :** L’image sélectionnée pour l’ancien document est appliquée au nouveau bloc `image-1` et sauvegardée.

**Résultat attendu :** Seule la dernière sélection encore pertinente pour le document courant peut modifier le bloc.

## Correction recommandée

Ajouter un jeton de génération du document et un numéro de requête par bloc. Les vérifier après chaque attente avant d’appliquer le résultat. Invalider les requêtes lors d’un remplacement ou d’une suppression ; traiter aussi deux sélections concurrentes sur le même bloc.

## Critères d’acceptation

- [ ] Une image sélectionnée avant un reset/import/restauration ne modifie pas le nouveau document.
- [ ] Si A démarre avant B mais finit après B, la sélection B gagne.
- [ ] Un bloc supprimé ou recréé avec le même identifiant ne reçoit pas de résultat ancien.
- [ ] Aucun résultat obsolète ne déclenche d’autosauvegarde ni de message de réussite trompeur.

## Tests à ajouter

Tests avec FileReader/decode différés et ordre de résolution inversé, puis test navigateur avec image réelle. La preuve Astra utilise un decode simulé et ne prétend pas valider le décodage d’un PNG réel.

## Références précises

- [prototype/source/editor.js, lignes 41 à 41](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L41-L41)
- [prototype/source/editor.js, lignes 47 à 54](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L47-L54)
- [prototype/source/editor.js, lignes 64 à 67](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L64-L67)
- [prototype/source/editor.js, lignes 90 à 92](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L90-L92)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
