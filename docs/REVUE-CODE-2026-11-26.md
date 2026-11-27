# Revue de code du 26 novembre 2026

Périmètre : dépôt `builder-mail-dsfr`, révision `c0a6d51` (`main`, écart 0/0 avec `origin/main`, arbre propre). Revue en lecture seule : aucun fichier suivi n'a été modifié, aucun commit. Ce rapport était alors le seul fichier ajouté.

Suites au 27 novembre 2026 : #229, #230, #231, #232, #233, #234 et #236 sont corrigées et closes (PR #240, #241 et #242) ; #235, #237, #238 et #239 restent ouvertes. Le texte de sept issues a été corrigé après la [contre-revue](CONTRE-REVUE-ISSUES-2026-11-26.md), qui rectifie aussi plusieurs affirmations de ce rapport, laissé tel qu’écrit le 26 novembre.

## Verdict

Aucun bloquant. Sur les risques majeurs d'une application qui importe des fichiers, rend du HTML et conserve du travail : validation stricte avant toute mutation, échappement systématique, isolation de l'aperçu, jeton de concurrence entre fenêtres, la mise en œuvre est solide et la suite de tests détecte une régression sur l'échappement comme sur la validation des URL.

Deux défauts importants, tous deux prouvés :

- « Tout effacer » affiche et annonce une erreur technique en anglais, à chaque ouverture et après annulation. Présent dans la version publiée.
- Quatre recettes natives attendent une annonce que l'application n'émet plus depuis le 2 novembre. Elles ne peuvent plus réussir.

Le reste est mineur : un cas limite de l'aperçu, un prérequis de `npm test` absent de la documentation, de l'outillage de recette et d'audit à aligner.

## Issues ouvertes

Une issue par défaut à corriger, le 26 novembre 2026, libellés du dépôt :

