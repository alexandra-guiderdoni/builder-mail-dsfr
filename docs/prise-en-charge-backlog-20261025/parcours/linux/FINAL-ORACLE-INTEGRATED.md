# Gate Linux final propre : 397/397

La campagne finale du candidat `c43f9e5f67bcee948de67b57d9a51d4b20454bd1ed5a5bdd291de3ecc57b2ec5` réussit : **npm run check code 0**, puis **397 tests réussis sur 397**, aucun échec, annulation, saut ou todo, **code 0**. Durée de `npm test` : **501075,418852 ms**. L’exécution est allée jusqu’au footer sans inspecteur, commande dans les pages, évaluation de secours ou autre intervention. La borne extérieure globale de 900 secondes n’a pas été déclenchée.

Le test complet commence le 25 octobre 2026 à **13:04:39 UTC** ; le reçu final est daté de **13:13:01,658525 UTC**. Aucun autre test ou build n’a été lancé après ce succès.

## Identité et environnement

Le snapshot Linux contient **346 fichiers**. Son manifeste a pour SHA256 `24096427781f1d0aedd9e22425650d4d3d99b962af1c7374e5c0efdfe7c66493`. Les **76 entrées** du manifeste candidat de la racine sont toutes présentes dans ce snapshot avec la même empreinte. Après exécution, les 346 empreintes du snapshot et les 76 de la candidate restent strictement identiques.

- Base Git : `395c08d1dfa4d0b8e41416da798bf0313a8bd379`, branche `fix/backlog-qualification-20261025` ; aucune publication Git effectuée par ce lot.
- Image officielle : `mcr.microsoft.com/playwright@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea`.
- Linux Ubuntu 24.04.5 arm64 / LinuxKit, Node officiel **24.18.0**, Playwright **1.64.1**.
- Navigateurs disponibles vérifiés : Chromium **156.0.8078.4**, Firefox **157.0**, WebKit **27.2**. La suite normale utilise Chromium et ses scénarios explicitement multi-moteurs ; ceci n’est pas une nouvelle matrice complète Firefox/WebKit.
- L’archive Node est contrôlée avec le `SHASUMS256.txt` officiel ; SHA256 `6b4484c2190274175df9aa8f28e2d758a819cb1c1fe6ab481e2f95b463ab8508`.

Cette preuve est une exécution Linux native dans le conteneur arm64 décrit, et non une exécution du runner GitHub Ubuntu.

## Isolation et suppression

Le conteneur unique `builder-final-oracle-node2418-20261025` utilise `--rm --cap-drop=ALL --shm-size=1g`, sans privilège, port publié, socket Docker, profil ou identifiant utilisateur monté. Source montée en lecture seule sous `/source`, seul le dossier de preuves Linux monté en écriture sous `/evidence`. Les fichiers sont copiés et vérifiés dans `/tmp/work` interne, sans `.git` ni node_modules Darwin ; `npm ci --ignore-scripts` installe le verrou.

Le conteneur est sorti naturellement avec le code 0, puis supprimé automatiquement. `container-after.stderr` et le reçu constatent son absence. Les artefacts de tests ont été copiés dans `test-artifacts/`. Aucun autre conteneur, navigateur personnel ou service partagé n’est arrêté.

## Portée du résultat

Les cinq contre-épreuves de ressources, les sept scénarios d’aperçu, l’image tardive avec ses deux decode natifs, les géométries, rafales, messages et sécurité passent dans cette suite globale. Les deux exports complets passent aussi : Chromium 132163,184102 ms et WebKit 102441,627171 ms. Le scénario des 52 blocs passe en 1560,586334 ms et la mesure prématurée en 485,029667 ms, sans secours.

Ce gate valide la candidate avec l’oracle de préparation géométrique explicitement accepté. Il ne résout pas la cause interne des anciennes promesses decode pendantes et ne revendique pas l’équivalence entre disponibilité géométrique et peinture des pixels. Les rapports d’échec et campagnes perturbées restent conservés comme antécédents ; leurs verdicts ne sont pas réécrits.

## Preuves et empreintes

Dossier `final-oracle-integrated/` :

- `RECEIPT.json` : footer exact, codes, absence d’intervention, suppression et intégrité.
- `full.log` : SHA256 `f41224e2f93ed2e24790bca82949eedaf29e6dbae73a38754f7208cbc84348ef`.
- `check.log` : SHA256 `2c5b0592fba6f95b67f8652a4532a338860105551ff0730d53d11a5c3912d63e`.
- `source-manifest.json`, `source-after.json`, `root-candidate-identity.json`, `candidate-correspondence.json` : identité avant/après et correspondance avec la candidate commune.
- `environment.log`, `browser-versions.json`, `selected.sha256`, `container-host-config.json`, `image-digests-after.json` : environnement et isolation.
- `docker-command.json`, `stages.tsv`, `run-linux-final-oracle-integrated.sh` et `run-final-oracle-bounded.py` dans le dossier parent : commandes et borne extérieure.

Voir [RAPPORT-ORACLE.md](oracle-resources/RAPPORT-ORACLE.md) pour le delta, le rouge discriminant et les ciblés 13/13 sur trois moteurs, puis cinq reprises Linux propres. Le reçu macOS final 397/397 est détenu par la racine dans `coordination/gates/macos-final-receipt.json`.
