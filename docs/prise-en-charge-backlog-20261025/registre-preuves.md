# Registre de prise en charge

Les 22 issues sont prises en charge dans le worktree `fix/backlog-qualification-20261025`, base `395c08d1dfa4d0b8e41416da798bf0313a8bd379`. Correctifs locaux non commités ; aucun ticket clôturé.

| Issue | Résultat vérifié | Preuve et limite |
|---|---|---|
| #13 | Référence actualisée vers l’application courante ; historique prototype conservé. Kit opérateur prêt, imports PNG/JPEG validés localement. | coordination/recu-amendements.json ; recette-messageries/ ; Windows/Outlook/Mélissa restent non exécutés. |
| #52 | Risques Outlook Word/DPI/centrage conservés à qualifier, sans correctif spéculatif. | Issue #52 et kit #13 ; dépend du poste et de l’opérateur habilité. |
| #130 | Fixture de refus indépendante du stockage/name : fragment consommé sur vrai file:// ; 3/3 par moteur Mac et Linux. | parcours/integration/DELTA-FINAL.md ; cause du run CI originel inconnue. Linux arm64 local distinct du runner GitHub x86. |
| #131 | Attente de la création finale après transaction ; rouge contrôlé puis 10/10. | parcours/RAPPORT.md ; aucune corruption produit démontrée. |
| #132 | Quota CDP natif Chromium ; injection d’erreur de sauvegarde explicitement synthétique sur les trois moteurs. | portabilite/JOURNAL.md ; quota physique Firefox/WebKit non exercé. |
| #133 | AX natif Chromium et contrôles portables des noms accessibles distingués. | portabilite/JOURNAL.md ; pas de lecteur d’écran ni AX natif Firefox/WebKit. |
| #134 | MessageEvent synthétique corrigé ; source/origine/jeton et postMessage réel vérifiés. | portabilite/JOURNAL.md ; distinct du timeout d’aperçu. |
| #135 | Serveur arrêté et requête témoin en échec avant contrôle du cache hors connexion. | portabilite/JOURNAL.md ; installation PWA du parc non qualifiée. |
| #136 | Oracle de texte visible corrigé ; vrai débordement WebKit corrigé par inline-size des tables copiées. | rendu/README.md : 3/3 par moteur, 590 cas Chromium + 590 WebKit ; simulation de réception. |
| #137 | Rectangle 4 px expliqué par bordure fusionnée, violet peint 3 px ; vrai filet 4 px refusé. | rendu/painted-pixels.json et README.md ; aucun correctif produit nécessaire. |
| #138 | Repli arbitré : lecture seule à la première modification, mémoire/export préservés, jamais d’écrasement. | rendu/README.md : 10/10 par moteur, mutant du garde refusé ; ticket amendé, proactivité non garantie. |
| #139 | Image préparée décodable puis exactement conservée UI→JSON→HTML→restauration. | parcours/RAPPORT.md : parcours 1/1 par moteur ; réencodage autorisé, pas de collage mail prouvé. |
| #140 | Scénario IME synthétique corrigé après observation de compositionend natif Firefox. | parcours/RAPPORT.md : 5/5 par moteur ; IME natif non qualifié. |
| #141 | Course blob corrigée ; blocage decode reproduit sans intervention. Oracle géométrique borné adopté et contre-éprouvé ; cause native interne inconnue. | portabilite/SERIALISATION.md ; oracle-resources/RAPPORT-ORACLE.md ; revue indépendante : 13/13 par moteur Mac et 65/65 Linux ; gates complets finaux 397/397 sur Mac et Linux arm64, aucun skip ni intervention. |
| #142 | Deux rejeux WebKit réussis ; diagnostic étape/DOM/cause enrichi. | parcours/RAPPORT.md ; timeout historique non reproduit, cause inconnue, aucune correction revendiquée. |
| #143 | readText intercepté et écritures réelles distinguées. | portabilite/JOURNAL.md ; interception ne vaut pas collage système. |
| #144 | Refus natif WebKit consigné ; relecture interceptée après écriture réussie. | portabilite/JOURNAL.md ; pas de compatibilité universelle du presse-papiers. |
| #145 | Quatre exports courants réussis, historique de l’attente localisé, fichier de test inchangé. | parcours/RAPPORT.md ; cause du timeout historique inconnue. |
| #146 | fast-uri 3.1.8→3.1.9 dans le verrou ; npm ci effectué ; npm audit zéro vulnérabilité. | coordination/dependance/ ; dépendance de développement, package.json inchangé. |
| #147 | Parcours fonctionnels de secours sur trois moteurs ; quota natif Chromium conservé. | portabilite/JOURNAL.md ; limites physiques hors Chromium visibles. |
| #148 | Audit natif ShipGuard 2.18 : cinq zones isolées, artefacts vérifiés ; supplément indépendant sur le dernier delta. | audit-final/RAPPORT.md et supplement-verdict.json ; 3 P2 + 1 P3 préexistants conservés, aucun GO production. |
| #149 | Patch de nettoyage limité à la session possédée ; succès/erreur/SIGINT préservent une vraie session témoin. | coordination/cleanup/ ; patch non installé globalement, cycle natif du skill non qualifié. Intégration dans sa source propriétaire requise. |

Lots exécutés par les agents Astra portabilité, parcours et rendu ; revue indépendante Astra native puis supplément. La racine a relu preuves et deltas, vérifié les 74 empreintes du manifeste final et les amendements GitHub, puis rejoué les dix invariants indépendants de navigation.

Les correctifs supplémentaires d’intégration restent dans les causes du périmètre : attente des 13 liens réparés (contre-épreuve rAF retenu/libéré), frappe pendant le chargement initial de l’aperçu, sans préchargement masquant la course. Voir parcours/integration/DIAGNOSTIC.md.

Les constats nouveaux de l’audit sont conservés sans élargissement automatique : agrégats du runner mêlant des sous-scénarios sur d’autres moteurs, deux anciennes recettes aux attentes obsolètes et définition catalogPreview dupliquée. Aucun nouveau ticket créé. Les agrégats du runner sont des contextes d’exécution de fichiers, pas des décomptes purs par moteur.
