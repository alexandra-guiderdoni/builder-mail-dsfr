# #150 — Qualification native unique du paquet portable

**La recette locale fonctionne et reproduit un clic enfant complet au cycle Confirmer.** Ce résultat qualifie cette installation et ce run, pas un taux déterministe, la cause interne ou un correctif produit. Aucun second run.

Installation effectuée dans le dossier candidat possédé : `npm ci --ignore-scripts --no-audit --no-fund --cache .npm-cache` (exit0, deux paquets), puis `PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" ./node_modules/.bin/playwright install chromium` (exit0). Les cibles navigateur et cache npm sont locales à l’étude ; aucun navigateur existant n’a été attaché ni fermé. L’installateur a téléchargé Chromium1248, Headless Shell1248 et FFmpeg1013. `npm test` après installation : 21/21 tests purs verts.

Une seule invocation `PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" node run.cjs --run-once ./result-once`, du 25 octobre 2026, avec reçus `attempt.json` et `execution.json` ; exit0, retries0. Le dossier de sortie nouveau a été créé par le runner, puis le navigateur possédé fermé par son finally. Aucun appel modèle Codex : budget #149 toujours 2/2.

Résultat brut : `../result-once/result.json`. Métadonnées enregistrées : darwin, arm64, osRelease25.5.0, Nodev24.18.0, Playwright1.64.1 ; browserVersion156.0.8078.4. Aucune déduction du numéro commercial macOS depuis osRelease.

| Cycle | Avant / sous modale / après |
|---|---|
| Annuler | 1 / 1 / 2 |
| Confirmer | 3 / 4 / 5 |

33 entrées, dropped0, errors[], cleanupErrornull, aucun primaryError. Au cycle Confirmer, séquences23–27 : pointerdown, mousedown, pointerup, mouseup et click trusted dans l’enfant, cible BUTTON/target630/532. Clic child-1:20, reçu lorsque le parent est open/modal ; la temporalité modale est celle de réception parent. Compteur immédiat4, ACK4 avant fermeture ; cinq clics enfant uniques, compteur parent5 et dernier ACK5 concordent. Le finding historique retourne true.

Les instantanés préalables rapportent :modal, focus H2/title, EFPdialog et pointer-events:none. Ils restent intrusifs et n’attestent pas l’état interne du routage au dispatch. Ce run ne démontre pas OOPIF, widget séparé, geste humain, faute Playwright/Chromium ou disparition des appuis partiels dans un run négatif.

Les sources et le manifeste de préparation demeurent gelés. Les champs browserExecuted:false/dependenciesInstalled:false du manifeste initial décrivent la préparation antérieure, pas l’état après cette qualification ; ils ne sont pas réécrits rétroactivement. Le présent dossier est le reçu ultérieur distinct.

La recette portable et son résultat peuvent maintenant être soumis à une revue indépendante. Aucune publication amont n’est autorisée ou effectuée par cet essai ; aucun patch produit ni clôture de #150.
