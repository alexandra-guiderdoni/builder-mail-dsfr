# Revue indépendante Astra de #142 — 25 octobre 2026

**Verdict : clôture justifiée pour le défaut reproduit du parcours, avec réserve explicite sur l’occurrence archivée initiale.** La nouvelle investigation apporte un rouge natif localisé, une divergence observable entre rendu demandé et document chargé, un comparateur ne changeant que le module d’aperçu, et un contrôle de régression rouge/vert. Aucun nouveau correctif produit n’est nécessaire : le module corrigé est déjà présent dans la base courante.

Ce verdict **ne permet pas d’affirmer que le locator ou la cause exacte de l’ancienne occurrence ont été retrouvés**. L’archive initiale ne conserve que `locator.waitFor: Timeout 30000ms exceeded.` ; plusieurs attentes du parcours étaient possibles. La clôture doit décrire la nouvelle reproduction et la résolution du défaut démontré, sans réattribuer rétrospectivement l’ancien timeout.

Revue effectuée dans `/Users/alex/Claude-worktrees/builder-six-restants-20261025`, HEAD `79c999cc00e8a317e71aa6f91c3bb357b5537741`, branche `fix/goal-restants-20261025`. [L’issue #142](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/142) a été relue via `gh issue view 142 --repo alexandra-guiderdoni/builder-mail-dsfr --json number,title,body,state,comments,url` : ouverte, sans commentaire au moment de la lecture. Aucun sous-agent, aucune écriture GitHub, aucun commit/push ; seul ce fichier de revue est écrit.

| Critère de l’issue | Évaluation |
|---|---|
| Conserver pile, locator exact, état actif et DOM à l’échec | Satisfait sur la **nouvelle occurrence native** : cas 3 du parcours complet, attente 30 000 ms, étape « aperçu du lien sans intitulé », locator `#preview → a:not([href])` avec le texte attendu ; état actif et DOM capturés. La pile TAP pointe l’enrichissement/rejet du test, tandis que le call log et `stage` identifient l’attente. Pas de récupération prétendue de la pile initiale perdue. |
| Isoler et corriger la cause démontrée sans augmenter arbitrairement le timeout | Satisfait pour le défaut reproduit : le modèle et `iframe.src` contiennent le dernier rendu, le document chargé reste le précédent ; seul `preview.js` corrigé plus son empreinte CSP change dans le comparateur. Aucun timeout du test suivi n’est relevé. |
| Vérifier refus des champs invalides, image facultative, liens, exports et rechargement | Satisfait par les 12 parcours complets du comparateur, tous verts, sans skip ni annulation. La comparaison du test avec 395c08d confirme que les changements ajoutent les diagnostics ; les assertions du parcours sont conservées. |

J’ai vérifié directement les trois empreintes de bundle du manifeste, la correspondance du bundle historique avec `git show 395c08d:app/distribution/portable.html`, ainsi que les copies de tests et d’aides contre leurs SHAs de préparation. J’ai reconstruit **en mémoire** le comparateur : remplacement unique du contenu exact de `app/source/preview.js`, puis remplacement du seul hash SHA-256/Base64 du script dans la CSP. Le résultat est byte-identique au bundle `preview-only` fourni. Aucun autre delta produit ne se cache dans cette comparaison.

Le module courant, celui de la base 79c999c et celui publié dans b859029 sont byte-identiques : SHA-256 `405e1e538c9ccf28fb1f5f810101627fd7bc9472eac747e24989257be1556146`. Sa file d’attente ne crée pas de nouveau Blob pendant une navigation ; le dernier rendu en attente part au `load`. Le test de contrat vérifie aussi le dernier document réellement chargé, les révocations de ressources et l’achèvement sans messages de mesure.

Le journal natif historique donne 11/12 avec un vrai échec de 30,994 s ; le comparateur donne 12/12. Dans la réduction historique, le seul échec sur 20 présente :
- modèle : lien supplémentaire présent, URL par défaut et intitulé vide ;
- `outer.src` : Blob `f8f176b3…` / jeton `7f735ece…` ;
- `inner.url` : Blob précédent `f75f3ce9…` / jeton `bd708603…`, document `complete` ;
- affectations de `src` à 262 et 267 ms, puis `load` à 271 ms ; aucune navigation observée vers le dernier Blob ;
- aucun `pageerror`.

Les 20 réductions `preview-only` passent, avec zéro divergence `outer.src/inner.url` et le lien provisoire attendu présent. Le `load` lu avec l’attribut courant ne suffit donc pas : la mesure du document effectivement chargé est la preuve discriminante. Cette trace détaillée appartient à la réduction ; elle n’est pas présentée comme une trace récupérée de l’ancienne archive ni comme un enregistrement simultané du rouge complet.

J’ai en outre **réexécuté indépendamment le seul contrat court** dans WebKit, Node v24.18.0, module Playwright existant, sans installation ni suite globale :
- ancien bundle : exit 1, assertion `40 !== 1`, un test échoué ;
- comparateur : exit 0, un test réussi, zéro échec/skip/annulation.

Ce contrôle déterministe prouve le mécanisme de sérialisation, pas la reproduction déterministe du timeout métier. Les deux exécutions utilisent la variable explicite `MAIL_BUILDER_ENGINE=webkit` ; le wrapper historique vérifié appelle effectivement `playwright[engineName].launch`.

Les limites restantes ne bloquent pas la clôture ainsi formulée : origine exacte de l’ancienne occurrence inconnue ; absence de rejeu dans l’environnement CI Linux x64 d’origine ; fréquence naturelle faible ; scénario réduit sans preuve de minimalité stricte ; comparaisons finies qui ne constituent pas une estimation statistique de fiabilité. Aucun diagnostic moteur WebKit interne ni garantie générale « plus aucun timeout possible » n’est établi. Le comparateur initial invalide pour CSP et la rafale synthétique 8/8 sont correctement exclus des preuves positives. Cette revue ne conclut rien sur #145.

Formulation de clôture défendable : « Une nouvelle reproduction native du parcours sous WebKit a localisé le timeout sur l’aperçu du lien sans intitulé. La réduction montre un document d’aperçu ancien malgré un modèle et un src à jour ; le comparateur ne remplaçant que le module d’aperçu confirme le correctif de sérialisation déjà publié. Les refus, image facultative, liens, exports et rechargement passent sur les parcours complets comparatifs. La pile et le locator de l’occurrence archivée initiale restent irrécupérables ; nous n’affirmons pas avoir identifié rétrospectivement sa cause exacte. »

Empreintes des preuves relues, relatives à `investigations/timeouts/` :

| Fichier | SHA-256 |
|---|---|
| `manifest.json` | `2fe57183a986227d2f9cccc5611a2d5b9c27da13a24b10d15471898e6a1e178b` |
| `prepare.py` | `5d5b8f323e7d776a209eb06907de4342a801af97d96f7250082225e9fbb4e1e1` |
| `historical-article-repeat.log` | `07411dcb71c7d78d46656b0129c0d25f7a0326b27dbb30ed5fb3533f3498d0a7` |
| `preview-only-repeat.log` | `5aa89087c4871edd7ce1bad3ed4e719a1eabf2b70d8981ea2d69dee006e6c4da` |
| `article-native-full-failure.json` | `fb475cf2eaefb901d11deaf3649e6db87f1f7e32f69a6ece1f70be670662c816` |
| `article-minimal-historical.json` | `cac79296ebd47ffb0ca1e1dd23cc3c3996690e9b4ccd8b6c7480e4fe5ad828c6` |
| `article-minimal-preview-only.json` | `7924ab55c3c0cab79e9922805481750991c1b6c719fa7546a2604a396ac064da` |

Reçu intégral des deux contrôles courts indépendants, conservé ici pour respecter le périmètre d’écriture unique :

```json
{
  "engine": "webkit",
  "PLAYWRIGHT_MODULE": "/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright",
  "node": "v24.18.0",
  "runs": [
    {
      "variant": "historical",
      "command": [
        "node",
        "--test",
        "--test-reporter=tap",
        "--test-name-pattern=une rafale de rendus",
        "/Users/alex/Claude-worktrees/builder-six-restants-20261025/docs/goal-six-issues-20261025/investigations/timeouts/historical/tests/preview-size-browser.test.cjs"
      ],
      "exit_code": 1,
      "stdout": "TAP version 13\n# Subtest: une rafale de rendus ne navigue que vers le premier puis le dernier document, même sans mesure\nnot ok 1 - une rafale de rendus ne navigue que vers le premier puis le dernier document, même sans mesure\n  ---\n  duration_ms: 1027.230459\n  type: 'test'\n  location: '/Users/alex/Claude-worktrees/builder-six-restants-20261025/docs/goal-six-issues-20261025/investigations/timeouts/historical/tests/preview-size-browser.test.cjs:41:1'\n  failureType: 'testCodeFailure'\n  error: |-\n    Une seule navigation démarre avant le premier load ; les rendus intermédiaires ne créent pas de blobs\n    \n    40 !== 1\n    \n  code: 'ERR_ASSERTION'\n  name: 'AssertionError'\n  expected: 1\n  actual: 40\n  operator: 'strictEqual'\n  stack: |-\n    TestContext.<anonymous> (/Users/alex/Claude-worktrees/builder-six-restants-20261025/docs/goal-six-issues-20261025/investigations/timeouts/historical/tests/preview-size-browser.test.cjs:64:14)\n    runNextTicks (node:internal/process/task_queues:65:5)\n    process.processImmediate (node:internal/timers:472:9)\n    async Test.run (node:internal/test_runner/test:1332:7)\n    async startSubtestAfterBootstrap (node:internal/test_runner/harness:385:3)\n  ...\n1..1\n# tests 1\n# suites 0\n# pass 0\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1221.758333\n",
      "stderr": "",
      "stdout_sha256": "7582c883e26198633e83f6ca196b00510c250ec364dc732680fad184a96794c5"
    },
    {
      "variant": "preview-only",
      "command": [
        "node",
        "--test",
        "--test-reporter=tap",
        "--test-name-pattern=une rafale de rendus",
        "/Users/alex/Claude-worktrees/builder-six-restants-20261025/docs/goal-six-issues-20261025/investigations/timeouts/preview-only/tests/preview-size-browser.test.cjs"
      ],
      "exit_code": 0,
      "stdout": "TAP version 13\n# Subtest: une rafale de rendus ne navigue que vers le premier puis le dernier document, même sans mesure\nok 1 - une rafale de rendus ne navigue que vers le premier puis le dernier document, même sans mesure\n  ---\n  duration_ms: 1111.317417\n  type: 'test'\n  ...\n1..1\n# tests 1\n# suites 0\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1301.17675\n",
      "stderr": "",
      "stdout_sha256": "5a8ee7a9b840446a6dde19b83ce61e51d6a3cfd20e35abab431205a2a92988e3"
    }
  ]
}
```
