# Revue et issues du builder mail DSFR

Ce dossier contient 13 issues prêtes à publier, le rapport de revue indépendante avec Astra et les preuves exécutables.

Dépôt : https://github.com/alexandra-guiderdoni/builder-mail-dsfr
Branche examinée : prototype/portabilite-courriel
Commit : c329339aee8e6ba36288197ab22000772bb248ae
Date : 22 octobre 2026

## Publier les issues à la main

1. Ouvrir le fichier `issues/INDEX.md` et choisir une issue.
2. Ouvrir https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/new .
3. Copier la première ligne du fichier de l’issue dans le titre GitHub, sans le caractère `#` initial.
4. Copier tout le reste dans la description GitHub.
5. Vérifier l’aperçu et créer l’issue.
6. Recommencer pour les autres fichiers. Une recherche des titres avant création évite les doublons si quelqu’un en a publié entre-temps.

Aucune issue n’a été publiée pendant cette revue : GitHub a refusé la première création avec « 403 — Resource not accessible by integration ». Le code du dépôt n’a pas été modifié.

Les priorités sont des propositions : F01 est une correction P1 ; Q01 est une qualification P1 distincte des bugs confirmés ; neuf corrections sont P2 et deux améliorations sont P3. Le cache F09 est conditionné à plusieurs déploiements sur la même origine. L’index suit l’ordre du rapport ; il ne remplace pas l’ordre de traitement conseillé dans celui-ci.

## Contenu

- `rapport-review-builder-mail-dsfr.md` : architecture, sécurité, accessibilité, persistance, tests, compatibilité et limites.
- `issues/` : un fichier par issue et un index.
- `issues-plan.json` : les mêmes textes en données structurées, sans numéro d’issue GitHub inventé.
- `review-artifacts/` : probes du fil principal, résultats et contrôles de génération/intégrité.
- `astra-review/` : reproduction indépendante Astra de la concurrence de chargement d’image.

## Rejouer les preuves dans un dossier de test

Les scripts n’ont aucune dépendance Node externe. Ils attendent une copie du dépôt dans un dossier `review-repo` voisin de `review-artifacts` et `astra-review`. Ne pas les lancer dans un profil de navigateur personnel : ils n’en ont pas besoin.

```sh
git clone https://github.com/alexandra-guiderdoni/builder-mail-dsfr.git review-repo
git -C review-repo checkout c329339aee8e6ba36288197ab22000772bb248ae
node review-artifacts/probes.cjs
node astra-review/image-race.cjs
python3 review-repo/scripts/build.py --check
```

Les probes exécutent du JavaScript réel avec des adaptateurs contrôlés. Elles ne lancent pas de navigateur, n’utilisent pas IndexedDB réel et ne constituent ni un audit RGAA ni un essai Outlook/Mélissa. Elles attestent les défauts de la révision auditée ; après correction, adapter les assertions au comportement attendu.

L’archive ne contient pas de copie du code du dépôt. Les liens des issues pointent vers le commit examiné pour conserver les références de lignes.
