# Reconstruire les contre-épreuves de #145

Les copies `snapshot/` et `counterexample/` sont jetables et ignorées par Git. Leur reconstruction ne lance aucun navigateur et ne remplace pas un fichier existant différent :

```sh
python3 docs/goal-six-issues-20261025/investigations/timeouts/prepare-diagnostic-copies.py
```

Exécuter depuis le checkout de cette publication : le script exige les empreintes des sources examinées. La référence diagnostique `ce1768f` et ses ancêtres doivent être disponibles ; dans un clone superficiel, récupérer explicitement `diag/issue-145-forensic` avant la reconstruction. Les huit fichiers produits sont contrôlés contre les sources/diffs et empreintes enregistrés. [Reçu de reconstruction isolée](reconstruction-verification.json).

Avec Node et Playwright déjà installés, les commandes suivantes rejouent les contrôles. `PLAYWRIGHT_MODULE` peut désigner un module installé ailleurs ; aucune installation implicite :

```sh
node --test --test-reporter=tap tests/export-names-browser.test.cjs
node --unhandled-rejections=strict --test --test-reporter=tap --test-name-pattern='noms des fichiers exportés, trois types d’export \(Chromium\)$' docs/goal-six-issues-20261025/investigations/timeouts/durable-diagnostic-proof/counterexample/tests/export-names-browser.test.cjs
node --unhandled-rejections=strict docs/goal-six-issues-20261025/investigations/timeouts/durable-diagnostic-proof/snapshot-deadline-probe.cjs
EXPORT_REPLAYS=3 node --test --test-reporter=tap --test-name-pattern='noms des fichiers exportés, trois types d’export \(Chromium\)$' docs/goal-six-issues-20261025/investigations/timeouts/local-cpu-study/snapshot/tests/export-names-browser.test.cjs
```

La contre-épreuve d’activation doit sortir **1**, afficher `CONTROL145_ACTIVATION_REJECTED` et `before-click`, sans rejet non observé. Les autres contrôles attendent zéro ; un vert du stress CPU reste une non-reproduction bornée. Les scripts `commands.sh` et `run-local.sh` conservent les commandes réellement exécutées sur le poste d’origine, avec ses chemins locaux.
