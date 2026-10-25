# Campagne Linux intégrée finale : gate non acquis

Campagne historique : la candidate ultérieure avec oracle géométrique borné possède désormais un [gate Linux propre 397/397](FINAL-ORACLE-INTEGRATED.md). Les observations et l’absence de footer de cette ancienne exécution restent inchangées.

Suite du diagnostic : [DIAGNOSTIC-141-BOUCLE.md](DIAGNOSTIC-141-BOUCLE.md) reproduit le blocage sans intervention et le localise dans les promesses decode originales. La cause reste ouverte et le gate global reste non acquis.

Le snapshot final n’a pas fourni de footer complet Linux : `npm run check` réussit, puis `npm test` est interrompu avec le **code 143** après deux attentes non bornées dans `tests/preview-size-browser.test.cjs:27`. Aucun compteur complet ne peut être annoncé. Le rejeu ciblé neuf, sans inspecteur ni intervention, réussit **8/8**, sans échec, annulation ou saut, en **8300,592462 ms**, code **0**. Il établit une non-reproduction ciblée ; il ne remplace pas le gate global manquant.

## Contexte et isolation

Les deux exécutions utilisent le même manifeste de 344 fichiers, Node officiel **24.18.0**, Playwright **1.64.1**, Ubuntu **24.04.5 arm64** et l’image `sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea`. Les empreintes hôte sont inchangées après les campagnes. Les versions des navigateurs et la vérification SHA256 du binaire Node figurent dans chaque dossier. Cette plateforme LinuxKit arm64 n’est pas assimilée au runner Ubuntu GitHub.

Les conteneurs `builder-final-integrated-node2418-20261025` et `builder-preview-isolated-node2418-20261025` ont été créés avec `--rm --cap-drop=ALL --shm-size=1g`, sans port, socket ou profil utilisateur monté. Le worktree est monté en lecture seule ; seul le dossier de preuves Linux est en écriture. Ils sont tous deux supprimés. Aucun daemon, conteneur tiers, source produit ou test du worktree n’a été modifié dans cette phase.

## Deux immobilisations observées

La première survient dans « aperçu isolé : 52 blocs jusqu’au pied de page ». L’unique appel Playwright en attente est `Frame.evaluateExpression`. Le document courant correspond à `iframe.src`, son état est `complete`, ses 24 images sont complètes avec dimensions naturelles non nulles, et les fontes sont `loaded`. Le titre est « Composition mesurée ».

L’inspection Node est activée dans ce seul processus possédé, sur boucle locale sans port publié. Une sonde lance de nouvelles promesses `image.decode()` et `document.fonts.ready`, chacune bornée à deux secondes. Les 24 nouveaux décodages résolvent en environ 5 ms et les fontes en 0,2 ms. Les empreintes SHA256 de chaque source, index et dimensions sont consignées. Entre avant et après la sonde, l’appel original `lruu@246` disparaît et l’attente de hauteur commence. Le test passe ensuite en **239131,254567 ms**. La sonde a pu débloquer l’appel : cette campagne est donc perturbée. Cette corrélation ne prouve ni une erreur de décodage ni un défaut du pont Playwright.

La seconde immobilisation survient dans « mesure prématurée », avec un nouveau navigateur et un nouveau blob. L’inspection reste alors côté Node, sans commande dans le document. Les métadonnées serveur confirment exactement :

```js
async () => {
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  await document.fonts.ready;
}
```

L’appel `lruu@689` est situé ligne 27, avec `timeout: 0`. Le protocole Chromium conserve un `Runtime.callFunctionOn` en attente (id 171), contexte principal 3 vivant. Ce n’est pas une fermeture du navigateur ou du serveur HTTP. Ces observations ne séparent pas une ancienne promesse de ressource et une livraison de résultat différée du protocole. Aucune seconde intervention de déblocage n’est tentée. À la demande de la racine, seul le conteneur possédé est arrêté et retiré : code 143, aucun footer global.

## Rejeu ciblé indépendant

Le conteneur neuf exécute :

```sh
node --test --test-concurrency=1 tests/preview-contract.test.cjs tests/preview-size-browser.test.cjs
```

Un surveillant hôte arrête uniquement ce conteneur si les ciblés dépassent 120 secondes ; la limite n’est pas déclenchée. Aucun inspecteur, délai ajouté, oracle modifié ou autre intervention. Footer : tests 8, pass 8, fail 0, cancelled 0, skipped 0, todo 0. Le cas long prend 1620,511001 ms et « mesure prématurée » 515,362333 ms.

## Prochaine preuve discriminante proposée, non exécutée

Le blocage relève du périmètre aperçu (#141), sans cause produit établie. Aucun correctif n’est démontré. Une copie diagnostique du seul test peut conserver exactement les appels et assertions, avec instrumentation dès le départ :

1. Dans la fonction évaluée originale, conserver les mêmes promesses `decode()` et `fonts.ready`, sans en créer de secondes. Enregistrer en mémoire un identifiant de document, le début de chaque étape, puis la résolution ou le rejet de chaque promesse originale. Le rejet de décodage reste traité comme aujourd’hui, mais devient visible dans le journal.
2. Côté Node, observer passivement les envois/réponses CDP et leur identifiant, ainsi que les événements de navigation/contexte. Aucune commande navigateur supplémentaire pendant la fenêtre normale. Borner l’appel depuis Node ; au dépassement, la recette échoue définitivement et le résultat ne peut plus redevenir vert.
3. Après ce verdict seulement, prendre une unique lecture synchrone de l’état de progression préenregistré, sans `decode`, `fonts.ready`, attente ou mutation. Enregistrer séparément les réponses CDP arrivées avant et après cette lecture. Puis fermer uniquement les ressources possédées.
4. Si une promesse originale manque, l’étape distingue images et fontes ; si toutes sont terminées avant le délai mais la réponse CDP manque, examiner le pont ou la réponse navigateur. Si l’évaluation n’a jamais commencé ou si le contexte a été remplacé, traiter cette branche séparément. Toute libération seulement après la lecture est une perturbation, jamais un succès.

L’instrumentation elle-même peut modifier l’ordonnancement : une non-reproduction instrumentée ne disculpe aucune couche. Un gate Linux global propre reste requis. Aucun nouveau lancement ou changement de source n’est effectué après le rejeu ciblé.

## Preuves

- `final-integrated/full.log`, `RECEIPT.json`, `source-manifest.json`, `container-host-config.json`, `stop-receipt.txt` : campagne interrompue et isolation.
- `final-integrated/inspector-objects.json`, `inspector-pending-dom.json`, `inspector-resource-promises.json` : premier blocage et corrélation de libération.
- `final-integrated/inspector-second-pending.json`, `inspector-second-server.json`, `inspector-second-protocol.json` : second blocage, expression et appel CDP.
- `preview-isolated/targeted.log`, `RECEIPT.json`, `docker-command.json`, `container-after.stderr` : rejeu propre et suppression.
- `run-linux-final-integrated.sh`, `run-linux-preview-isolated.sh`, `run-preview-bounded.py` : recettes. Les campagnes antérieures, dont 390/391, restent distinctes.
