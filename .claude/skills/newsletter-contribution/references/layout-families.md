# Choisir parmi les mises en page natives

Charger cette référence avant de conseiller une composition ou choisir ses
blocs. Lire seulement les familles pertinentes, puis inspecter les composants
retenus avec `builder-document.cjs catalogue`. Les champs, valeurs par défaut,
rôles de titres et liens viennent du checkout courant, jamais de cette fiche.

## Découverte et couverture

```sh
node scripts/layouts.cjs audit "$BUILDER"
node scripts/layouts.cjs presets "$BUILDER"
node scripts/builder-document.cjs catalogue "$BUILDER" mail-46
```

`audit` rapproche chaque composant des neuf familles documentées et signale
les identifiants nouveaux, absents ou déplacés. Exiger `complete: true` avant
d’annoncer une couverture du catalogue courant. Les trois capacités
facultatives du template éditorial ont leur résultat distinct ; leur absence
n’interdit pas les mises en page natives qui ne les utilisent pas.

`inventoryComplete` ne suffit pas : `contract.unchanged` doit aussi être vrai.
Le contrat de `assets/builder-contract.json` contrôle, pour chaque composant,
les clés et types des champs, les rôles de titres, les liens, le gabarit et
le nom ; il éprouve aussi les fonctions du moteur utilisées et les
versions de composition. Un changement sous le même identifiant exige donc une
nouvelle vérification. Libellés et valeurs par défaut des champs, et styles,
sont hors contrat. Aucun
script ne l’actualise automatiquement ; la CI du builder signale tout écart.

La couverture porte sur les composants et variantes détectés. Elle ne signifie
pas que toute combinaison de contenus, largeur ou client mail a été testée.

## En-têtes — 00 à 03

- `00` : pré-en-tête masqué ; compléter l’objet sans répéter tout le message.
- `01` : version en ligne ; employer une URL réelle fournie, sinon omettre ce bloc.
- `02` : identité Marianne ; `03` ajoute le logo opérateur. Les variantes
  d’image de l’identité sont des champs distincts, à conserver toutes.

Vérifier l’organisme émetteur et les assets autorisés. Une image de signature
extraite d’une pièce jointe privée demande un fichier disponible ; garder la
structure et signaler ce média absent plutôt qu’inventer un logo.

## Titres — 04 à 06, 10 à 17

- `04` : bannière de campagne ; elle ne remplace pas automatiquement le titre
  principal sémantique. `05` porte le titre principal, `06` lui ajoute une image.
- `10/11` : section avec accroche ; `12/13` : section seule.
- `14/15` : partie avec accroche ; `16/17` : partie seule.
- Dans chaque paire ci-dessus, la première variante est lavande, la seconde blanche.

Choisir un titre principal puis une hiérarchie cohérente de sections et parties.
Le renderer calcule les niveaux : relire les `h1` à `h6` réellement produits.
Un titre local d’article ne remplace pas une rubrique. Éviter l’alternance de
fonds sans intention éditoriale ; un fond coloré sert à distinguer une section.

## Textes — 07 à 09, 18 à 25

- `07` : texte de prévisualisation ; `08` : chapô signé ; `09` : chapô de service.
- `18/19` : paragraphe lavande ou blanc.
- `20/21` : liste de trois éléments ; inspecter les quatre champs de texte.
- `22/23` : liste de deux éléments.
- `24/25` : titre local et description.

Les cardinalités des listes sont fixes. Répéter des blocs ou choisir des
paragraphes si le nombre d’éléments diffère ; annoncer l’adaptation. Les champs
sont du texte brut, avec retours à la ligne ; aucun HTML éditorial injecté.

## Images — 26 à 29, 37 et 38

- `26/27` : image 16:9 et source, lavande ou blanc.
- `28/29` : image carrée et source, lavande ou blanc.
- `37` : partie illustrée avec sous-sections ; `38` : partie illustrée simple.

Prendre un média fourni et pertinent, avec son alternative et sa source.
Respecter le recadrage du bloc et vérifier son rendu à petite largeur.
L’incorporation Base64 n’établit ni les droits d’usage ni la qualité de l’alternative.
Sans image disponible, comparer les variantes textuelles avant de composer.

## Cartes — 30 à 33 et 46

- `30` : article avec vignette ; son titre n’a pas de destination native.
- `31` : article avec vignette et titre cliquable. Sa variante sans image
  exige la capacité dédiée ; charger `references/editorial-template.md` pour ce cas.
- `32` : appel à contribution illustré ; `33` ajoute un bouton.
- `46` : deux cartes d’information dans un seul composant, avec titre de section.

