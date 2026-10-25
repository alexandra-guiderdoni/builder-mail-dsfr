# [P2] Versionner une suite de régression reproductible pour les invariants du prototype

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **absence de suite versionnée et de CI observée ; les recettes antérieures ne sont pas invalidées**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Le dépôt contient des comptes rendus et empreintes, mais les scénarios et preuves brutes annoncés sont dans `evidence/`, exclu de Git. `build.py --check` compare les distributions aux sources ; il ne teste pas l’édition, les imports ou la persistance. L’API GitHub ne retournait aucun workflow de branche, statut publié ni check-run pour le commit examiné.

## Reproduction

1. Cloner le commit examiné.
2. Exécuter `python3 scripts/build.py --check` et les vérifications `node --check`.
3. Chercher les tests de comportement et les scripts de recette cités par la documentation.
4. Constater qu’ils ne sont pas livrés dans l’arbre Git.

**Résultat actuel :** Les contrôles de génération passent, mais un contributeur ne peut pas rejouer les scénarios métier documentés à partir du seul dépôt.

**Résultat attendu :** Les invariants critiques et les corrections disposent d’une procédure de test exécutable versionnée.

## Correction recommandée

Ajouter une suite proportionnée : tests du modèle/rendu, tests déterministes des transitions asynchrones et quelques parcours navigateur à stockage réel. Conserver les données synthétiques et les scripts, sans publier des captures ou des données de messagerie privées. Une CI minimale peut lancer génération, syntaxe et tests hors services externes.

## Critères d’acceptation

- [ ] Une commande documentée lance les tests sans profil utilisateur ni compte de messagerie.
- [ ] Les régressions F01 à F09 sont couvertes au bon niveau, avec tests ajoutés dans les corrections respectives.
- [ ] Un test navigateur contrôle le focus, les imports et la relecture du brouillon avec image.
- [ ] Le hors connexion et le presse-papiers sont testés lorsque le moteur/les permissions le permettent, avec statut « non exécuté » explicite sinon.
- [ ] Les comptes rendus distinguent tests automatiques, simulations et recettes humaines.

## Tests à ajouter

Les probes de la revue sont une base de reproduction à adapter, pas une suite prête à intégrer telle quelle. Ajouter des assertions sur le comportement attendu après correction plutôt que figer le comportement défectueux.

## Références précises

- [docs/RECETTE.md, lignes 9 à 29](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/docs/RECETTE.md#L9-L29)
- [docs/RECETTE.md, lignes 58 à 64](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/docs/RECETTE.md#L58-L64)
- [scripts/build.py, lignes 91 à 102](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L91-L102)
- [.gitignore, lignes 1 à 3](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/.gitignore#L1-L3)

## Périmètre

Outillage de développement seulement : l’application distribuée reste sans dépendance d’installation pour l’utilisateur. La suite n’équivaut pas à un audit RGAA ni à une qualification Outlook/Mélissa.
