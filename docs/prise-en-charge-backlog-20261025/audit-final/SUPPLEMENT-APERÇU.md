# Supplément indépendant — cycle de vie de l’aperçu

**Delta relu : aucun nouveau finding P0–P3 prouvé.** La sérialisation de l’aperçu et les nouvelles attentes sont cohérentes avec les contre-exemples observés. Le fixture de refus IndexedDB conserve un vrai accès natif au rechargement. Cet avis ciblé ne remplace pas le gate intégré du parent et ne constitue pas un nouveau run natif complet ShipGuard.

## Identité et portée

Base inchangée : `395c08d1dfa4d0b8e41416da798bf0313a8bd379`.

Nouvelle candidate, base + overlay : `d02270f421f92ab06b10eeeba9cd1616085c931234a8f5a4fb2b56978f1272cb`.

L’ancien run `audit-20261025-115922108-395c08d1` et son overlay `c257e8483a78695fa29935b8f3db54b11bc9664a69001a5576cde37dbd114a57` restent historiques. Son JSON canonique et sa copie durable sont identiques octet pour octet. Les 69 autres fichiers de son manifeste sont inchangés ; seuls `preview.js`, `preview-size-browser.test.cjs` et `restore-after-refusal-browser.test.cjs` diffèrent. Deux CJS supplémentaires entrent dans cette revue : `link-labels-browser.test.cjs` et `typing-performance-browser.test.cjs`.

Le manifeste actuel de 74 fichiers, les cinq fichiers effectivement relus, leurs hashes, le hash du patch suivi et la définition de l’overlay figurent dans `supplement-verdict.json`. Ce manifeste ne signifie pas que 74 fichiers ont été relus une nouvelle fois. Distributions générées, dépendances et documents ne sont pas incorporés à cette identité de source.

## Cycle de vie examiné

Lecture complète de `app/source/preview.js`, du script de mesure et du scénario de rafale. La sonde indépendante `supplement-preview-probe.cjs` exécute le **fichier produit exact** avec les frontières navigateur simulées. Commande exécutée :

```sh
node docs/prise-en-charge-backlog-20261025/audit-final/supplement-preview-probe.cjs
```

Résultat : exit 0, dix invariants, six URL créées et cinq révoquées, une URL vivante. La sonde refuse explicitement toute affectation de `src` pendant un chargement inachevé et toute révocation de l’URL encore en chargement. Elle couvre deux rafales qui se chevauchent, puis mille demandes pendant une navigation sans événement `load`.

| Obligation | Observation et contre-épreuve |
| --- | --- |
| Une navigation active, dernière demande en attente | `pending = next` remplace une seule valeur. Les demandes intermédiaires ne créent pas de blob. La seconde rafale, arrivée pendant le dernier chargement de la première, atteint également son dernier document. |
| Invalidation immédiate des mesures | `token` et `loaded=false` sont posés avant mise en attente/navigation. La sonde envoie le jeton courant avant `load` : hauteur inchangée ; après `load`, la même mesure est acceptée. |
| Aucun ancien document ne fournit une mesure acceptée | Ancien jeton, jeton inconnu, source étrangère, origine étrangère, largeur incorrecte et hauteur négative sont rejetés. Le document courant conserve son jeton jusque dans la requête de mesure. |
| Rendu invalide et dernier valide | La validation du rendu précède la mutation de l’état. Un appel invalide ne remplace pas la dernière attente ; un nouvel appel valide après cet échec reste atteignable. Les contenus des blobs finaux sont vérifiés. |
| Libération sans annuler le chargement actif | Une demande immédiate ne remplace qu’un document déjà chargé. Une demande en attente est lancée dans le `load` de la précédente, puis cette ancienne URL est révoquée. La sonde vérifie ces deux cas. Une transition crée brièvement la nouvelle URL avant de révoquer l’ancienne ; une URL reste vivante après la transition. |
| Progression indépendante des mesures | Les événements `load` suffisent à faire avancer les deux rafales, sans message de mesure. Le scénario navigateur vérifie aussi l’interception de vrais messages (`isTrusted`), distincts du témoin synthétique. |
| Ressources bornées sans `load` | Mille demandes supplémentaires ne créent aucune URL supplémentaire ; seul le dernier HTML reste en attente. La sonde reprend ensuite les `load` et atteint ce dernier HTML. Le code n’ajoute ni relance, ni polling, ni succès inventé si un navigateur ne délivre jamais `load`. |
| Taille pendant une navigation | Les mesures prématurées ne changent pas la hauteur ; seule une mesure valide du document final chargé peut la changer. Le contenu précédent peut rester affiché pendant le chargement : ce n’est pas une acceptation de sa mesure comme celle du nouveau rendu. |

