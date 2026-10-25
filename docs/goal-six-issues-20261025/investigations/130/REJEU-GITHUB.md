# #130 — rejeu GitHub vérifié, cause originelle toujours inconnue

Le [run 40213040087](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40213040087), terminé avec succès le 25 octobre 2026 à 16:44:13 UTC, exécute le harnais `9b56c13570236875893293fdd95d01d13a4de678` sur `diag/issue-130-forensic`. Son unique job est `forensic` ; aucun déploiement. Les dix fichiers de l’artefact `forensic-130-40213040087-1` ont été relus et leurs SHA-256 consignés dans `REJEU-GITHUB-SHA256.json`, sans relancer les tests.

| Élément | Incident 40185188187 | Rejeu 40213040087 |
|---|---|---|
| Produit/fixture | `395c08d1dfa4d0b8e41416da798bf0313a8bd379` | même SHA ; six empreintes du manifeste confrontées aux blobs Git |
| Système/architecture | Ubuntu 26.04.1 / x64 | Ubuntu 26.04.1 / x64 |
| Image GitHub | `20261012.163.1` | **`20261023.163.3`** |
| Node / Playwright | 24.18.0 / 1.64.1 | identiques |
| Chromium | 156.0.8078.4 | identique |

Le rejeu corrige donc l’écart de système et d’architecture des essais Noble/arm64 ; **il ne restaure pas l’image exacte du runner incident**, ni son état d’exécution. `host.log` relève le noyau `7.0.0-1017-azure` et `RunnerArch=X64` ; `browser.json` confirme les versions runtime.

| Scénario | Résultat vérifié |
|---|---|
| Fichier historique original complet | **3/3 réussis**, 3,226 s |
| Même fichier instrumenté, sans intervention sur le marqueur | **3/3 réussis**, 3,245 s |
| Concurrent ciblé avec suppression explicite du marqueur avant reload | **1 échec attendu**, 1,490 s ; symptôme exact de l’incident |

Aucun skip ni annulation. Le succès global signifie que le contrôle négatif a bien échoué pour le symptôme attendu ; il ne signifie pas que les sept tests sont verts. Le diff d’instrumentation conserve les assertions historiques et correspond aux ajouts relus.

Dans la trace naturelle, les deux rechargements relisent `"1"`, empruntent `native-open` et sortent du mode récupération. Le scénario concurrent retrouve « Écriture concurrente » ; ses assertions de conservation et de conflit passent. Dans le contrôle, CDP enregistre `domStorageItemRemoved` pour `refus-initial`, puis le nouvel init lit `null` et injecte un **second refus artificiel**. Aucun `native-open` n’est observé dans cette fixture au document rechargé. L’état final est `recoveryOnly:true`, `refusedAtStart:false`, `writes:0`, « Mon premier courriel ». Document et loader changent, tandis que la frame principale, l’URL et la clé de stockage sérialisée restent les mêmes.

**Conclusion bornée :** le mécanisme « marqueur supprimé → réinjection du refus par la fixture » est maintenant démontré aussi sur GitHub Ubuntu26/x64. L’incident spontané n’est pas reproduit ; aucun défaut IndexedDB natif n’est établi.

Le run originel n’archivait ni trace de navigation/stockage ni identité de document/contexte ; son seul état final ne permet pas de reconstruire la transition réellement survenue. On ne peut déterminer rétrospectivement **si, quand et pourquoi le marqueur a cessé d’être reconnu**, ou si un autre document/contexte a été observé. Le vert actuel et le rouge provoqué ne tranchent pas cette inconnue. #130 doit rester ouvert : cause originelle non démontrée, aucun correctif validé par ce rejeu.
