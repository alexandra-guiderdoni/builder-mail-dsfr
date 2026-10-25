# Delta après le gate et l’audit de la candidate

Les trois tests modifiés passent sur les trois moteurs sous macOS et sous Linux Node 24.18.0. Le vrai test de rafraîchissement rapide passe aussi avec Chromium ralenti d’un facteur 6 dans les deux environnements. Aucune suite complète n’a été relancée dans cette phase ; le gate Linux précédent reste un résultat historique rouge sur son ancien snapshot.

## Fichiers et causes

| Fichier | Correction | Preuve discriminante et limite |
| --- | --- | --- |
| `tests/restore-after-refusal-browser.test.cjs` | Demande initiale de refus dans le fragment URL de recette, consommée synchroniquement par `history.replaceState` sur le vrai document file://. Aucun traitement du about:blank. | `refusal-name-firefox-red.log` et `refusal-name-webkit-red.log` réfutent la variante window.name précédente. La finale vérifie un seul refus initial, URL revenue au même fichier sans fragment, aucun refus au reload, puis ouverture réelle IndexedDB. |
| `tests/link-labels-browser.test.cjs` | Attente des treize liens réparés, puis snapshot atomique conditionné par URL réellement demandée, document complet et treize intitulés exacts. Les assertions finales d’URL restent présentes. | `links-held-red.log` : douze liens sous la condition du premier lien, malgré la sauvegarde terminée. `links-held-release.log` : treize après libération explicite. |
| `tests/typing-performance-browser.test.cjs` | Observation des mutations src jusqu’au document final chargé ; titre exact, URL demandée et un seul remplacement. Suppression des deux rAF + 100 ms ; aucune attente du document initial ajoutée. | `typing-cpu6.log` : ancienne navigation réellement restée chargée. Le correctif produit de sérialisation dans preview.js appartient au lot portabilité. `typing-final-cpu6.log` prouve le vrai test corrigé contre ce produit, sans pré-attente initiale. |

Le dernier delta produit est coordonné avec le lot portabilité ; ce lot parcours n’a modifié ni `preview.js` ni les distributions. Il ne revendique pas avoir corrigé la navigation par la seule modification du test. Ce delta vient après l’audit natif de la candidate précédente et doit être intégré à la revue finale de la racine.

La fixture #130 ne dépend plus de sessionStorage ni de window.name. Le test efface également ces deux états avant le rechargement comme contre-épreuve. Les vérifications du travail temporaire exportable, de l’absence d’écriture préalable, de la bibliothèque concurrente et du conflit après reprise sont conservées. La cause de la disparition du marqueur sessionStorage dans le run Linux originel reste inconnue ; un passage ciblé n’autorise pas cette conclusion historique.

## Vérifications finales

| Environnement | Contrôle | Résultat | Journal |
| --- | --- | --- | --- |
| macOS, Chromium | Cinq cas modifiés ou directement concernés | 5/5 | `final-chromium.log` |
| macOS, Firefox | Même sélection | 5/5 | `final-firefox.log` |
| macOS, WebKit | Même sélection | 5/5 | `final-webkit.log` |
| macOS, Chromium CPU ×6 | Vrai test de rafraîchissement rapide | 1/1 | `typing-final-cpu6.log` |
| Linux Node 24.18.0, trois moteurs | Même sélection, cinq cas par moteur | 15/15 | `../linux/integration-final/targeted-*.log` |
| Linux Node 24.18.0, Chromium CPU ×6 | Vrai test de rafraîchissement rapide | 1/1 | `../linux/integration-final/typing-cpu6.log` |
| Linux | Provenance et distributions | PASS | `../linux/integration-final/check.log` |

Les cinq cas sont les trois scénarios de récupération, l’ancien JSON à treize intitulés réparés et le rafraîchissement rapide de l’aperçu. La première variante de sélection exacte par regex ne tenait pas compte des espaces des gabarits : elle a échoué avant la correction du filtre de sélection. L’oracle final conserve l’égalité exacte après trim, le nombre de treize et toutes les URL ; les journaux intermédiaires `expectations-*.log` restent conservés.

Le reçu `../linux/integration-final/RECEIPT.json` décrit l’environnement, les résultats, l’absence de nouveau gate complet et les SHA256 du nouveau snapshot. Les **344 fichiers** sont restés inchangés après la campagne ciblée. Le conteneur dédié a terminé avec le code 0 et a été retiré automatiquement.

## Reproduction des ciblés

Depuis la racine du worktree, pour chaque moteur :

```sh
MAIL_BUILDER_ENGINE=chromium MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/parcours/integration/final-chromium node --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='ancien JSON|rafraîchissement complet|refus initial|écriture concurrente|sans IndexedDB' tests/restore-after-refusal-browser.test.cjs tests/link-labels-browser.test.cjs tests/typing-performance-browser.test.cjs
node --require ./docs/prise-en-charge-backlog-20261025/parcours/integration/cpu6-preload.cjs --test --test-reporter=tap --test-name-pattern='rafraîchissement complet' tests/typing-performance-browser.test.cjs
```

Les variantes Firefox/WebKit emploient leur nom dans `MAIL_BUILDER_ENGINE` et un dossier de preuves distinct. La recette Docker ciblée est `../linux/run-linux-integration-final.sh` : source en lecture seule, seuls les reçus en écriture, image épinglée, Node officiel vérifié SHA256, `--cap-drop=ALL`, aucun privilège ni port/socket/profil monté. L’environnement reste Ubuntu Noble arm64 sous LinuxKit, distinct d’un run GitHub Actions.
