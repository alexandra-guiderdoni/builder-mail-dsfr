# Revue bornée de l’oracle de préparation des ressources

Revue indépendante du delta de tests livré par le lot parcours, le 25 octobre 2026. Le relecteur n’a lancé aucun navigateur, test, build ou nouvel audit complet. Seul ce rapport est écrit. Le contrat, le diff et les journaux disponibles sont lus ; les résultats d’exécution restent ceux du lot parcours.

**Verdict : adaptation du contrat géométrique justifiée, sans défaut bloquant identifié dans le delta relu. Efficacité bornée soutenue par cinq reprises natives Linux réussies, soit 65 tests verts, puis par les deux gates globaux macOS/Linux à 397/397 sur la même candidate.**

## Contrat et limites

L’ancien helper attendait le règlement de toutes les promesses `decode()`, mais absorbait leurs rejets. Le nouveau helper ne prétend pas leur être équivalent : il exige des ressources disponibles pour la mesure géométrique, puis attend les polices. Ni les pixels effectivement peints, ni la réussite ou le règlement d’une promesse `decode()` ne sont certifiés par ce nouvel oracle. Le changement de contrat est explicite et limité à cette préparation.

La cause interne du blocage natif de `decode()` reste inconnue. Le rouge sur une image cassée montre une propriété discriminante du nouvel oracle ; il n’est pas présenté comme une reproduction du blocage Linux. La variante séquentielle de `decode()` précédemment essayée a aussi bloqué et n’est pas retenue.

| Affirmation | Source relue | Verdict et impact |
| --- | --- | --- |
| Toutes les images doivent être disponibles | `tests/preview-resources.cjs` | Confirmé : inventaire exact, `complete`, deux dimensions naturelles positives ; aucun filtre de visibilité. |
| Les compositions attendent 24 ou 0 images | `tests/preview-size-browser.test.cjs`, `parcours/linux/image-contract/dom-images.json` | Confirmé : 24 pour tous les composants, 0 pour la composition courte. Le témoin DOM contient les quatre alternatives CSS masquées, indices 1, 3, 20 et 22 ; elles restent contrôlées. |
| Le bon document est mesuré | Helper et appel dans `composition()` | URL exacte, titre et document complet contrôlés avant puis après `document.fonts.ready`. L’assertion finale comparant le document chargé au `src` courant reste présente. |
| Les attentes sont bornées | Helper et diff | Chaque attente du helper a une borne de 10 000 ms, sans récupération d’erreur transformée en succès. Il s’agit de deux bornes successives, pas d’un plafond global de 10 secondes. L’attente préalable du titre est désormais bornée à 10 secondes ; la borne géométrique existante reste inchangée. |
| Les polices sont réellement attendues | Helper et contre-épreuve HTTP | `document.fonts.ready` natif est attendu ; il n’est remplacé ni par un statut ni par une promesse injectée. |
| Les assertions du scénario restent intactes | `preview-size-oracle.diff`, comparaison directe avant/après | Confirmé : géométrie, titre, URL, messages forgés et sécurité inchangés. Le test complet d’image tardive, avec ses deux `decode()` sans absorption des rejets, est identique octet pour octet. |

Le helper ne vérifie pas l’identité de chaque fichier image ni l’égalité des pixels : un remplacement par une autre image valide de même inventaire n’est pas son contrat. Un chargement survenant après son retour relève des assertions ultérieures et du test d’image tardive, conservé.

## Contre-épreuves natives disponibles

Sources : `tests/preview-resources-browser.test.cjs` et journaux sous `parcours/linux/oracle-resources/`. Le nom de ce dossier ne constitue pas une preuve du système d’exécution ; les premiers journaux ci-dessous proviennent du ciblé local Chromium communiqué par le lot parcours.

| Condition | Mécanisme réel et résultat relu |
| --- | --- |
| Image cassée, même masquée | Réponse HTTP 404 ; refus attendu, puis succès après remplacement par le PNG de référence. L’état `complete=true`, largeur naturelle nulle et `display:none` est vérifié. |
| Image manquante | Une image présente pour deux attendues ; refus, puis succès après ajout réel de la seconde. |
| Image en attente | Réponse HTTP retenue ; requête observée, refus et `complete=false`, puis succès après libération ; dimensions 1920 × 1080 vérifiées. |
| Document périmé | Ancien document complet refusé pour la nouvelle URL ; navigation réelle ensuite acceptée. Titre erroné refusé séparément, puis titre corrigé accepté. |
| Polices en attente | Fichier Marianne WOFF2 servi par HTTP et réponse retenue. Le document est déjà complet, sans image, tandis que la police et le FontFaceSet chargent. Refus avant libération ; police chargée et disponible après. |

