# Accessibilité — campagne du 22 octobre 2026

**Dossier historique des corrections d’interface.** La [tranche suivante sur les titres](titres-20261022/RAPPORT.md) contient les preuves de la version courante ; les observations ci-dessous restent celles de leur collecte initiale.

**Objectif : 100 % de conformité aux critères RGAA applicables. Objectif non atteint et aucun taux publié.** Les corrections locales passent leurs régressions ; la qualification exhaustive reste ouverte, avec des constats sur les sorties mail, des limites d’outillage et des essais humains manquants.

Le mandat couvre le builder, ses distributions, le convertisseur SNUM, les aperçus et les courriels produits. Les amonts et AY11 sont restés en lecture seule. Aucun envoi ni installation nouvelle pendant cette campagne. Aucun opérateur humain ni poste Windows n’est disponible, selon les réponses de l’utilisateur.

## Dossier et portée des preuves

| Élément | Preuve et verdict |
|---|---|
| Référence normative | [RGAA 4.1.2](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/), consulté le 22 octobre ; référence structurée avec provenance et empreinte dans la matrice JSON. |
| Registre exhaustif | [106 critères](MATRICE-106.md), [258 tests](MATRICE-258.md), attentes et liens officiels. Présence au registre ne signifie pas exécution ni applicabilité. |
| Échantillon | Treize pages : accueil web, portable HTTP, SNUM, neuf compositions couvrant les 52 composants et une composition SNUM complète. Onze états d’interface capturés indépendamment en fichier local. |
| Observations par critère | [Matrice JSON](matrice-rgaa.json) : 1 155 observations avec page ou état, preuve et granularité. Une observation de critère ne qualifie pas chacun de ses tests. |
| Résultats vérifiables | [Reçu partageable](recu-20261022.json) : empreintes des sources et distributions, résultats, traces clavier, Firefox, lacunes. Le SHA parent précède les modifications ; les empreintes identifient leur contenu exact. |
| Qualification humaine | `NON_TESTE` ; aucune décision `C_CONFIRMEE` ou `NA_CONFIRMEE` attribuée automatiquement. La non-applicabilité doit être motivée pour chaque instance. |

Les preuves volumineuses restent sous `evidence/accessibilite-20261022/`, ignoré par Git : DOM, AX, captures, résultats axe, sorties AY11 et journaux. Le reçu conserve une empreinte de leur inventaire et les résultats utiles. Leur absence sur un autre poste exige une nouvelle collecte avant contre-vérification détaillée.

## Deux défauts reproduits et corrigés

| Constat initial | Intervention | Preuve avant/après |
|---|---|---|
| Sections ouvertes et espacements augmentés : page de 368 px dans une fenêtre de 320 px. | Bornes des champs, fichier local et contenu des blocs ; `box-sizing:border-box` sur `details::details-content`. La pseudo-boîte interne pouvait transmettre `content-box` aux contrôles DSFR. | Deux régressions rouges avant correction ; deux vertes après. Largeur et champs contrôlés à 320/640/1280 px dans Chromium, puis Firefox natif 156.0. |
| Champ invalide indiqué par `aria-invalid` sans message associé ; erreur du nom en dialogue non décrite par le champ. | Message propre à chaque champ avec `aria-describedby`, conservation des autres descriptions, retrait à la correction ou à l’annulation ; association du message au nom du dialogue. | Deux erreurs simultanées, correction de l’une, conservation de l’autre, annulation et renommage vide exercés. Focus et association DOM vérifiés. Restitution vocale non écoutée. |

Sources : `app/source/view.js`, `editor.js`, `library-actions.js`, `library.js`, `style.css`. Aucun changement du modèle JSON, du catalogue, du moteur mail ou des données enregistrées dans cette tranche. Les distributions sont régénérées.

Régressions : `tests/accessibility-browser.test.cjs`. Suite complète : **72 réussites, 0 échec et 0 saut**, environ 29 secondes. Comparaisons : `APPLICATION_DISTRIBUTIONS_OK` et `DISTRIBUTIONS_OK`.