Pour un article par bloc, retenir un bloc d’article indépendant. `46` groupe
deux informations ; il ne respecte pas cette contrainte pour deux articles.
Le nombre de cartes et la structure des colonnes sont ceux du gabarit natif :
aucune grille libre ou colonne arbitraire n’est exposée par le JSON courant.
Observer l’empilement mobile au lieu de le déduire d’une capture bureau.

## Mises en avant — 34 à 36 et 44

- `34` : chiffres clés et liste structurée ; inspecter ses onze champs de texte.
- `35/36` : mise en avant lavande ou grise.
- `44` : chiffre clé et séparateur.

Prendre les chiffres et leur contexte dans le contenu fourni. Réserver la mise
en avant à une information prioritaire ; un encadré par ligne neutralise cette
priorité. Les filets et espacements restent ceux du renderer natif.

## Contacts — 39

Le contact de service rassemble titre, service, département et adresse en texte.
Il ne transforme pas une adresse en action cliquable. Pour une action, choisir
un composant qui expose un champ URL compatible ; inspecter les protocoles
acceptés au lieu de supposer que `mailto:` fonctionne partout.

## Actions — 40 à 43 et 45

- `40/41/42` : boutons primaire, secondaire et tertiaire.
- `43` : lien d’action et lien de texte, avec deux destinations distinctes.
- `45` : invitation à devenir partenaire, avec texte et bouton.

Donner un intitulé qui décrit l’action et une destination HTTPS fournie.
Le bouton primaire matérialise l’action prioritaire ; les autres complètent.
Ces blocs ne sont ni des formulaires, ni des menus déroulants, ni des scripts.
Une demande d’interaction absente produit un prérequis technique explicite.

## Pieds de page — 47 à 51

- `47/48` : identité Marianne ou opérateur en clôture.
- `49` : désabonnement ; `50` : gestion des abonnements ; `51` : clôture en texte.
- `47` à `50` acceptent `mailto:` seulement si le modèle courant le permet.
- Les trois actions ensemble de `50` nécessitent `additionalLinks` ; consulter
  `references/editorial-template.md` pour cette variante et son contrôle de capacités.

Conserver les mentions, destinataires et objets fournis. Une URL valide ne
prouve pas qu’un abonnement est traité. Ne pas activer une action pour tester
la mise en page. Éviter les doublons si identité, mentions et liens sont déjà présents.

## Compositions de départ et assemblage

`presets` lit les départs réellement définis dans `app/source/library-actions.js`.
Les clés actuelles sont `@information`, `@lettre`, `@invitation`. Pour préparer
un squelette natif ou une sélection explicite de blocs :

```sh
node scripts/layouts.cjs seed "$BUILDER" @invitation "Invitation de travail" sortie-neuve
node scripts/layouts.cjs seed "$BUILDER" mail-02,mail-05,mail-19,mail-40,mail-51 "Lettre de travail" autre-sortie
```

Le statut `SQUELETTE` liste les champs à personnaliser. Les trois fichiers sont
au format natif, avec des exemples à remplacer ; ce statut ne vaut pas livraison
éditoriale. Conserver les images d’identité pertinentes et remplacer les médias
de démonstration. Une URL d’exemple ne doit pas survivre dans une édition livrée.

La sélection peut répéter un composant. Pour une autre mise en page, combiner
les blocs détectés selon le contenu, comparer les alternatives, puis appliquer
les contrôles de `references/modes.md`. Un composant absent donne lieu à une transmission
du besoin, des alternatives examinées et d’un critère d’acceptation ; le skill
ne développe aucun composant et ne change pas le builder.

## Vérifier une mise à jour du skill

Depuis la racine du builder, `npm test` exécute les tests du builder et ceux
de ce skill, comme la CI. Par défaut ils exercent ce dépôt ; `BUILDER` désigne
un autre checkout. Les tests unitaires de `tests/layouts.test.cjs` vérifient
les 52 composants, les départs natifs et le format des fichiers.
`tests/builder-contract.test.cjs` éprouve le contrat, y compris ses cas
négatifs. `tests/editorial.test.cjs` couvre la recette validée et son cas
négatif contre un builder antérieur réel, extrait de l’historique Git (ou
désigné par `OLD_BUILDER`).

Le test `tests/layouts-browser.test.cjs` utilise le Playwright du checkout ou
celui indiqué par `PLAYWRIGHT_MODULE` ; ses preuves vont dans
`NEWSLETTER_EVIDENCE` si défini, sinon dans un dossier temporaire. Il crée un
contexte Chromium isolé, hors ligne,
importe tous les blocs, exerce les familles et compare les exports. Son reçu
identifie les variantes, largeurs et thèmes testés. L’installation d’une
dépendance absente n’est pas implicite : nommer ce contrôle comme non exécuté.
