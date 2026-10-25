# Intégration CI proposée — #145

Branche dédiée `diag/issue-145-destinations`, base `0b7adc7f18355e740f144b379f7930bf4c8c23de`. Préparation uniquement : aucun commit, push, dispatch, installation ou test navigateur réalisé ici. Le workflow `pages.yml` de cette branche remplace les jobs de publication par un unique job manuel ; aucun déploiement, déclenchement push, permission d’écriture ou annulation concurrente.

Le paquet `probe/` reste exactement celui de la revue Astra : 32 entrées plus `MANIFEST.json`, SHA du manifeste `59c9d711e9c59fe60982e559af79ee5234c1a6fc729bc423f5d11b2351c0df2f`. La revue de ce paquet ne vaut pas encore revue de ce YAML.

Ordre prévu :

1. Créer un répertoire exclusif sous `RUNNER_TEMP`, avant tout checkout.
2. Checkout du sujet 0b7adc7 à la racine `GITHUB_WORKSPACE`, puis checkout sparse du SHA diagnostic dans `.diagnostic-source`, sans identifiants persistés.
3. Node 24.18.0 ; relever et vérifier Ubuntu 26.04/x64, conserver ImageOS/ImageVersion et les SHA sujet/diagnostic. `ubuntu-latest` est gardé comme dans l’original ; si ce label ne fournit plus Ubuntu 26.04, le garde-fou arrête le job avant le test.
4. Vérifier le manifeste gelé, ses 32 fichiers, les quatre SHA d’entrée, puis appliquer seulement les trois overlays. Vérifier trois SHA après copie et les deux invariants portable/diagnostic ; conserver l’URL file racine effective.
5. `npm ci --ignore-scripts` depuis le verrou du sujet, Playwright/Core 1.64.1 vérifiés ; installer Chromium **et WebKit** avec `--with-deps`, comme la CI originale. Le JSON des navigateurs est la déclaration statique du paquet, pas une interrogation de navigateur lancé.
6. Revérifier les sources juste avant l’unique commande TAP et les fichiers package/verrou. La regex exacte sélectionne Chromium parmi quatre tests déclarés ; les noms exclus ne sont pas arbitrairement comptés comme skips. Les neuf noms et 27 exports restent une progression maximale, interrompue normalement au premier échec.
7. Copier immédiatement `PIPESTATUS` après le pipeline ; conserver les deux codes et propager d’abord l’échec du test, sinon celui de `tee`. Sceller les fichiers disponibles et uploader avec `always()`, y compris après échec de préparation/test. Le plafond de job est 30 minutes, sans modifier les attentes fonctionnelles. Une coupure forcée peut empêcher la finalisation ; `always()` ne promet pas une collecte après disparition du runner.

La sortie `observer/` est laissée inexistante jusqu’au collecteur. Les logs et reçus sont hors checkout, donc préservés si le checkout racine nettoie son contenu. Aucun `browser.version`, screenshot, EFP, geste supplémentaire ou retry. La sonde garde ses deux RPC de préparation avant navigation et son relevé intrusif dans le `look` existant ; runner, charge, sélection et observation peuvent encore différer du run rouge.

Une réussite reste une non-reproduction ; une erreur de sortie/installation du collecteur invalide l’observation même si le test passe. Lire séparément TAP, erreurs primaires et trace de destination, sans inférer absence d’événement lorsque le transport reste inconnu. Aucun rejeu automatique.

Contrôles de préparation : six tests purs de garde-fous, parsing YAML local, syntaxe Bash de chaque bloc, parsing Python, diff sans erreur d’espacement. Les copies des 32 entrées sont identiques ; les 16 tests purs de la sonde avaient été rejoués par la revue indépendante. Pas d’actionlint disponible, ni validation distante GitHub à ce stade. Preuves détaillées conservées hors checkout dans `builder-145-destinations-ci-validation-20261026/` ; la revue YAML indépendante précède toute publication par root.

La synchronisation vers l’autre Mac est reportée : ce worktree diagnostic local est préparé pour une revue ciblée, sans mutation du harnais ni mandat de synchronisation.