## Instrumentation et limites

AY11 expose dix-huit familles exécutables et un catalogue couvrant cinquante-deux critères distincts. `candidate-static` ne propose aucun critère à son argument obligatoire : indisponibilité enregistrée, jamais assimilée à une réussite.

- Campagne principale : **819 appels** consignés sur treize pages, variantes et collectes du moteur comprises. Ce ne sont ni 819 critères ni 819 conformités.
- États complémentaires : **7 captures avec `--profile rgaa-106` et 399 appels de sondes**, tous avec code de commande nul. Les sorties conservent **194 `collected_no_candidate`, 170 `partially_collected`, 7 `not_collected` et 28 sorties sans ce champ**. Un code nul ne garantit pas une observation complète.
- Formulaires : `dialog-invalid` possède un scénario `captured`. Quatre autres états gardent `failed_target_unresolved`. Les parcours indépendants du dialogue et des erreurs apportent une preuve complémentaire ; ils ne réécrivent pas ces statuts.
- Axe sur les onze états d’interface : aucune violation relevée, mais contrastes indéterminés sur huit états et `frame-tested` sur cinq. L’injection locale utilise `bypassCSP:true`, explicitement déclaré. Elle ne prouve ni la CSP ni l’autonomie.
- Les dix HTML de courriels sont capturés séparément par AY11, avec résultats axe bruts. Cela examine le contenu hors iframe sans retirer le sandbox de l’aperçu. Le comportement dans les messageries reste une qualification distincte.
- Clavier : huit cycles Tab/Maj+Tab sur accueil, éditeur ouvert, dialogue et SNUM terminent sans atteindre la borne de 300 étapes ni focaliser une cible masquée. Fermeture par Échap exercée. Déplacement, duplication et retrait possèdent des traces DOM/AX du focus. Ordre pertinent, visibilité et annonces vocales restent à qualifier.
- Redistribution, simulation du zoom à 200 %, portrait, paysage et espacements : dix observations sans débordement extérieur. Le seul candidat de texte rogné est la légende volontairement masquée visuellement `sr-only`. Absence de recouvrement à revoir visuellement ; un viewport réduit n’est pas un zoom réel du navigateur.
- Les contrastes indéterminés des sélecteurs proviennent de leur image de fond SVG. Le calcul des deux couleurs CSS opaques figure dans le reçu. Il ne qualifie pas à lui seul la flèche, le texte recouvert, les autres états ou tous les contrastes.

Les collectes complémentaires comprennent aussi styles calculés, focus, orientation, redistribution et temporalité AY11. Signaux partiels, cibles absentes et captures manquantes restent dans les résultats ; aucun silence d’une sonde n’est transformé en conformité.

## Échecs du moteur de campagne

Le statut global de Creator n’est **pas OK**. Matrices et rapports sont générés ; leur génération ne valide pas leur contenu ni leur complétude.

1. La capture du rapport exige `dsfr/pages-html/P01.html` alors que l’audit DSFR est désactivé. L’erreur `BUILD.json ne référence pas dsfr/pages-html/P01.html` est conservée. Le cache du kit n’a pas été modifié.
2. Le premier passage navigateur ne trouvait pas axe. Un rejeu avec `AXE_CORE_PATH` rencontre la CSP réelle du builder, puis une fermeture du navigateur. États `ECHEC` et `À REJOUER` conservés ; les résultats axe initiaux d’AY11 et les collectes indépendantes restent disponibles.
3. La validation technique de cohérence signale quatorze tests avec signaux AY11 non reliés à une décision. Aucune décision humaine inventée pour faire disparaître cet avertissement.

Le registre partageable normalise les qualifications en `NON_TESTE` et conserve les statuts des moteurs séparément. Il ne remplace pas leurs preuves et ne prétend pas réparer Creator ou AY11.

## Constats sur les courriels encore ouverts

