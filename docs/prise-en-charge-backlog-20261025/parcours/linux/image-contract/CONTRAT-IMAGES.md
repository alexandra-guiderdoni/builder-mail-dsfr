# Contrat des images de la composition complète

Lecture du HTML figé et **un seul témoin DOM neuf**, Linux Chromium, thème clair, viewport 1600 × 1000. Aucune invocation de `image.decode()`, aucun test d’hypothèse H2/H3, aucune modification de code. Le témoin se ferme normalement (code 0) et son conteneur est supprimé. Les 344 empreintes source restent inchangées.

Les **24 images** sont `complete=true` avec dimensions naturelles strictement positives, y compris les variantes volontairement masquées. Les seuls masquages CSS observés en clair concernent les indices **1, 3, 20, 22**, les variantes Marianne `hide-white`. Elles ont un rectangle nul mais leurs dimensions naturelles valent 152 × 132.

## Images 4 et 5

L’image **4** appartient à `mail-03`, « En-tête avec logo opérateur » ; alternative « Nom de l’opérateur de l’état ». Sa boîte affichée vaut 80 × 45 px, avec contraintes inline min/max 60–80 px en largeur et 45–50 px en hauteur. Elle est `display:block`, `visibility:visible`, opacité 1, sans ancêtre masqué.

L’image **5** appartient à `mail-04`, « Bannière de campagne » (table source `Entête GouvX`) ; alternative vide. Sa classe `wlkm-cl` applique les règles de largeur responsive ; l’image vaut ici 150 × 84,375 px, avec largeur/max-width inline 150 px. Elle est également `display:block`, `visibility:visible`, opacité 1, sans ancêtre masqué. Ce n’est pas une alternative HTML masquée.

Ces deux images utilisent la même source PNG, SHA256 de l’URI source `4ce4e86fdfc024eba08d3d2dfc7e88050489fa4b7bfe8df5ab8388e278439534`, dimensions naturelles 1920 × 1080. La source est une image de substitution réutilisée dans plusieurs composants du catalogue ; ses usages et dimensions CSS diffèrent.

Dans ce témoin, l’iframe commence à y=754 dans la fenêtre principale, avec une bordure de 1 px. L’image 4 a y=188 dans l’iframe, soit environ y=943–988 dans la fenêtre principale ; l’image 5 a y=298, soit y=1053–1137, sous le bas de la fenêtre de 1000 px. C’est une observation de géométrie, pas une expérience démontrant une cause du blocage. Le témoin n’inspecte pas une ancienne promesse bloquée.

## Masquage volontaire et responsive

Le CSS figé impose `.hide-white { display:none!important }` et `.hide-black { display:block!important }` par défaut. Dans `prefers-color-scheme:dark`, les deux règles s’inversent : indices **0, 2, 19, 21** masqués, **1, 3, 20, 22** affichés. Cette inversion est attestée statiquement ici ; aucun second témoin sombre n’est exécuté.

Aucune des 24 images, ni leurs ancêtres, ne porte `wlkm-hide` ou `darkmode-img` dans cette fixture. Les règles responsives `wlkm-cl` changent la largeur et ne masquent pas l’image 5. Les images 4/5 ne sont donc pas des doublons d’un mécanisme de masquage responsive. Une vérification du chargement des 24 sources doit distinguer dimensions naturelles et boîte affichée : exiger une boîte positive pour toutes contredirait les quatre variantes Marianne volontairement masquées. Ce constat ne prétend pas remplacer un contrat spécifique de décodage.

## Inventaire observé

Les coordonnées y ci-dessous sont relatives au viewport de l’iframe ; `none` correspond au masquage CSS volontaire en thème clair.

| Index | Composant | Display | Boîte CSS (px) | y (px) |
|---:|---|---|---:|---:|
| 0 | mail-02 — En-tête Marianne | block | 76 × 66 | 57 |
| 1 | mail-02 — En-tête Marianne | none | 0 × 0 | 0 |
| 2 | mail-03 — En-tête avec logo opérateur | block | 76 × 66 | 180 |
| 3 | mail-03 — En-tête avec logo opérateur | none | 0 × 0 | 0 |
| 4 | mail-03 — En-tête avec logo opérateur | block | 80 × 45 | 188 |
| 5 | mail-04 — Bannière de campagne | block | 150 × 84.375 | 298 |
| 6 | mail-06 — Titre principal avec image | block | 140 × 78.75 | 518.375 |
| 7 | mail-26 — Image 16:9 et source · lavande | block | 500 × 281.25 | 2265.38 |
| 8 | mail-27 — Image 16:9 et source · blanc | block | 500 × 281.25 | 2607.62 |
| 9 | mail-28 — Image carrée et source · lavande | block | 500 × 500 | 2949.88 |
| 10 | mail-29 — Image carrée et source · blanc | block | 500 × 500 | 3510.88 |
| 11 | mail-30 — Article avec vignette | block | 125 × 125 | 4061.88 |
| 12 | mail-31 — Article avec vignette et lien | block | 125 × 125 | 4206.88 |
| 13 | mail-32 — Appel à contribution | block | 130 × 130 | 4385.88 |
| 14 | mail-33 — Appel à contribution et bouton | block | 130 × 130 | 4579.88 |
| 15 | mail-37 — Partie illustrée avec sous-sections | block | 500 × 281.25 | 5397.88 |
| 16 | mail-38 — Partie illustrée | block | 500 × 281.25 | 5945.12 |
| 17 | mail-46 — Deux cartes d’information | block | 236 × 132.75 | 7093.38 |
| 18 | mail-46 — Deux cartes d’information | block | 236 × 132.75 | 7093.38 |
| 19 | mail-47 — Pied de page Marianne | block | 76 × 66 | 7466.12 |
| 20 | mail-47 — Pied de page Marianne | none | 0 × 0 | 0 |
| 21 | mail-48 — Pied de page avec logo opérateur | block | 76 × 66 | 7674.12 |
| 22 | mail-48 — Pied de page avec logo opérateur | none | 0 × 0 | 0 |
| 23 | mail-48 — Pied de page avec logo opérateur | block | 80 × 45 | 7682.12 |

## Preuves

- `static-images.json` : attributs, chaînes d’ancêtres et CSS exacts du HTML figé.
- `dom-images.json` : correspondance composant/source vérifiée par SHA, styles calculés, rectangles, dimensions naturelles et contexte de l’iframe.
- `read-geometry.cjs`, `targeted.log`, `RECEIPT.json` : unique témoin, sans appel decode, fermeture et intégrité.
