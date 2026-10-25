# Correctif145 — gel pour revue indépendante, aucune publication

Le défaut central a été capturé natif deux fois avec R1 : le clic demandé sur la confirmation est reçu par un TD de l’aperçu ; la modale reste ouverte et le téléchargement expire après30s. La dernière paire strictement identique de harnais/source/runtime, hormis la règle CSS, donne témoin2verts puis1rouge persistant contre comparateur30/30vert (810exports). Cette preuve soutient un correctif minimal du signal reproduit ; elle ne prouve pas le mécanisme interne Chromium ni toute interaction modale possible.

Seule la règle suivante est ajoutée au CSS de l’interface applicative :

```css
body:has(#check-dialog[open]) #preview { pointer-events: none; }
```

Le build canonique modifie portable.html, web/index.html et la clé dérivée du service worker. Les quatre fichiers sont byte-identiques au comparateur natif69b0.... Aucun JavaScript, helper, input, assertion existante, retry ou timeout modifié. Le courriel exporté n’incorpore pas cette règle d’interface. Script/CSP inchangés. Le diff suivi contient exactement ces quatre fichiers ; aucun test permanent ajouté/modifié.

## Validation exécutée séquentiellement

| Commande / configuration | Résultat |
|---|---|
| run-engines, trois fichiers existants, configurationchromium |12/12, code0|
| même sélection, configurationwebkit |12/12, code0|
| même sélection, configurationfirefox |12/12, code0|
| npm run check | PROVENANCE_OK, APPLICATION_DISTRIBUTIONS_OK, DISTRIBUTIONS_OK ; code0 |
| npm test |397/397,0échec,0annulé,0ignoré ; code0 ;415,16s |
| git diff --check | code0 |

Sélection : copy-check-browser.test.cjs, export-names-browser.test.cjs, editor-dsfr-browser.test.cjs. Important périmètre de preuve : copy-check conserve ses six cas explicitement Chromium/WebKit ; export-names conserve son bras WebKit explicite. Les trois configurations du runner représentent36exécutions mais pas12tests natifs distincts sur chaque moteur. D’après les launchers inchangés, ces exécutions se répartissent13Chromium,19WebKit et4Firefox. Les relectures du presse-papiers WebKit/Firefox de editor-dsfr passent par l’interception existante, pas un collage natif réel. Les tests, leur registre et cette limite n’ont pas été retouchés.

Versions locales : Node24.18.0, Playwright1.64.1, macOSdarwin25.5.0/AppleM2Max, Chromium156.0.8078.4. Les preuves causales Linux restent celles du run40221895564, avec leurs métadonnées Ubuntu26x64 et la divergence ImageVersion env23/setup12 conservée. Les validations macOS ne sont pas présentées comme un nouveau replay Linux.

## Contre-signal séparé, statut INCONNU

Le nouveau test expérimental de fond modal a donné deux rouges et deux verts. Un compteur parent a reçu3messages pour2attendus ; les données ne distinguent pas événement réel tardif, duplication d’observation ou autre condition. Aucun témoin sans CSS n’a exécuté ce test : aucune régressionCSS n’est établie. Aucun défaut d’instrumentation n’est déclaré prouvé.

Après avis Astra et GO root, ce test non suivi a été archivé dans une destination exclusive, égalitéSHA vérifiée, puis seul son original identique a été retiré de tests/. Les trois versions exactes, deux rouges, deux verts et logs sont conservés. Il n’a pas été rejoué pendant la reprise de validation. Voir CONTRE-SIGNAL-APERCU.md et EXPERIMENTAL-TEST-ARCHIVE.json dans l’archive externe. Les validations vertes ci-dessus ne clôturent pas ce suivi, que root prévoit de publier séparément avec statut INCONNU.

## Pièces et périmètre proposés

Quatre fichiers produit seulement : app/source/style.css ; app/distribution/portable.html ; app/distribution/web/index.html ; app/distribution/web/sw.js. Hashes complets : FIX-RECEIPT.json. Diff : APP-FIX.diff. Documents sélectionnables : ce rapport, le reçu, RESULTAT.md, verified-summary.json et CONTRE-SIGNAL-APERCU.md. Ne pas ajouter en masse les répertoires forensic ni leurs anciens bruts.

Tous les logs, commandes exactes, résultats détaillés et preuves volumineuses de cette dernière exécution sont hors checkout, sous /Users/alex/Claude-worktrees/builder-goal-six-raw-20261025-v1/40221895564/. NATIVE-MANIFEST.json scelle la collecte native ; product-validation/FINAL-VALIDATION-MANIFEST.json scelle les validations et l’archive expérimentale. Les chemins et SHA de ces deux manifestes sont dans FIX-RECEIPT.json. Aucune nouvelle règle ignore, aucun autre retrait, aucune modification de main ou du paquet149.

CPU primaire terminé ; sources gelées pour revue indépendante. Aucun commit, push, déploiement, fermeture d’issue ou nouvelle paire diagnostique effectué. Le GO de publication relève de root après cette revue.
