# R1 exacte40221895564 : candidat soutenu par A/B, validation locale des contrats145 terminée

Run https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40221895564 ; harnais7d4fcf3d12b203e309f8342c0ce76bc40ebfd427, snapshotf3aa8324dbcd255bddafeeb2eec559e698f6065c. Les cinq sources et les copies loop/trace des deux bras ont les SHA gelés, byte-identiques au R1 du rouge4249. Préparation canonique :742 fichiers,738 inchangés, CSS et trois dérivés seulement, scripts/CSP/helper identiques.

| Mesure | Témoin R1 | Comparateur CSS |
|---|---:|---:|
| Parcours verts / rouges | 2 / 1 | 30 / 0 |
| Contextes observés | 22 | 270 |
| Exports / téléchargements | 64 / 63 | 810 / 810 |
| Suspects / persistants / ACK transitoires | 1 / 1 / 0 | 0 / 0 / 0 |
| Événements souris iframe | 5 | 0 |

Verdict indépendant et reçu du job concordent : candidate-supported-in-this-pair. Ubuntu26.04/x86_64, Node24.18.0, PW1.64.1, Chromium156.0.8078.4. Env ImageVersion20261023.163.3 et texte Set up job20261012.163.1 demeurent contradictoires ; les deux sources sont conservées sans arbitrage.

## Même signal natif, pas seulement focus final

Troisième parcours (pass2), contexte4, nom exact `  ..Rentrée--` (13 caractères), export-mail. Le helper click résout en24ms puis confirmChecks en78ms. Pendant confirmChecks, cinq événements trusted pointerdown/mousedown/pointerup/mouseup/click atteignent un TD du blob qui est exactement la src du preview. Aucun click confirm ni submit principal. Le bouton garde UID1 et reste connecté ; son rectangle passe y1303→837 comme dans des parcours verts. Après retour du helper, active=preview, modale ouverte ; même état après30s, primaire TimeoutError download30000ms. Capture red-full-2.png inspectée : modale et fond visibles, bouton présent.

Réceptions Node : before-click1792953571168, before-confirm1192, événements iframe1269, after-confirm1270, snapshot initial1270–1274, final1792953601175–1180. La dernière navigation blob observée arrive1172 ; ce n’est pas une preuve de fin de chargement. Les horloges performance de documents distincts ne sont pas soustraites. R1 ne capture pas les coordonnées iframe : aucune position précise du clic rouge n’est inventée. trusted/CDP headless n’est pas une preuve hardware GUI.

Cette paire soutient la règle minimale comme traitement du signal central reproduit ; elle ne prouve ni l’explication interne du compositor Chromium, ni l’absence universelle d’interaction de fond. Le R2 précédent était30/30 vert dans les deux bras. Retour du rouge avec R1 compatible avec un effet de l’observateur, mais la chronologie entre jobs et les modifications groupées empêchent d’attribuer cet effet à une lecture précise.

## Implémentation autorisée et contre-signal de validation

Après GO root, seule la règle exacte a été ajoutée à app/source/style.css, puis build canonique. Les quatre hashes sont exactement ceux du comparateur : portable69b0d0ad06742ffd6e77df9a573238afd849c37628878aadcae9ee9dc5736ab9, web/indexa34ec36adaf511032c4bba7326c8d0ded13c4c418b8f28aeff82e00108aded34, sw8f63a962c00790b1bc9714a339142f050fd5ee43efa007af8639859a7552f61a, styled6398e12efff66a03715625ad7a1f0b10af626a69d11c37f6529173ac36a5f04. Aucun JS applicatif, helper ou délai fonctionnel modifié.

Le nouveau test check-dialog-interaction-browser.test.cjs vérifie le comportement : clic aperçu avant/après Escape et confirmation Enter, clic sur fond recouvrant l’aperçu, titre initial/Tab interne/focus rendu, aucun download avant consentement. Il ne teste pas une valeur CSS.

1. Suite ciblée Chromium :12/13 verts ; nouveau test échoue au compteur iframe. Le runner conserve le message, pas les valeurs expected/actual. Les douze autres tests restent des résultats distincts, non une validation complète.
2. Rejeu diagnostic unique du test initial en TAP détaillé :1/1 vert, sans explication du premier échec.
3. Compteur d’observation déplacé du document iframe vers la page parente, car le document blob peut être remplacé. Test ciblé : rouge, compteur3 attendu2 au second cycle. Cela réfute la suffisance de la première hypothèse compteur réinitialisé.
4. Une exécution diagnostique bornée ajoute coordonnées/target/trusted/time/timeOrigin des messages et snapshot seulement en cas d’échec :1/1 vert. Aucun événement de l’occurrence rouge antérieure n’est ainsi reconstitué. Ce vert ne résout pas le contre-signal.

Les deux échecs et les deux succès sont conservés, avec les versions du test. Une livraison tardive peut déplacer l’attribution d’un clic entre les deux cycles ; elle n’explique pas seule un message supplémentaire en l’absence de duplication. Restent à distinguer une vraie réception iframe sous modale, des messages/listeners dupliqués ou un problème d’observation de test. Le prochain journal devrait conserver tous les événements avec documentURL/identifiant, numéro, source et phases parent, y compris sur succès. Aucune nouvelle exécution n’est autorisée ou lancée ici.

La validation a d’abord été suspendue sur instruction root. Après avis indépendant Astra et nouveau GO, le test expérimental a été archivé hors suite avec ses trois versions exactes et ses quatre résultats, puis les seuls contrats145 existants ont été repris. Ils passent12/12 dans chacune des trois configurations du runner ; npmcheck est vert et la suite complète397/397. Les lancements explicitement Chromium/WebKit dans certains tests restent tels quels :12/configuration ne signifie pas12 tests natifsFirefox distincts. Le contre-signal reste INCONNU dans un suivi séparé, ni défaut d’instrumentation prouvé ni régressionCSS établie ; cette validation ne le clôt pas. La publication du correctif central reste soumise au GO de revue indépendante. Aucun élargissement CSS, JS, retry, changement helper, nouvelle paire CI, commit ou push.

## Conservation et sélection

Les19 fichiers d’artefact et les logs natifs sont hors checkout sous /Users/alex/Claude-worktrees/builder-goal-six-raw-20261025-v1/40221895564/. NATIVE-MANIFEST.json scelle22 fichiers natifs/analyses brutes,15379570octets, SHA33f492d70945a2176946cd8bf566901a0ba514ad8cf5898ce729ef40623caf37. Les logs de validation produit sont dans product-validation/ sous cette même archive, séparés du manifeste natif.

Fichiers locaux sélectionnables : RESULTAT.md, verified-summary.json et ANALYSIS-RECEIPT.json. Ne pas ajouter en masse les répertoires d’enquête antérieurs ou les bruts. Aucun ignore nouveau n’a été créé. Le seul fichier expérimental non suivi a été retiré du dossier tests après copie vers une archive exclusive et vérification d’égalitéSHA ; toutes ses versions et preuves sont conservées dans EXPERIMENTAL-TEST-ARCHIVE.json. Le writer reste volontairement modifié et non publié. Voir FIX-VALIDATION.md et FIX-RECEIPT.json pour le gel final des quatre deltas applicatifs.
