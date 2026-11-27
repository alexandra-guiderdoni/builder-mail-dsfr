# Contre-revue des issues du 26 novembre 2026

Périmètre : issues #229 à #239 de `builder-mail-dsfr`, ouvertes à la suite de [la revue de code du même jour](REVUE-CODE-2026-11-26.md). Révision `c0a6d51`. Chaque affirmation a été relue à la source ; sept issues ont en plus été exécutées. Aucun fichier suivi modifié, aucune issue modifiée : ce document est le seul ajout.

## Verdict

Les onze constats sont réels : aucune issue n'est à fermer. Quatre demandent une correction de leur texte avant qu'un agent ne s'en saisisse, parce que leur reproduction, leur décompte ou leur correctif proposé est faux :

- #238 : le correctif proposé, `frame-ancestors` dans les distributions, est sans effet. Prouvé.
- #230 : huit attentes périmées au moins, pas cinq.
- #233 : le comportement dénoncé est figé par un test du dépôt ; ce n'est pas un défaut du collecteur.
- #236 : la reproduction décrite est inexécutable ; le défaut, lui, est maintenant prouvé et plus net que décrit.

Trois autres portent une imprécision sans conséquence sur le correctif (#231, #234, #235). Quatre sont exactes (#229, #232, #237, #239).

Suite donnée le 26 novembre 2026 : le corps des sept issues #230, #231, #233, #234, #235, #236 et #238 a été corrigé sur GitHub selon ce document, et relu identique au texte préparé. #233 passe du libellé `bug` à `enhancement`. Les quatre premières portent une section « Contre-revue du 26 novembre 2026 » qui dit ce qui a changé ; l'historique des modifications de GitHub garde les versions d'origine.

## Issues à corriger avant prise en charge

### #238, absence de `frame-ancestors`

- Constat confirmé : zéro occurrence dans les trois distributions ; la page publiée ne renvoie ni `content-security-policy` ni `x-frame-options`.
- Erreur : la décision proposée, « poser `frame-ancestors 'none'` sur les trois distributions », ne protège rien. Les distributions posent leur politique par balise `meta`, et un navigateur ignore `frame-ancestors` à cet endroit.
- Preuve exécutée : une page portant `frame-ancestors 'none'` par balise `meta`, encadrée par un site tiers, s'affiche sous Chromium et sous WebKit ; la même directive en en-tête HTTP bloque l'encadrement. Chromium l'écrit en console : « The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element ».
- Conséquence : GitHub Pages ne permet pas de poser d'en-tête. Les options réelles sont un refus d'encadrement par script au chargement, un autre hébergement, ou l'acceptation motivée du risque.
- Cette erreur est passée à ma relecture avant création de l'issue : je l'avais vérifiée sur ses constats, pas sur son remède.

### #230, recettes qui attendent une annonce disparue

- Confirmé : les cinq attentes citées, aux lignes citées, et l'absence des deux textes dans `app/source`.
- Décompte incomplet. Trois autres attentes sont périmées :
  - `scripts/recipe_firefox.mjs:56` et `scripts/recipe_page_flow_firefox.mjs:100` ouvrent le volet « Fichiers et récupération », qui n'existe plus (retiré par `a9d2896`, #208 ; le volet s'appelle « Sauvegarde et import »). `firefox.details` lève alors une `TypeError` sur `undefined`, avant toute attente de texte.
  - `scripts/recipe_firefox.mjs:57` attend « Import ajouté à la bibliothèque » ; l'atelier émet « Import ajouté à Mes newsletters ».
