# Audit indépendant final de la candidate — ShipGuard 2.18

Audit natif Codex exécuté et terminé, en mode `quick --all --report-only --model=auto`, une ronde, cinq zones dont une infra dédiée. **72 fichiers lus ; trois P2 et un P3 préexistants ; aucune régression nouvelle prouvée dans les correctifs examinés.** Aucun correctif appliqué par l’audit. Ce résultat ne constitue ni un audit approfondi, ni une conformité, ni un GO production.

Les gates de campagne restent rouges : le parent rapporte **390/391 sur Mac** (`link-labels-browser.test.cjs:102`, évaluation pendant une navigation d’iframe) et **390/391 sur Linux** (`typing-performance-browser.test.cjs:201`, attente du titre de l’iframe). Ces résultats sont conservés comme échecs, sans requalification par cet audit. Une correction ultérieure modifiera l’identité de la candidate et exigera sa propre preuve.

## Identité exacte et transport natif

- Run : `audit-20261025-115922108-395c08d1`.
- Base : `395c08d1dfa4d0b8e41416da798bf0313a8bd379`.
- Overlay SHA256 : `c257e8483a78695fa29935b8f3db54b11bc9664a69001a5576cde37dbd114a57`.
- Candidate : **base + modifications non committées**, et non le commit seul. La définition de l’empreinte, le patch suivi, les copies des fichiers modifiés/nouveaux et les 72 empreintes sont dans `run/candidate-identity.json`, `run/candidate.patch` et `run/overlay/`.
- Modèle des enfants hérité sans override ; son identifiant effectif n’est pas attesté par un outil natif, donc enregistré `inherited/unknown`.

Chaque tentative a reçu avant dispatch son `run_id`, `base_sha`, `zone_id`, `round=1`, `agent_id`, chemin absolu unique et chemin d’artefact. Les cinq worktrees liés ont été créés détachés à la base, puis ont reçu la même copie d’overlay avant lancement. HEAD et les 72 empreintes ont été contrôlés avant et après lecture, puis à la collecte et à l’agrégation.

| Zone | Agent ShipGuard | Identifiant natif | Fichiers |
| --- | --- | --- | ---: |
| z01 — rendu, modèle, édition, fichiers, images, imports | r1-z01-a1 | /root/native_shipguard_audit/audit_z01 | 7 |
| z02 — bibliothèque, aperçu, état, stockage, SNUM, interface | r1-z02-a1 | /root/native_shipguard_audit/audit_z02 | 19 |
| z03 — prototype, génération et collecteurs | r1-z03-a1 | /root/native_shipguard_audit/audit_z03 | 22 |
| z04 — tests et aides de preuve | r1-z04-a1 | /root/native_shipguard_audit/audit_z04 | 20 |
| z05 — infra et dépendances | r1-z05-a1 | /root/native_shipguard_audit/audit_z05 | 4 |

Les worktrees sont conservés sous `/Users/alex/Claude-worktrees/sg-audit-20261025-115922108-395c08d1-z01` à `-z05`. Les chemins exacts et transitions figurent dans `run/dispatch.json`. Chaque enfant a exécuté le helper installé `retain-zone-artifact.mjs` avec succès avant sa completion native : seul son JSON exact a reçu une entrée Git `intent-to-add`, sans contenu staged. Le parent d’audit a copié le fichier original, vérifié les cinq identités et son SHA256. Aucun résultat textuel reconstruit, ancien ou découvert par glob n’entre dans l’agrégat.

Les cinq completions natives ont été observées. L’index du checkout candidat est resté vide ; les cinq index enfants ne contiennent aucun contenu staged. Aucun commit, merge, push, publication, démarrage de service ou nettoyage de worktree. Monitoring désactivé. Reçus : `run/allocation-receipt.json`, `run/z01-retention-receipt.json` à `run/z05-retention-receipt.json`, `run/final-validation.json`.

## Findings prouvés

