# Préaudit RGAA 4.1.2 de la version actuelle — 6 novembre 2026

**Préqualification instrumentée, sans qualification humaine.** Ce dossier ne prononce aucune conformité, ne donne aucun taux et ne remplace pas les matrices de la [campagne du 23 octobre](../css-20261023/RAPPORT.md). Il dit, critère par critère, ce que la version actuelle montre aux outils et ce qui reste à juger par une personne.

## Périmètre

- **Version :** `main` à `afb2934`, avec la relecture du vocabulaire non commitée du 5 novembre. Distribution web reconstruite (`app/distribution/web/index.html`, empreinte SHA-256 `83209a2feb226f5c…`), servie sur `http://127.0.0.1`.
- **Navigateur :** Chromium de Playwright 1.64.1, en français, sans profil personnel ; axe-core 4.14.0 (règles WCAG 2.0 à 2.2 A et AA, plus les bonnes pratiques) ; Nu HTML Checker local (`vnu`).
- **Données :** synthétiques. On part de l’exemple « Lettre d’information », avec une identité « Service test ».
- **États exercés (21) :**
  - Accueil :
    - première visite, à 1 280 et à 320 px ;
    - avec une newsletter.
  - Dialogues :
    - aperçu d’un exemple ;
    - « Vérifier avant de copier » ;
    - « Supprimer la newsletter » ;
    - « Appliquer une identité de service » ;
    - « Remplacer toutes vos newsletters ? » ;
    - « Tout effacer dans ce navigateur ? ».
  - Éditeur :
    - bloc sélectionné, à 1 280 et à 320 px ;
    - catalogue ouvert, avec une recherche ;
    - ajout, retrait et déplacement d’un bloc au clavier.
  - Erreurs :
    - erreurs de saisie ;
    - JSON invalide importé.
  - Adaptations de présentation :
    - deuxième fenêtre ;
    - texte agrandi ;
    - espacement du texte ;
    - feuilles de style désactivées ;
    - préférence système sombre.
- **Mesures par état :**
  - axe ;
  - titres, régions, liens, images, cadres, champs, groupes et zones d’annonce ;
  - parcours complet à la tabulation : visibilité et indicateur de focus de chaque arrêt, fin du parcours ;
  - focus à l’ouverture et à la fermeture des dialogues ;
  - débordement et contenu tronqué ;
  - structure de l’aperçu du courriel dans son iframe.
- **Fichiers :**
  - données brutes : [observations.json](observations.json) ;
  - scripts : [collecte.cjs](collecte.cjs), [sondes.cjs](sondes.cjs) et [sondes2.cjs](sondes2.cjs), relançables par `node collecte.cjs <dossier>`.

Hors périmètre :
- l’atelier portable et la page SNUM ;
- Firefox et WebKit ;
- les lecteurs d’écran ;
- l’accessibilité du courriel une fois reçu dans une messagerie ;
- le mode lecture seule à plusieurs fenêtres : il ne s’est pas déclenché dans le contexte de test, et n’est donc pas exercé.

## Résultat en bref

- **axe : 0 violation dans les 17 relevés.** Les contrastes indéterminés (listes déroulantes à flèche en image de fond, lien souligné en dégradé) ont été calculés à la main : 9,8:1 et 11,37:1.
- **Clavier :**
  - chaque commande des états exercés est atteinte à la tabulation, avec un indicateur visible : contour de 2 px `#0a76f6`, soit 4,26:1 sur blanc ;
  - le parcours ne bloque nulle part, aperçu du courriel compris ;
  - le lien d’évitement mène au contenu principal.
- **Validité :** aucune erreur `vnu` sur la distribution ni sur le DOM rendu de l’éditeur. Seuls des avertissements restent, dont la politique de sécurité que `vnu` ne sait pas évaluer.
- **Adaptations de présentation :**
  - aucun débordement horizontal à 320 px ni avec la page zoomée à 200 % ;
  - aucun texte tronqué avec l’espacement du texte du critère 10.12.
- **Défaut bloquant : aucun trouvé.** Cinq écarts candidats, tous mineurs, sont listés ci-dessous. Les mesures décrivent l’état d’avant correction.

## Corrections du 6 novembre 2026

Les cinq écarts sont corrigés le même jour. Le test `tests/preaudit-rgaa-browser.test.cjs` reproduit chacun d’eux : il échouait avant correction et passe désormais sous Chromium, Firefox et WebKit.