Les dix exports ne contiennent ni titre HTML `h1` à `h6`, ni `role=heading`. La composition SNUM complète et les composants explicitement titrés présentent pourtant des titres et rubriques visuels. Défaut de structure confirmé sur ces contenus, également relevé par Astra. Une famille d’images ou de boutons isolés ne nécessite pas automatiquement un titre. Ajouter un `h1` arbitraire à chaque bloc ne construirait pas une hiérarchie cohérente.

Les marqueurs axe `page-has-heading-one`, `landmark-one-main` et `region` sont à qualifier selon le document, sans déduire automatiquement trois non-conformités. Le moteur RGAA signale aussi des attributs de présentation ; les tableaux inventoriés portent `role=presentation`.

Le validateur HTML relève des erreurs dans les dix exports, dont espaces de noms Office/VML et attributs hérités du mail. Les trois interfaces applicatives n’ont pas d’erreur HTML dans cette collecte. Nombres par page dans le reçu. Ces résultats ne justifient ni une exemption générale du mail ni la suppression aveugle de ses adaptations Outlook.

La correction devra distinguer structure sémantique, contrôles RGAA applicables et adaptations mail. Elle doit préserver l’empreinte du catalogue et les fichiers existants, ou fournir une migration vérifiée. Aucun changement de catalogue entrepris sans cette analyse.

## Qualifications restantes

| Travail | Moyen attendu | État |
|---|---|---|
| Qualifier chaque test et non-applicabilité, alternatives/liens, ordre de lecture et structure | Revue du référentiel, des pages, états et instances | À poursuivre ; registre présent, qualifications non réalisées |
| Corriger et contre-vérifier la structure des courriels | Adaptation du rendu avec non-régression des données, du visuel et de la compatibilité mail | Ouvert |
| Terminer les collectes incomplètes et la capture du rapport | Diagnostic instrumental et protocoles complémentaires | Ouvert ; erreurs tracées |
| Écouter noms, descriptions, erreurs, annonces dynamiques, dialogues et focus | Opérateur avec lecteur d’écran réellement utilisé ; base de référence documentée | NON_TESTE ; aucun opérateur disponible |
| Zoom réel, contrastes et focus dans les états pertinents | Contrôle visuel et mesures sur les cibles réelles | À qualifier ; preuves instrumentées partielles |
| Firefox/Outlook et Mélissa sur le poste métier, installation et accès HTTPS | Poste Windows, versions/restrictions relevées, opérateur et autorisations métier | NON_TESTE ; aucun poste disponible |

Les issues historiques #2 et #13 restent ouvertes tant que leur recette n’est pas satisfaite. Publication d’une correction ou avis technique d’Astra ne vaut pas déclaration de conformité.

## Contre-audit indépendant

Astra donne **GO local pour les deux corrections d’interface**, après relecture des sources, tests, journaux et inventaires indépendants. Aucun GO RGAA global : le défaut des titres relève du test **9.1.3** sur P05/P13, les collectes restent partielles et les qualifications humaines manquent. `git diff --check` et la comparaison des distributions ont aussi été exécutés indépendamment. Aucun navigateur concurrent ni modification de fichier par le réviseur.

## Reproduction

Depuis la racine du dépôt, avec les outils déjà présents sur le poste :

```sh
python3 scripts/build_app.py
node scripts/audit_server.cjs
```

Dans un second terminal, serveur local conservé :

```sh
node scripts/audit_browser.cjs
PYTHONDONTWRITEBYTECODE=1 /Users/alex/Claude/git-hors-workflow/ay11-pre-audit/.venv/bin/python -B scripts/audit_ay11.py
npm run check
npm test
python3 -B scripts/audit_receipt.py
```

Le reçu exige aussi les fichiers Creator, la recette Firefox et les mesures de contraste de cette campagne. Il échoue si les prérequis ou les compteurs attendus diffèrent ; ce n’est pas une commande autonome de certification. Kit, configuration et journaux restent avec les preuves locales.
