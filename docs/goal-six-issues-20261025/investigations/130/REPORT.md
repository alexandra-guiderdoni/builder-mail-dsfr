# #130 — ce que l’incident permet réellement de conclure

**Cause originelle non démontrée ; ticket à maintenir ouvert.** Une condition d’environnement auparavant insuffisamment précisée est maintenant établie : le run [40185188187](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40185188187) utilisait **Ubuntu 26.04.1, image `ubuntu-26.04` version `20261012.163.1`, x64**, Node 24.18.0, Chromium headless-shell 156.0.8078.4 / Playwright 1.64.1. Les contre-preuves Linux arm64/Noble ne reproduisent donc ni l’architecture ni la version du système. Cela ne démontre aucune causalité OS.

## Pièce décisive absente

L’API du run retourne **zéro artefact** (`original-artifacts.json`) ; le workflow historique n’uploadait aucune trace des tests. Le journal conserve l’assertion terminale, mais aucun identifiant de document, frame, loader, contexte d’exécution ou événement de stockage. On ne peut donc reconstruire a posteriori **la transition réellement survenue** entre l’activation de « Recharger » et le diagnostic final. `refusedAtStart:false` seul n’établit ni une perte spontanée du marqueur ni un refus IndexedDB natif.

La source exacte `395c08d1…` établit le parcours **programmé** : nouveau navigateur → un contexte → page écrivain avec deux états sauvegardés → seconde page et fixture → travail temporaire → écriture concurrente → export → seconde demande de récupération → `location.reload()` → assertion. Chaque test crée puis ferme son propre navigateur ; la suite est lancée avec `--test-concurrency=1`. Le test précédent passe dans le run. Ces faits excluent un partage explicite du contexte entre ces deux tests, sans exclure un effet d’environnement. Ils ne remplacent pas une trace d’exécution.

## Boucle effectivement exécutée

Copie des six fichiers historiques par `git show`, SHA-256 dans `snapshot-manifest.json`. Aucun octet du produit courant modifié. Image Docker locale figée `sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea`, Node 24.18.0 téléchargé dans ce dossier et vérifié contre le SHA historique, Playwright 1.64.1 en lecture seule. Environnement réel : Ubuntu 24.04, arm64, Chromium 156.0.8078.4 (`environment.json`, `os-release.txt`).

Commande exécutée, capable d’échouer sur le symptôme exact, depuis `/proof/snapshot` dans le conteneur privé :

```sh
CONTROL130=remove-marker TRACE130=/proof/controlled-trace.jsonl \
  node --test --test-reporter=tap \
  --test-name-pattern='écriture concurrente pendant' tests/instrumented.test.cjs
```

Résultats conservés : original exact **1/1 vert** (`exact-original.log`) ; même parcours instrumenté sans intervention **1/1 vert** (`natural.log`) ; suppression contrôlée du seul marqueur juste avant le rechargement **1 échec**, avec le JSON du symptôme originel (`controlled.log`). Ce dernier est une **précondition provoquée**, pas une reproduction spontanée de l’incident. La sonde instrumentée a été rejouée une fois pour conserver aussi la valeur brute lue (`null` versus autre valeur), sans changement de comportement du produit. Aucune suite complète ni campagne répétitive.

Les traces montrent, dans les deux variantes, une nouvelle identité de document et un nouveau loader, avec la même frame principale, la même URL `file://` et la clé de stockage sérialisée `file:///`. Naturel : lecture du marqueur `"1"`, passage vers `native-open`, bibliothèque « Écriture concurrente », contrôles de conflit finaux réussis. Contrôle : événement CDP `domStorageItemRemoved`, lecture `null` au nouvel init, **second `artificial-refusal`, aucun `native-open` au document rechargé**, puis `recoveryOnly:true`. Le mécanisme **perte du marqueur → réinjection par la fixture** est démontré sous cette précondition. La raison d’une éventuelle perte dans le run original reste inconnue.

La première tentative Docker a échoué avant tout test car `/deps` n’était pas sur `NODE_PATH` ; le montage est maintenant résolu explicitement. Les conteneurs possédés `builder130-env-readonly`, `builder130-targeted-20261025` et `builder130-raw-marker-20261025` ont tous été supprimés par `--rm` ; aucun processus laissé actif. Les copies et runtimes locaux sont isolés et ignorés par Git.

## Prochaine observation discriminante : proposition non appliquée

`proposal-pages.yml` est une proposition **forensic-only**, à substituer à `.github/workflows/pages.yml` **sur une branche diagnostique dédiée**. Aucun déclencheur push, aucun job deploy, permissions `contents:read`, checkout avec `persist-credentials:false`. Deux checkouts séparés : produit au SHA incident exact ; harnais au SHA de la branche dispatchée. Node et Playwright verrouillés ; garde Ubuntu 26.04/x64 ; version d’image et navigateur conservées. L’image hébergée actuelle peut différer de `20261012.163.1` : la différence doit rester explicitement tracée, aucun équivalent exact promis.

Le job exécute une seule fois le fichier historique complet (3 tests, précurseur conservé), puis sa copie instrumentée (3 tests), puis le contrôle négatif ciblé (1 test). Il ne lance pas la suite complète. Les traces JSONL, verdicts distincts, manifests et diff d’instrumentation sont déposés même après échec. Le SHA de `actions/upload-artifact@v4` a été vérifié via l’API GitHub ; le YAML a été parsé, son unique job et ses permissions contrôlés. **Aucun push ni dispatch effectué.**

Après création/relecture/publication par root de cette branche et de ces seuls fichiers de harnais : `prepare-replay.py`, `trace130.cjs` et le workflow substitué, la commande de lancement est :

```sh
gh workflow run 393066060 --repo alexandra-guiderdoni/builder-mail-dsfr \
  --ref diag/issue-130-forensic
```

L’ID **393066060** désigne le workflow existant `pages.yml`, vérifié par `gh workflow list`. Vérifier avant dispatch que le blob de ce chemin **sur cette ref** est exactement la proposition forensic-only. Collecter ensuite l’unique run de cette branche, son SHA et son artefact.

Observation recherchée : au premier rouge spontané, comparer valeur lue à l’init, événements de stockage, document/loader/context et branche réelle `artificial-refusal`/`native-open`. Un rouge uniquement contrôlé ou un vert spontané ne ferme toujours pas #130. Si le rouge disparaît seulement avec instrumentation, conserver les deux verdicts : la sonde peut modifier le timing. Les autres tickets ne sont pas inclus dans cette proposition.