| Priorité | Source | Déclencheur et conséquence | Preuve |
| --- | --- | --- | --- |
| P2 | `tests/creation-browser.test.cjs:29` | Avec `MAIL_BUILDER_ENGINE=firefox`, la boucle lance cinq Firefox via le wrapper, puis cinq WebKit directs. `run-engines.cjs` attribue les dix à Firefox ; les comptes et l’attribution de moteur sont faux. Les cinq parcours Firefox existent bien. | `run/z04-engine-probe.json` ; rejeu indépendant `run/orchestrator-engine-replay.json` : 5 Firefox + 5 WebKit, arrêt au lanceur sans navigateur. |
| P2 | `scripts/recipe_firefox.mjs:40` | La recette prescrite dans `docs/MAINTENANCE.md:110` attend trois anciens noms fixes. Les actions courantes produisent des noms datés ; arrivé au premier export, le collecteur cherche un fichier différent et expire. | `run/z03-probe.cjs`, `run/z03-source-probes.json` et rejeu indépendant `run/orchestrator-z03-replay.json` ; actions exactes exécutées avec téléchargement capturé. |
| P2 | `scripts/recipe_page_flow_firefox.mjs:57` | La recette prescrite dans `docs/RECETTE-DEFILEMENT.md:40` exige `size=52` à toutes les largeurs. L’interface courante donne 61 en large (52 composants + 9 familles), 1 sous 576 px ; le collecteur rejette son contrat actuel. | Même sonde source : calcul exact de l’affectation avec le catalogue épinglé, résultats 61 et 1. |
| P3 | `app/source/view.js:142` et `:151` | Deux déclarations strictement identiques de `catalogPreview` dans la même portée. La seconde fournit la liaison effective ; une correction limitée à la première resterait sans effet. Aucune double exécution ni panne actuelle démontrée. | Lecture complète et comparaison déterministe `run/z02-source-probes.json`. |

Ces quatre constats sont antérieurs au delta. Les trois P2 concernent la fiabilité des collecteurs ; ils ne prouvent pas de défaut du courriel produit. Aucun P0/P1 retenu. Les classifications de correction sont trois `test-first` et une `mechanical` ; elles ne créent aucune autorisation de modification.

Les quatre constats portent sur des contradictions ou déclarations présentes, sans affirmation d’absence ; aucun rejet au gate d’évidence négative. Les fichiers, lignes, identités, catégories et tiers ont été contrôlés. Aucun finding critique/élevé n’exigeait de vérificateur de sévérité. Le tracer interzones est exclu par le mode quick. Aucun ancien rapport canonique n’était présent dans ce checkout : `lifecycle=new` signifie nouveau dans ce suivi, pas introduit par les correctifs. Aucun risque accepté n’a été appliqué.

## Revue des correctifs et des frontières de preuve

