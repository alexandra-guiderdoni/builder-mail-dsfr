# Investigation ciblée des timeouts #142 et #145 — 25 octobre 2026

## Verdict

**#142 : une nouvelle reproduction native du même parcours historique est obtenue, puis réduite et reliée à une navigation d’aperçu perdue.** Le modèle contient le lien ajouté, l’attribut `iframe.src` désigne son nouveau rendu, mais le document réellement chargé reste celui du rendu précédent. Le seul remplacement de `app/source/preview.js` par sa version déjà publiée dans b859029 supprime les échecs dans les comparaisons bornées réalisées. Aucun nouveau correctif produit n’a été appliqué. Le locator de l’occurrence archivée originale reste irrécupérable ; cette nouvelle reproduction ne permet pas de le réinventer.

**#145 : cause historique toujours inconnue.** La source eadd426 contient déjà `confirmChecks(page,event)` et son attente répétée. Le scénario historique passe ici. Un retard contrôlé de soumission reproduit les mêmes quatre valeurs finales que le journal CI, puis produit le téléchargement attendu après libération. Ce contrôle démontre l’insuffisance de l’état final pour identifier la cause historique ; il ne démontre pas qu’un tel retard s’est produit dans le run 40182604318. Aucun patch produit proposé sur cette base.

## Périmètre et environnement

- Base de mission : `79c999cc00e8a317e71aa6f91c3bb357b5537741` ; worktree isolé `builder-six-restants-20261025`.
- Sources #142 : `395c08d1dfa4d0b8e41416da798bf0313a8bd379` ; #145 : `eadd426befeb39a6e68a14342f9c1a66102ac81d`.
- Node 24.18.0, Playwright 1.64.1, macOS ARM64 ; navigateurs éphémères appartenant aux seules sondes. Pas de profil personnel, de serveur partagé, de Docker, d’installation ou de suite complète.
- La CI historique Linux x64 n’est pas reproduite par cet environnement. Les résultats 397/397 antérieurs ne servent pas de preuve causale ici.
- Bodies et commentaires des deux issues relus via `gh issue view` et conservés dans `issue-142.json` / `issue-145.json` ; aucun commentaire présent lors de la lecture. Aucun écrit GitHub.
- Skill appliqué : `/Users/alex/Claude/.claude/skills/diagnosing-bugs/SKILL.md`. Écritures limitées à ce dossier, aucune modification de test suivi, produit, skill ou configuration.

Les copies de distributions et de tests sont ignorées par `.gitignore`. `prepare.py` les recrée depuis les SHAs exacts. `manifest.json` en conserve les empreintes. Le comparateur `preview-only` est le bundle 395c08d avec **seul** le source `preview.js` remplacé, et l’empreinte CSP du script recalculée pour autoriser exactement ce script. Le delta source est dans `preview-only-source.diff`.

## #142 — du journal incomplet à un échec natif identifiable

### Archives et pertes constatées

Dans l’archive originale `docs/qualification-preproduction-20261025/preuves/engines.json`, l’unique erreur disponible est `locator.waitFor: Timeout 30000ms exceeded.` (`article-original-results.json`). Le journal `engines.log` n’en dit pas davantage. Le runner historique `tests/run-engines.cjs` conserve seulement le champ `error:` du TAP via `parseTap` ; `runEngine` ne persiste pas le stdout complet. La pile, l’étape, l’état actif et le DOM de cette occurrence ne sont donc pas récupérables à partir de ces artefacts.

Les attentes possibles incluent aussi les aides de navigation/clic, en plus des quatre locators de l’aperçu. L’ancien résumé ne prouve donc même pas à lui seul que l’attente portait sur l’aperçu.

### Boucle exécutée et échec exact

Le test complet courant ajoute uniquement le diagnostic `stage`/état/DOM au parcours historique ; il est exécuté contre **la distribution produit historique**. Le premier rejeu passe (1,7 s). La répétition bornée de douze parcours obtient **11 réussites et 1 échec**, à l’itération 3, sans injection ni délai ajouté. La durée du cas rouge est 30,994 s.

`historical-article-repeat.log` et `article-native-full-failure.json` établissent :

- étape : `aperçu du lien sans intitulé` ;
- locator : `#preview` → `a:not([href])` contenant `Intitulé du lien à renseigner` ;
- expiration native de 30 000 ms ;
- notice : `Lien supplémentaire 1 ajouté au bloc « Gestion des abonnements ».` ; erreur vide, dialogue fermé, fenêtre focalisée ;
- DOM de l’aperçu : seulement le lien de l’article et `S’abonner`, aucun intitulé provisoire.

### Réduction et hypothèses discriminées

Après ce rouge, trois explications ont été distinguées :

