# H1 — La concurrence de decode n’est pas nécessaire au blocage

La contre-expérience alternée ne valide pas le correctif séquentiel. Sur **12 essais terminés**, A parallèle réussit 3 fois et bloque 3 fois ; B séquentiel réussit 4 fois et bloque 2 fois. Les deux rouges B restent dans une promesse native decode avant les fontes. Aucun changement de test suivi ni de produit n’est appliqué ou proposé comme correction.

## Variable unique et borne

`A-parallel.test.cjs` est la copie de reproduction « composition seule ». `B-sequential.test.cjs` ne change que l’agrégation : la même liste statique d’images est parcourue par `for...of`, avec attente de chaque promesse originale. Chaque image conserve son appel natif, ses témoins, la même gestion de rejet et les fontes attendues ensuite. `A-to-B.diff` contient exactement ce changement ; `variants.json` fixe les deux SHA256. Aucun changement d’image, de grille, de géométrie, de document ou d’assertion.

Les essais sont alternés A/B, chaque fois dans un conteneur neuf, même snapshot de 344 fichiers, Node officiel 24.18.0, image Playwright et droits précédemment vérifiés. Une borne hôte de 15 secondes commence après préparation ; elle termine seulement le conteneur de l’essai bloqué. Aucune commande navigateur de secours ni inspecteur. Les témoins de début/résolution/rejet sont émis depuis les promesses originales et enregistrés côté Node.

## Comptes

| Variante | Essais | Verts | Blocages decode à 15 s |
|---|---:|---:|---:|
| A parallèle | 6 | 3 | 3 |
| B séquentiel | 6 | 4 | 2 |

Les essais A rouges sont 3, 5 et 11 ; les B rouges sont 10 et 12. Tous ont le code conteneur 143 après la borne. Les essais verts ont un footer complet et le code 0. Chaque essai vert parcourt les 24 images en portable puis les 24 en distribution web, avec les mêmes SHA et les fontes terminées. Les rejets observés sont nuls. Les durées normales sont de l’ordre d’une seconde ; les rouges ne se limitent pas à un dépassement de durée : les journaux localisent une progression decode arrêtée avant les fontes.

À la demande de la racine, l’alternance est interrompue dès connaissance du premier échec séquentiel. B12 avait déjà atteint sa borne lors de l’arrêt du lanceur. A13 avait commencé sa préparation ; son conteneur est arrêté avant tout démarrage de test et il est exclu des comptes. Aucun autre essai n’est lancé. Tous les conteneurs sont supprimés et les 344 empreintes source restent inchangées.

## Témoins B10 et B12

Dans les deux cas, la composition portable « Frappe continue » est le document actif. Les images 0 à 4 résolvent. L’image **5** reste en attente ; les images suivantes ne sont logiquement pas appelées puisque B attend séquentiellement.

- Source SHA256 : `4ce4e86fdfc024eba08d3d2dfc7e88050489fa4b7bfe8df5ab8388e278439534`, identique à l’image 4 déjà résolue.
- Dimensions naturelles : 1920 × 1080 ; `complete=true`, image connectée.
- Document : `readyState=complete` ; aucune navigation ni détachement observé après le début des decode.
- Les indices 0–4 terminent en quelques millisecondes ; aucun rejet n’est enregistré. `fonts-start` n’est jamais atteint.

La concurrence entre les appels decode n’est donc **pas nécessaire** au blocage observé. L’expérience ne distingue pas encore l’historique/cache et les conditions de rendu ou de visibilité dans la page complète. Le passage séquentiel serait un correctif insuffisant. H2 et H3 ne sont pas testées dans cette tranche.

## Preuves

`analysis.json` contient tous les documents, indices, durées, SHA et footers ; chaque `trial-XX-X/` conserve les journaux et reçus d’isolation/suppression. `campaign-receipt.json` consolide les comptes. `trial-13-A/RECEIPT.json` distingue l’annulation de préparation d’un résultat de test.

Commande exécutée : `python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-h1-bounded.py`. Le lanceur collecte les codes des conteneurs dans les reçus ; son propre arrêt de coordination est distinct des résultats A/B. Aucun nouveau gate global n’a été exécuté.
