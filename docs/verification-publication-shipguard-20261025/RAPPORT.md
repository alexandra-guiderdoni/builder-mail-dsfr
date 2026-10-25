# Vérification ShipGuard Astra avant publication — 25 octobre 2026

**GO pour publier le correctif identifié par `4c4caff747a77c987be2ec4cbb914c39d3ea5b07b206886f6ab5fc24955f914e`.** La CI complète du commit final doit encore être observée avant d’annoncer sa réussite ou celle du déploiement. **La qualification Outlook/Mélissa reste NO-GO : aucun de ces clients n’a été exécuté.**

Ce verdict combine un audit natif complet de la candidate précédente et une relecture indépendante du seul correctif ajouté ensuite. Il ne transforme pas les résultats précédents en exécution de la nouvelle candidate.

| État examiné | Identité et résultat |
|---|---|
| Base Git | `395c08d1dfa4d0b8e41416da798bf0313a8bd379` |
| Audit complet | Overlay `c43f9e5f67bcee948de67b57d9a51d4b20454bd1ed5a5bdd291de3ecc57b2ec5` ; **publication suspendue** pour une fuite nouvellement introduite dans un helper de test |
| Correctif ciblé | Overlay `4c4caff747a77c987be2ec4cbb914c39d3ea5b07b206886f6ab5fc24955f914e` ; seul `tests/preview-resources-browser.test.cjs` change parmi les 168 fichiers audités ; **GO publication du correctif** |

L’audit a suivi `sg-code-audit quick --all --report-only --model=auto` de ShipGuard `2.18.0+codex.local-20261025112131`. Cinq agents Astra hérités ont examiné cinq zones exclusives, avec deux agents simultanés au maximum. Chaque agent a travaillé dans un worktree Git lié détaché à la base, contenant les copies exactes de l’overlay. Les cinq identités natives et l’overlay ont été vérifiés ; chaque JSON a été retenu par le helper natif avant completion, puis copié et accepté par le coordinateur. Les 168 empreintes ont été reconfirmées dans les cinq worktrees. Aucun agent n’a modifié de source, commité, poussé ou fusionné.

Le périmètre comprend les sources actives, les tests CJS/MJS, les scripts Python, le workflow et le lockfile. Les distributions générées, références tierces et anciennes preuves sont exclues de la lecture comme code actif, avec motifs dans [le manifeste d’exclusions](artifacts/exclusions.json). Leurs liens avec les distributions et preuves exécutées ont été contrôlés séparément. Les anciens résultats canoniques ont été archivés avant le nouveau run. La [provenance du skill](artifacts/skill-provenance-and-preflight.json), les [zones](artifacts/zones.json), le [manifeste source](artifacts/auditable-manifest.json) et le [dispatch natif](artifacts/native-run/dispatch.json) permettent de vérifier ce déroulement.

| Constat natif | Niveau | Attribution |
|---|---|---|
| `r1-z04-001` — serveur du nouveau helper restant actif après échec de lancement ou fermeture du navigateur | P2 / medium | **Introduit par c43, corrigé dans 4c4** |
| `r1-z02-003` — parsing d’URL malformée rejetant le callback du serveur de recette | P2 / medium | Préexistant ; outil local lié à `127.0.0.1`, non livré par Pages |
| `r1-z04-002` — TAP partiel accepté malgré interruption du processus | P2 / medium | Préexistant dans la matrice multi-moteur ; hors `npm test` direct et CI Pages |
| `r1-z05-001` — reçu favorable malgré une annulation supplémentaire de test Node | P2 / medium | Préexistant dans l’outil de reçu ; les compteurs finaux ont été vérifiés indépendamment |
| `r1-z03-001`, `r1-z04-003` — scénarios Chromium/WebKit fixes attribués au moteur demandé | P2 / medium | Préexistants ; neuf fichiers de z03 et quatre fichiers de z04, mêmes mécanismes d’attribution |
| `r1-z02-001`, `r1-z02-002` — deux recettes Firefox avec contrats d’export/catalogue périmés | P2 / medium | Préexistants, déjà consignés |
| `r1-z01-001` — double déclaration identique de `catalogPreview` | P3 / low | Préexistant, déjà consigné |

