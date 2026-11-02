# Copie enrichie, collage et réception

Charger cette référence pour préparer la reprise dans une messagerie, expliquer
« Copier le courriel », ou évaluer un rendu après collage. Les preuves de
fabrication, de copie, de collage et de réception restent distinctes.

## Choisir la bonne sortie

| Sortie native | Usage | Limite de preuve |
|---|---|---|
| JSON de composition ou bibliothèque | Rééditer, conserver modèles et identités | Ne sert pas de corps de message |
| HTML téléchargé | Archiver et inspecter `Render.exportHtml` : rendu de `Render.html` dont les largeurs sont bornées en ligne | Le client peut supprimer les styles de tête |
| « Copier le courriel » | Préparer le collage enrichi avec HTML et texte | N’établit pas ce que conservera le client destinataire |

Le bouton appelle `Files.copy`, qui utilise `Render.clipboardHtml` et
`Render.plain`. Le premier transforme le HTML natif : bornes de largeur en
styles inline, tableaux et cellules adaptés, images bornées, variantes de logos
fixées pour la copie. Le HTML copié est donc différent du fichier téléchargé.
Les styles Office sont préservés ; la lecture filtrée d’un presse-papiers peut
néanmoins modifier le contenu. Ne pas remplacer le rendu natif par une retouche
manuelle pour masquer un écart.

CONTEXT-POINTER externe : quand le comportement de copie change, lire
`app/source/files.js` et `app/source/render.js` du checkout détecté pour suivre
la commande réelle, puis examiner les tests natifs de présentation et de copie.
Une documentation de version différente ne prouve pas le fonctionnement local.

## Confirmation et avertissements

Avant copie ou téléchargement HTML, inspecter le dialogue éventuel du builder.
Relever les avertissements affichés, les blocs concernés, le poids et le seuil
annoncés par cette version. Des valeurs du catalogue encore présentes et un
poids élevé appellent une décision éditoriale ; un export techniquement possible
ne suffit pas à déclarer la newsletter prête à envoyer.

Utiliser les liens vers les blocs pour corriger dans le brouillon désigné, ou
annuler en conservant son contenu. Pour une démo explicitement fictive, une
confirmation permise par le builder peut être exercée en gardant les alertes
dans le reçu. Pour une édition réelle, corriger dans le mandat courant ; une
acceptation qui change les contraintes de livraison exige l’arbitrage manquant.
Ne pas modifier les seuils, le moteur ou la validation pour obtenir un export.
Une erreur bloquante reste un blocage, même si une autre sortie est disponible.

Après la confirmation de copie, contrôler le message et, si possible, les formats
HTML et texte effectivement produits. Un dialogue fermé n’est pas une preuve de
copie. Après un téléchargement, retrouver et relire le fichier réellement reçu.
Comparer chaque sortie à son rendu natif : le HTML du presse-papiers ne doit pas
être exigé identique au HTML téléchargé.

Pour une recette qui touche le presse-papiers système, préserver son état
antérieur et le restaurer après vérification ; garder la sauvegarde privée hors
des rapports. Capturer seulement le contenu de test identifié. Si la demande
est de préparer le collage de l’utilisateur, conserver la copie demandée et
signaler cet état final au lieu de l’annuler par une restauration automatique.

## Parcours de reprise

1. Valider la composition et garder son JSON ainsi que le HTML natif.
2. Observer l’interface du builder compatible, puis activer « Copier le courriel »
   si la demande couvre cette action. Traiter la confirmation selon la section
   ci-dessus, puis vérifier son message de succès ou d’échec.
   Une permission manquante ou une API absente est un blocage de copie ; les
   fichiers restent disponibles. Ne pas annoncer une copie réussie depuis un
   simple clic ou remplacer le message par du code HTML brut.
3. Si un brouillon dans une messagerie est explicitement demandé, identifier
   le client, sa version ou son environnement observable et la voie de collage.
   Coller comme contenu enrichi dans le corps du brouillon identifié.
   Observer l’état avant et après, conserver l’objet et les contenus existants.
4. Comparer titres, textes, destinations, images, alternatives disponibles,
   colonnes, espacements et pied de page avec le rendu attendu. Observer la
   largeur disponible ; un aperçu du builder n’est pas une preuve de collage.
5. Décrire les écarts et garder le brouillon. Une copie réussie ne donne pas
   l’autorisation d’envoyer. La réception n’est testée qu’après un mandat
   distinct précisant le destinataire et le message de test.

Pour Mélissa/OWA, les libellés et la version de l’interface doivent être observés
avant interaction ; ne pas inventer une procédure depuis son seul nom.
Conserver le statut `NON VÉRIFIÉ` tant que le client cible n’est pas exercé.

## États à rapporter

- `FICHIERS VALIDÉS` : modèle natif et export relus.
- `COPIE CONTRÔLÉE` : commande et formats HTML/texte observés, avec nature du test.
- `COLLAGE SIMULÉ` : HTML injecté dans un récepteur de recette ; aucun client réel exercé.
- `BROUILLON OBSERVÉ` : collage observé dans la messagerie identifiée.
- `RÉCEPTION OBSERVÉE` : message réellement reçu et contrôlé dans un client nommé.

Chaque état doit citer sa preuve, le contenu exercé et sa limite. Un test qui
intercepte l’API Clipboard évite de toucher au presse-papiers de l’utilisateur,
mais ne prouve pas l’API système, ses permissions ni la réception mail.

## Vérification locale du skill

`tests/copy-browser.test.cjs` exerce le bouton natif dans un navigateur isolé,
capture la frontière Clipboard, compare texte, liens et images, puis simule un
récepteur privé de styles de tête. Il inclut les 52 composants et deux variantes
facultatives, ainsi que les cas d’API absente et de refus de copie. Il passe
le contrôle avant copie en vérifiant que tous les avertissements attendus sont
affichés. Il s’exécute avec `npm test`, comme les autres tests du skill.
Ce test qualifie le chemin natif et la simulation, pas une messagerie réelle.
