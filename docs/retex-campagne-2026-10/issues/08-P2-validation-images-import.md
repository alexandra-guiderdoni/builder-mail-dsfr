# [P2] Valider réellement les images du fichier de travail avant de remplacer le brouillon

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **confirmé par simulation T03_CORRUPT_IMAGE_ACCEPTED ; ce défaut ne démontre pas de XSS**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

La validation d’une composition vérifie seulement la forme de l’URL data et l’alphabet base64. `data:image/png;base64,AAAA` est accepté pour une image ou le logo alors que ses trois octets n’encodent pas un PNG. Contrairement à la sélection de fichier image, l’import JSON ne tente aucun décodage avant de remplacer et sauvegarder le brouillon.

## Reproduction

1. Exporter une composition valide.
2. Remplacer une image ou `logo` par `data:image/png;base64,AAAA`.
3. Réimporter le fichier modifié.
4. Constater que l’import est accepté et que le brouillon courant est remplacé.

**Résultat actuel :** Un fichier de travail aux images corrompues passe la validation et peut remplacer le seul brouillon automatique.

**Résultat attendu :** Toutes les images requises sont vérifiées avant le remplacement atomique du document.

## Correction recommandée

Construire un document candidat ; vérifier les images utilisées et le logo par décodage navigateur, avec type, dimensions et taille bornés ; remplacer seulement après succès intégral. Conserver le modèle de validation sans dépendance au DOM si utile, et ajouter cette validation à la frontière d’import.

## Critères d’acceptation

- [ ] Une fausse image, une image tronquée ou un logo illisible font refuser l’import.
- [ ] Un échec conserve la composition et le brouillon précédents.
- [ ] PNG et JPEG valides restent transportables.
- [ ] Les limites de taille/dimensions sont explicites et l’erreur désigne l’image concernée.
- [ ] Une opération de validation devenue obsolète ne remplace pas un document plus récent.

## Tests à ajouter

Tests de signature/forme et tests navigateur de décodage réel. Vérifier des fichiers avec une seule image invalide parmi plusieurs, puis quota/volume raisonnable sans test destructeur du profil utilisateur.

## Références précises

- [prototype/source/model.js, lignes 9 à 10](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L9-L10)
- [prototype/source/model.js, lignes 17 à 28](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L17-L28)
- [prototype/source/editor.js, lignes 47 à 54](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L47-L54)
- [prototype/source/editor.js, lignes 81 à 84](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L81-L84)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