Le run natif contient **9 constats : 0 critical, 0 high, 8 medium, 1 low**. Quatre retrouvent exactement leur clé historique ; cinq sont nouvellement détectés, dont quatre préexistaient dans la base. « Nouveau dans le rapport » ne signifie donc pas « introduit par le correctif ». Aucun P0/P1 ni nouvelle régression du produit n’a été établi par cette revue rapide. Les constats préexistants restent ouverts, sans acceptation de risque inventée ni correction hors périmètre.

Les trois affirmations d’absence ont été contrôlées par recherches déterministes complètes. La sérialisation de certains motifs regex natifs était suréchappée : les commandes originales, leurs sorties et les recherches corrigées du coordinateur sont conservées dans [le contrôle des preuves négatives](artifacts/negative-evidence-gate.json). Les JSON natifs demeurent inchangés. Aucune vérification par score n’était requise, aucun constat n’étant critical/high ; le traceur supplémentaire est désactivé par le mode quick.

La fuite du nouveau helper a été reproduite avant correction : échec de `launch` ou de `browser.close`, serveur jamais fermé, puis arrêt externe. Le writer a déplacé le lancement dans le `try` et imbriqué les `finally` pour assurer la fermeture du serveur. Le coordinateur Astra, distinct du writer, a relu le diff et la sonde utilisant la fonction exacte et un vrai serveur HTTP possédé. Les quatre cas après correction — succès, callback rejeté, lancement rejeté, fermeture navigateur rejetée — terminent naturellement avec une fermeture du serveur et les erreurs isolées attendues. La sonde remplace la frontière navigateur ; elle ne prétend pas avoir reproduit une panne réelle de Playwright. Les cas de plusieurs erreurs simultanées ne sont pas qualifiés.

Les [preuves rouge/vert et le supplément](artifacts/supplement/review.json) conservent les deux identités. Le [résultat canonique natif](artifacts/audit-results.json) reste celui de c43, avec son NO-GO initial ; le supplément ne réécrit ni ce résultat ni le constat d’origine. La contre-épreuve ne justifie aucune modification du helper historique similaire de `preview-size`, hors périmètre du correctif minimal.

Les journaux déjà produits sur c43 montrent **397/397, zéro échec, annulation ou skip**, sur macOS et Linux ARM64. Leurs reçus, SHA256 et la correspondance des 168 fichiers avec le snapshot Linux ont été vérifiés : [contrôle des preuves d’exécution](artifacts/execution-evidence-verification.json). Sur 4c4, le writer a exécuté les trois fichiers ciblés (deux parcours navigateur et un contrat statique) : **13/13 sous Chromium, 13/13 sous Firefox, 13/13 sous WebKit**, zéro échec, annulation ou skip. Le coordinateur a relu les journaux, contrôlé leurs empreintes et la sélection effective du moteur par le wrapper partagé. La [commande et ses variables de moteur](artifacts/supplement/execution-command.json) ont été reconstituées explicitement par le writer après exécution depuis son appel outil ; ce reçu ne constitue pas une nouvelle mesure. Aucune nouvelle suite complète n’a été lancée par cet audit ; la suite complète du commit final relève de la CI standard après push.

L’arbitrage #138 est conservé : refus en lecture seule à la première modification, aucune écriture sur les données persistées, mémoire et export préservés ; aucune alerte proactive obligatoire ajoutée. L’oracle de préparation vérifie cardinalité 24/0, chargement complet, dimensions naturelles et `fonts.ready` avec borne de 10 secondes. Il ne démontre ni les pixels peints ni la résolution interne du décodeur ; le scénario tardif et les deux appels explicites à `decode` restent présents. Le patch global #149 n’est pas intégré. Les causes internes historiques #130/#142/#145 restent inconnues.

Le serveur de recette fautif ne fait pas partie du site Pages : le workflow ne copie que `app/distribution/web`, `snum.html` et `portable.html` ([preuve de périmètre](artifacts/publication-exposure.json)). La publication Git/CI est distincte du feu vert métier pour la diffusion en messagerie. Aucun déploiement ni test Outlook/Mélissa n’a été réalisé par ce relecteur.

Les empreintes du dossier figurent dans [SHA256.json](SHA256.json). Les worktrees natifs et les résultats historiques sont conservés ; aucun nettoyage global n’a été réalisé. Suites possibles, uniquement sur instruction distincte : `/sg-process-check --from-audit`, `/sg-visual-run --from-audit`, `/sg-visual-review` ou `/sg-ship`. Elles n’ont pas été exécutées dans cette mission.
