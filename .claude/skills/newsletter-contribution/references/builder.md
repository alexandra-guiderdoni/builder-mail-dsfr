# Utiliser le contrat du builder

Charger cette référence pour accompagner les choix de champs ou fabriquer un
document. Exécuter les commandes depuis le dossier du skill ; `BUILDER` désigne
le checkout exercé, par défaut la racine du dépôt qui contient ce skill
(`BUILDER="$(git rev-parse --show-toplevel)"`). Dépendances : Node.js 18+ et
Python 3, sans paquet supplémentaire. Le checkout est du code de confiance
exécuté localement.

## Sources de vérité

Le script lit `scripts/catalogue.py`, `app/source/model.js` et
`app/source/render.js` du checkout fourni. Le catalogue compile les gabarits
canoniques et les ressources incorporées. Refaire l'inspection après une
mise à jour ; une empreinte de catalogue différente exige la migration native,
pas le remplacement manuel de son identifiant.

`layouts.cjs audit` rapproche le checkout de `assets/builder-contract.json`,
contrat de ce skill comme consommateur du builder : structure de chaque
composant (clés et types de champs, gabarits, titres, liens, nom du composant),
fonctions `Model` et `Render` utilisées, versions de composition acceptées et
attribuées. Les libellés et valeurs par défaut des champs, et les styles, n’en
font pas partie : les changer ne modifie pas ce que le skill remplit. Un inventaire complet peut
coexister avec un contrat modifié : dans ce cas, `validate`, `render`, `seed` et
`compose` refusent la fabrication. Les tests du skill tournent dans la CI du
builder ; pour une évolution voulue, examiner l’écart signalé, mettre à jour les
références concernées, puis le contrat avec
`node scripts/builder-contract.cjs current "$BUILDER"`, dans le même commit.
Ne jamais l’actualiser pour seulement faire passer les tests.

CONTEXT-POINTER externe : pour comprendre une erreur d'import ou un changement
de version, lire `app/source/imports.js` et les tests correspondants du checkout
au moment de l'erreur, puis utiliser son entrée de migration ou d'import.
Pour la sauvegarde d'une bibliothèque, lire `app/source/library-actions.js`
avant d'agir ; conserver l'export complet si des données existent déjà.

## Champs et adaptations

- `text` : texte brut ; les retours de ligne sont rendus, le HTML est échappé.
- `url` : HTTPS complet sans identifiant. Les livraisons prenant en charge
  `mailto:` l'acceptent uniquement dans les champs URL des pieds de page
  `mail-47` à `mail-50`, vers une adresse ASCII avec `subject` facultatif.
  Inspecter le modèle du checkout : les anciennes livraisons refusent ce cas.
- `image` : PNG, JPEG, GIF ou WebP incorporé dans `values` ; validation réelle
  au décodage lors de l'import. Une référence `cid:` ou une URL de session ne
  remplace pas une image disponible. Utiliser uniquement un asset pertinent et
  autorisé.
- Image distante : `remoteImages` associe une clé de champ `image` du bloc à
  une adresse HTTPS directe, sans identifiant (`{"f0": "https://…/visuel.png"}`).
  Elle remplace l’image incorporée au rendu ; `values` garde l’image locale
  pour revenir en arrière. Une composition qui en contient est en version 2,
  sans en contenir en version 1 : appeler `Model.versions(doc)` après la
  modification, sinon `Model.document` refuse le fichier. L’image n’est ni
  incorporée ni archivée : l’hébergeur reçoit une requête à chaque affichage,
  le poids distant n’est pas mesuré et la lecture hors connexion la perd.
  N’utiliser qu’une adresse publique fournie ou autorisée ; un builder
  antérieur refuse la version 2.
  La variante éditoriale de `mail-31` accepte `f0` vide seulement dans les
  versions compatibles ; vérifier avec `scripts/editorial.cjs probe`.
- `alt` : alternative utile, vide pour une image décorative selon son contexte.
- `source` et `sourceLabel` : lien HTTPS facultatif du bloc et son intitulé.
  Ajoutent un lien source au bloc. Pour un article au titre directement cliquable,
  suivre plutôt `references/editorial-template.md` et sa variante native.

`mail-50.additionalLinks` accepte au plus deux objets `{url, label}` dans les
versions compatibles. La première action reste dans `values.f1` et `values.f2`.
Le contrôle `probe` vérifie le rendu de ces liens, pas seulement le schéma.

Inspecter les clés `fields`, `headings`, `links` avant de remplir un bloc.
Les valeurs par défaut sont des exemples à remplacer ou à supprimer.
Vérifier les liens obligatoires des pieds de page : aucun lien factice pour
faire accepter un composant. Si une adresse électronique est fournie, vérifier
le support `mailto:` avant de remplir le pied de page natif. S'il manque,
nommer le prérequis technique et demander le mandat correspondant ; conserver
les adresses en texte seulement comme proposition explicite. Un lien valide
ne prouve pas le traitement réel d'un abonnement ou désabonnement.

## Exemple minimal exécutable

Créer un fichier local `exemple.cjs` contenant ce code, après inspection des
trois composants indiqués. Depuis le dossier du skill :

```javascript
const fs = require('node:fs');
const {loadBuilder} = require('./scripts/builder-document.cjs');
const {Model: M} = loadBuilder(process.env.BUILDER);
const doc = M.create('Lettre de démonstration', [5, 13, 25]);
doc.blocks[0].values.f0 = 'Lettre de démonstration';
doc.blocks[1].values.f0 = 'Actualités';
const article = doc.blocks[2];
article.values.f0 = 'Titre fourni';
article.values.f1 = 'Source et date fournies';
article.source = 'https://www.numerique.gouv.fr/';
article.sourceLabel = 'Consulter la source';
fs.writeFileSync('exemple.json', JSON.stringify(doc, null, 2), {flag: 'wx', mode: 0o600});
```

```sh
node exemple.cjs
node scripts/builder-document.cjs validate "$BUILDER" exemple.json
node scripts/builder-document.cjs render "$BUILDER" exemple.json exemple-sortie
```

Résultat : un titre principal, une section, un article et une destination.
`validate` reste en lecture seule ; `render` crée un dossier neuf contenant
JSON, HTML et texte. Il refuse l'écrasement. Une sortie partielle après une
erreur reste à inspecter, sans relancer dans le même dossier.

## Qualification finale

Comparer les textes et liens à l'inventaire, importer dans le builder,
observer les images et l'aperçu, réexporter et contrôler les titres et la
lisibilité mobile. Garder les données internes dans un dossier ignoré ou privé.
Les essais de transport et de retouche sont distincts : nommer le client,
sa version, la voie d'insertion et la réception observée avant de conclure.
Pour « Copier le courriel », suivre `references/copy-and-reception.md` :
le bouton prépare un autre HTML que le téléchargement, accompagné du texte.
