# [P2] Permettre de consulter et corriger les liens source des paragraphes importés

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **confirmé par lecture de la chaîne import → édition → rendu**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Un article SNUM devient un bloc texte portant une URL source, utilisée par les sorties HTML et texte. Le formulaire n’affiche pourtant un champ URL que pour les blocs Action. Le titre et le texte peuvent être changés sans que le lien source puisse être corrigé ou retiré depuis l’éditeur.

## Reproduction

1. Importer un paquet SNUM V519 valide contenant un article avec URL.
2. Modifier son titre et son texte.
3. Chercher un contrôle permettant de modifier ou retirer son URL source.
4. Exporter le courriel et constater le lien « Consulter la source » conservé.

**Résultat actuel :** Le lien est dans le document et dans les sorties, mais son champ d’édition est absent.

**Résultat attendu :** Toute URL diffusée par un paragraphe peut être inspectée, corrigée ou supprimée depuis l’éditeur.

## Correction recommandée

Afficher pour les paragraphes un champ « Lien source HTTPS, facultatif ». La suppression doit retirer le lien des sorties HTML et texte. Réutiliser une validation de saisie qui ne reproduit pas F01.

## Critères d’acceptation

- [ ] Le lien importé est consultable et modifiable au clavier.
- [ ] Une URL vide supprime la source du paragraphe.
- [ ] Duplication et déplacement conservent la bonne URL.
- [ ] Export/import du fichier de travail et copie HTML/texte utilisent la dernière valeur validée.

## Tests à ajouter

Tests de mapping SNUM et de l’éditeur : modifier, retirer, dupliquer, réexporter et réimporter une source. Vérifier les deux formats du presse-papiers.

## Références précises

- [prototype/source/model.js, lignes 47 à 56](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L47-L56)
- [prototype/source/editor.js, lignes 35 à 37](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L35-L37)
- [prototype/source/render-mail.js, lignes 14 à 14](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/render-mail.js#L14-L14)
- [prototype/source/render-mail.js, lignes 27 à 28](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/render-mail.js#L27-L28)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