1. Le nom vide affiche « Erreur : Renseignez le nom de la newsletter. ».
2. Les options du catalogue passent à la ligne (`white-space: normal`). Firefox ne permet pas ce retour à la ligne dans une liste : il garde un défilement horizontal (`overflow-x: auto`). Ce défilement est mesuré, mais n’a pas été essayé à la main.
3. Si la newsletter existe toujours, le focus revient au bouton qui a ouvert la fenêtre.
4. Le JSON refusé :
   - le champ est marqué invalide ;
   - il est relié au message, préfixé « Erreur : » ;
   - il reprend le focus ;
   - l’annonce précédente est effacée, et une nouvelle saisie retire le signalement.
5. Chaque « Aller au bloc » est décrit par son avertissement (`aria-describedby`).

Ces corrections ne sont pas encore requalifiées par une personne. Les statuts de 11.11 et des écarts 2 à 5 deviennent `PASS_CANDIDATE` pour l’échantillon exercé.

## Écarts candidats, à confirmer (état avant correction)

1. **Nom vide : message d’erreur en jargon interne** (11.11). Vider « Nom de la newsletter (obligatoire) » affiche « Erreur : Identifiant et nom de newsletter requis. ». Ce texte de validation interne (`app/source/model.js:125`) arrive tel quel sous le champ. « Identifiant » ne correspond à rien que l’utilisateur voie. Proposition : « Renseignez le nom de la newsletter. ». La relecture du vocabulaire du 5 novembre l’avait manqué.
2. **Liste du catalogue tronquée avec le seul texte agrandi** (10.4, à confirmer).
   - **Mesure :** le texte est passé à 200 % (racine à 32 px) dans une fenêtre de 1 280 px. Les libellés de « Composant et variante » (`#catalogue`, liste à 8 lignes) dépassent alors la largeur utile, 567 px contre 415 px, et ils sont coupés.
   - **Zoom de page :** à 200 % (640 px CSS), rien n’est coupé.
   - **Reste à vérifier :** le « zoom texte seulement » de Firefox, mode que le RGAA admet aussi.
3. **Annuler la suppression d’une newsletter ne rend pas le focus au bouton** (7.1, à confirmer).
   - Dans l’éditeur, « Supprimer la newsletter » puis « Annuler » ou Échap renvoie le focus sur le titre « Votre newsletter » (`focusRow`, `app/source/library.js:51`), et non sur le bouton qui a ouvert le dialogue.
   - Les cinq autres dialogues exercés rendent le focus à leur déclencheur.
   - Le focus reste dans la même section : rien n’est perdu, mais l’utilisateur doit revenir de six arrêts.
4. **Erreur d’import JSON non rattachée au champ** (11.10, à confirmer).
   - Après un JSON invalide, le message « Le fichier ou le contenu collé est invalide ou incomplet. » s’affiche dans la zone d’erreur générale, en haut de page (`role="alert"`, donc annoncé).
   - Mais le champ « Contenu d’une newsletter ou d’une sauvegarde » n’est ni marqué invalide, ni lié au message, et le focus reste sur le bouton.
   - Le message de réussite précédent (« Identité … enregistrée ») reste affiché en même temps.
5. **Boutons de même nom dans « Vérifier avant de copier »** (11.9, à confirmer).
   - Quand un bloc a deux avertissements, deux boutons « Aller au bloc 1 » se suivent. Chacun suit son message, mais n’y est pas lié (`aria-describedby` absent, `app/source/checks.js`).
   - Une personne qui parcourt les boutons au lecteur d’écran entend deux fois le même nom.

## Critères par thématique

Les statuts sont des candidats, au sens du skill `audit-rgaa-dsfr` :
- `PASS_CANDIDATE` : aucun signal contraire dans l’échantillon ;
- `FAIL_CANDIDATE` : écart mesuré ;
- `A_CONFIRMER` : jugement humain nécessaire ;
- `NA_CANDIDATE` : non applicable, à confirmer.

Toutes les qualifications réglementaires restent `NON_TESTE`.

### 1. Images

- 1.1 à 1.3, `PASS_CANDIDATE` :
  - l’interface n’a aucune image porteuse d’information ;
  - la poignée « ⠿ » est masquée (`aria-hidden`) et le bouton porte son nom ;
  - dans l’aperçu, les quatre logos Marianne ont l’alternative « République française ».
- 1.2 à 1.3 dans le courriel composé, `A_CONFIRMER` : l’alternative dépend du contenu saisi. L’atelier propose un champ « Alternative textuelle ».
- 1.4 à 1.9, `NA_CANDIDATE` : aucun CAPTCHA, aucune image texte, aucune légende.

### 2. Cadres

