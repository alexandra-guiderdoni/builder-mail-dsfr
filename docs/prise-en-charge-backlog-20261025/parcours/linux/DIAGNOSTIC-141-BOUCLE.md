# Blocage Linux #141 : boucle rouge et minimisation partielle

Suites expérimentales autorisées après cette minimisation : [H1](preview-h1/RAPPORT-H1.md) montre que le séquentiel bloque aussi ; [contrat des images](image-contract/CONTRAT-IMAGES.md) distingue chargement et visibilité ; [H3](preview-h3/RAPPORT-H3.md) est non concluante ; [H3b](preview-h3b/RAPPORT-H3B.md) montre qu’une lecture synchrone du layout est insuffisante. Aucun correctif appliqué.

Le blocage est reproduit sans inspecteur ni évaluation de secours. Une copie jalonnée localise l’attente dans les **promesses natives `image.decode()` originales**, avant `document.fonts.ready`. La composition initiale suffit : aucune frappe, modification de bloc ou assertion postérieure n’est nécessaire pour atteindre le blocage. La minimisation hors de l’application n’a pas reproduit sur les essais bornés ; la cause n’est pas établie et aucun correctif n’est appliqué.

Cette phase applique les phases 1–2 du skill `/Users/alex/Claude/.claude/skills/diagnosing-bugs/SKILL.md`. La phase 2 reste partielle : les éléments encore nécessaires du contexte applicatif ne sont pas tous identifiés. Aucune hypothèse de phase 3, correction, exécution séquentielle de decode ou attente rAF n’a été introduite.

## Protocole

Snapshot de 344 fichiers inchangé, manifeste SHA256 `ec19d276f0dd116f322907358748a058b9481ca8bfe3af61a18e99187d11048f`, Node officiel 24.18.0, même image Playwright officielle et Linux arm64. Chaque tranche utilise un conteneur neuf, privé, supprimé après sortie, source en lecture seule et preuves seules en écriture. Aucun fichier source, test suivi ou distribution du worktree n’est modifié.

Chaque itération dispose d’une limite extérieure hôte de **40 secondes**, avec arrêt du seul conteneur possédé au premier blocage. Limite de tranche 300 secondes. Aucun inspecteur, seconde promesse decode/fontes, commande navigateur de secours ni allongement d’attente. Les jalons navigateur utilisent les promesses originales ; les SHA256 des sources sont calculés côté Node depuis les événements console. Les navigations et détachements sont observés passivement. Tous les conteneurs sont supprimés, attestés par leurs reçus.

20 itérations ont été exécutées sur sept tranches successives autorisées, à partir de 12:39:04 UTC. Le dernier reçu donne la fin exacte de la tranche de contrôle initial. Les reçus consignent le code du conteneur : **143** pour les interruptions bornées, **0** pour les tranches terminées. Le lanceur Python collecte ce résultat en JSON et sort lui-même normalement ; son code de processus n’est pas le verdict des tests.

## Résultats

| Tranche | Périmètre | Résultat |
|---|---|---|
| `preview-loop` | Fichier intact, sans instrumentation | Premier essai bloqué après 6 cas terminés ; arrêt 40 s, code 143 |
| `preview-loop-diagnostic` | Fichier entier, jalons decode/fontes | Premier essai bloqué dans la composition initiale de « Frappe continue », après 4 cas terminés ; decode démarré, pas de fin ; code 143 |
| `preview-minimal` | Seul scénario « Frappe continue », jalons par image | 2 essais verts, troisième bloqué ; 24 decode lancés, indices 0–4 résolus, 5–23 en attente ; code 143 |
| `preview-composition-only` | Même scénario, étapes de frappe et postérieures supprimées | Premier essai vert (1141,45 ms), deuxième bloqué dans la composition portable ; seul indice 0 résolu, 1–23 en attente ; code 143 |
| `preview-native` | HTML rendu figé avec 24 mêmes images, iframe blob native sans script ni MailBuilder | 3 essais verts ; aucune reproduction |
| `preview-minimodule` | Même HTML, module preview.js exact et previewMeasure source/hash, initial neutre sans image | 5 essais verts ; aucune reproduction ; initial différent de l’application |
| `preview-minimodule-exact-initial` | Même minimodule, seul initial remplacé par le document réellement ouvert | 5 essais verts ; aucune reproduction |

