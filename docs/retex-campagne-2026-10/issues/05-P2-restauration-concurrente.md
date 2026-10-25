# [P2] Préserver les éditions intervenues pendant la restauration du brouillon

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **confirmé par simulation T05_PENDING_RESTORE_OVERWRITES_EDIT avec lecture retardée**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

L’action « Rouvrir le brouillon » attend `load()` puis remplace le document sans vérifier si l’utilisateur a continué à modifier la composition. Le chargement initial possède déjà une protection par révision, absente de la restauration explicite.

## Reproduction

1. Préparer un brouillon intitulé « Ancien ».
2. Déclencher « Rouvrir le brouillon » en retardant de façon contrôlée la réponse du stockage.
3. Avant sa résolution, saisir « Nouveau » dans le titre.
4. Résoudre la lecture avec le brouillon « Ancien ».

**Résultat actuel :** Le titre affiché redevient « Ancien » et l’aperçu suit cette ancienne version ; le stockage peut pourtant contenir « Nouveau ».

**Résultat attendu :** Une lecture devenue obsolète ne remplace pas une édition plus récente.

## Correction recommandée

Capturer une révision ou un jeton d’opération avant la lecture et vérifier sa validité avant de remplacer le document. Une autre solution est une transition explicitement verrouillée. Indiquer à l’utilisateur si la restauration est ignorée ; ne pas sauvegarder automatiquement une ancienne version pour masquer la divergence.

## Critères d’acceptation

- [ ] Une modification survenue après le début de la lecture est préservée.
- [ ] Le chargement initial et la restauration explicite appliquent une politique cohérente.
- [ ] Interface, aperçu et stockage n’annoncent pas une version différente comme courante.
- [ ] Les erreurs de lecture préservent la composition et restent visibles.

## Tests à ajouter

Test déterministe avec promesse de lecture différée, puis recette navigateur avec stockage réel. Couvrir également deux restaurations concurrentes et le remplacement par import pendant une lecture.

## Références précises

- [prototype/source/editor.js, lignes 92 à 92](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L92-L92)
- [prototype/source/editor.js, lignes 108 à 108](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L108-L108)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