- 2.1 et 2.2, `PASS_CANDIDATE`. Les trois cadres ont un titre pertinent :
  - « Aperçu du courriel composé » ;
  - « Aperçu du composant sélectionné » ;
  - « Aperçu de l’exemple « … » ».

### 3. Couleurs

- 3.1, `PASS_CANDIDATE` : les erreurs commencent par « Erreur : », pas seulement par la couleur.
- 3.2, `PASS_CANDIDATE` :
  - axe ne relève aucune violation ;
  - indéterminés calculés : 9,8:1 et 11,37:1 ;
  - texte d’erreur `#ce0500` à 5,76:1.
- 3.3, `PASS_CANDIDATE` : les champs DSFR ont un trait inférieur contrasté, et la poignée « ⠿ » est à 14,9:1. Les sections repliables n’ont pas de bordure ; leur texte et leur marqueur relèvent de 3.2.

### 4. Multimédia

- 4.1 à 4.13, `NA_CANDIDATE` : ni vidéo, ni audio, ni animation.

### 5. Tableaux

- Interface, `NA_CANDIDATE` : aucun tableau de données.
- Aperçu du courriel :
  - ses 44 tableaux sont tous de mise en page, en `role="presentation"`, sans `th` ni `caption` : 5.8 `PASS_CANDIDATE` ;
  - linéarisation (5.3), `A_CONFIRMER`.

### 6. Liens

- 6.1 et 6.2, `PASS_CANDIDATE` :
  - trois liens d’interface aux intitulés explicites ;
  - les liens de l’aperçu reprennent les titres des articles.

### 7. Scripts

- 7.1, `A_CONFIRMER` :
  - dialogues natifs modaux, avec nom et description ;
  - sections repliables natives ;
  - liste des blocs en boutons `aria-pressed` ;
  - voir l’écart 3. L’annonce réelle reste à écouter.
- 7.2, `NA_CANDIDATE`.
- 7.3, `PASS_CANDIDATE` : tout se fait au clavier ; le glisser-déposer a son équivalent, « Déplacer à la position… », atteint depuis la poignée.
- 7.4, `PASS_CANDIDATE` : changer de newsletter passe par « Ouvrir cette newsletter ». Choisir un fichier de restauration ouvre une confirmation, ce qui est attendu.
- 7.5, `PASS_CANDIDATE`. Les messages arrivent dans des zones d’annonce :
  - ajout, retrait et enregistrement (`role="status"`) ;
  - nombre de résultats du catalogue, 500 ms après la frappe : « 4 composants trouvés sur 52. » ;
  - erreurs (`role="alert"`).

### 8. Éléments obligatoires

- 8.1 à 8.6, `PASS_CANDIDATE` :
  - doctype présent ;
  - aucune erreur `vnu` ;
  - `lang="fr"` ;
  - titre propre à la vue, par exemple « Lettre d’information – Éditeur – Atelier de courriels DSFR ».
- 8.7, `A_CONFIRMER` : « newsletter » est employé comme un mot français.
- 8.9, `A_CONFIRMER` : deux `fieldset` servent à désactiver l’atelier pendant le chargement, et exposent des groupes « Atelier de composition » et « Édition de vos newsletters ».
- 8.10, `NA_CANDIDATE`.

### 9. Structuration

- 9.1, `PASS_CANDIDATE` : la hiérarchie des titres est cohérente.
  - Accueil :
    - un h1 « Atelier de courriels DSFR » ;
    - un h2 « Mes newsletters » ;
    - les étapes en h3 ;
    - « Exemples » en h4, ou en h3 hors première visite.
  - Éditeur :
    - un h2 par panneau ;
    - un h3 pour le bloc.
- 9.2, `PASS_CANDIDATE` : en-tête, navigation, contenu principal et pied de page.
- 9.3, `PASS_CANDIDATE` : les étapes, les blocs, les avertissements et les newsletters sont des listes.
- 9.4, `NA_CANDIDATE`.

### 10. Présentation

- 10.1 à 10.3, `PASS_CANDIDATE` : sans styles, le texte suit l’ordre de lecture et aucun contenu masqué ne réapparaît.
- 10.4, `A_CONFIRMER` : voir l’écart 2.
- 10.5, `NON_TESTE`.
- 10.6, `PASS_CANDIDATE` : le lien du texte est souligné.
- 10.7, `PASS_CANDIDATE` : un indicateur sur chaque arrêt, y compris dans l’aperçu (anneau natif, 5,98:1).
- 10.8, `PASS_CANDIDATE`.
- 10.9 et 10.10, `A_CONFIRMER` : les niveaux de poids du courriel sont à juger à l’œil.
- 10.11, `PASS_CANDIDATE` : aucun débordement horizontal à 320 px, à l’accueil ni dans l’éditeur. Le courriel de 600 px reste dans son cadre : à confirmer.
- 10.12, `PASS_CANDIDATE` : seul le lien « Passer l’aperçu du courriel » dépasse, et il est masqué hors focus par construction.
- 10.13 et 10.14, `NA_CANDIDATE` : aucune infobulle ni aucun contenu révélé au survol n’a été trouvé.

