# Accessibilité de l’accueil refondu — 3 novembre 2026

Requalification ciblée demandée par #207, après l’accueil guidé (#205) et l’ouverture sans bascule (#207). Collecte automatique sur `main` à `0b9f16b`, Chromium (Playwright), axe-core d’`ay11-pre-audit`. **Aucune qualification humaine ni lecteur d’écran réel** : ce dossier ne vaut pas conformité RGAA et ne donne aucun taux.

## Portée

| État | Version | Largeur |
|---|---|---|
| Première visite | portable, web (avec l’étape « Installer ») | 1 280 px ; web aussi à 320 px |
| Lecture du stockage en cours | portable (ouverture d’IndexedDB retenue) | 1 280 px |
| Newsletters existantes | portable | 1 280 px |
| Stockage illisible (version de sauvegarde inconnue) | portable | 1 280 px |

Mesures par état : règles axe WCAG 2.0 à 2.2 A et AA, titres, ordre de tabulation depuis le titre « Mes newsletters » avec visibilité et indicateur de focus, débordement horizontal. En plus : focus après « Restaurer une sauvegarde ». Données brutes : [observations.json](observations.json) ; script : [collecte.cjs](collecte.cjs), relançable par `node collecte.cjs <sortie.json>`.

## Résultats

| Contrôle | Résultat |
|---|---|
| axe, violations | 0 dans les six relevés. |
| axe, contrastes « à revoir » | `#starter` (liste « Point de départ ») et `#portable-download` : axe ne conclut pas à cause d’une image de fond (flèche, soulignement). Calcul manuel : `#3a3a3a` sur `#eeeeee`, 9,8:1 ; `#3a3a3a` sur blanc, 11,37:1. Conformes au seuil de 4,5:1. |
| Titres, première visite | h1 Atelier, h2 Mes newsletters, h3 pour chaque étape ; « Exemples » au niveau 4 et ses cartes au niveau 5 dans l’arbre d’accessibilité natif de Chromium (`aria-level`). L’instantané ARIA de Playwright affiche 3 et 4 : il ignore `aria-level` sur les titres natifs ; ce n’est pas un défaut de la page. |
| Titres, accueil habituel | Inchangés : « Exemples » et « Repartir de zéro » en h3, cartes en h4. |
| Ordre clavier, première visite | Exemples (prévisualiser, créer), « Point de départ », « Créer une newsletter », « Restaurer une sauvegarde », puis sur le web « Télécharger l’atelier portable » et l’aide repliable, enfin « Sauvegarde et import ». L’ordre suit celui des étapes et du texte. Aucun élément invisible ni sans indicateur de focus. |
| Lecture du stockage en cours | Seuls h1 et « Mes newsletters » ; aucune commande de l’accueil n’est atteignable. « Sauvegarde et import » et « Importer du JSON » restent atteignables comme repliables, état antérieur à ce lot. |
| Focus après « Restaurer une sauvegarde » | Sur le champ « Restaurer une sauvegarde » (`#restore-input`), visible. |
| Largeur 320 px | Aucun débordement horizontal. |
| Stockage illisible | Pas d’accueil guidé ; l’erreur et la copie de diagnostic restent proposées, comme prévu par #205. |

## Non vérifié

- Restitution par un lecteur d’écran réel (VoiceOver, NVDA) des étapes numérotées, du passage de « Lecture de vos newsletters… » à l’accueil, et des niveaux de titre.
- Zoom du texte à 200 % et espacement du texte (critères 10.4 et 10.12 du RGAA) sur l’accueil refondu.
- Firefox et WebKit.
- Qualification humaine des critères : `NON_TESTE`.
