# Préparation géométrique bornée de l’aperçu

Le helper de `composition()` attend désormais les ressources nécessaires aux assertions géométriques avec des bornes explicites. Il ne prétend pas corriger les promesses natives decode pendantes ni certifier la peinture des pixels. Le contrat est celui de [DECISION-ORACLE.md](../DECISION-ORACLE.md).

## Delta exact

Trois fichiers de tests seulement :

- `tests/preview-resources.cjs` : helper commun CJS réellement exercé par le parcours et les contre-épreuves.
- `tests/preview-size-browser.test.cjs` : import du helper, borne 10 s sur le titre préalable, puis remplacement de l’ancien agrégat decode/fonts par son appel avec URL exacte, titre exact et inventaire 24 ou 0.
- `tests/preview-resources-browser.test.cjs` : cinq contre-épreuves natives et leurs reprises positives.

Le helper exige un document complet correspondant à l’URL et au titre demandés, le nombre exact d’images et, pour chacune, `complete` et des dimensions naturelles positives. Il inclut les variantes CSS masquées. Une deuxième attente attend réellement `document.fonts.ready`, puis revalide identité et ressources. Chaque attente normale est bornée à 10 secondes et tout dépassement échoue. Aucun délai fixe, conversion d’échec en succès ou deuxième appel decode.

`preview-size-oracle.diff` compare uniquement ce delta au fichier figé avant adaptation. Les assertions géométriques, URL, titres, sécurité, rafales et messages restent inchangées. Le test d’image tardive est identique octet pour octet, avec ses **deux appels decode sans catch**, SHA256 `90237fbd49186552bbc5be8fcee42d9b3ed76e9201ca35e7c232fd42ada6466d`. Les **39 fichiers app** comparés au snapshot antérieur sont inchangés (`preservation.json`).

## Rouge et contre-épreuves

Les rouges de blocage Linux original restent conservés dans les campagnes antérieures. Un rouge supplémentaire a été obtenu avec l’ancien API exporté temporairement dans le même module : une image cassée et volontairement masquée était acceptée, d’où `Missing expected rejection (TimeoutError)`. `red-broken-legacy.log` conserve le code 1 et `legacy-resources-red.cjs` la version exacte. Après adaptation, ce même contre-test réussit.

Les cinq tests exercent le helper réel, sans copie de sa fonction :

1. Image HTTP cassée, même masquée : rejet borné ; remplacement par une image PNG réelle, puis réussite.
2. Inventaire incomplet : rejet ; ajout de l’image manquante, puis réussite.
3. Réponse HTTP d’image réellement retenue : rejet avec `complete=false` ; réponse PNG libérée, puis dimensions naturelles 1920 × 1080 et réussite.
4. URL périmée puis titre périmé : rejets distincts ; navigation et titre final demandés acceptés.
5. Police Marianne WOFF2 réelle retenue par un serveur HTTP privé : le document est déjà complet, sans image, et la police native est en chargement. Le helper échoue avant libération ; après réponse, `fonts.ready` termine, la face est chargée et `document.fonts.check` confirme sa disponibilité.

Les seules limites réduites sont les **250 ms des contre-épreuves négatives**, passées explicitement à l’API. Les reprises positives et le parcours gardent la limite normale 10 s. Chaque serveur et navigateur créé est fermé par son test.

## Résultats ciblés

| Plateforme/moteur | Résultat |
|---|---|
| macOS chromium | 13/13, aucun échec/annulation/saut, 10.328 s |
| macOS firefox | 13/13, aucun échec/annulation/saut, 27.285 s |
| macOS webkit | 13/13, aucun échec/annulation/saut, 20.647 s |
| Linux Chromium, cinq conteneurs neufs | 5 × 13/13, soit 65 réussites ; aucun échec/annulation/saut |

Les 13 cas combinent les 8 ciblés existants (contrat et aperçu) et les 5 contre-épreuves. Les cinq reprises Linux exécutent les fichiers originaux du candidat, sans inspecteur, instrumentation diagnostique ni évaluation de secours. Borne extérieure 30 s par reprise, jamais atteinte. Tous les conteneurs sont supprimés. Les reçus et footers sont sous `../oracle-validation/`.

Snapshot Linux : 346 fichiers ; manifeste SHA256 `24096427781f1d0aedd9e22425650d4d3d99b962af1c7374e5c0efdfe7c66493`. Node officiel 24.18.0 et même image Playwright épinglée que les campagnes précédentes. L’image Linux arm64 reste distincte du runner GitHub.

Les trois empreintes de code sont dans `candidate-hashes.json`. La revue indépendante est suivie par la racine dans `audit-final/REVUE-ORACLE-RESSOURCES.md`. Après ces ciblés verts, l’unique campagne Linux complète autorisée réussit **397/397, code 0**, sans intervention, avec empreintes inchangées. Voir [FINAL-ORACLE-INTEGRATED.md](../FINAL-ORACLE-INTEGRATED.md) et `../final-oracle-integrated/RECEIPT.json` ; ce succès global est établi par son propre footer, et non déduit des seuls ciblés.
