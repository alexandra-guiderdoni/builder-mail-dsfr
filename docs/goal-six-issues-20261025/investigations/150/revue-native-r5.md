# #150 — revue indépendante des deux résultats natifs R5

**Interprétation root confirmée ; NO-GO pour promouvoir R5 comme remédiation.** Le contrat app passe, mais le minimal démontre une entrée partielle vers l’enfant sous modale malgré `finding.routingObserved=false`. Ce champ mesure uniquement l’augmentation du compteur de clics complets. Il ne mesure pas l’exclusion de toutes les entrées.

Revue du 25 octobre 2026 : lecture des bruts, vérification d’empreintes, décodage réversible du TAP et réévaluation pure du contrat sur le JSON existant. Aucun navigateur, modèle ou CLI native lancé ; aucun oracle, brut ou source modifié. Aucun troisième essai proposé.

## Preuves et contrôles

Le manifeste app `fe35a9020f41a4752178441d3d1758e14c99a433c0716a1e95a949cce1267262` et ses cinq pièces concordent. Le manifeste minimal `3829453771b181fae5d640e81f25cb27c1351a034796800827523899673f50b6` et son résultat concordent. Les40 pièces de préparation R5 restent intactes.

Le TAP app a été décodé puis réencodé exactement ; le JSON obtenu est égal à trace.json et les deux SHA du reçu decoding.json sont vérifiés. Le reçu execution.json indique exit0, zéro retry. Les51 lignes conservent les compteurs1 puis2 sous modale et les réceptions volontaires0→1→2→3 après interactions autorisées. Le passage du test entier couvre ses assertions clavier, focus, retour à l’aperçu et téléchargement unique.

Deux clics de fond trusted sont effectivement observés sur le dialogue parent : lignes21 et38, cancel puis confirm, cible check-dialog, coordonnées événement1364/990 pour le point commandé1364.984375/990. Le vert n’est donc pas uniquement un compteur silencieux sans aucun clic observé. Cependant l’observateur app enregistre les clics, pas pointerdown/mousedown/pointerup/mouseup. Il ne permet pas d’exclure une entrée partielle préalable dans l’enfant. Le transport reste déclaré de complétude inconnue, avec dropped=0 et aucun dépassement déclaré ; cette absence de dépassement ne supprime pas la limite.

## Minimal : réception d’appui enfant, relâchement parent

Résultat brut SHA `a76931cd29f42ca619c88044a7b38308aeb1ed221a17782de8e5609b04bff209`. Les deux états satisfont à nouveau assertGeometry ; verdict(cycles,trace) retourne exactement le finding false conservé. Il y a32 lignes consécutives, dropped=0, quatre clicks enfant trusted uniques, compteur parent4 et dernier ACK enfant4. Errors est vide, cleanupError null, aucune primaryError ; version156.0.8078.4. L’exit0 minimal est attesté par le rapport root ; aucun reçu de process distinct n’est présent dans son manifeste.

| Cycle | Avant / sous modale / après | Entrées de fond présentes dans la trace |
|---|---|---|
| Cancel | 1 / 1 / 2 | Lignes7–11 : pointerdown, mousedown, pointerup, mouseup, click sur DIALOG1365/990 |
| Confirm | 3 / 3 / 4 | Lignes23–24 : pointerdown/mousedown enfant target630/532 ; lignes25–26 : pointerup/mouseup parent DIALOG1365/990 |

Les lignes23–24 portent les IDs child-1:16 et child-1:17, isTrusted=true, et parentModalAtReceipt open=true/modal=true. La translation630+735,532+458 donne le point1365/990. Les relâchements parent sont eux aussi trusted, open et modal. L’état préalable conserve EFPdialog, pointer-events:none, inert=false et focus H2/title.

Les quatre clicks enfant complets sont uniquement les contrôles positifs sur control528/41, hors modale à réception. La trace ne comporte pas de click complet de fond au second cycle et le compteur enfant reste stable. Ces observations sont compatibles avec l’appui et le relâchement livrés à des documents différents. Elles ne déterminent pas à elles seules la règle interne de synthèse/suppression du click ni la cause du changement de destination. Les numéros de lignes décrivent l’ordre de collecte ; les états enfant sont ceux de la réception parent, pas une horloge globale des deux documents.

## Prédicat et clarification dérivée

Le prédicat exact reste `cycles.some(c => c.modalCount > c.before)`. Les compteurs childClicks sont incrémentés sur le seul événement click. La réconciliation finale lie donc quatre clics enfant, quatre reçus et quatre lignes click ; elle ne qualifie pas les autres familles d’entrées. Le résultat false est correct pour ce prédicat étroit et insuffisant pour une affirmation générale d’absence de routage.

Clarification pure proposée, sans changer les données ni le finding historique : conserver côte à côte le signal **« augmentation du compteur de clics enfant sous modale : false »** et le signal positif **« appui enfant reçu pendant que le parent est modal : true, lignes23–24 »**, puis les **« relâchements parent observés : lignes25–26 »**. Le reçu JSON de cette revue contient cette projection dérivée et ses références. Il ne remplace aucun résultat brut.

Un analyseur hors ligne distinct peut matérialiser ces catégories et vérifier leurs entrées. Il devra distinguer un signal positif observé d’une absence non démontrée, préserver erreurs/pertes/complétude, et ne pas convertir une trace app limitée aux clics en constat sur les appuis. Aucun changement de scénario ni essai nouveau n’est nécessaire pour constater les faits présents.

La séquence publique move/down/up n’a donc pas garanti l’exclusion de toute entrée enfant dans le minimal exécuté. Le succès app reste un succès de son contrat de clics, distinct d’une qualification plus large. DragManager, transactions, instrumentation, variation entre runs, géométrie synthétique et lectures intrusives empêchent d’attribuer ici une cause interne unique à Chromium ou Playwright. isTrusted ne prouve pas un geste humain physique. #150 n’est pas résolue par ces résultats.