| Point | Observation | Limite |
| --- | --- | --- |
| Borne du HTML copié | `inline-size:min(100%,620px)!important` est ajouté aux seules tables racines. Largeur physique, repli `min()`, styles Office bruts et modèle sont conservés ; texte script échappé et URL `javascript:` refusée dans la sonde. | VM et frontières DOM simulées ; la cascade native et le collage relèvent des essais du parent. |
| Bibliothèque et aperçu | `State.change` rend synchroniquement ; depuis l’accueil, `Library.open` affiche avant de rafraîchir. Depuis l’éditeur, le second rafraîchissement est évité. `UI.preview` n’ouvre plus le cadre masqué. Quatre transitions VM cohérentes ; aucun champ, titre, focus ou aperçu périmé prouvé. | Pas de preuve exhaustive des courses ou du moteur natif. |
| Presse-papiers | L’aide mémorise après réussite de `write`/`writeText` natifs. La sonde contrôlée garde la sentinelle après rejet. | Relecture interceptée distincte du presse-papiers natif et d’un collage. |
| Quota | Injection `QuotaExceededError` explicitement marquée `physicalQuota:false`. Le parcours CDP Chromium reste séparé. | Aucune mesure de quota physique Firefox/WebKit. |
| Messages d’aperçu | Les événements synthétiques conservent la vraie référence source et testent source/origine/jeton invalides ; un vrai `postMessage` positif est ajouté. | Événements synthétiques et navigateur réel restent des preuves différentes. |
| PWA | Le test coupe son serveur privé et ses connexions ; vérifie le témoin reçu avant coupure, l’échec d’un fetch Node puis les requêtes non précachées. | Lecture du test, pas nouvelle exécution navigateur par l’audit. |
| Sentinelle #130 | `window.name` appartient à la page jetable du fixture, avec refus neuf puis consommé au rechargement. | Aucune modification du contenu utilisateur ; aucune cause historique Linux inventée. |
| Mutant #138 | Le script crée une copie portable éphémère ; seule sa garde de jeton est neutralisée. Le log conserve l’échec exact « Une tentative refusée ne doit pas remplacer le jeton » et `MUTANT_EXIT=1`. Aucun répertoire temporaire restant. | Contre-épreuve relue, non relancée ; le contrat de repli vient de l’arbitrage du parent. |
| Filets #137 | Oracle sur pixels peints ; témoin de quatre pixels explicitement refusé. | Le produit n’a pas été changé pour faire correspondre son rectangle à l’oracle. |
| IME #140 | Composition synthétique et `isComposing:true` explicitement nommés. | Aucun IME natif qualifié. |
| Dépendance | Verrou `fast-uri 3.1.9`, plage AJV compatible, URL/digest correctement formés ; contrôles/tests précèdent le déploiement dans le workflow. | Pas d’installation, comparaison distante d’intégrité, scan de vulnérabilités ou exécution CI par cet audit. |

Preuves détaillées : `run/z01-review-evidence.json` à `run/z05-review-evidence.json`, sondes associées et `run/critical-review-context.json`. Les sondes sont ciblées ; aucune suite lourde ni navigateur n’a été lancé par cette revue.

## Couverture et exclusions

Le périmètre `--all` porte sur les sources de première partie selon les extensions du skill, augmenté des **CJS modifiés/nouveaux**, des MJS de collecte/aide et des manifestes npm. La liste exacte, sans chevauchement, est `run/zones.json`. Les CJS inchangés ne sont pas tous audités : certains sont lus comme contexte, notamment `run-engines.cjs`. Il ne faut donc pas lire « full » comme une revue exhaustive de tout fichier du dépôt.

- `reference/dsfr-mail/` et `reference/dsfr-web/` : tiers épinglés, exclus ; provenance/génération contrôlées par la campagne du parent.
- `app/distribution/` et `prototype/distribution/` : générés, exclus ; les copies des worktrees d’audit restent celles de la base et n’ont servi à aucune validation navigateur.
- `node_modules/`, documents et reçus historiques : hors corpus de code ; documents utilisés uniquement pour contrats et contexte.
- Aucun fichier Shell dans le corpus ; checklist Shell non activée. Python standard, HTML/CSS/JS, Node CJS/MJS et infra couverts.

Restent inconnus ici : Outlook/Mélissa réels, rendu reçu, collage natif, IME natif, restrictions des postes, causes des deux gates rouges de campagne et exhaustivité des courses asynchrones. Le score technique du format ShipGuard n’est pas une autorisation de livraison.

## Artefacts et suite autorisée

Canonique local : `visual-tests/_results/audit-results.json` et `audit-results.toon`. Copie durable dans ce dossier, avec le run complet sous `run/`. `SHA256.json` vérifie leur copie. Le run est `completed` et ses cinq artefacts acceptés sont explicitement listés dans `run/dispatch.json`.

La condition native de #148 est désormais démontrée sur cette candidate avec l’adaptation d’identité base + overlay, sans commit temporaire. Les gates de recette demeurent distincts. Les commandes aval proposées par le protocole sont `/sg-visual-review`, `/sg-visual-run --from-audit` ou `/sg-process-check --from-audit` selon les besoins ; elles n’ont pas été exécutées par ce mandat. Toute mutation après ce rapport exige un nouveau relevé d’identité et une revue bornée du delta.
