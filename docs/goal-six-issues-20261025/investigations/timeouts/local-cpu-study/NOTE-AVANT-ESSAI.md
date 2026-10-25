# #145 — essai local CPU4, hypothèses avant exécution

Périmètre arrêté avant l’essai : macOS arm64, fixture historique `eadd426befeb39a6e68a14342f9c1a66102ac81d`, instrumentation enrichie `ce1768f2798454326ed1687c37aaf05aa34c8d0d`. Seule nouvelle variable du parcours : `Emulation.setCPUThrottlingRate({rate:4})` via CDP dans le callback `beforeNavigate` déjà utilisé pour fixer la date. Trois replays Chromium au maximum ; arrêt après ces trois cas si aucun échec. Aucun délai événementiel, retry, changement de focus, confirmation, assertion ou timeout ajouté. Aucun changement de produit.

L’objectif est d’obtenir le message primaire discriminant. Un échec sous cette contrainte serait un **stress contrôlé local**, pas la preuve du mécanisme de la CI originelle.

## Hypothèses classées, non établies

1. **Attente de navigation dans l’activation initiale.** Si le parcours reste suspendu dans `locator.press('Enter')`, le message/stack primaire nommera `locator.press`, l’aide `click` et éventuellement l’attente de navigation. La trace peut déjà contenir l’ouverture du dialogue sans confirmation, car l’appel d’activation n’a pas encore rendu la main. Un échec primaire dans un autre appel ne soutiendrait pas cette hypothèse pour le cas observé.
2. **Actionnabilité du bouton de confirmation.** Si `confirmChecks` a commencé son clic mais que la cible n’est pas stable/actionnable, le message primaire nommera `locator.click`, `#check-confirm` et l’attente concernée (stabilité, interception, etc.). L’absence d’événement DOM de clic ne distinguerait pas seule ce cas du précédent.
3. **Attente du téléchargement après le chemin de confirmation.** Si l’expiration vient de l’événement attendu, le message primaire nommera le téléchargement/`waitForEvent('download')` ou l’erreur de `suggested`. Les événements enregistrés permettront alors de vérifier si une soumission et une fermeture ont effectivement précédé l’expiration. Un message de clic ou de touche ne soutiendrait pas cette hypothèse pour le cas observé.

Aucun classement ne provient du seul focus final `preview`. Aucun changement de variante ne sera improvisé si les trois cas restent verts.

## Témoins déjà disponibles, non rejoués

- Historique exact : `../export-historical-full.log`, **1/1** ; fixture `../export-historical/tests/export-names-browser.test.cjs`, environnement dans `../manifest.json`, description dans `../RAPPORT.md`.
- Instrumenté Mac : `../export-traced-local.log`, **5/5** ; fixture `../export-traced/tests/export-names-browser.test.cjs` et préparateur `../prepare-export-traced.py`.

Commandes des fixtures existantes (rappel reproductible, aucun nouveau lancement de témoin ; le stdout conservé ne journalise pas la ligne shell originale) :

```sh
PLAYWRIGHT_MODULE=/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright MAIL_BUILDER_ENGINE=chromium node --test --test-reporter=tap --test-name-pattern='noms des fichiers exportés, trois types d’export \(Chromium\)$' docs/goal-six-issues-20261025/investigations/timeouts/export-historical/tests/export-names-browser.test.cjs
PLAYWRIGHT_MODULE=/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright MAIL_BUILDER_ENGINE=chromium EXPORT_REPLAYS=5 node --test --test-reporter=tap --test-name-pattern='noms des fichiers exportés, trois types d’export \(Chromium\)$' docs/goal-six-issues-20261025/investigations/timeouts/export-traced/tests/export-names-browser.test.cjs
```

L’environnement et la chronologie de ces témoins diffèrent : ce ne sont pas des contrôles causaux simultanés. Leur rôle se limite à documenter les observations antérieures ; le présent essai vise seulement l’erreur primaire sous CPU4.
