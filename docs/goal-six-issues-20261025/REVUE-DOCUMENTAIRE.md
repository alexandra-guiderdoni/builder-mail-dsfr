# Revue indépendante Astra — sélection documentaire #130 et #145

**GO pour publier les 18 fichiers documentaires identifiés ci-dessous.** Aucune confusion substantielle entre non-reproduction et correction n’est relevée. Les métadonnées d’image sont désormais attribuées à leurs sources ; la divergence non résolue n’est pas transformée en causalité. Ce verdict ne valide aucun correctif produit ni clôture d’issue.

Revue en lecture seule du checkout `/Users/alex/Claude-worktrees/builder-six-restants-20261025`, le 25 octobre 2026. Seul le présent avis est écrit, hors checkout. Aucun test applicatif, navigateur, job CI, script collecteur ou analyseur du paquet n’a été exécuté. Les contrôles utilisent des lectures JSON, calculs SHA-256 et comptes indépendants dans les traces existantes. Les brouillons `RAPPORT-SUIVI.md` et `etat-operationnel.json`, ainsi que le résultat futur du run 40221895564, sont explicitement exclus.

## #130 : correction juste et bornée

Les deux extraits « Set up job » nomment `ubuntu-26.04` et `20261012.163.1`. Le `host.log` du rejeu contient `ImageVersion=20261023.163.3`. Les empreintes des deux extraits et des onze fichiers du reçu REJEU concordent, y compris le rapport corrigé. Le rapport explique correctement que la comparaison précédente mélangeait deux sources et ne prouvait pas des images différentes. Il ne prétend pas non plus que des métadonnées identiques établissent une identité binaire.

Les champs JSON historiques `runnerImage` et `historicalRunnerImage` sont conservés avec des champs Source explicites et un objet imageComparisonCorrection. Cette conservation est cohérente avec la correction ; un consommateur doit lire les sources, pas traiter les deux valeurs comme un comparatif homogène.

La conclusion #130 reste : mécanisme de fixture provoqué, incident spontané non reproduit, cause historique inconnue, issue ouverte. Le contrôle négatif rouge n’est pas présenté comme un septième test vert.

Le reçu image-metadata-review conserve les noms des fichiers de sa collecte originale, dont certains ne sont pas copiés dans la sélection. Son host.log est explicitement rattaché au chemin Git publié ; le rapport proposé correspond au rapport intégré. Ce reçu est une provenance historique, pas l’affirmation que tous ses fichiers annexes sont adjacents à la copie sélectionnée.

## #145 : archives, traces et comptes concordants

Les archives brutes désignées par ARCHIVE-SHA256 sont présentes. J’ai vérifié leur inventaire exhaustif et toutes leurs empreintes, puis celles des fichiers sélectionnés et leur égalité byte-for-byte avec les originaux.

| Run | Fichiers bruts | Octets bruts | Fichiers sélectionnés |
|---|---:|---:|---:|
| 40219553464 | 18 | 1 127 140 | 5 |
| 40221156125 | 26 | 30 672 789 | 6 |

Les reçus d’analyse pointent eux aussi vers des empreintes exactes. Les chemins de collecte conservés ne désignent pas tous des fichiers publiés ; LISEZ-MOI le dit explicitement et fournit la racine d’archive. La sélection ne prétend donc pas être l’archive complète.

Dans `linux-confirmation.json`, le recomptage donne un parcours vert, un rouge, 43 exports et 42 événements download. Le rouge est le contexte 6 du second parcours, nom de quatre unités UTF-16. Cinq événements de pointeur/souris sont trusted et ciblent TD dans la frame ; l’URL est exactement previewSrc. L’événement window-focus complète cette séquence mais son payload ne possède pas de champ trusted : la preuve trusted porte sur les cinq événements d’input. Le bouton UID1 demeure connecté, le dialogue reste ouvert dans le snapshot après retour et dans le final ; TimeoutError download est préservé. La PNG relue montre bien le dialogue, son backdrop, le bouton visible et l’aperçu derrière.

Cette preuve soutient la destination erronée du geste, sans expliquer la cause interne. Le texte conserve correctement l’absence de coordonnées iframe et ne soustrait pas des horloges de documents différents. La précision « natif » ne vaut pas interaction physique : le rapport le dit.

Le recomptage des deux traces du comparatif donne, dans chaque bras, 30 parcours verts, 270 contextes, 810 exports/downloads et 270 confirmations DOM mail ; aucune réception de pointeur/souris iframe enregistrée. Le reçu de préparation identifie les quatre seules différences de fichiers : style.css, portable.html, web/index.html et web/sw.js ; scripts, CSP et helper inchangés. Le verdict `non-reproduction-no-fix-proof` est cohérent avec un témoin intégralement vert.

