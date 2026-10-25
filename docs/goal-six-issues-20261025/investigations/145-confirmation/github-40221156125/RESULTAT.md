# Paire CSS native 40221156125 : non-reproduction, aucun GO correction

Le run GitHub est success, mais son verdict explicite est **non-reproduction-no-fix-proof**. Aucun correctif produit n’est justifié par cette paire. Aucune relance n’a été lancée.

| Signal | Témoin f3 | Comparateur CSS |
|---|---:|---:|
| Parcours complets verts | 30/30 | 30/30 |
| Contextes | 270 | 270 |
| Exports / téléchargements | 810/810 | 810/810 |
| Suspects immédiats / ACK transitoires / rouges persistants | 0/0/0 | 0/0/0 |
| Confirmations DOM mail | 270 | 270 |
| Événements souris reçus dans une iframe | 0 | 0 |
| Violations CSP capturées | 0 | 0 |
| pointer-events fermé / ouvert | auto / auto | auto / none |

L’absence de réception iframe concerne les événements conservés de cette exécution, pas une garantie universelle. Aucun screenshot rouge n’a été produit puisque les deux bras sont verts. Aucune comparaison pixel n’est revendiquée.

## Provenance vérifiée indépendamment

Run : https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40221156125 ; job121252819627. Harnais `94533707fa819a343f08aded029410b0fa6a60a3`, source `f3aa8324dbcd255bddafeeb2eec559e698f6065c`. Les quatre SHA des sources correspondent exactement au gel. 13 fichiers d’artefact sont téléchargés et scellés dans download-complete.json ; analyse.py revérifie chaque digest avant l’analyse.

Ubuntu26.04/x86_64, Node24.18.0, Playwright1.64.1, Chromium156.0.8078.4 dans les deux bras. Le comparateur contient742 fichiers de base, dont738 byte-identiques. Seules style.css et ses trois dérivés autorisés changent ; les scripts, CSP et helper sont identiques. Portable comparateur SHA25669b0d0ad06742ffd6e77df9a573238afd849c37628878aadcae9ee9dc5736ab9.

L’environnement du job indique ImageVersion20261023.163.3 tandis que le texte Set up job annonce20261012.163.1. Les logs directs du job confirment ce texte. Cette divergence est conservée sans arbitrage. Elle ne démontre aucune causalité ; d’anciens lots rouges et verts existent déjà avec la même valeur env23.

Le collecteur a attendu uniquement ce run, par interrogations espacées, puis récupéré run.json, run.log, job-direct.log, index d’artefacts et payload. Il ne contient aucune commande dispatch. `analyse.py` confronte les résultats bruts au reçu de CI, aux versions, au nombre de passes et aux quatre sources attendues.

## Biais observationnel possible, non démontré

Le rouge réel antérieur40219553464 employait l’observateur R1, harnais4249c2f2ec091526e1413bc70b39917c5e6e845e. Sa seconde passe avait livré pointerdown/mousedown/pointerup/mouseup/click à un TD de l’aperçu, avec bouton modal stable et timeout download30s. Le présent témoin vert ne réfute pas cet événement.

Diff exact : observer-R1-R2.diff. Par rapport à R1, R2 lit dans state() — appelé aussi dans des événements/ResizeObserver avant la confirmation — `getComputedStyle(preview).pointerEvents`, `dialog.scrollTop`, `matches(':modal')`, et réorganise légèrement la lecture des rectangles. Ces opérations ajoutent du travail synchrone et peuvent modifier une fenêtre de style/layout/dispatch. Il serait incorrect d’affirmer que :modal force nécessairement un layout : cela n’a pas été mesuré. R1 utilisait déjà getBoundingClientRect, donc la présence d’une lecture géométrique ne distingue pas à elle seule les deux versions.

R2 ajoute aussi elementFromPoint uniquement dans le snapshot après retour d’input ; aucune RPC d’observation n’a été insérée avant click/confirmChecks. Cette lecture tardive pourrait affecter des événements encore différés, mais elle ne peut être présentée comme l’explication démontrée d’un clic déjà livré à la mauvaise iframe dans R1. Les coordonnées d’événements iframe, logs console click/submit et validations Node après download ajoutent eux aussi du coût ; ils ne sont pas isolés entre eux. Les deux bras R2 partagent tous ces ajouts, ce qui rend leur comparaison interne cohérente sans garantir que R2 conserve la fréquence du défaut R1.

L’ordre des réceptions Node console/download demeure descriptif, sans assertion stricte ; aucune conclusion de scheduling physique entre sessions CDP n’en est tirée. Les valeurs performance.now de documents différents ne sont pas soustraites sous horloges virtuelles.

## Bifurcation proposée, NON préparée ni exécutée

Une unique paire bornée avec les **deux fichiers R1 byte-identiques**, témoin f3 puis même comparateur CSS69b0..., même job/versions/fixtures/helpers/timeouts. R1 existe dans pre-css-pair/ et dans les artefacts natifs40219553464 ; SHA loop `127fec761916ef3962176b981588df37443a9baaa3bf03a2de7b36fdabcefda4`, trace `065c9d06fd804c7f8adbeb5bed0210d4f6b848d8d4d310ffadc2214a533550d5`.

Créer deux répertoires de harnais éphémères séparés contenant ces mêmes fichiers sans modification : cela préserve leurs noms internes et évite toute collision des screenshots `red-full-*.png`. Chaque lancement reçoit seulement MAIL_BUILDER_ROOT vers son portable adjacent, PLAYWRIGHT_MODULE vers le module unique du témoin, PASSES30, SCENARIOfull et RESULT distinct. Les étiquettes des bras, hashes et verdict comparatif restent dans le reçu extérieur ; aucun champ, console, lecture CSS/:modal/scrollTop/hit-test, RPC ou validation supplémentaire n’est ajouté au loop R1.

La préparation CSS et son reçu byte-exact existants sont réutilisables. Le reçu externe vérifie les sources identiques, comptes, activation DOM dans les traces disponibles et téléchargements, sans exiger les champs R2 absents. Il conserve le premier rouge de chaque bras et le timeout original30s. Témoin rouge persistant + comparateur30verts permettrait seulement de soutenir ce candidat dans cette paire ; témoin30verts arrêterait à nouveau sur non-reproduction sans variante supplémentaire automatique. Un comparateur rouge réfuterait la suffisance de cette règle pour le signal reproduit.

Cette expérience ne prouverait pas à elle seule que getComputedStyle causait la non-reproduction R2 : les autres ajouts et la chronologie entre jobs ne sont pas contrôlés individuellement. Elle rétablit surtout l’observateur déjà capable de capter le défaut, sans transformer immédiatement l’étude en chasse de variantes.

Attente de validation root avant toute modification de harnais/workflow ou nouvelle exécution. Aucun fichier applicatif suivi, main, paquet149, commit ou push modifié.