### 11. Formulaires

- 11.1, `PASS_CANDIDATE` : chaque champ a une étiquette visible et liée.
- 11.2, `A_CONFIRMER`.
- 11.3, `PASS_CANDIDATE` : « Exporter Mes newsletters » est identique partout.
- 11.4, `A_CONFIRMER`.
- 11.5 à 11.7, `PASS_CANDIDATE` : les liens supplémentaires du pied de page sont groupés, avec une légende.
- 11.8, `A_CONFIRMER` : les 52 composants du catalogue ne sont pas regroupés par famille (`optgroup`).
- 11.9, `A_CONFIRMER` : voir l’écart 5 et le bouton « Appliquer » des identités.
- 11.10, `PASS_CANDIDATE` pour les champs des blocs : « (obligatoire) » dans l’étiquette, `aria-invalid`, message lié. Pour l’import JSON, voir l’écart 4.
- 11.11, `FAIL_CANDIDATE` pour le nom vide (écart 1). Les autres messages guident, par exemple « retirez les espaces et les caractères de contrôle ».
- 11.12, `NA_CANDIDATE` : aucune donnée juridique ou financière. Les suppressions et la restauration demandent tout de même une confirmation.
- 11.13, `NA_CANDIDATE` : aucun champ de donnée personnelle de l’utilisateur.

### 12. Navigation

- 12.1 à 12.5, `NA_CANDIDATE` : une seule page applicative.
- 12.6, `PASS_CANDIDATE`.
- 12.7, `PASS_CANDIDATE` : « Aller au contenu » vient en premier et mène au contenu principal, avec deux liens locaux autour de l’aperçu.
- 12.8, `PASS_CANDIDATE` : l’ordre suit l’affichage.
- 12.9, `PASS_CANDIDATE` : aucun piège. L’aperçu se traverse en quatre arrêts, sur des liens qui ne s’ouvrent pas, et un lien permet de le passer.
- 12.10, `NA_CANDIDATE` : aucun raccourci à une touche.
- 12.11, `NA_CANDIDATE`.

### 13. Consultation

- 13.1, `NA_CANDIDATE` : aucune limite de temps.
- 13.2, `PASS_CANDIDATE` : aucune nouvelle fenêtre.
- 13.3 et 13.4, `A_CONFIRMER` : les téléchargements sont du HTML et du JSON, pas des documents bureautiques.
- 13.5 à 13.8, `NA_CANDIDATE`.
- 13.9, `A_CONFIRMER` : aucun verrouillage d’orientation dans le code, mais pas de mesure en portrait.
- 13.10 et 13.11, `PASS_CANDIDATE` : le déplacement à la souris a son équivalent au clavier, et un dépôt hors de la liste annule.
- 13.12, `NA_CANDIDATE`.

## Ce qui reste à faire par une personne

- **Lecteur d’écran.** L’essai VoiceOver du 3 novembre ne couvre que l’accueil. Restent à écouter l’éditeur, les dialogues et les annonces de 7.5. NVDA et JAWS, sous Windows, restent à faire.
- **Jugements :**
  - pertinence des titres et des étiquettes (8.6, 9.1, 11.2) ;
  - proximité visuelle des étiquettes (11.4) ;
  - information par la forme ou la position (10.9).
- **Autres moteurs et modes :**
  - le zoom texte seulement de Firefox (écart 2) ;
  - le mode portrait ;
  - Firefox et WebKit, plus largement.
- **Autres surfaces :** l’atelier portable, la page SNUM et le mode lecture seule.

## Limites de ce préaudit

- **Méthode :**
  - le zoom texte est simulé en agrandissant la police racine ;
  - la désactivation des styles retire la feuille interne.
- **Indicateur de focus :** il est détecté par son style calculé, pas par une comparaison d’images.
- **Zones d’annonce :** elles sont vérifiées par leur contenu, pas par une annonce entendue.
- **Couverture :** les états couvrent les parcours principaux, pas toutes les combinaisons des 52 composants. Celles-ci relèvent de la campagne du 23 octobre.
