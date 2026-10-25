# #145 — premier échec capturé sur CI instrumentée

Le [run 40213294190](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40213294190), au commit diagnostique `53c53183c2413e5983fef79b99c687c68762d90a`, a échoué le 25 octobre 2026 à 16:49:06 UTC. Le scénario Chromium original passe **1/1** ; la copie instrumentée passe **2/5** et échoue **3/5** (rejeux 1, 3 et 4, environ 32–34 secondes chacun), sans skip ni annulation. Il s’agit d’échecs réellement survenus dans le navigateur de la CI, sans panne ni délai injectés ; leur cause précise et leur identité exacte avec l’incident historique restent à démontrer.

Environnement observé : Ubuntu 26.04.1/x64, image `20261023.163.3`, Node 24.18.0, Playwright 1.64.1, Chromium 156.0.8078.4. Le produit et les fichiers historiques proviennent de `eadd426befeb39a6e68a14342f9c1a66102ac81d`. Le manifeste `source-proof.json` est hashé dans `REPRODUCTION-GITHUB-40213294190-SHA256.json` ; ses trois empreintes originales ont été comparées aux blobs Git. La preuve du workflow reconstitue aussi chaque fichier original en retirant uniquement les ajouts diagnostiques déclarés : les assertions, les attentes et la distribution restent identiques.

## Ce que les traces établissent

Les trois erreurs contiennent chacune deux événements capturés : activation `export-mail`, puis ouverture (`toggle`) du dialogue `check-dialog`. Le titre du dialogue est actif à son ouverture. Au constat final, le dialogue est toujours ouvert, la page a le focus et l’élément actif est `preview`. Aucun événement `click` sur `check-confirm`, `submit`, `close` ou téléchargement n’a été capturé ; `outside` est vide.

Cela ne démontre pas que l’aperçu a causé l’échec, ni que la fonction de confirmation n’a jamais été appelée. La trace ne décrit pas les étapes internes de `confirmChecks` et le dernier état de focus ne donne pas l’enchaînement causal. Aucun défaut produit n’est attribué à cet état final.

## Limite décisive et itération suivante

Le catch diagnostique conserve l’exception d’origine dans `Error.cause`, mais le TAP de ce run n’en affiche ni le message ni la stack. Les stacks visibles commencent dans ce catch ; les quelque 30 secondes ne suffisent donc pas à décider si l’échec provient du clic Playwright, de l’attente du téléchargement ou d’une autre étape. L’original non instrumenté n’échoue pas lors de son unique passage ; l’instrumentation peut modifier le timing malgré l’absence de délai intentionnel.

La prochaine itération change **une seule information observable** : le JSON `Forensic145` affichera explicitement `original.name`, `original.message` et `original.stack`. Le `cause` reste conservé. La preuve source du workflow est adaptée au nouveau texte du catch ; aucun retry, appel de confirmation, changement de focus, timeout ou assertion n’est ajouté. Le helper de collecte reste byte-identique à celui du run échoué.

Validation locale de cette itération : syntaxes YAML/Bash/Python/Node et politiques du workflow ; étape de préparation et restitution byte-à-byte des sources exécutée ; conservation du message et de la stack vérifiée sur le seul formatage diagnostique. **Aucun nouveau scénario navigateur ni run CI exécuté par cette itération.**

Les sondes légères `confirmChecks` (entrée, résultat de lecture du dialogue, début/retour/rejet du clic) sont réservées à l’étape suivante après lecture de l’exception primaire. Elles ne sont pas ajoutées simultanément. #145 reste ouvert ; aucune correction produit ni causalité de l’aperçu n’est revendiquée.
