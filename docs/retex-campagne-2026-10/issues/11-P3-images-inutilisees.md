# [P3] Ne plus embarquer l’image de démonstration dans les blocs qui ne l’utilisent pas

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P3**
Preuve : **surcharge mesurée par T08_UNUSED_IMAGE_FIELDS ; aucun blocage de performance mesuré**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Le constructeur de bloc ajoute la même image de démonstration à tous les types, y compris texte et action. Le JSON, les copies mémoire et les écritures contiennent donc un champ image inutilisé pour chaque paragraphe. L’import SNUM utilise le même constructeur.

## Reproduction

1. Créer un document avec 30 blocs texte à l’aide du modèle distribué.
2. Sérialiser le fichier de travail.
3. Comparer sa taille avec une copie de mesure où seuls les champs image des paragraphes sont vides.

**Résultat actuel :** La mesure donne 235 533 octets contre 11 673 octets, soit 223 860 octets inutiles dans ce cas synthétique. Cela ne mesure pas une latence utilisateur.

**Résultat attendu :** Seuls les blocs image portent une ressource image ; la compatibilité des fichiers existants est conservée.

## Correction recommandée

Utiliser des valeurs vides ou un schéma adapté par type pour les champs inutilisés. Normaliser prudemment les compositions existantes et éviter une migration qui rejetterait les fichiers version 1 déjà exportés. Mesurer séparément le coût de l’aperçu et de la sauvegarde à chaque frappe avant toute optimisation plus large.

## Critères d’acceptation

- [ ] Les nouveaux paragraphes et actions n’incorporent pas le placeholder inutilisé.
- [ ] Le document avec 30 paragraphes conserve le même rendu et se réduit nettement en taille.
- [ ] Les anciens fichiers de travail restent importables.
- [ ] La normalisation ne retire ni une véritable image ni un lien source.

## Tests à ajouter

Test du contenu sérialisé par type et test aller-retour des anciens fichiers ; mesure de taille reproductible, sans seuil de performance inventé.

## Références précises

- [prototype/source/model.js, lignes 32 à 35](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L32-L35)
- [prototype/source/model.js, lignes 51 à 54](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L51-L54)
- [prototype/source/editor.js, lignes 18 à 26](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L18-L26)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