Le diff d’observateur R1/R2 contient bien les lectures supplémentaires et validations décrites. Le rapport qualifie leur effet de possible, non démontré. L’hypothèse que :modal ou getComputedStyle expliquerait à elle seule le changement de fréquence n’est pas affirmée.

## Portée temporelle et exclusions

Les rapports originaux sont conservés sans réécriture : leurs formulations « aucune relance » ou « bifurcation non préparée » décrivent l’état au moment de leur analyse. Le LISEZ-MOI plus récent signale séparément la paire R1 40221895564 autorisée ; il ne la présente pas comme déjà terminée. Cette distinction est suffisante dans la sélection relue. Si ce LISEZ-MOI est actualisé après collecte, son nouveau contenu et sa nouvelle empreinte sortiront de ce verdict figé.

Le rappel de l’échec du run main 40216251444 n’est pas réaudité ici : les deux archives autorisées contiennent les rejouages suivants. Aucun nouveau statut de main, Pages ou du run en cours n’est déduit de cette revue. Les diagnostics restent distincts des workflows produit ; aucune approbation de fusion de leurs workflows ou du CSS expérimental n’est donnée.

## Identité des 18 fichiers approuvés

Chemins relatifs à `docs/goal-six-issues-20261025/investigations/`.

```json
{
  "130/REJEU-GITHUB.md": "f379a2cf57777cbca3e301f7416c6847cb996ca0fda0769c9573a66bfcd08788",
  "130/REJEU-GITHUB-SHA256.json": "c01ac758adb32ffcc2d64a88e82707633b174616479c0882253702587baedb11",
  "130/image-metadata-review/RECEIPT.json": "e8ae1d20f420e1fcb94ebedc040c3a0af0fbfa3148fe4ade2e1987e6adb65644",
  "130/image-metadata-review/setup-40185188187-job-121144378637.log": "fe49abda323a782b5f186086e6e2b1e307c518e12e7598bb29fe6de5d6c20e95",
  "130/image-metadata-review/setup-40213040087-job-121228189622.log": "6d90017a0dc98f174ea40262d1dc2fa309f562bdf18fd2b6be47a5be99f3ca6d",
  "145-confirmation/ARCHIVE-SHA256.json": "2ee7dee023833263e3ebc67538e94cd6bd5e2f3fcc72f670ec0d583ebdf9b394",
  "145-confirmation/LISEZ-MOI.md": "d3ee06b8aa2311213fc72abb5557cbc03927f9c80b6f81b1a2d30aae170508d4",
  "145-confirmation/github-40219553464/ANALYSIS-RECEIPT.json": "1292d9d1576d539b14ee7cd99c70e12fe8208723dabc65bce510c0e099257045",
  "145-confirmation/github-40219553464/RESULTAT.md": "9174a6a92a822f4a83584f569bc1142b87a62c8e62b1c20f9247f94d972b0aee",
  "145-confirmation/github-40219553464/comparison-timeline.json": "5e8a91790ab87994bec65250f5759c6a44396eaa9ebcdfd7177825df91b5f845",
  "145-confirmation/github-40219553464/download-complete.json": "5cc0e165ee82d084777c059dcc77b007a25be4d1ac7d6d18dd48ffee756ce2f6",
  "145-confirmation/github-40219553464/verified-summary.json": "c39ee47d7a0cbafde96e33f33ed59d0ce2f58083f909aa6f18da51b500a925f0",
  "145-confirmation/github-40221156125/ANALYSIS-RECEIPT.json": "eba9f5359c81dc65558affffb39a379e8eb766c40b8a1972603479ff1be4f48a",
  "145-confirmation/github-40221156125/RESULTAT.md": "3cc7a9bb7ed13fc3e96cae28791efc646a82ee1a44de315301cd12e4c4ecd4d9",
  "145-confirmation/github-40221156125/download-complete.json": "5f76971634b226904c47cb29ab27f512ae75476f1d32e103fb263055f75a0999",
  "145-confirmation/github-40221156125/observer-R1-R2.diff": "53836d8887b7bc865ed587d7a13236b082768ddd802ad58720463ff489042c8c",
  "145-confirmation/github-40221156125/red-comparison-details.json": "c30080ebb244136549e77740277788aff8cbb46579b1bf7019770a90b85c6bb0",
  "145-confirmation/github-40221156125/verified-summary.json": "3aa3c48847ce400e3b17618c57e57014f1152848675d834a00891f4c3ed0f960"
}
```

**Verdict documentaire : aucun blocage sur cette sélection exacte.** Garder #130 et #145 ouvertes selon les limites énoncées ; le bilan final et l’état opérationnel attendent leur revue séparée.
