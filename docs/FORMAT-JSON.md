# Structure JSON générique

Le builder importe des **compositions de courriel**, indépendamment de l’outil qui a préparé leur contenu. Le format existant `dsfr-mail/document`, version 1, est conservé : les fichiers de travail déjà exportés restent acceptés. Le format de bibliothèque `dsfr-mail/library` transporte aussi modèles et identités.

Fichiers prêts à utiliser : [exemple importable](../app/distribution/exemple.courriel.json), [schéma JSON](../app/distribution/courriels.schema.json) et [exemples des 52 composants](../app/distribution/qualification.courriels.json). Dans le builder, « Importer du JSON » accepte le texte collé ; « Fichiers et récupération » accepte le fichier. L’import ajoute les compositions et conserve la bibliothèque existante.

## Une composition

```json
{
  "schema": "dsfr-mail/document",
  "version": 1,
  "catalogue": "6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b",
  "id": "exemple-document",
  "name": "Information de service",
  "subject": "Une nouvelle information",
  "blocks": [
    {
      "id": "titre-1",
      "component": "mail-05",
      "values": {"f0": "Titre du courriel"},
      "source": ""
    },
    {
      "id": "texte-1",
      "component": "mail-19",
      "values": {"f0": "Un paragraphe de contenu."},
      "source": "https://exemple.invalid/information"
    }
  ]
}
```

| Champ | Rôle |
| --- | --- |
| `schema`, `version` | Identifient le contrat ; ne pas les remplacer par le nom d’un outil métier. |
| `catalogue` | Empreinte du catalogue pris en charge ; reprendre celle d’un export ou de l’exemple livré. |
| `id`, `name`, `subject` | Identifiant, nom de travail et objet du courriel. |
| `blocks` | Liste ordonnée des blocs ; son ordre définit la mise en page. |
| `component` | Composant et variante du catalogue, par exemple `mail-05` pour le titre principal. |
| `values` | Tous les champs de ce composant, sous forme de chaînes. Le schéma donne leurs noms et libellés. |
| `source` | Lien source HTTPS facultatif, ou chaîne vide ; conservé dans les sorties et après duplication. |

Les identifiants de blocs doivent être uniques dans une composition. Ils peuvent être des chaînes lisibles ; l’import crée de nouveaux identifiants pour fusionner sans collision. Une bibliothèque possède aussi un `activeId` qui désigne sa composition active.

## Décrire la mise en page

Construire la composition avec plusieurs blocs adaptés : en-tête, titre, rubrique, paragraphes, liste, image, action et pied de page. Un composant reste dans sa charte et sa variante. Le builder ne déduit pas cette structure à partir d’un long texte.

Pour produire un JSON avec un autre outil, partir d’un modèle exporté du builder et remplir ses champs. Le schéma contient les 52 définitions de composants, avec leurs libellés et champs ; les exemples par famille permettent de choisir une variante. Les clés `f0`, `f1`, etc. appartiennent au composant indiqué, et ne sont pas interchangeables entre composants.

Les textes restent du texte : aucun HTML ni script fourni par le JSON n’est exécuté. Pour plusieurs paragraphes réorganisables, créer plusieurs blocs. Les images sont incorporées en données PNG, JPEG, GIF ou WebP ; un chemin de fichier ou une URL d’image distante ne convient pas. Pour ajouter un visuel manuellement, utiliser le chargement local dans le builder puis exporter la composition.

## Validation et compatibilité

Le [JSON Schema 2020-12](https://json-schema.org/understanding-json-schema/reference/object) décrit les propriétés requises et refuse les champs inconnus. Il sert aux éditeurs et validateurs ; ne pas ajouter `$schema` au fichier de composition. Le moteur complète ce schéma par les contrôles d’URL, d’identifiants uniques, de composition active et de catalogue.

Un JSON refusé ne remplace pas le travail existant. Une autre version ou un autre catalogue exige une migration explicite ; changer seulement l’empreinte ne convertit pas les données.

À l’import et au chargement d’une nouvelle image, le navigateur contrôle le contenu Base64, le format annoncé et le décodage réel. Chaque image est limitée à **10 Mio de données encodées dans le fichier image**, **8192 pixels par côté** et **16 777 216 pixels au total**. La limite d’octets concerne les données de l’image, avant leur expansion Base64 ; elle ne concerne pas la taille totale de la bibliothèque. Le refus nomme l’image et conserve le fichier original ainsi que le travail déjà présent. Le navigateur peut refuser un fichier plus petit si ses propres capacités de décodage ou de stockage sont dépassées.

Ces contrôles ne redimensionnent aucune image et ne migrent aucun document. Les bibliothèques v1 déjà enregistrées restent lisibles et exportables ; une image ancienne dépassant ces limites nécessite une copie réduite pour un nouvel import. Les modèles et identités importés passent les mêmes contrôles que les compositions.

## Collecte SNUM séparée

Ouvrir [snum.html](../app/distribution/snum.html), coller le paquet V519 ou le bloc complet de Collecte, puis convertir. La page crée une composition de ce même contrat : rubriques, titres d’articles, faits, enseignements, intérêt SNUM et mots-clés sont répartis en blocs. Les remarques de collecte restent hors du courriel.

Exporter la composition JSON puis l’importer dans le builder pour modifier l’identité, le contenu ou les blocs. Le rendu HTML utilise le même moteur dans les deux pages. Le paquet métier SNUM est analysé seulement par cette page dédiée ; le builder reçoit la composition générique.
