# [P2] Bloquer la diffusion d’une action dépourvue de libellé

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **confirmé par simulation T02_EMPTY_ACTION_ACCEPTED et inspection du HTML généré**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

La validation exige une chaîne pour `title` sans vérifier son contenu. Effacer le libellé d’une action produit un élément `<a href="…"></a>` sans texte ni alternative, tout en conservant ses styles de bouton. Le titre général peut également devenir un `<h1>` vide.

## Reproduction

1. Charger l’exemple.
2. Effacer « Titre ou libellé » du bloc Action, ou saisir uniquement des espaces.
3. Copier ou télécharger le courriel.
4. Inspecter l’ancre de l’action. Effacer aussi le titre du courriel pour vérifier le titre principal.

**Résultat actuel :** Une ancre sans intitulé et, si le titre est effacé, un h1 vide sont produits sans refus.

**Résultat attendu :** Le document de diffusion comporte des actions nommées et une structure de titres pertinente.

## Correction recommandée

Ajouter une validation avant diffusion fondée sur `trim()` pour les libellés requis. Laisser l’effacement temporaire pendant l’édition ; guider la correction et associer l’erreur au champ. Décider explicitement du traitement des titres facultatifs plutôt que d’émettre des titres vides.

## Critères d’acceptation

- [ ] Une action vide ou composée d’espaces empêche la copie et l’export de diffusion.
- [ ] Le champ concerné et le bloc sont identifiés dans l’erreur.
- [ ] Le parcours de correction reste utilisable au clavier.
- [ ] Aucun lien sans intitulé ni titre vide n’est produit dans la sortie validée.
- [ ] Vérifier RGAA 6.2.1 et 9.1.2 ; WCAG 2.4.4 et 2.4.6 selon le contenu.

## Tests à ajouter

Test du HTML pour valeurs vide, espaces et libellé significatif ; parcours navigateur d’effacement, tentative de sortie et correction. Ne pas confondre niveau A/AA WCAG et gravité du ticket.

## Références précises

- [prototype/source/model.js, lignes 19 à 28](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L19-L28)
- [prototype/source/render-mail.js, lignes 13 à 19](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/render-mail.js#L13-L19)
- [prototype/source/editor.js, lignes 27 à 37](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L27-L37)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
