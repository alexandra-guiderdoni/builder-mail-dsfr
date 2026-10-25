# H3 — Différentiel de visibilité non discriminant

Les huit essais terminent : **A 4/4 verts, C 4/4 verts**, sans borne déclenchée. Le témoin A ne reproduit pas dans cet échantillon ; cette expérience ne démontre donc aucun bénéfice causal du défilement et ne justifie pas un correctif.

## Variable et témoins communs

Les deux copies de « composition seule » gardent les 24 images, les appels decode parallèles originaux, les fontes et les assertions. `A-to-C.diff` contient une seule ligne :

```js
await frame.locator('img').nth(5).scrollIntoViewIfNeeded();
```

L’ajout intervient après l’attente du titre et de `readyState=complete`, avant les decode. Les deux variantes ont exactement la même garde et instrumentation : boundingBox de l’iframe et viewport parent, puis une lecture synchrone des rectangles des images 4/5 au début de l’évaluation originale, avant les decode. Aucun secours ou lecture après un blocage. Ces observations communes diffèrent du témoin H1 précédent et peuvent influer sur le moment ou le rendu ; leur innocuité n’est pas démontrée.

La prédiction testée était : si la visibilité contribue à la progression, l’image 5 rendue visible devrait résoudre et la frontière des attentes pourrait suivre les images hors fenêtre. Aucun blocage n’étant apparu, cette prédiction n’est ni validée ni réfutée par une contre-expérience discriminante.

## Géométrie effectivement observée

Les huit essais couvrent chacun les distributions portable et web, viewport 1600 × 1000. Les projections incluent la bordure 1 px de l’iframe.

| Variante | y de l’iframe | Image 4, haut dans la fenêtre | Image 5 dans la fenêtre |
|---|---:|---:|---:|
| A, portable et web | 754 | 943 | 1053–1137,375, hors fenêtre |
| C, portable | 160 | 349 | 459–543,375, visible |
| C, web | 159 | 348 | 458–542,375, visible |

Le défilement produit donc bien le changement demandé. En A aussi, malgré l’image 5 hors fenêtre, toutes les promesses résolvent sur ces essais. Chaque document lance et résout ses 24 decode, avec les mêmes SHA de source et aucun rejet ; les fontes terminent. Aucun comptage réduit ni image ignorée.

## Exécution et limite

Huit essais alternés A/C, chacun dans un conteneur neuf, même snapshot, Node officiel 24.18.0 et image Playwright Linux arm64. Borne extérieure 15 secondes par test et budget 180 secondes. Codes conteneurs 0, aucun timeout, tous supprimés. Les 344 empreintes source restent inchangées. Aucun fichier suivi ni produit n’est modifié et aucun nouveau gate complet n’est exécuté.

La reproduction antérieure du blocage reste valide ; cette série ne la résout pas. Le séquentiel H1 reste insuffisant (deux échecs B). Aucune nouvelle hypothèse n’est testée après ces huit essais.

## Preuves

- `A-original-position.test.cjs`, `C-image5-visible.test.cjs`, `A-to-C.diff`, `variants.json` : copies exactes, delta et empreintes.
- `analysis.json`, `trial-XX-X/analysis.json`, `targeted.log` : positions, progression native, SHA, fontes et footers.
- `campaign-receipt.json`, reçus par essai : codes, bornes, suppression et intégrité.
- Commande exécutée : `python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-h3-bounded.py`.