- Attribution inexacte : « Version de composition » a quitté le code avec `8671507` (3 novembre, #207), pas avec #199.
- Le relevé est une heuristique sur les chaînes des recettes : il donne un minimum, pas un total. Le premier critère d'acceptation, « les cinq attentes sont alignées », est donc insuffisant ; seul le deuxième, exécuter chaque recette, fait foi.
- Non exécuté : les recettes elles-mêmes, qui demandent Firefox natif.

### #233, recette page-flow

- Confirmé par exécution sur une copie hors dépôt : relancer sur un répertoire qui contient un reçu réussi rend le code 1 et remplace `recu.json` (empreinte `8332254d…` avant, `6cabe1ef…` après), l'ancien étant archivé sous `runs/<id>/previous-recu.json`. Lancée depuis un autre répertoire, la recette y crée bien un dossier avant d'échouer.
- Qualification à revoir : le remplacement du reçu canonique par un reçu incomplet est le contrat voulu du collecteur. `tests/collectors-receipt.test.cjs:27` le fige (« le reçu courant incomplet remplace le canonique après archivage exact de l'ancien », `3b1b6a6`), et le code le commente : « Incomplet dès le début : aucun ancien PASS implicite ».
- Ce qui reste vrai : la recette appelle `beginCollection` avant de refuser, là où ses deux sœurs refusent avant toute écriture. C'est un alignement entre recettes, pas un `bug`. Le correctif MUST déplacer le refus dans la recette et MUST NOT toucher à `beginCollection` ni à son test.
- Libellés `bug` et `ready-for-agent` trop affirmatifs tant que l'issue ne cite pas ce contrat.

### #236, ordre du rendu et de la sauvegarde

- La reproduction décrite ne fonctionne pas : `A.UI` est gelé (`app/source/view.js:204`), remplacer `A.UI.refresh` est ignoré sans erreur. Essai fait : aucune exception, modification enregistrée normalement.
- Défaut prouvé par une autre injection (le champ `#subject` rendu introuvable le temps d'un appel), sous Chromium et WebKit : l'exception remonte, le nom modifié est en mémoire, absent du stockage, l'avertissement de fermeture ne se déclenche pas.
- Plus net que décrit : l'état affiché reste « Newsletters enregistrées dans ce navigateur. », donc faux, et non simplement absent. La modification suivante enregistre l'ensemble.
- La qualification « non reproduite » et le libellé `enhancement` sont à revoir ; le déclencheur naturel reste hypothétique, aucune exception du rendu n'ayant été observée.

## Issues exactes à une imprécision près

### #231, aperçu et marqueur de politique de sécurité

- Confirmé sous Chromium et WebKit : la localisation rend `null` avec l'objet au marqueur, `{top: 0, height: 123}` avec un objet ordinaire. La limite « non vérifié sous WebKit » est levée ; Firefox reste non vérifié.
- Le chiffre de 595 px n'est pas une constante : dans mes conditions le cadre reste à 760 px en profil neuf, et à 1003 px si un objet ordinaire a été affiché avant. Le défaut est que la hauteur cesse de suivre, pas qu'elle vaut 595.
- Portée précisée : seules les apostrophes droites déclenchent le défaut. Avec des apostrophes typographiques, l'aperçu fonctionne.

### #234, reçus amont incomplets

- Confirmé à la lecture : ni `audit_receipt.py` ni `audit_contrasts.cjs` ne lisent `completed` ou `proof_errors`, alors que `verifyBaseline` le fait.
- Inexact : « sans appelant dans la documentation ni la CI ». `docs/MAINTENANCE.md:139` documente `audit_contrasts.cjs`, et `npm test` exerce `audit_receipt.py` par `tests/audit-receipt.test.cjs` et `tests/audit_receipt_contract.py`. Un correctif devra tenir ces contrats.
- Le critère « carte d'empreintes vide » est déjà satisfait par `audit_receipt.py` (contrôle `sources-mesurees-declarees`) ; il ne manque que dans `audit_contrasts.cjs`.
- Non exécuté.

### #235, contrat du skill

- Confirmé : aucun script du skill n'appelle `Render.clipboardHtml` ni `Render.exportHtml`.
- Incomplet : `Render.block` est dans le même cas, déclaré et appelé par un test seulement.
- « Le skill continuerait de fonctionner » est trop fort. `SKILL.md:131`, `references/copy-and-reception.md` et `evals/scenarios.md` citent ces fonctions par leur nom, et deux tests du skill les appellent. Le commentaire du contrat garde déjà les noms de composants « car les références les citent » : la même raison vaut ici. La seconde branche du critère d'acceptation, écrire la raison de les conserver, est donc l'issue la plus probable.

## Issues confirmées sans réserve

- #229, « Tout effacer » : confirmé par clic réel sous Chromium et WebKit, à l'ouverture et après annulation. Sous WebKit le message est plus long (« … is not a function. (In 'A.Actions[…]()', … is undefined) »). Une fonction vide dans `A.Actions` fait disparaître l'erreur sans ouvrir la fenêtre deux fois : la raison donnée dans le rapport de revue pour l'interdire est fausse, l'interdiction reste un choix défendable (une seule voie).
- #232, `npm test` et WebKit : les quinze fichiers, les 29 occurrences et les deux lignes de documentation sont exacts ; la contre-épreuve (791 réussites sur 791 après installation) est versée à l'issue.
- #237, exception ANDI : politique relue dans les deux distributions, zéro occurrence de « ANDI » dans `docs/MAINTENANCE.md`, `README.md` et `SPECIFICATION.md`.
- #239, requêtes à l'import : preuve exécutée avant création. Sous réserve que l'hébergeur y est simulé.

## Exécutions

- `contre-preuves.cjs` sur `app/distribution/portable.html` : code 0 sous Chromium, code 0 sous WebKit. Sous Firefox : non exécuté, le Firefox de Playwright attendu (`firefox-1555`) n'est pas installé sur ce poste.
- `recipe_page_flow_firefox.mjs` sur une copie `git archive HEAD` : code 1 attendu, reçu comparé avant et après.
- `meta-frame-ancestors.cjs` : code 0, Chromium et WebKit.
- `textes-recettes.cjs` : code 0, relevé heuristique.

Scripts et sorties conservés hors dépôt, non versionnés.

## PDG pass

Auto-vérification PDG, pas une revue indépendante : le même agent a créé #237 à #239.

- Déclenchement : oui, revue dont un autre agent exécutera les conclusions.
- Compétence : `progressive-disclosure-guard`, exigée par les consignes de l’espace de travail. Une lecture seule des issues ne suffisait pas : trois erreurs n'apparaissent qu'à l'exécution (#236, #238) ou en ouvrant un test (#233).
- Artifacts inspectés : les onze corps d'issues ; les lignes citées de `app/source`, `scripts/`, `tests/firefox-support.mjs`, `tests/collectors-receipt.test.cjs`, `docs/MAINTENANCE.md` ; le skill `newsletter-contribution` ; les trois distributions ; le journal `test.log` de la revue.
- Chevauchements : `beginCollection` et son test, à étendre par la recette et non à remplacer (`extend`) ; les contrats de `audit_receipt.py`, à tenir (`extend`) ; aucun doublon créé.
- Matrice des affirmations :
  - #229, erreur affichée : exécution, deux moteurs. Confirmé.
  - #230, cinq attentes périmées : lecture et relevé. Partiel, huit au moins.
  - #231, localisation perdue : exécution, deux moteurs. Confirmé ; chiffre de hauteur partiel.
  - #232, WebKit requis : journal et contre-épreuve. Confirmé.
  - #233, reçu remplacé : exécution. Confirmé ; qualification de défaut non étayée, contrat testé contraire.
  - #234, `completed` non lu : lecture. Confirmé ; « sans appelant » non étayé.
  - #235, fonctions non appelées : recherche. Confirmé ; effet annoncé partiel.
  - #236, modification non sauvegardée : exécution. Confirmé ; reproduction décrite non étayée.
  - #237, exception non documentée : lecture. Confirmé.
  - #238, directive absente : lecture et `curl`. Confirmé ; remède proposé réfuté par exécution.
  - #239, requêtes sans confirmation : exécution. Confirmé, hébergeur simulé.
- Fichiers matériels non lus : les quatre recettes en entier (lignes citées et lignes relevées seulement), d'où `Unknown` sur le nombre total d'attentes périmées ; `audit_receipt.py` hors des lignes 455 à 480 ; les captures de #229 et #231, non rouvertes.
- Connu connu : les onze constats, les quatre textes à corriger.
- Connu inconnu : Firefox pour #229 et #231 ; l'exécution réelle des recettes ; le déclencheur naturel de #236.
- Inconnu connu : croire qu'une issue `ready-for-agent` a un correctif juste parce que son constat l'est ; croire qu'un test vert protège un comportement que l'issue qualifie de défaut.
- Inconnu inconnu : d'autres sélecteurs périmés dans les recettes, hors textes ; d'autres contrats testés que les issues contredisent sans le savoir.
- Voie à écarter : ajouter `frame-ancestors` aux balises `meta` et clore #238 ; modifier `beginCollection` pour #233 ; aligner cinq chaînes et clore #230 sans exécuter les recettes ; retirer du contrat des fonctions que la documentation du skill cite.
- Garde-fou proposé : corriger le texte des quatre issues avant prise en charge.
- À préserver : le contrat de `beginCollection` et `tests/collectors-receipt.test.cjs` ; les contrats de `audit_receipt.py` ; la politique de l'aperçu figée par `tests/preview-contract.test.cjs`.
- Preuve de non-régression requise : pour chaque correctif, le test rouge puis vert demandé par l'issue, `npm run check` et `npm test` avec WebKit.

## Fiche de validation humaine

- Fichiers modifiés : aucun fichier suivi ; ce document.
- À inspecter : les issues #238, #230, #233 et #236 sur GitHub, en regard des quatre sections ci-dessus.
- Résultat attendu : chaque texte corrigé ou commenté avant qu'un agent ne le prenne.
- Risque accepté en l'état : un agent qui prendrait #238 livrerait une protection inopérante ; un agent qui prendrait #233 pourrait casser un contrat testé.
- Phrase d'approbation : `Approved after human validation.`
