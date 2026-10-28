# #179 — protocole borné de zoom Firefox visible

État de préparation : **NOT_EXECUTED**. Aucun navigateur ni commande UI n'a été exécuté pendant sa préparation. Ce protocole complète l'oracle relatif de `scripts/recipe_page_flow_firefox.mjs` ; il ne remplace aucune assertion de parcours/reflow/navigation.

## Allocation et référence

1. L'intégrateur alloue une seule instance possédée : `new Firefox(out, {headless:false})`, profil neuf, puis `start()`. Conserver `allocation`, version Firefox, OS/Node, SHA Git, empreintes des sources/distributions et dimensions d'écran. Si `allocation.status !== 'owned-session'`, arrêter ; conserver le reçu `stop()` avec `cleanup_error` et ne pas ouvrir d'autre instance.
2. Naviguer vers le portable du candidat puis le web du serveur exclusivement possédé. Préserver pour chaque origine la même fenêtre, le même écran et l'état de l'éditeur. Ne pas employer `setViewport`, `deviceScaleFactor`, `style.zoom`, `transform`, une modification CSS ou une base SQLite pour simuler cette manipulation native.
3. Dans la fenêtre Firefox de recette identifiée par son profil, placer le focus dans la barre d'adresse avec **Commande+L**, puis **Échap**. Utiliser le menu Firefox **Affichage → Zoom → Taille réelle** (ou **Commande+0**, après avoir vérifié le raccourci du menu sur ce Firefox). Vérifier et capturer le pourcentage **100 %** dans le menu de Firefox ou son indicateur natif. Conserver une capture de cette fenêtre et l'identité de l'instance. L'absence de valeur native lisible laisse `absoluteZoomVerified:false` ; ne pas l'inventer.
4. Capturer la mesure de référence ci-dessous sans redimensionner la fenêtre. Refaire exactement la même mesure sans action de zoom : c'est le **témoin négatif inchangé**. Appeler `qualifyZoom(reference, unchanged, 2)` et exiger `qualified:false`. `qualifyZoom(reference, unchanged, 1)` doit accepter le témoin de référence si toutes ses dimensions sont mesurables.

## Manipulation native réelle

5. Utiliser **Affichage → Zoom → Zoom avant** dans la même fenêtre. Répéter l'action du menu uniquement jusqu'à l'indicateur Firefox **200 %**, avec capture du réglage effectif. Ne pas déduire 200 % d'un nombre fixe de pressions : les paliers et préférences peuvent varier. Ni `script.evaluate`, ni `input.performActions` n'ont démontré ici la commande du zoom de l'interface Firefox ; ne pas déclarer leur prise en charge avant observation. Une API absente/refusée conduit à `NOT_EXECUTED` pour cette voie, sans substitution CSS.
6. Après stabilisation de deux captures successives des dimensions (deux `requestAnimationFrame` ne suffisent pas à eux seuls à prouver une commande native), relever les mêmes mesures. Conserver les deux mesures brutes et leur horodatage. Évaluer `qualifyZoom(reference, zoomed, 2)`. Cette fonction exige simultanément DPR relatif doublé, contraction largeur/hauteur CSS, dimensions `outer*` et écran stables, `visualViewport.scale === 1`. Si l'un manque ou contredit le facteur, résultat **INCONCLUSIVE**, pas PASS.
7. Conserver les captures 100 % et 200 % ainsi que le chemin de commande natif réellement employé. L'oracle relatif ne certifie ni zoom physique absolu ni conformité accessibilité : `absoluteZoomVerified` de sa sortie reste faux. La lecture UI, si établie, est une preuve distincte nommée `nativeUiZoomObservation`, jamais une réécriture de la mesure.
8. Exécuter à 200 % les assertions existantes de reflow, absence de débordement, navigation catalogue et retour au champ/aperçu. Les conserver intégralement. La réussite d'un changement de zoom seul ne valide pas le parcours. Pour le protocole manuel, consigner chacun de ces cas et ses pièces ; sinon, laisser `pageFlowStatus:NOT_EXECUTED`.
9. Rétablir Taille réelle dans **cette instance**, recueillir une mesure retour et conserver le résultat relatif facteur1. Fermer seulement via le helper possédé. Un `cleanup_error` invalide la clôture ; aucune relance et aucun signal à un PID supposé.

## Mesure exacte dans le contexte de la page

Avec la méthode `firefox.evaluate`, cette expression n'agit ni sur le zoom ni sur le contenu :

```js
({width:innerWidth,height:innerHeight,outerWidth,outerHeight,
  dpr:devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height,
  visualScale:visualViewport?.scale??null})
```

Exemple d'appel d'oracle (module importable sans lancer `runRecipe`) :

```js
const {qualifyZoom} = await import('./scripts/recipe_page_flow_firefox.mjs');
const negative = qualifyZoom(reference, unchanged, 2);
const relative = qualifyZoom(reference, zoomed, 2);
```

## Reçu initial à conserver tel quel jusqu'à exécution

```json
{
  "issue":179,
  "status":"NOT_EXECUTED",
  "nativeUiCommandStatus":"NOT_EXECUTED",
  "nativeUiZoomObservation":null,
  "absoluteZoomVerified":false,
  "reference":null,
  "unchangedNegativeControl":null,
  "zoomed":null,
  "relativeQualification":null,
  "pageFlowStatus":"NOT_EXECUTED",
  "cleanup_receipts":[],
  "limitations":["Aucune API de zoom de l'interface Firefox prouvée lors de la préparation.","Aucune mesure native, lecture UI ou qualification humaine exécutée."]
}
```
