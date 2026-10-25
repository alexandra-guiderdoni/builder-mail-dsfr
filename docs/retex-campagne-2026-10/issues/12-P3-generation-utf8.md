# [P3] Fixer explicitement UTF-8 et les fins de ligne dans le générateur

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P3**
Preuve : **échec reproduit sous Python 3.12.14 avec locale ASCII contrôlée ; Windows non testé**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Les lectures et écritures texte utilisent les paramètres par défaut de `Path.read_text()`/`write_text()`. Les sources comportent du français et des caractères non ASCII. Le générateur dépend donc de l’encodage de l’environnement ; son caractère déterministe ne garantit pas les mêmes octets entre plateformes.

## Reproduction

1. Sur un environnement POSIX avec Python 3.12, lancer `LC_ALL=C PYTHONUTF8=0 PYTHONCOERCECLOCALE=0 python3 -X utf8=0 scripts/build.py --check`.
2. Comparer avec `python3 scripts/build.py --check` dans l’environnement UTF-8.
3. Pour les fins de ligne, comparer ensuite les octets générés sur Windows et POSIX.

**Résultat actuel :** La première commande échoue avec `UnicodeDecodeError` pendant la lecture de `snum-packet.js`, alors que le contrôle UTF-8 passe. Le comportement Windows reste à qualifier.

**Résultat attendu :** La génération lit et écrit le contrat UTF-8 du dépôt indépendamment de la locale, avec des octets stables.

## Correction recommandée

Passer explicitement `encoding="utf-8"` partout et imposer les fins de ligne lors des écritures. Pour un contrôle strictement déterministe, comparer les octets canoniques plutôt que des textes dont les fins de ligne peuvent avoir été normalisées.

## Critères d’acceptation

- [ ] Le contrôle réussit sous locale UTF-8 et sous locale ASCII contrôlée.
- [ ] Les distributions annonçant charset UTF-8 contiennent des octets UTF-8.
- [ ] La politique de fins de ligne est explicite ; la vérification des octets ne masque pas un écart.
- [ ] Le contrôle est ajouté à la suite ou à une matrice Windows/POSIX proportionnée.

## Tests à ajouter

Rejouer les deux commandes, puis vérifier SHA-256 des sorties d’une génération sur les plateformes mainteneurs. Cette correction ne change pas les prérequis du poste métier.

## Références précises

- [scripts/build.py, lignes 24 à 25](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L24-L25)
- [scripts/build.py, lignes 41 à 44](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L41-L44)
- [scripts/build.py, lignes 80 à 87](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L80-L87)
- [scripts/build.py, lignes 95 à 101](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L95-L101)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