1. **Navigation d’aperçu perdue** : le modèle et `iframe.src` sont à jour mais l’URL et le DOM du document chargé sont anciens ; sérialiser les navigations doit supprimer cette divergence.
2. **Sauvegarde observée trop tôt** : le modèle ne contient pas encore le lien attendu, ou le rendu rejoint ensuite spontanément l’état demandé.
3. **Action d’ajout non appliquée** : absence de lien dans le modèle et/ou de nouvelle demande de rendu.

`article-minimal.cjs` retire l’image, les éditions invalides, la duplication, les exports et le rechargement. Il conserve l’import initial article+pied, la sélection du pied, le retrait des deux liens puis l’ajout d’un lien, par les contrôles réels et les mêmes aides `click`/`saved`. Le délai de diagnostic est ramené à 1 200 ms dans cette **sonde**, sans modifier aucun timeout produit ou test suivi.

La source historique obtient **19 réussites / 1 timeout sur 20**, sans injection. Dans `article-minimal-historical.json`, run 1 (index à partir de zéro) :

- `additionalLinks` contient bien `{url:"https://exemple.invalid/",label:""}` ;
- `outer.src` se termine par `f8f176b3…#7f735ece…` ;
- `inner.url`, document `complete`, se termine par `f75f3ce9…#bd708603…` ;
- deux affectations de `src` ont lieu à 262 et 267 ms, avant le `load` observé à 271 ms ;
- les événements `framenavigated` ne contiennent jamais le dernier `src` ; aucun `pageerror`.

Ces mesures éliminent l’action absente et la sauvegarde incomplète pour cette reproduction. Le `load` porte l’attribut courant, mais il ne prouve pas que son document correspond à cet attribut : la comparaison `outer.src` / `inner.url` est déterminante.

### Contrôle causal et régression existante

| Variante | Parcours complet | Scénario réduit | Contrat de navigation existant |
| --- | --- | --- | --- |
| Produit 395c08d | 11/12 ; timeout natif détaillé | 19/20 ; ancien document observé | Rouge : 40 blobs au lieu de 1 avant premier load |
| Même bundle, seul `preview.js` de b859029 + CSP | 12/12 | 20/20 | Vert, premier puis dernier rendu, aussi sans mesure |

Preuves : `preview-only-repeat.log`, `article-minimal-preview-only.json`, `preview-contract-old.log`, `preview-contract-new.log`.

Le contrat réutilisé est le premier test de `tests/preview-size-browser.test.cjs`, « une rafale de rendus ne navigue que vers le premier puis le dernier document, même sans mesure ». Il fournit une boucle rouge/verte en moins de deux secondes sur le mécanisme de sérialisation. **Ce contrat n’est pas présenté comme la reproduction du locator historique** : son lien avec le parcours est établi par la trace native ci-dessus, qui montre justement plusieurs navigations avant le `load` précédent.

Le correctif minimal correspondant existe déjà : mettre en attente le dernier rendu pendant une navigation, puis le lancer au `load`. Aucun patch supplémentaire nécessaire pour le défaut reproduit. Un nouveau commit produit identique serait redondant.

### Essais qui ne constituent pas une preuve positive

- Une variante activant les trois contrôles dans une seule tâche JavaScript (`article-burst.cjs`) passe 8/8 sur l’ancien code. Cette rafale synthétique ne reproduit pas la chronologie native intertâches ; elle n’infirme pas le rouge du parcours réel.
- Le premier comparateur avait remplacé le script sans mettre à jour sa CSP : il échouait à l’ouverture. Il a été interrompu ; `preview-only-invalid-csp.log` est conservé et exclu des résultats comparatifs. La version corrigée de préparation recalcule l’empreinte exacte.
- Le scénario réduit n’a pas été prouvé minimal au sens « chaque élément restant indispensable ». La fréquence naturelle reste faible (1/12 et 1/20) ; aucune reproduction native déterministe du timeout n’est revendiquée.

## #145 — confirmation ouverte après expiration du téléchargement

`export-original-excerpt.log` reprend les lignes 422–440 du journal original `ci-previous-failure.log` : test Chromium, premier nom `Édition & <dossier> "suivi"`, sélecteur `[data-action=export-mail]`, nom attendu `Édition-&-dossier-suivi-2026-10-25.html`, expiration de 30 000 ms. État final : `notice:""`, `error:""`, `checkDialog:true`, `focused:true`. La pile atteint `suggested`, `exportNames` et la première itération de la table.

Les sources exactes eadd426 incluent déjà l’attente répétée `confirmChecks(page,event)`. `app/source/checks.js` appelle `settle("go")` depuis la soumission du formulaire, ferme alors le dialogue et résout la confirmation. L’ancienne correction « regarder le dialogue plus d’une fois » ne peut donc pas être réutilisée comme cause de cette occurrence.