Les essais bloqués de la copie instrumentée atteignent l’évaluation navigateur réelle et produisent des événements de résolution de certaines promesses. Le dernier document est complet, les 24 images sont connectées, complètes et ont des dimensions naturelles non nulles au début des appels. Aucun événement de navigation ou détachement ne suit le démarrage des decode dans l’essai minimal rouge. `fonts.ready` n’est pas encore atteint. Le blocage observé n’est donc pas une simple réponse finale perdue après la fin de cette fonction ; la progression de ses promesses decode est effectivement incomplète dans les jalons reçus. La cause de cette absence de progression reste inconnue.

Dans l’essai rouge minimal, l’image 4 résolue et plusieurs images en attente ont la même source SHA256 `4ce4e86fdfc024eba08d3d2dfc7e88050489fa4b7bfe8df5ab8388e278439534`, dimensions naturelles 1920 × 1080. Les indices en attente ne désignent donc pas une unique source systématiquement invalide. Aucun remplacement d’image n’a été essayé.

## Réductions natives et limites

`preview-native/fixture.html` conserve le HTML rendu et les 24 sources, dans le même ordre. `source-equality.json` vérifie les 24 SHA256 contre le témoin rouge. Le test natif ne charge pas de code MailBuilder. Il modifie toutefois le contexte de navigation, la géométrie et retire le script de mesure : ses trois succès ne suffisent pas à attribuer le blocage à l’application.

Le différentiel suivant réintroduit le module `app/source/preview.js` exact, le `previewMeasure` source/hash extrait et deux documents figés (initial neutre, puis la composition à 24 images). Le seul adaptateur Render renvoie ces chaînes figées ; aucun modèle, stockage, bibliothèque ou champ n’est chargé. Il reprend les paramètres observés dans l’application au stade précédant decode : viewport 1600 × 1000, sandbox `allow-scripts`, bordure 1 px, iframe x=735/y=754, largeur 639,984375 px et scrollY=329. La hauteur initiale vaut 760 px puis le module de mesure la gère. Les cinq essais attendent le titre exact et `readyState=complete`, puis exécutent les mêmes decode originales en parallèle. Tous passent. Les paramètres de géométrie sont repris par construction ; aucune assertion de parité complète du layout applicatif n’est prétendue.

Un contrôle supplémentaire corrige le delta d’initial : le premier minimodule employait un initial neutre sans image (SHA256 `f05529ab17f4c236025889f43785bd1f4a180948e2a92c452be73361d3cc4093`). Le document réellement ouvert, « Mon premier courriel », possède **4 images** (SHA256 du rendu avant ajout identique du script de mesure : `13dc851a9aa0ccb79b53ffb917b764fc994b92098a8ae927293a7b82e1273926`). La tranche `preview-minimodule-exact-initial` utilise `Render.html(MailBuilder.doc(), true)` relevé après l’ouverture réelle pour figer ce document, et garde strictement la même fixture finale à 24 images. Elle réussit cinq essais supplémentaires. Ce contrôle élimine cette différence précise d’initial ; il ne prouve pas la parité de tout l’historique applicatif ni l’absence du défaut.

La reproduction utile reste donc la copie « composition seule » dans le contexte de l’application. Les petits échantillons ne donnent pas un taux statistique fiable. Aucune réduction à 6 ou 2 images n’est exécutée puisque la reproduction native à 24 images manque. Une prochaine phase doit préserver ce rouge et identifier les éléments de contexte encore nécessaires avant de qualifier un correctif.

## Commandes et preuves

Commandes réellement exécutées, chacune une fois pour sa tranche (réutiliser un nouveau dossier de preuves avant tout rejeu pour préserver les journaux) :

```sh
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-loop-bounded.py
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-loop-diagnostic-bounded.py
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-minimal-bounded.py
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-composition-only-bounded.py
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-native-bounded.py
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-minimodule-bounded.py
python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-minimodule-exact-initial-bounded.py
```

Chaque dossier conserve `RECEIPT.json`, le manifeste, les journaux par itération, la commande Docker, les versions et les preuves de suppression. Les copies `preview-size-diagnostic.test.cjs` sont marquées diagnostic ; les assertions de production ne sont jamais modifiées. `preview-minimal/third-iteration-state.json` contient les indices, SHA, dimensions et navigations de l’occurrence rouge. Les campagnes intégrées antérieures restent conservées dans `FINAL-INTEGRATED.md` ; aucun nouveau gate global n’est exécuté ici.
