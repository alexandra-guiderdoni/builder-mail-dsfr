# Builder de courriels DSFR

Spécification et **prototype de faisabilité**, sans qualification de production.

La [recette observée](docs/RECETTE.md) couvre Firefox 156 et Chromium 156 sur macOS : sauvegarde, restauration avec images, exports, copie enrichie et cache après arrêt du serveur. Windows, Outlook, Mélissa et l’installation native restent à qualifier.

Ouvrir [le prototype portable](prototype/distribution/portable.html) par double-clic. Le poste utilisateur ne nécessite aucune installation de dépendance. Le prototype conserve un brouillon dans une base locale portant explicitement son nom ; exporter le fichier de travail pour en disposer indépendamment du navigateur.

Il permet d’éditer un en-tête, des paragraphes, une image locale, une action et un pied de page, puis de sauvegarder, restaurer, copier le mail et télécharger ses deux sorties. L’import SNUM exerce l’adaptation au format générique. Le catalogue complet, la bibliothèque de plusieurs modèles et les profils de service restent dans la [spécification](SPECIFICATION.md), au-delà de cette tranche.

## Utilisation du prototype

1. Charger l’exemple puis modifier les champs et les blocs.
2. Ajouter une image PNG ou JPEG locale et son alternative.
3. Attendre l’indication de sauvegarde ; recharger pour éprouver la restauration.
4. Télécharger la composition, la rouvrir avec « Importer une composition » et contrôler les images.
5. Copier le courriel ou télécharger son HTML. Le résultat dans Outlook et Mélissa nécessite une recette distincte.

Les scénarios guidés permettent aussi de vérifier un import invalide et les exports. Les boutons de déplacement remplacent le glisser-déposer pour le clavier.

## Maintenance locale

Python 3 sert uniquement à générer les livraisons et à servir la variante web pendant la recette :

```sh
python3 scripts/build.py
python3 scripts/build.py --check
python3 -m http.server 8765 --bind 127.0.0.1 --directory prototype/distribution/web
```

La variante web locale se trouve ensuite à `http://127.0.0.1:8765/`. La distribution sur un vrai poste utilise une origine HTTPS autorisée ; localhost est seulement un environnement de développement. L’installation native et les restrictions du parc ne sont pas déduites du fonctionnement du cache.

Sources de vérité : `prototype/source/`, ressources et code repris sous `prototype/reference/`. Les fichiers de `prototype/distribution/` sont générés. Le moteur de rendu est partagé entre les deux sorties ; aucune bibliothèque distante n’est chargée à l’exécution.

## Sources et limites

- [Cadrage source](docs/cadrage-source.md) : choix utilisateur et limites d’autorisation.
- [Spécification](SPECIFICATION.md) : périmètre complet et questions techniques.
- [Recette](docs/RECETTE.md) : observations exécutées et limites.
- `prototype/reference/provenance.json` : origine et empreintes des ressources reprises.

Le dépôt officiel `GouvernementFR/dsfr-mail`, son clone local et le dépôt SNUM restent en lecture seule. Le seul dépôt applicatif concerné est `alexandra-guiderdoni/builder-mail-dsfr`. Aucun push ni envoi de mail ne fait partie de cette tranche.

<!-- PDG-BINARY-ASSET-JUSTIFICATION: les deux PNG de référence sont conservés pour rendre l'exemple et sa régénération autonomes ; les livraisons incorporent les mêmes ressources pour l'usage hors connexion. -->

<!-- PDG-LARGE-FILE-JUSTIFICATION: les deux HTML générés incorporent volontairement le moteur, l'interface et les ressources ; leurs sources restent séparées et bornées. -->
