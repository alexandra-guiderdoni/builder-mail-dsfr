# Accessibilité de l’accueil refondu — 3 novembre 2026

Requalification ciblée demandée par #207, après l’accueil guidé (#205) et l’ouverture sans bascule (#207). Collecte automatique sur `main` à `0b9f16b`, Chromium (Playwright), axe-core d’`ay11-pre-audit`. **Aucune qualification humaine ; essai VoiceOver natif partiel** (voir plus bas) : ce dossier ne vaut pas conformité RGAA et ne donne aucun taux.

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

## Essai VoiceOver natif (partiel)

3 novembre 2026, 20 h 47 à 20 h 57 puis 21 h 10 à 21 h 17, VoiceOver de macOS 26.5.2 en français, Safari, version web servie localement sur une origine neuve (première visite réelle). Annonces lues par AppleScript (`content of last phrase`) après chaque touche `VO` envoyée, et par un collecteur continu. Ce relevé n’est pas un flux vocal exhaustif, et il n’y a pas eu d’écoute humaine.

| Cas | Annonce native relevée | Résultat |
|---|---|---|
| Liste des étapes | « liste 3 éléments », puis « 1 » | Liste numérotée restituée. |
| Étape 1 | « niveau d’en-tête 3 Créer votre première newsletter » | Conforme. |
| Étape 2 | « niveau d’en-tête 3 2. Garder une copie de vos newsletters » | Numéro et niveau restitués. |
| Titre de l’accueil | « niveau d’en-tête 2 Mes newsletters » | Conforme. |
| Titre « Exemples » | « niveau d’en-tête 4 Exemples » | Niveau 4 restitué (`aria-level`). |
| Carte d’exemple | « niveau d’en-tête 5 Revue de presse » | Niveau 5 restitué (`aria-level`). |
| Boutons des exemples | « Prévisualiser l’exemple « Information de service » bouton », « Créer à partir de cet exemple « Invitation » bouton » | Noms complets. |
| « Point de départ » | « Information de service Point de départ bouton de menu local », « menu 3 éléments ✓ Information de service » | Nom, rôle et options restitués. |
| Navigation de l’espace de travail | « Mes newsletters et édition navigation vide » | **Défaut corrigé** : le repère de navigation restait exposé alors que ses deux boutons étaient masqués. Il est désormais masqué quand aucun de ses boutons n’est visible (test `welcome-browser`). Après correction, VoiceOver passe de « Édition de vos newsletters » à « niveau d’en-tête 2 Mes newsletters », et le relevé continu de la reprise ne contient plus « navigation ». |
| « Restaurer une sauvegarde » (`Option-Tab`, puis `VO-Espace`) | « Restaurer une sauvegarde bouton », puis « aucun fichier sélectionné Remplace toutes vos newsletters, modèles et identités par ceux d’une sauvegarde exportée, après confirmation. […] bouton de téléchargement de fichier Fichiers de travail et sauvegardes région » | Focus sur le champ de restauration, avec sa description. Le nom du champ n’apparaît pas dans la phrase relevée : **non concluant** (relevé par sondage). |
| Ordre des boutons (`Option-Tab`) | Prévisualiser / Créer pour chacun des quatre exemples, « Point de départ », « Créer une newsletter », « Restaurer une sauvegarde » | Ordre des étapes. |

**Première session interrompue** deux fois : le poste était utilisé en même temps et le premier plan a changé, puis VoiceOver a été arrêté. Collecte suspendue dès la perte de la cible ; les phrases lues hors de l’atelier ne sont pas conservées dans ce dossier. **Reprise** sur un poste laissé libre, origine locale neuve, après la correction de la navigation. Le saut de titre en titre (`VO-Cmd-H`) et le rotor (`VO-U`) n’ont pas été transmis par l’outil de pilotage ; la lecture s’est faite par `VO-flèche droite`, mot par mot, et par `Option-Tab`.

**Rangement vérifié :** VoiceOver arrêté comme à l’état initial, autorisation AppleScript de VoiceOver retirée (clé absente, comme à l’état initial), fenêtre Safari de l’essai fermée sans toucher à l’autre fenêtre, serveur local et collecteurs arrêtés. Le stockage de l’origine locale de l’essai reste dans Safari.

## Non vérifié

- Avec VoiceOver : l’étape « Installer l’atelier », le nom du champ annoncé après « Restaurer une sauvegarde », le passage de « Lecture de vos newsletters… » à l’accueil, la navigation de titre en titre et le rotor. À confirmer par une personne qui utilise VoiceOver.
- NVDA et JAWS.
- Zoom du texte à 200 % et espacement du texte (critères 10.4 et 10.12 du RGAA) sur l’accueil refondu.
- Firefox et WebKit.
- Qualification humaine des critères : `NON_TESTE`.
