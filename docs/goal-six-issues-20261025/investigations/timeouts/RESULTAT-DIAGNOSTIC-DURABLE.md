# #145 — diagnostic durable du test, sans correction produit

Le test courant d’export dispose maintenant d’un diagnostic pour sa prochaine exécution CI. Les seules sources modifiées sont `tests/export-names-browser.test.cjs` et le nouveau helper `tests/export-diagnostics.cjs`. Aucun commit, push, déploiement, rejeu CI ou changement de produit effectué. **#145 reste ouvert : ce complément n’établit ni ne corrige la cause historique.**

## Ce qui sera visible au prochain échec

Avant/après les `await` d’activation et de confirmation, le test enregistre une phase synchrone côté Node. La réception du téléchargement est aussi enregistrée, sans ajouter d’attente. Le diagnostic indique la dernière phase du parcours, le sélecteur et le nom de cas déjà utilisés par le test. Il rend explicitement visibles **nom, message et stack de l’erreur primaire**, même si le rejet vient de `click` ou `confirmChecks` ; `Error.cause` est conservé en complément.

Le helper observe les événements pertinents du document principal : export, clic dans la confirmation, soumission, fermeture/annulation, changement d’état du dialogue, téléchargement et erreur de page. Chaque liste est limitée à100 entrées. Une seule lecture navigateur rassemble événements, élément actif, dialogue et focus, ainsi que les anciens champs `notice`, `error`, `checkDialog` et `focused`. Le catch du test ne fait plus de lecture `pageState` séparée. Aucune bibliothèque, contenu du courriel, capture visuelle ou HTML complet n’est collecté. Aucun routage, remplacement de primitive navigateur, action, retry, modification des délais fonctionnels, écriture de fichier ou lecture de données applicatives supplémentaire dans le helper. La collecte n’est publiée que dans le TAP d’un échec.

La lecture diagnostique est désormais bornée par une **deadline Node de 1000 ms**, uniquement après l’échec. Si le renderer ne répond pas, un repli `unreadable` remplace les deux vues du snapshot, avec l’erreur primaire, son nom/stack, le nom du cas, le sélecteur et les phases conservés. Le timer est libéré dans `finally`, y compris si la lecture termine avant la deadline ; le rejet tardif de la lecture reste observé. Aucun timeout d’action ou d’assertion du parcours n’est augmenté.

Le rejet de `page.waitForEvent('download')` est observé immédiatement par un handler sans relance d’exception. Cela évite de laisser cette attente produire un rejet non observé si l’activation échoue d’abord et que le contexte est fermé. **La promesse originale n’est pas remplacée ni convertie en succès : elle reste celle passée à `confirmChecks` puis attendue dans le parcours normal.** Son rejet reste donc un échec du test lorsqu’il est atteint.

## Vérifications exécutées

Sur macOS arm64, Node24.18.0 et Playwright1.64.1 existant :

| Contrôle | Résultat |
|---|---|
| Fichier courant complet : noms d’exports + accueil, Chromium et WebKit | **4/4 réussis**, 7,794s, aucun skip/annulation |
| Copie jetable avec rejet artificiel de l’activation `export-mail` | **1 échec attendu**, 0,491s, code1 |
| Contre-épreuve sous `--unhandled-rejections=strict --trace-warnings` | erreur primaire et `lastPhase:before-click` visibles ; aucune erreur `unhandledRejection`/`uncaughtException` ni activité tardive signalée |
| Faux `page.evaluate` jamais résolu, mode strict | retour du helper en **1003,3 ms**, une seule lecture, repli `unreadable`, erreur primaire et phases conservées |
| Faux snapshot immédiat | forme `browser`/`state` conservée, une seule lecture ; timer de deadline supprimé |
| Ressources timer du probe | **0 avant / 0 après**, processus terminé naturellement |
| Sources | assertions, noms attendus, cas, date, sélecteurs et paramètres d’attente préservés ; SHA inchangés après essais |

La contre-épreuve remplace seulement, dans une copie ignorée, l’activation initiale par `CONTROL145_ACTIVATION_REJECTED`. Le téléchargement est déjà écouté ; la fermeture du contexte reste celle du catch original. Le TAP conserve la stack du rejet d’activation, son sélecteur et le nom « Édition & <dossier> \"suivi\" ». Le verdict rouge reste rouge. Le rejet ultérieur de l’attente de téléchargement n’est pas journalisé séparément ; l’absence de rejet non observé est contrôlée par le mode strict et le résultat TAP. **Ce rejet artificiel vérifie le diagnostic ; il n’est pas présenté comme la cause historique.**

Commande réellement exécutée, contenant les trois invocations exactes :

```sh
sh docs/goal-six-issues-20261025/investigations/timeouts/durable-diagnostic-proof/commands.sh
```

Preuves : `durable-diagnostic-proof/current-four.log`, `activation-rejection.log`, `counterexample-only.diff`, `counterexample-verification.json`, `snapshot-deadline-probe.cjs`, `snapshot-deadline.log`, `source-proof.json` et `RECU-SHA256.json`. Les copies jetables sont sous `counterexample/`, ignorées ; aucun autre test n’est ajouté à la suite. Les quatre tests et les contre-épreuves ont été réexécutés après cette révision de deadline. Le probe du snapshot est une preuve jetable sous `docs/`, pas un test permanent ni une exécution navigateur. Les sources suivies hors des deux fichiers autorisés et les documents concurrents ont été préservés.

Le résultat vert valide la compatibilité du diagnostic avec ces quatre parcours locaux. Il ne remplace pas une observation du prochain échec CI. La collecte ajoute une instrumentation de test et peut modifier légèrement le timing ; aucune causalité n’est déduite du seul focus final sur `preview`.