- [#229](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/229) : « Tout effacer », erreur technique affichée et annoncée (`P2`, `bug`, `accessibility`, `ready-for-agent`).
- [#230](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/230) : quatre recettes attendent une annonce disparue (`P2`, `bug`, `ready-for-agent`).
- [#231](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/231) : aperçu, marqueur de politique de sécurité pris dans le titre (`P3`, `bug`, `ready-for-agent`).
- [#232](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/232) : `npm test` exige WebKit, la documentation ne le dit pas (`P3`, `documentation`, `ready-for-agent`).
- [#233](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/233) : recette page-flow, reçu réussi remplacé avant le refus (`P3`, `bug`, `ready-for-agent`).
- [#234](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/234) : reçus amont incomplets acceptés par deux scripts d'audit (`P3`, `bug`).
- [#235](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/235) : contrat du skill trop large de deux fonctions (`P3`, `enhancement`).
- [#236](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/236) : ordre du rendu et de la sauvegarde dans `change()` (`P3`, `enhancement`).

Trois observations à arbitrer, ouvertes comme questions (`question`), chacune attend une décision écrite :

- [#237](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/237) : exception ANDI de la politique de sécurité publiée (`P3`).
- [#238](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/238) : absence de `frame-ancestors` dans les distributions publiées (`P3`).
- [#239](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/239) : requêtes des images distantes à l'import, sans avertissement préalable (`P3`).

Sans issue : la couverture du parcours à la souris (à rapprocher de #173), et la piste des images animées, non creusée.

## Exécutions

- `npm run check` : code 0 (`PROVENANCE_OK`, `APPLICATION_DISTRIBUTIONS_OK`, `DISTRIBUTIONS_OK`). Les distributions commitées sont conformes aux sources.
- `npm test` : code 1. 791 tests, 759 réussites, 32 échecs, 0 ignoré, en 8 min 24 s, sur Node 26.13.0 et macOS 27. Motif unique des 32 échecs, lu 29 fois dans le journal : l'exécutable WebKit de Playwright 1.64.1 (`webkit-2370`) n'est pas installé sur ce poste.
- Contre-épreuve après installation de WebKit (`npx --no-install playwright install webkit`, code 0) : `npm test`, code 0, 791 réussites sur 791, 0 ignoré, en 10 min 7 s. L'absence de WebKit était la seule cause des 32 échecs ; résultat versé à #232.
- Import d'un fichier portant une image distante, sur la distribution portable, profil neuf : 0 requête avant l'import, 2 requêtes d'image après, sans référent, sans fenêtre de confirmation. Sortie versée à #239.
- Mutations sur une copie hors dépôt (`git archive HEAD`), lot de 13 fichiers de tests : témoin sain 81 réussites sur 81 ; échappement HTML neutralisé dans `render.js`, 7 échecs sur 81 dans 5 fichiers ; validation des URL désactivée dans `model.js`, 10 échecs sur 81 dans 6 fichiers.
- Preuve sur la distribution portable, profil Playwright jetable : `preuve-portable.cjs`, code 0, résultats dans `preuve-portable.json`.

Journaux conservés hors dépôt, non versionnés.

## Défauts importants

### « Tout effacer » affiche une erreur technique

- Observation : ouvrir « Tout effacer » écrit `A.Actions[action.dataset.action] is not a function` dans `#error` (`role="alert"`, donc annoncé de façon assertive) ; le message reste visible après annulation.
- Cause : le répartisseur générique de `app/source/editor.js:56-58` exécute `A.Actions[action.dataset.action]()` pour tout `[data-action]`. Le bouton `data-action="reset-library"` (`app/source/shell.html:17`) est traité par un écouteur dédié (`app/source/library.js:198-205`) et n'a jamais eu de fonction dans `A.Actions` (`app/source/library-actions.js`).
- Depuis : introduction de la fonctionnalité, `a6fb095` (2 novembre, #201). Donc présent dans `eed1667`, la dernière révision publiée.
- Pourquoi la suite ne le voit pas : `tests/reset-browser.test.cjs:29,36,70` ouvre le dialogue et vérifie son contenu, jamais `#error`.
- Correction minimale : porter le traitement de `library.js:198-205` dans `A.Actions["reset-library"]` et retirer l'écouteur dédié, pour garder une seule voie. Ajouter au test l'assertion « `#error` caché » après ouverture et après annulation.
- À ne pas faire : une fonction vide dans `A.Actions`, ou un cas particulier dans le répartiteur. La première ouvrirait le dialogue deux fois, le second masquerait le défaut sans le retirer.

### Quatre recettes attendent une annonce disparue

- Observation : « Bibliothèque sauvegardée dans ce navigateur. » est attendu par `scripts/recipe_firefox.mjs:41`, `scripts/recipe_page_flow_firefox.mjs:104`, `scripts/recipe_firefox_clipboard.mjs:178` et `scripts/recipe_installation.cjs:75`. Le texte est absent de toutes les sources de `app/source`. `scripts/recipe_firefox.mjs:74` attend aussi « Version de composition », absent de même.
- Depuis : le texte a quitté le code avec `6119e64` (2 novembre, #199). L'annonce actuelle est « Newsletters enregistrées dans ce navigateur. » (`app/source/state.js:139`). Aucune des quatre recettes n'a été modifiée après le 1er novembre.
- Effet (déduit de la lecture, recettes non relancées) : `firefox.wait` renonce après 100 essais de 100 ms et lève « Condition Firefox absente » (`tests/firefox-support.mjs:107`) ; `page.waitForFunction` expire. L'échec est fermé : ces recettes ne produisent pas de faux reçu, elles ne produisent plus de reçu du tout.
- Portée : trois d'entre elles sont les procédures documentées pour le Mac de développement (`docs/MAINTENANCE.md:141-158`). Elles sont hors de `npm test` et de la CI, d'où une divergence sans signal.
- Correction minimale : aligner les cinq attentes sur les textes courants, puis ajouter un contrôle qui compare les annonces attendues par les recettes aux sources, dans `npm test` ou `npm run check`.

## Défauts mineurs

- Aperçu : marqueur de politique de sécurité pris dans le titre. `app/source/preview.js:27-30` remplace la première occurrence de `default-src &#39;none&#39;;`, alors que `app/source/render.js:127` place `<title>` avant la balise `meta`. Prouvé : avec le sujet « Rapport default-src 'none'; suite », la première occurrence tombe dans le titre (indice 231, la balise `meta` est à 272) et la localisation d'un bloc rend `null` après 3 s, contre `{top: 0, height: 123}` avec un sujet ordinaire. Effet : plus de redimensionnement de l'aperçu ni de « Voir ce bloc dans l'aperçu ». Aucun effet de sécurité, la politique reste `default-src 'none'` et le script de mesure est refusé. Correction : remplacer dans la balise `meta` elle-même, avec un témoin dans `tests/preview-locate-browser.test.cjs`.
- `npm test` exige WebKit. `docs/MAINTENANCE.md:73` et `:79` annoncent Chromium seul ; 15 fichiers de `npm test` lancent WebKit et rendent la suite rouge sur un poste qui ne l'a pas. Correction : documenter `npx --no-install playwright install webkit` comme prérequis de `npm test`, ou réserver ces cas à `npm run test:engines`.
- Recette page-flow. `scripts/recipe_page_flow_firefox.mjs:77-78` appelle `beginCollection` avant d'assertionner que le répertoire est vide : sur un répertoire déjà utilisé, `recu.json` à la racine est remplacé par un reçu incomplet (`scripts/collector_receipt.cjs:42-54`), l'ancien restant archivé sous `runs/<id>/previous-recu.json`. La ligne `:48` prend en plus le dépôt dans `process.cwd()`. Lu, non exécuté.
- Reçus amont. `scripts/audit_receipt.py:461-478` et `scripts/audit_contrasts.cjs:145-148` ne lisent ni `completed` ni les tableaux d'erreurs de `browser.json`, contrairement à `scripts/recipe_export_downloads.cjs:14-18`. Outillage de la campagne du 22 octobre, sans appelant documenté. Le reçu publié `docs/accessibilite/recu-20261022.json` ne porte pas ce défaut (contrôlé : schéma 1, sans `report_review`, Firefox sans erreur). Lu, non exécuté.
- Ordre dans `change()`. `app/source/state.js:163-168` remplace `A.library`, rend l'interface, puis appelle `save()` : une exception du rendu laisserait une modification en mémoire sans sauvegarde ni état affiché. Mécanisme lu, occurrence non produite.
- Contrat du skill. `.claude/skills/newsletter-contribution/scripts/builder-contract.cjs:12` déclare `Render.clipboardHtml` et `Render.exportHtml`. Aucun script du skill ne les appelle, et `builder-document.cjs:17` ne fournit pas `DOMParser` pour les exécuter. Un renommage sans effet sur le skill ferait échouer le contrat.
- Constaté sans y toucher : `.claude/session-context.md` du dépôt est suivi et porte un état de session du 3 novembre.

## Observations, à arbitrer

- La politique de sécurité publiée (`scripts/build_app.py:87-109`) autorise deux scripts tiers pour l'outil d'audit ANDI : `https://www.ssa.gov/accessibility/andi/` et jQuery 3.7.1 sur `ajax.googleapis.com`. L'exception figure dans les rapports d'accessibilité, pas dans `docs/MAINTENANCE.md`. Aucune distribution ne pose `frame-ancestors`.
- Import d'un fichier tiers : ses références d'images distantes déclenchent des requêtes vers les hébergeurs dès l'affichage de l'aperçu. Le guide d'utilisation (`docs/UTILISATION.md:62`) et l'éditeur (`app/source/remote-images.js:9`) le disent. À l'import, l'annonce mentionne des « références d'images en ligne (connexion nécessaire pour les afficher) », après le chargement et sans dire que l'hébergeur est contacté ; `docs/FORMAT-JSON.md` n'en dit rien. Prouvé par exécution, voir #239.
- La suite active les commandes au clavier (`tests/browser-support.cjs:64`) ; le parcours à la souris n'est pas couvert. À rapprocher de #173.
- Piste non creusée : un WebP animé ou un APNG passe par le canvas et perd son animation sans message (`app/source/images.js:61-75`).

## Limites de la revue

- Non vérifié : sous WebKit, tout ce que `npm test` n'exerce pas ; Firefox natif, installation PWA, presse-papiers réel et rendu dans les messageries, qui n'ont pas été exécutés.
- Non lu ligne à ligne : 141 fichiers de tests sur 156 (mesures transversales seulement), les feuilles de style, la référence amont, le prototype, les distributions générées, la documentation hors `MAINTENANCE.md`, `ETAT-LIVRAISON.md` et `cadrage-source.md`.
- Les 17 scripts d'audit et de recette ont été relus par un sous-agent privé de recherche d'appelants et d'exécution ; ses constats retenus ici ont été revus à la source, dont un écarté.
- Deux relectures déléguées ont été bloquées par le harnais (contrôle de sécurité du mode Auto indisponible) : celle des tests n'a rien produit et a été remplacée par la revue ciblée des aides partagées et des mesures transversales.

## PDG pass

Auto-vérification PDG, pas une revue indépendante.

- Déclenchement : oui. La revue sera exécutée par le mainteneur ou un autre agent et porte des affirmations de vérification.
- Compétence : `progressive-disclosure-guard`, exigée par les consignes de l’espace de travail avant une revue de code. Point d'entrée lu. Une réponse directe ne suffisait pas : un constat de sous-agent non sourcé aurait été relayé.
- Artifacts inspectés : `app/source/` en entier, `app/snum/`, `shared/`, les scripts de build, les quatre scripts du skill, `tests/browser-support.cjs`, `tests/run-engines.cjs`, `tests/reset-browser.test.cjs` (extraits), les passages cités des recettes et du reçu d'audit, `docs/MAINTENANCE.md`, `docs/ETAT-LIVRAISON.md`, `docs/cadrage-source.md`, `SPECIFICATION.md`, les deux workflows.
- Chevauchements : aucun doublon d'outillage créé. Le défaut 1 est un double chemin d'exécution pour une même action (`avoid`). Les recettes périmées étendent des attentes existantes (`extend`).
- Matrice des affirmations :
  - « Tout effacer » affiche une erreur technique : `editor.js:56-58`, `library.js:198-205`, exécution. Confirmé.
  - Quatre recettes attendent une annonce disparue : quatre lignes citées, recherche dans `app/source` nulle, `git log -S`. Divergence confirmée ; échec des recettes déduit.
  - Marqueur pris dans le titre : `preview.js:27-30`, `render.js:127`, exécution. Confirmé.
  - `npm test` exige WebKit : `MAINTENANCE.md:73,79`, journal. Confirmé.
  - Suite sensible aux mutations : exécution sur copie. Confirmé, pour un lot de 13 fichiers.
  - Reçu racine écrasé, reçus amont non contrôlés, ordre dans `change()` : lecture seule.
  - « Le reçu publié embarque des échecs », affirmation du sous-agent : réfutée par la lecture de `recu-20261022.json`.
- Fichiers matériels non lus : énumérés à la section Limites. Les affirmations qui en dépendent restent `Unknown`, notamment la couverture réelle des 141 fichiers de tests non lus.
- Connu connu : architecture, invariants, résultats des exécutions.
- Connu inconnu : comportements sous WebKit et dans les messageries ; décision d'installer WebKit sur ce poste.
- Inconnu connu : supposer que `npm test` suffit à valider une livraison alors qu'il ne lance aucune recette native ; supposer que le vert de la CI couvre les recettes documentées.
- Inconnu inconnu : défauts dans les fichiers non lus ; régressions propres à WebKit ou à Firefox.
- Voie à écarter : corriger le défaut 1 par un cas particulier ou une fonction vide ; corriger les recettes en retirant l'attente plutôt qu'en l'alignant ; affaiblir la politique de sécurité de l'aperçu pour corriger le marqueur.
- Garde-fou proposé : une assertion sur `#error` dans le parcours de « Tout effacer » ; un contrôle des annonces attendues par les recettes.
- À préserver : validation sur copie avant mutation ; transaction unique jeton puis écriture ; `sandbox` et CSP de l'aperçu ; script de mesure autorisé par empreinte ; politique de mise à jour du service worker sur action ; `npm run check`.
- Preuve de non-régression requise après correctif : `npm run check`, `npm test` complet avec WebKit disponible, et pour le défaut 1 le parcours `tests/reset-browser.test.cjs` augmenté.

## Fiche de validation humaine

- Fichiers à modifier : `app/source/library-actions.js`, `app/source/library.js`, `tests/reset-browser.test.cjs`, puis `python3 scripts/build_app.py` pour régénérer ; les quatre recettes ; `app/source/preview.js` et `tests/preview-locate-browser.test.cjs`.
- Commande d'inspection : ouvrir l'atelier portable, aller à l'accueil, activer « Tout effacer », puis annuler. Attendu : aucune erreur affichée ni annoncée.
- Risque accepté en l'état : un message technique annoncé de façon assertive dans une application dont l'accessibilité est un objectif affirmé ; des recettes documentées impossibles à exécuter.
- Phrase d'approbation : `Approved after human validation.`

## Captures

`docs/revue-code-2026-11-26/` porte les quatre captures de l’état du 26 novembre, affichées dans #229 (`01` et `02`) et #231 (`03` et `04`), et sous `apres/` les deux captures prises après correctif. Les issues et la PR #240 les affichent depuis les commits `0253ee0` et `397395d` de la branche `docs/captures-revue-2026-11-26` : supprimer cette branche casserait leur affichage dès que ces commits ne seraient plus atteignables.