La sonde démontre le flot du code aux frontières déclarées. Elle ne reproduit pas l’ordonnanceur, la cascade ou le moteur de navigation natifs. Aucun nouveau cas normatif manquant n’a été identifié dans ces frontières ; les pannes arbitraires d’API ou l’absence définitive de `load` ne sont pas transformées en exigence nouvelle de relance.

## Tests et preuves de l’intégration

- **Rafale de quarante rendus** : le test observe les API URL en déléguant aux fonctions natives ; il exige un premier blob avant `load`, puis seulement le dernier, l’égalité entre document réellement chargé et `src`, et la révocation des deux documents remplacés. Le cas sans mesure exige des événements natifs effectivement interceptés. L’appel invalide ne peut satisfaire le succès final.
- **Refus initial IndexedDB** : le fragment est consommé par `history.replaceState` seulement dans la vraie navigation `file://`, pas dans `about:blank`. Le premier refus est compté. Au rechargement, zéro refus artificiel et au moins un appel à l’ancienne fonction native sont exigés, puis la bibliothèque réellement persistée et l’écriture concurrente sont relues. Les assertions de non-écrasement et de conflit restent présentes. Le compteur seul ne prouverait pas une restauration ; ces assertions de données la complètent.
- **Treize liens réparés** : l’attente exige treize intitulés complets, le document demandé et `readyState=complete`. Elle renvoie le snapshot utilisé pour les assertions d’URL et d’intitulés. Le rouge contrôlé 12/13 montre pourquoi le premier lien ne suffisait pas ; il n’est pas présenté comme une reproduction exacte de l’exception historique.
- **Frappe et rafraîchissement complet** : aucun préchargement de l’aperçu initial n’a été ajouté. Le scénario rapide est conservé ; le comptage des mutations reste ouvert jusqu’au document final, puis exige une seule navigation. Le titre exact et l’égalité document/URL demandée sont vérifiés. La suppression de l’attente fixe ne masque pas le cas CPU×6 identifié.

Journaux relus : `parcours/integration/final-{chromium,firefox,webkit}.log`, chacun **5/5 sans skip** ; `portabilite/serialization-{moteur}-preview.log`, chacun **8/8 sans skip** ; `serialization-{moteur}-boundary-final.log`, chacun **1/1 sans skip**. Les documents `SERIALISATION.md`, `DIAGNOSTIC.md` et les rouges contrôlés sont lus ; leurs empreintes sont enregistrées dans le verdict JSON. Ce sont les exécutions des lots concernés ; le relecteur n’a lancé aucune suite navigateur complète.

## Nettoyage #149

Le patch préparé remplace les fermetures globales/non qualifiées par une session propre au run et applique ce sélecteur aux commandes, au retour après crash et aux sorties. Le manifeste et le fichier installé ont été comparés : **le skill installé est inchangé**. Les résultats de la sonde CLI conservent le témoin tiers dans les trois sorties succès/erreur/SIGINT.

Cette preuve porte sur la CLI et un script de sonde, pas sur l’exécution native du skill modifié dans son cycle complet. Le patch demeure préparé, non installé ; **#149 ne peut pas être clos par cette seule preuve**. Aucun navigateur ni outil global n’a été lancé/modifié pendant cette relecture.

## Compatibilité avec le verdict initial

Les trois P2 de collecteurs et le P3 de déclaration dupliquée restent présents et non corrigés. L’ancienne observation favorable sur le fixture `window.name` ne qualifie pas le nouveau fixture : son échec ultérieur FF/WK et son remplacement sont explicitement pris en compte ici. Le supplément ajoute la revue du nouveau cycle et de ces attentes ; il ne réattribue pas ces sources au vieux run natif.

Les deux anciens gates intégrés rouges restent des événements historiques. Les ciblés ci-dessus soutiennent le nouveau delta ; seul le parent peut conclure sur une nouvelle campagne intégrée exécutée sur les mêmes hashes. Aucune qualification Outlook/Mélissa, IME natif, Safari natif ou conformité n’est déduite de ce résultat.

Source produit, tests, historique Git et canonique native n’ont pas été modifiés par cette revue. Les artefacts nouveaux se limitent à ce supplément, son verdict et sa sonde indépendante.
