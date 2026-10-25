# Sonde de destination des entrées — #145

Préparation isolée du 26 octobre 2026, sans exécution navigateur. Sujet immuable : `0b7adc7f18355e740f144b379f7930bf4c8c23de`. Les copies `original/` proviennent de ce commit ; `INPUTS.json` les épingle. Aucun fichier du checkout produit n’a été modifié.

## Nouvelle preuve qui motive la sonde

Le run `40241898231` termine avec 397 tests, 396 réussites et un échec. Au quatrième nom (`'  ..Rentrée--'`, deux espaces dans la valeur), l’export HTML attend un téléchargement pendant 30 s. Les phases montrent l’activation initiale en 43 ms puis `confirmChecks` en 69 ms, retour compris. La trace parent contient le clic d’export et l’ouverture du dialogue, aucun clic de confirmation ni submit/close ; le snapshot final garde le dialogue ouvert et l’aperçu actif. Cela n’identifie ni le destinataire de l’entrée ni la cause du focus.

Le décodage réversible du TAP et le détail sourcé restent dans l’étude sœur `builder-145-rich-failure-study-20261026/`. Son `diagnostic.json` a pour SHA-256 `8c7b64fb52cc836595214ba64d13c75dd9d4deb5f82febbc5ee5e7b337050d42`. Cette sonde ne transforme pas cette occurrence en preuve d’un clic dans l’enfant.

## Delta concret

- `runtime/tests/export-names-browser.test.cjs` : installation avant navigation, phases Node synchrones et enregistrement de l’erreur avant les opérations de diagnostic/cleanup d’origine ; sortie du collecteur à la fin du fichier.
- `runtime/tests/browser-support.cjs` : lecture géométrie/style/inert lors de la première observation du dialogue ouvert, **dans le RPC `look` existant** ; phase avant/retour/rejet du `.click()` de confirmation existant.
- `runtime/tests/destinations-probe.cjs` : listeners capture/passifs, transport public `page.exposeBinding`, collecte Node bornée.
- `export-diagnostics.cjs` et `app/distribution/portable.html` sont inchangés. Aucun autre code applicatif n’est nécessaire à l’overlay.

L’activation du bouton d’export reste `waitFor → focus → press('Enter')`. La confirmation reste le `.click()` pointeur original. Neuf noms, même ordre, trois exports par nom, mêmes assertions, promesse de téléchargement armée au même endroit, attente de 30 s et polling existant de 10 ms conservés. Aucun retry, nouveau délai fonctionnel, capture écran, `elementFromPoint`, clavier de remplacement ou règle CSS.

`prepare.cjs` applique des remplacements textuels explicites. `PRESERVATION.json` et les deux diffs prouvent que leur inversion restitue exactement les sources d’origine. Cette preuve porte sur le contenu ; elle ne prétend pas que l’observateur laisse le timing inchangé.

## Contrat d’observation

L’installation ajoute **deux appels Playwright attendus avant navigation** : `page.exposeBinding`, puis `page.addInitScript`. L’appel de préparation est inséré après l’observateur d’origine et avant `clock.setFixedTime`, `goto` et les gestes. Aucun nouvel `await` ni RPC n’est ajouté entre le `look` et le clic de confirmation. Le retour des bindings est géré par Playwright ; le code injecté ne l’attend pas et n’effectue aucun drainage/ACK.

Le callback public fournit `source.frame` et `source.page`. Les extraits versionnés du paquet local **Playwright Core 1.64.1**, avec SHA des fichiers complets, sont dans `sources/PLAYWRIGHT-API.json`. Le collecteur n’utilise ni `ConsoleMessage.frame`, ni champ Playwright privé, ni CDP. Le commentaire de documentation nomme `browserContext` ; le type et l’implémentation nomment `context`. La sonde n’utilise que `page` et `frame`.