`red-broken-legacy.log` : **0/1**, échec précis « Missing expected rejection (TimeoutError) » sur l’ancien helper. `counterproofs-chromium.log` : **5/5**, aucun échec, annulation ou skip. La borne de 250 ms appartient seulement aux contre-épreuves négatives ; les témoins positifs utilisent la borne normale. Chaque test possède un témoin positif après restauration, empêchant qu’un helper qui échoue toujours satisfasse la recette.

Les trois journaux `mac-chromium.log`, `mac-firefox.log` et `mac-webkit.log` sont relus : **13/13 par moteur**, aucun échec, annulation ou skip. Ils couvrent les cinq contre-épreuves, les sept scénarios d’aperçu et le contrat bundle/CSP.

Les cinq reprises Linux `parcours/linux/oracle-validation/trial-01` à `trial-05` exécutent les mêmes trois fichiers originaux, sans instrumentation de diagnostic ajoutée : **5 × 13/13 = 65 succès**, aucun échec, annulation ou skip. Le script de lancement, les cinq sorties, les reçus et les vérifications du snapshot sont relus. Chaque reçu constate un code 0, aucune limite externe déclenchée et son conteneur supprimé. Environnement : Linux arm64, Node 24.18.0, Playwright 1.64.1, Chromium 156.0.8078.4. Ce ciblé Linux utilise Chromium ; le relevé des versions Firefox/WebKit n’est pas une exécution des tests dans ces deux moteurs.

Chaque reprise vérifie les **346 empreintes** du manifeste `oracle-validation/source-manifest.json`, SHA-256 `24096427781f1d0aedd9e22425650d4d3d99b962af1c7374e5c0efdfe7c66493`. Leur comparaison aux fichiers courants ne relève aucune différence. Les durées totales ciblées vont de 10,15 à 10,93 secondes. La borne externe vaut 30 secondes pour ces treize tests ; ce n’est pas la même fenêtre que les essais diagnostiques antérieurs sur un test. Les bornes internes de 10 secondes du helper restent intactes.

Cette série soutient une efficacité observée de la nouvelle préparation, face aux blocages antérieurs de `decode()`. Elle ne démontre ni l’absence de toute intermittence, ni la cause interne Chromium, ni une équivalence entre les API.

### Complément après achèvement des gates globaux

Les reçus et les fins des deux journaux complets sont désormais relus :

- **macOS : 397/397**, code 0, aucun échec, annulation ou skip, durée 427 689,876833 ms. Sources : `coordination/gates/macos-final-receipt.json` et `macos-final-npm-test.log`.
- **Linux : 397/397**, code 0, aucun échec, annulation ou skip, durée 501 075,418852 ms. Sources : `parcours/linux/final-oracle-integrated/RECEIPT.json`, `full.log` et `stages.tsv` ; `check` et `full` terminent avec `EXIT=0`. Le reçu constate l’absence d’inspecteur et d’évaluation de secours, aucune limite externe déclenchée et le conteneur supprimé.

Les deux reçus identifient l’overlay `c43f9e5f67bcee948de67b57d9a51d4b20454bd1ed5a5bdd291de3ecc57b2ec5`. La comparaison directe finale des **76 empreintes** aux fichiers courants ne trouve aucune différence ; l’index Git est vide. Le snapshot Linux vérifie aussi ses 346 fichiers. Ce complément lève l’attente des gates, sans réexécution par le relecteur et sans étendre le verdict aux parcours opérateur non exercés.

## Delta et provenance

Le diff depuis `parcours/linux/oracle-resources/preview-size-before.cjs` ajoute seulement l’import du helper, borne l’attente initiale du titre et remplace la préparation `decode()` par l’appel du nouvel oracle. Les autres scénarios du fichier sont inchangés. Les deux nouveaux fichiers portent le helper et ses cinq contre-épreuves.

Comparaison SHA-256 directe : les **39 fichiers `app/`**, sources et distributions incluses, correspondent au manifeste `parcours/linux/final-integrated/source-manifest.json` antérieur à ce delta. Aucun produit ou build n’est modifié par cette adaptation. Empreinte de ce manifeste : `ec19d276f0dd116f322907358748a058b9481ca8bfe3af61a18e99187d11048f`.