Le test historique ciblé « noms des fichiers exportés, trois types d’export (Chromium) » passe (1/1, tous les noms du test) : `export-historical-full.log`. Cela reste une non-reproduction bornée.

### Contre-épreuve, explicitement contrôlée

`export-loop.cjs` reprend le premier nom, la date locale, `click`, `confirmChecks` et le vrai téléchargement de la distribution eadd426. Il conserve seulement les événements `click`, `submit`, `close` pertinents, le focus précis, le dialogue et les erreurs.

| Condition | Résultat |
| --- | --- |
| Sans retard, trois contextes neufs | Trois téléchargements au nom attendu |
| Soumission retenue 120 ms, budget 400 ms | Téléchargement au nom attendu |
| Soumission retenue 650 ms, budget 400 ms, deux contextes | Deux expirations, dialogue ouvert, notice/erreur vides, focus vrai, aucun téléchargement avant libération |
| Après libération des deux soumissions | Dialogue fermé, un téléchargement, annonce de succès |

Le retard est réalisé par un gestionnaire de capture **ajouté par la sonde** qui suspend la soumission puis appelle `requestSubmit`. C’est une précondition contrôlée, absente de l’application historique. Les logs détaillés sont `export-loop.json` et `export-loop.log`. Les attentes internes rouges sont attendues par la contre-épreuve ; son code de sortie zéro signifie que les contrôles positifs et négatifs sont cohérents, pas que la CI historique est corrigée.

Le même état final est compatible avec une confirmation jamais activée, une activation non suivie de soumission ou une soumission trop tardive. Le journal historique ne conserve pas cette séquence. **Aucune de ces causes n’est retenue pour le run historique.**

## Rejouer les seules boucles utiles

Depuis la racine du worktree, utiliser le Playwright déjà présent ; aucune installation :

```sh
export PLAYWRIGHT_MODULE=/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright
export MAIL_BUILDER_ENGINE=webkit
python3 docs/goal-six-issues-20261025/investigations/timeouts/prepare.py
node --test --test-reporter=tap --test-name-pattern='une rafale de rendus' docs/goal-six-issues-20261025/investigations/timeouts/historical/tests/preview-size-browser.test.cjs
node --test --test-reporter=tap --test-name-pattern='une rafale de rendus' docs/goal-six-issues-20261025/investigations/timeouts/preview-only/tests/preview-size-browser.test.cjs
node docs/goal-six-issues-20261025/investigations/timeouts/article-minimal.cjs historical 20
node docs/goal-six-issues-20261025/investigations/timeouts/article-minimal.cjs preview-only 20
unset MAIL_BUILDER_ENGINE
node docs/goal-six-issues-20261025/investigations/timeouts/export-loop.cjs
```

Les deux collecteurs `article-minimal` / `article-burst` écrivent leurs verdicts par scénario et sortent zéro si la collecte est complète ; consulter leurs compteurs, pas leur seul statut de processus. Le test complet et le contrat utilisent le runner Node et sortent bien rouge sur les échecs.

Pour le parcours complet reproduit, définir `MAIL_BUILDER_EVIDENCE` vers un sous-dossier de cette investigation, puis lancer `historical/tests/article-repeat.test.cjs` (12 cas, environ 45 s dans cette session) ou sa variante `preview-only` (15 s). Ne pas lancer la suite générale.

## Critères restant ouverts

- **#142** : le nouveau rouge natif, sa pile, son état/DOM, la divergence modèle/src/document et le comparateur causal sont obtenus. Les refus, image facultative, liens, exports et rechargement restent vérifiés par les 12 parcours complets du comparateur. Le locator de l’occurrence archivée originale demeure inconnu ; le rejeu dans l’environnement CI d’origine et une fréquence native élevée/déterministe ne sont pas obtenus.
- **#145** : action, nom, dialogue, focus global et pile originaux sont localisés. L’élément focalisé historique, l’activation effective de `#check-confirm`, la soumission et leur chronologie manquent. La non-reproduction est bornée ; la contre-épreuve n’est pas une cause historique. Aucune clôture sur ces seuls verts.
- Pour une prochaine occurrence #145, la trace minimale discriminante doit horodater export-click, confirmation-click, form-submit, dialog-close et download, avec `activeElement` et `pageerror`. Pour #142, conserver la pile brute du test, `stage`, modèle actif, `iframe.src`, `frame.url()` et les derniers `src/load/framenavigated` suffit ; ne pas journaliser toute l’application.

Aucun commit, push, changement produit, clôture d’issue ou publication effectué par cette investigation.
