# Revue indépendante du correctif ciblé #145

**GO pour publier la mitigation CSS ciblée du clic de confirmation, avec les limites et le contre-signal ci-dessous explicitement conservés. Aucun défaut bloquant identifié dans les quatre fichiers produit proposés. Ce GO ne démontre pas une étanchéité générale du fond modal, ne résout pas le scénario expérimental associé et n’attribue pas rétrospectivement toutes les occurrences historiques de #145 à une même cause.**

Revue Astra du 25 octobre 2026, sur `/Users/alex/Claude-worktrees/builder-confirmation-145-20261025`, base `f3aa8324dbcd255bddafeeb2eec559e698f6065c`. Relecture des deux axes du skill `code-review`, sans sous-délégation. Aucune modification de l’application, des tests, de main ou du candidat #149 par le relecteur. Aucun nouveau run CI. Le rejeu indépendant a attendu la fin des tests de l’auteur ; ses sorties éventuelles utilisaient un répertoire temporaire distinct, supprimé ensuite. Seul ce rapport est écrit.

## Preuve A/B contre-vérifiée

Source : [run 40221895564](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40221895564), harnais `7d4fcf3d12b203e309f8342c0ce76bc40ebfd427`, produit f3aa8324. Les bruts sont sous `/Users/alex/Claude-worktrees/builder-goal-six-raw-20261025-v1/40221895564/`.

Le relecteur a recalculé les comptes directement depuis les deux `result.json`, sans exécuter le parseur de l’auteur. Les **22 fichiers et 15 379 570 octets** du manifeste natif ont été vérifiés ; son SHA256 est `33f492d70945a2176946cd8bf566901a0ba514ad8cf5898ce729ef40623caf37`.

| Observation indépendante | Témoin | Comparateur CSS |
|---|---:|---:|
| Parcours observés | 3 | 30 |
| Verts / rouges | 2 / 1 | 30 / 0 |
| Contextes | 22 | 270 |
| Exports engagés / téléchargements | 64 / 63 | 810 / 810 |

Le rouge du témoin apparaît au troisième parcours, contexte 4, pour `export-mail`. Pendant `confirmChecks`, les cinq événements `pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click` atteignent un `TD` de l’iframe dont l’URL correspond exactement à celle de l’aperçu. Ces événements ont `isTrusted: true` dans le navigateur automatisé. Aucun `click` du bouton `check-confirm` ni `submit` principal n’apparaît avant le timeout de téléchargement de **30 000 ms**. Le dialogue reste ouvert, le focus actif est `preview`, le bouton garde son identité UID 1 et reste connecté. Le signal persiste dans le snapshot final ; il ne repose donc pas sur un simple retour anticipé de commande. Les traces examinées ne saturent pas leurs limites : au plus 180 événements externes sur 2000 et 28 lignes de snapshot sur 500.

Le loop (`127fec761916ef3962176b981588df37443a9baaa3bf03a2de7b36fdabcefda4`) et l’observateur (`065c9d06fd804c7f8adbeb5bed0210d4f6b848d8d4d310ffadc2214a533550d5`) sont identiques dans les trois copies contrôlées. Les deux bras gardent les mêmes helpers, scénarios, timeout et instrumentation ; chaque bras s’arrête au premier rouge, sans relance. La capture visuelle finale a également été examinée.

Cette paire soutient une intervention ciblée sur la réception du pointeur par l’aperçu pendant la confirmation. Elle ne démontre pas le mécanisme interne du moteur, une équivalence à un clic humain physique, une absence universelle d’échec ou une neutralité absolue de l’observateur. Les métadonnées d’image restent distinguées : `ImageVersion=20261023.163.3` dans l’environnement, `20261012.163.1` dans « Set up job », sans arbitrage de ce désaccord.

## Conformité du changement

La seule règle produit ajoutée est :

```css
body:has(#check-dialog[open]) #preview { pointer-events: none; }
```

Les deux HTML ont été reconstruits indépendamment à partir des blobs f3, en remplaçant seulement le CSS source par ce CSS augmenté de la règle : les empreintes correspondent exactement au comparateur et au writer. Le service worker ne change que la clé de cache `9543c5a897478ae9` → `cdd55d72aca6de98`.

| Fichier produit | SHA256 final vérifié |
|---|---|
| `app/source/style.css` | `d6398e12efff66a03715625ad7a1f0b10af626a69d11c37f6529173ac36a5f04` |
| `app/distribution/portable.html` | `69b0d0ad06742ffd6e77df9a573238afd849c37628878aadcae9ee9dc5736ab9` |
| `app/distribution/web/index.html` | `a34ec36adaf511032c4bba7326c8d0ded13c4c418b8f28aeff82e00108aded34` |
| `app/distribution/web/sw.js` | `8f63a962c00790b1bc9714a339142f050fd5ee43efa007af8639859a7552f61a` |

Le diff suivi contient exactement ces quatre fichiers. Les scripts embarqués, la CSP et le JavaScript applicatif ne changent pas. `tests/browser-support.cjs`, les tests existants d’export/copie et `app/source/checks.js` ont été comparés aux blobs de base : ils sont intacts. Aucun changement de helper, assertion, confirmation requise, délai fonctionnel, retry ou clic synthétique n’entre dans le correctif.

