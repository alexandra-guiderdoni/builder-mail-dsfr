# Suivi séparé — statut INCONNU

Pendant la validation locale du candidat CSS145, un test expérimental d’interaction a échoué deux fois et passé deux fois. Ces observations ne sont classées ni comme défaut d’instrumentation établi, ni comme régression provoquée par la règle CSS : aucun témoin sans cette règle n’a exécuté ce test.

Le test ouvre une confirmation export, clique le fond recouvrant l’aperçu, annule avec Escape puis vérifie un vrai clic dans l’aperçu ; il recommence avec confirmation Enter. Il vérifie également le titre focalisé, Tab dans la modale, retour au déclencheur et absence de téléchargement avant consentement.

| Version exacte | Résultat conservé |
|---|---|
| e67e06f0d551b538bb222bb0ef2ded55abb38575f02eef46d64cafdf811b54f1, compteur dans document iframe | rouge dans suite ciblée, valeurs expected/actual non conservées par le runner ; puis unique rejeu TAP vert |
| 09cc8f887eca0217823224f98a0b6653879db71398b3df95e11c22573334bf96, compteur dans parent | rouge au second cycle : compteur3 attendu2 |
| 62107496cad0da834c806d1fafb763d22d0718902b286ada221fb9a3babe9ab4, mêmes actions avec détails d’événements et snapshot seulementéchec | unique exécution diagnostique verte ; aucun détail de l’occurrence rouge précédente n’est reconstitué |

La réinitialisation d’un compteur lors d’une navigation iframe ne suffit donc pas à expliquer tous les résultats. Une livraison postMessage tardive peut déplacer l’attribution entre cycles, mais les événements manquants ne permettent pas de distinguer cette livraison, une duplication de listeners/messages ou un vrai clic en arrière-plan. Les succès ultérieurs n’effacent pas les rouges. Le signal central145 (clic de confirmation livré à un TD, download30s) reste distinct de ce test de fond modal plus large.

Sur GO root et avis Astra, le fichier non suivi a été copié byte-pour-byte vers une destination d’archive exclusive, SHA vérifié avant retrait du seul original identique dans tests/. Aucun ignore ni autre suppression. Les trois versions, deux rouges, deux verts et la correspondance exacte sont dans :

`/Users/alex/Claude-worktrees/builder-goal-six-raw-20261025-v1/40221895564/product-validation/EXPERIMENTAL-TEST-ARCHIVE.json`

La version finale est `interaction-test-final-experimental-62107496.cjs`. Les logs sont indiqués dans ce reçu. Le premier échec conserve son message et son résultat, pas les valeurs d’assertion : aucune valeur n’a été inventée.

Prochaine observation nécessaire, seulement sous nouveau mandat borné : journal persistant de tous les événements avec URL/identité de document, numéro, cible/coordonnées, source et phases parent ; témoin sans CSS pour distinguer préexistant/régression. Aucun rejeu de ce test, aucune nouvelle paire CI ni variante corrective n’est lancé après son archivage.

Ce suivi doit rester explicitement INCONNU dans l’issue séparée que root prévoit d’ouvrir. La validation des contrats145 existants et de la suite générale ne clôt pas ce suivi.