Chaque document reçoit une étiquette de corrélation `timeOrigin + quatre morceaux Math.random`, utilisable en contexte opaque sans `crypto.randomUUID`. Elle n’est pas cryptographique et ne garantit pas l’absence de collision. Une réinstallation dans le même document est signalée sans ajouter de listeners. Les événements ont un identifiant monotone propre au document ; l’identité des éléments repose sur une WeakMap. Les doublons restent dans la trace et sont signalés, jamais supprimés.

Les entrées parent/enfant incluent type, cible/identité DOM, état connecté, `isTrusted`, coordonnées client/écran, `pointerId`, bouton, élément actif et horloge locale. Les événements de focus, chargement, pagehide et les callbacks de frame/navigation sont enregistrés. Le booléen `data.dialog` est **local au document émetteur** : sa valeur false dans l’enfant ne décrit pas la modale du parent.

Le premier `look` ouvert relève les rectangles du dialogue, du bouton et de l’iframe, `:modal`, `scrollTop`, les styles pointer-events/visibility, inert attribut/propriété, src de l’iframe, viewport et focus. Ces lectures peuvent forcer style/layout et modifier la fenêtre de reproduction ; elles ne prouvent pas la cible du compositeur. L’identité du bouton dans ce relevé est comparable à celle des événements du même document.

`nodeNs` représente la réception/phase Node. `time` et `timeOrigin` appartiennent au document émetteur ; `stamp` appartient à l’événement. **Aucune soustraction interdomaines ni ordre physique global n’est établi.** Les epochs Node sont l’ordre de première réception des étiquettes de document, pas l’instant de navigation. L’URL de la frame à réception est séparée de l’URL capturée à l’émission ; un message ancien peut arriver après navigation.

## Bornes et erreurs

Par document : 512 envois normaux, puis un seul avis de dépassement (borne inférieure de perte, pertes suivantes non rapportées). Par page : 2 000 lignes Node, 64 documents et 20 erreurs de collecteur. Maximum 16 pages, contre neuf prévues par le test ciblé. Les compteurs de débordement, trous de séquence, doublons, régressions et troncatures sont explicites. Les erreurs de transport connues ne sont observables que si une télémétrie suivante arrive ; `transportCompleteness` reste toujours `unknown`.

Les erreurs d’observation sont contenues. L’erreur primaire est journalisée synchroniquement avant le diagnostic original, qui conserve son snapshot unique limité à 1 000 ms. Les opérations de fermeture originales restent identiques ; aucune nouvelle garantie de terminaison de `browser.close()` ou d’installation du binding n’est revendiquée. Un processus interrompu avant le hook final peut ne pas produire `destinations.json` ; les lignes TAP/Node déjà émises restent alors la seule preuve disponible.

La sortie exige un dossier final inexistant ; elle ne remplace aucun artefact. Un échec d’écriture est signalé par `DEST145_OUTPUT_ERROR` et invalide l’observation sans réécrire le verdict du test. Les données sont limitées aux gestes de cette fixture : pas de corps de document, capture écran ou contenu de stockage.

## Validation de préparation

Les tests purs utilisent VM et objets simulés, aucun navigateur. Ils couvrent contexte opaque sans crypto, installation unique, epochs et messages anciens, identité/duplicata, pertes/troncatures, erreur d’observation, rejet de clic inchangé, inverse des sources, filtre ciblé et snapshot non répondant borné à 1 000 ms. Voir `results/` pour les commandes et résultats exacts. Le paquet exige une revue distincte avant l’unique campagne native proposée dans `PROTOCOLE.md`.

Les premiers essais d’extraction des extraits Playwright ont rencontré un nom de déclaration erroné (`interface` au lieu de `type`) puis une borne de ligne supérieure à la longueur du fichier. Ils n’ont exécuté aucun test natif ni modifié les sources ; l’extraction finale utilise les lignes réellement présentes. Les logs des tests purs initiaux sont conservés avec le résultat final.
