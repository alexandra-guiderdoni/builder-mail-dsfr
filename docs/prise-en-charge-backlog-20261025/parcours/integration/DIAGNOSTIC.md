# Deux échecs du gate intégré : attentes et navigation d’aperçu

Ce document conserve la phase de diagnostic. Les corrections et vérifications effectuées ensuite sont décrites dans [DELTA-FINAL.md](DELTA-FINAL.md).

Deux causes distinctes sont observées. La réparation des intitulés utilise une condition trop faible. Le test de frappe révèle, sous ralentissement Chromium, un aperçu réellement resté sur l’ancien document ; précharger cet aperçu dans le test masquerait ce cas.

## Intitulés : attente satisfaite avant la treizième réparation

Gate Mac : `tests/link-labels-browser.test.cjs:102`, `locator.evaluateAll: Execution context was destroyed`, après l’attente du premier lien actif. Journal initial : `/tmp/builder-backlog-tests-final-20261025.log`.

Sonde copiée dans `link-labels-probe.test.cjs`, sans modification du test hôte. Le callback du dernier `requestAnimationFrame` de l’aperçu est retenu à la frontière navigateur, puis libéré explicitement. Aucun délai fixe supplémentaire.

- `links-held-red.log` : l’attente du premier lien passe, mais l’oracle original reçoit **12 URL au lieu de 13**. La sauvegarde est terminée et les treize valeurs du modèle sont réparées ; l’aperçu précédent garde un placeholder.
- `links-held-red/links-after-weak-wait.json` : DOM effectivement interrogé et URL du document.
- `links-held-release.log` : après libération, **13 liens**, URL exactes et tous les intitulés « Lire le dossier réparé » sont observés. `links-held-release/links-after-release.json` conserve les deux nombres.

Cela prouve une attente insuffisante, sans prétendre reproduire exactement l’exception de navigation du gate. Le correctif proposé doit attendre le document demandé et les treize intitulés complets, puis recueillir le snapshot et vérifier les URL/intitulés sans séparer l’attente d’état et la lecture par une fenêtre de navigation.

## Frappe : le nouveau src ne devient pas le document chargé

Gate Linux Node 24.18.0 : `typing-performance-browser.test.cjs:201`, timeout de 30 secondes sur le titre attendu. Le premier rejeu instrumenté Mac passe. Trois rejeux instrumentés Linux passent également ; leur instrumentation ajoutait une évaluation après `open()`, qui peut laisser le document initial finir de charger. Ces passages ne réfutent pas la course initiale.

L’instrumentation suivante est installée avant navigation, sans attente supplémentaire après `open()`. Chromium est ralenti par `Emulation.setCPUThrottlingRate`, facteur 6, dans le seul contexte jetable de la sonde. Les délais du test restent inchangés.

`typing-cpu6.log` et `typing-cpu6/typing-failure.json` reproduisent le timeout. À l’expiration :

- le modèle contient le sujet terminé par « puis bloc déplacé » ;
- l’attribut `iframe.src` contient le **blob 2** demandé ;
- le frame courant, non détaché, expose toujours le **blob 1**, titre « Mon premier courriel », `readyState:complete` ;
- le blob 2 est assigné à **843,9 ms**, avant le premier événement load à **855,1 ms** ;
- ce load est enregistré par le parent avec le src courant, mais la navigation observée par Playwright reste celle du blob 1 ; aucune navigation vers le blob 2 ne suit pendant 30 secondes.

Le Frame interrogé n’est donc pas simplement une ancienne référence détachée : le frame courant est réellement resté sur le document précédent. La sonde ne démontre pas encore le mécanisme interne du navigateur qui perd cette navigation, ni la correction produit à retenir.

Contrôle : `typing-cpu6-initial-loaded.log` passe avec le même facteur 6 quand le document initial est attendu avant la frappe. Le JSON associé montre ensuite la navigation vers le bon blob et le bon titre. Cela localise le scénario à un rafraîchissement demandé pendant le chargement initial. Ajouter seulement cette attente au test hôte donnerait un passage au vert en excluant le scénario défaillant.

Discrimination supplémentaire : `typing-cpu6-no-revoke.log` reste rouge quand la sonde neutralise uniquement `URL.revokeObjectURL` dans son contexte jetable. Le frame courant reste encore sur le blob précédent alors que son attribut src désigne le nouveau. La révocation immédiate du précédent blob n’est donc pas une explication suffisante. Cette modification de frontière navigateur est limitée à la sonde et n’est pas proposée comme correctif.

Les journaux Linux ciblés sont dans `../linux/integration-probe/` : Node officiel 24.18.0, même image/droits que la qualification Linux précédente ; aucune nouvelle suite complète. Le conteneur jetable s’est terminé après trois ciblés réussis.

## Commandes discriminantes

```sh
PREVIEW_HOLD_FINAL=hold MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/parcours/integration/links-held-red node --test --test-reporter=tap --test-name-pattern='ancien JSON' docs/prise-en-charge-backlog-20261025/parcours/integration/link-labels-probe.test.cjs
PREVIEW_HOLD_FINAL=release MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/parcours/integration/links-held-release node --test --test-reporter=tap --test-name-pattern='ancien JSON' docs/prise-en-charge-backlog-20261025/parcours/integration/link-labels-probe.test.cjs
PREVIEW_CPU_RATE=6 MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/parcours/integration/typing-cpu6 node --test --test-reporter=tap --test-name-pattern='rafraîchissement complet' docs/prise-en-charge-backlog-20261025/parcours/integration/typing-probe.test.cjs
PREVIEW_CPU_RATE=6 PREVIEW_WAIT_INITIAL=1 MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/parcours/integration/typing-cpu6-initial-loaded node --test --test-reporter=tap --test-name-pattern='rafraîchissement complet' docs/prise-en-charge-backlog-20261025/parcours/integration/typing-probe.test.cjs
```

À ce stade, aucun fichier de code ou test hôte n’a été modifié dans cette phase. La correction des intitulés attend le signal de fin de matrice ; la navigation perdue exige une coordination produit explicite. Ce delta est postérieur à l’audit natif de la candidate gelée.