## Intention, clavier et restauration

La règle s’applique exclusivement à l’aperçu lorsque le dialogue de contrôle porte l’attribut `open`. Elle n’ajoute aucun état JavaScript à nettoyer et cesse de s’appliquer à sa fermeture. Le mécanisme existant `showModal`, les gestionnaires d’annulation/validation, l’accès aux avertissements et le retour du focus restent inchangés. Les tests existants vérifient le titre focalisé, Escape et le retour au déclencheur, l’annulation sans téléchargement, la confirmation par sortie et l’accès au bloc concerné.

Le risque d’une interaction inattendue avec l’iframe après ou pendant une succession de modales ne peut toutefois pas être déclaré entièrement écarté : le scénario expérimental ci-dessous reste inconnu. Le GO porte sur le traitement du signal central reproduit et les contrats existants validés, sans étendre la preuve à toutes les interactions du fond modal ou aux technologies d’assistance non exercées.

## Contre-signal expérimental conservé

Un nouveau test d’interaction a échoué deux fois sous Chromium : première version avec compteur dans l’iframe ; deuxième version avec compteur dans le parent, **3 clics observés pour 2 attendus**, au second cycle. Deux rejeux diagnostiques distincts ont été verts. Ces verts n’expliquent pas les rouges. Le compteur parent réfute la suffisance de la seule hypothèse de remise à zéro du compteur lors d’une navigation de l’iframe ; il ne prouve pas, à lui seul, une régression causée par la CSS.

Les trois versions et les quatre résultats sont préservés dans `product-validation/`, avec le mapping `EXPERIMENTAL-TEST-ARCHIVE.json` (SHA256 `aa56e680d2ce919cd8eb3950818e7abf37199bfa8f3f3f51cb0a0259156c9074`). Le relecteur a vérifié les trois empreintes de versions. Sur décision explicite de la racine, le seul fichier expérimental non suivi a été archivé à l’identique puis retiré de la suite permanente. Les tests existants n’ont pas été affaiblis.

Le suivi demeure **« interaction du fond modal / attribution des événements : INCONNU »**. Il ne doit pas être présenté comme un défaut d’instrumentation déjà établi. Il manque une attribution des événements à leurs documents/phases et un témoin comparable sans CSS pour départager comportement préexistant, interaction produit et mesure. Aucune nouvelle investigation ou paire n’a été lancée par ce relecteur. La validation verte des contrats existants ne transforme pas ces deux échecs en succès.

## Validation finale

Preuves de l’auteur examinées, sous `product-validation/` :

Le reçu documentaire final `FIX-RECEIPT.json` a pour SHA256 `67129314fd191ce9603cb151520a4cb7baaf6f3f26de17546b9f65d28853f956`. Les cinq documents/diff qu’il référence et les quatre empreintes produit concordent. Le manifeste final de validation (`6a652ed23bceb2ec2effbed835b1f7b7c48bd8640cb316272efd26b76fbb796f`) a été contrôlé intégralement : **613 fichiers**, tailles et empreintes concordantes. Les rapports finaux maintiennent la bifurcation autorisée et le statut INCONNU du contre-signal.

- Contrats existants : **12/12 dans chacune des trois configurations**, soit 36 exécutions. Les launchers effectifs représentent **13 Chromium, 19 WebKit et 4 Firefox** ; certains fichiers imposent leurs moteurs. Il serait incorrect d’annoncer 12 tests natifs Firefox.
- `npm run check` : code 0, provenance et génération conformes.
- `npm test` : **397/397 réussis**, aucun échec, skip ou annulation, **415 034,796 ms**. SHA256 du log : `d759d660000ac8e9fff7d91d844d59e6bb614f0dca5abcf0871a6f888e98940f`.

Rejeu indépendant, après arrêt des tests de l’auteur, Node **24.18.0**, module Playwright existant **1.64.1**, sans installation :

```sh
node --test --test-concurrency=1 --test-reporter=tap \
  tests/export-names-browser.test.cjs tests/copy-check-browser.test.cjs
```

`PLAYWRIGHT_MODULE` et `NODE_PATH` pointaient vers les modules déjà installés du checkout principal ; `MAIL_BUILDER_ENGINE` était absent et les éventuelles preuves allaient dans un répertoire temporaire distinct. Résultat : **10/10 réussis** — cinq Chromium et cinq WebKit — aucun skip/annulation, **12 957,960 ms**, code 0. SHA256 de la sortie TAP capturée : `dffa5e8d7cdb67a1e67abcc80297e14038f16041940679ac800d5070aa379c3f`. La suite complète et la paire CI n’ont pas été dupliquées.

**Verdict final : GO publication de ces quatre fichiers et de leur documentation factuelle, en conservant le suivi expérimental non résolu. Conformité : aucun écart bloquant. Intention : mitigation ciblée soutenue par la paire discriminante et les contrats verts ; aucune garantie générale supplémentaire.**