L’overlay historique `audit-20261025-115922108-395c08d1`, hash `c257e8483a78695fa29935b8f3db54b11bc9664a69001a5576cde37dbd114a57`, demeure un instantané antérieur. Cette revue ne lui attribue ni le nouveau helper, ni la sérialisation d’aperçu ultérieure déjà examinée dans `SUPPLEMENT-APERÇU.md`. Aucun résultat du vieux run natif n’est réécrit comme une preuve de la candidate actuelle.

L’identité courante figure dans `coordination/gates/final-candidate-identity.json` : overlay `c43f9e5f67bcee948de67b57d9a51d4b20454bd1ed5a5bdd291de3ecc57b2ec5`, 76 fichiers. Depuis le supplément antérieur, seul `preview-size-browser.test.cjs` change parmi les anciens fichiers et les deux fichiers de ressources sont ajoutés.

| Fichier | SHA-256 exact relu |
| --- | --- |
| `tests/preview-resources.cjs` | `58a0faef9f7439003368d2a00253d72bf083e22dcd3457170746e99f13573794` |
| `tests/preview-resources-browser.test.cjs` | `f589d371cc2beabe75ff703e61d0fb7d82abd32daf45aebc41a6b19fb5a8a4df` |
| `tests/preview-size-browser.test.cjs` | `d9a14364def9b68400f16a32aea2503be0479a450a809cd9cb1e78a3d7c5c10b` |
| `parcours/linux/oracle-resources/preview-size-before.cjs` | `30c81a09c525a6407711890eef8bca204f293d4ab28398844a3c25362f64da55` |
| `parcours/linux/oracle-resources/preview-size-oracle.diff` | `aaa9d41322eb36c58ea899f47a6c296e6ad4566f45cb840fb0c0ba8cfc9ab4e5` |
| `parcours/linux/oracle-resources/red-broken-legacy.log` | `78e20c17b9ae8643b3f9a51f338a18c665eba4c7c7d378078b07cca1659f6f5f` |
| `parcours/linux/oracle-resources/counterproofs-chromium.log` | `e8be5980ac0abda7f6fba8de8ca0e47dd872d9fd1a0a00b3e0f79770e717b232` |
| `parcours/linux/oracle-validation/trial-01/targeted.log` | `1b8d006b4c1d0e76a97376e89f005d3982aec96ff3312bf91eef4fe18c405277` |
| `parcours/linux/oracle-validation/trial-02/targeted.log` | `09667ad7933e7cc33b034c1ddb57792214f76810d7997d3ff740cb22b03a2c97` |
| `parcours/linux/oracle-validation/trial-03/targeted.log` | `b8a6e2bea6e32affc9157a658e36de862a73366a335f6bf2cde5ea9d2258fd25` |
| `parcours/linux/oracle-validation/trial-04/targeted.log` | `3572568e6839df5755eee388cb340092e03e00d3f423c792943d2e096b78552d` |
| `parcours/linux/oracle-validation/trial-05/targeted.log` | `3efcef528475d8c0430de0ad78496c50053b52077f1511f5a0606272964f9921` |
| `coordination/gates/macos-final-receipt.json` | `f5adf823a09ef7000c831df29e3557912127a4ff1eb8d957c9c26e0fa75678c4` |
| `coordination/gates/macos-final-npm-test.log` | `e8645af92e7e48ec592acaed03fde1680e728591b65e60c0cc5023d2988f8ba9` |
| `parcours/linux/final-oracle-integrated/RECEIPT.json` | `5e7928ab0e39bfdfa6fd767290c22d8268a3b3f0e0fcee47e6a86d9ca6df197a` |
| `parcours/linux/final-oracle-integrated/full.log` | `f41224e2f93ed2e24790bca82949eedaf29e6dbae73a38754f7208cbc84348ef` |

Contrôles de revue : couverture du delta et des cinq conditions ; rattachement des affirmations aux sources et sorties lues ; conservation des assertions et comparaison des empreintes produit. Aucune qualification Safari natif, Outlook, Mélissa ou parcours de courrier n’est déduite. La cause interne du blocage de `decode()` reste inconnue. La revue du delta est terminée ; la décision de livraison et les limites des autres lots restent du ressort de la racine.
