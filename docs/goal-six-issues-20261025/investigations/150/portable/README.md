# #150 — Reproduction portable : une qualification locale positive

Ce paquet autonome a reproduit **un clic complet dans l’iframe au second cycle modal**, sans charger le builder. Une seule qualification native a été exécutée dans le dossier d’étude initial, le 25 octobre 2026 de **21:49:57.421676 à 21:49:59.871983 UTC**. Ce dossier publié est une copie : ses nouveaux chemins et URL `file:` n’ont pas été exécutés en navigateur.

The standalone package recorded one complete child click during the second modal cycle in one local qualification. The published copies have not been rerun. This is an observation, not a deterministic reproduction guarantee, an internal-cause attribution or a product fix.

## Installer localement et lancer une fois

Depuis ce dossier, avec Node24.18.0 pour retrouver la version observée (minimum déclaré : Node20) :

```sh
npm ci --ignore-scripts --no-audit --no-fund --cache .npm-cache
npm test
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" ./node_modules/.bin/playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" node run.cjs --run-once ./result-new
```

`result-new` doit être inexistant. **Ne pas utiliser `result-once` : il contient la preuve archivée.** Playwright1.64.1 est épinglé par le package, le lock et une assertion runtime. Les téléchargements exigent le réseau ; cache npm et navigateurs restent dans les dossiers locaux indiqués. Aucun installateur de dépendances système n’est inclus. `node_modules`, `.browsers` et `.npm-cache` ne sont pas distribués ici.

La recette installe deux paquets puis Chromium et ses composants locaux. Le runner crée son propre navigateur/contexte, ferme uniquement ce Browser dans `finally`, refuse un dossier de sortie existant et ne relance pas automatiquement. Son import ne lance rien. Les contrôles positifs utilisent l’actionnabilité native du locator ; le fond reçoit un `page.mouse.click(1365,990)` brut par cycle. Les fichiers de runtime, package et lock sont identiques à ceux de la qualification.

Installation and execution commands above are for a future run in a fresh output directory. They were not rerun from this publication path. Exit0 means the protocol completed; inspect the finding and errors. Do not retry automatically after an inconclusive or negative observation.

## Preuve exécutée et limites

Le [résultat natif exact](result-once/result.json), les reçus [attempt](qualification/attempt.json)/[execution](qualification/execution.json), les stdout/stderr vides, le [rapport de qualification](qualification/RESULTAT.md) et la [revue indépendante](qualification/REVIEW.md) sont conservés. Le [manifeste natif](qualification/MANIFEST.json) vérifie les six pièces contemporaines.

<!-- PDG-LARGE-FILE-JUSTIFICATION: result-once/result.json est une preuve native intégrale conservée à l’octet ; le découper modifierait son empreinte. CURATION.json garde dans un seul reçu les correspondances mécaniques source/destination nécessaires à la vérification inverse des copies. -->

| Métadonnée enregistrée | Valeur |
|---|---|
| Plateforme / architecture | darwin / arm64 |
| osRelease | 25.5.0 — aucun numéro commercial macOS déduit |
| Node / Playwright | v24.18.0 / 1.64.1 |
| Chromium | 156.0.8078.4 |
| Annuler : avant / sous modale / après | 1 / 1 / 2 |
| Confirmer : avant / sous modale / après | 3 / 4 / 5 |

`finding.routingObserved=true`,33 événements collectés, cinq clics enfant trusted distincts, compteur parent5 et dernier ACK enfant5 réconciliés ; `errors=[]`, `cleanupError=null`, `dropped=0`. Les séquences23–27 contiennent les événements de fond dans l’enfant. Les numéros sont les champs `sequence`, pas les lignes physiques du JSON.

**Les logs d’installation et du npm test post-installation ne sont pas archivés.** Leurs succès sont des attestations de l’opérateur, distinguées des reçus natifs vérifiés par la revue. Aucune intégralité de trace d’installation n’est revendiquée. Le log de préparation sous `results/` concerne les tests purs antérieurs ; il ne remplace pas un log d’installation.

Le finding compte les clics complets : `false` n’exclurait pas un appui partiel, comme l’illustre [l’étude R5](../README.md). Les lectures de style/layout/elementFromPoint et les ACK modifient le timing. Les coordonnées sont synthétiques ; la modalité accompagnant un message enfant est observée à réception parent. La réconciliation des clics et `dropped=0` ne certifient pas l’intégralité de toutes les autres familles d’événements. `isTrusted` ne prouve pas un geste humain ; `blob:null` ne démontre ni OOPIF ni widgets séparés. Aucun taux, déterminisme, mécanisme interne Chromium/Playwright ou correctif n’est établi.

## Intégrité et vérifications sans navigateur

`npm test` exécute21 tests purs sans résoudre Playwright ni lancer de navigateur ; aucune installation n’est nécessaire pour ces tests Node. Ils vérifient notamment la reconstruction inverse du runner historique, les fixtures, les entrées exactes du lock, l’import sans effet et les cinq clés de métadonnées autorisées. Le [log de curation](publication-checks.log) est distinct des logs historiques.

Le [reçu de curation](CURATION.json) donne pour chaque copie sa source, sa destination et son SHA ; [SHA256.json](SHA256.json) couvre les fichiers publiés hors lui-même. Les fichiers historiques [préparation](provenance/preparation-RESULTAT.md), [README initial](provenance/preparation-README.md) et [manifeste initial](provenance/preparation-MANIFEST.json) restent inchangés sous `provenance/`. Leurs champs `browserExecuted:false`/`dependenciesInstalled:false` décrivent **l’état avant qualification**, pas l’état actuel. Les chemins de ce manifeste se relisent via la correspondance de CURATION.json.

Des chemins techniques historiques `/Users/alex/...` sont conservés dans la provenance et les revues ; ils ne servent pas à résoudre Playwright dans le runner portable. Aucun credential, dump d’environnement ou donnée métier n’est inclus. Cette publication builder n’est ni un envoi upstream, ni une clôture de #150, ni une autorisation de campagne supplémentaire.
