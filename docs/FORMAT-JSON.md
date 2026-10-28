# Structure JSON générique

Le builder importe des **compositions de courriel**, indépendamment de l’outil qui a préparé leur contenu. Le format existant `dsfr-mail/document`, version 1, est conservé : les fichiers de travail déjà exportés restent acceptés. Le format de bibliothèque `dsfr-mail/library` transporte aussi modèles et identités.

`subject` accepte toujours une chaîne vide ou blanche ; `name` reste obligatoire et non blanc. Le rendu utilise `name` comme titre de page HTML quand `subject` est vide après suppression des espaces. Ce repli laisse les champs JSON inchangés. Un objet renseigné reste le titre prioritaire ; le nom de travail peut donc devenir visible dans les métadonnées de l’export si l’objet est vide.

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
      "source": "https://exemple.invalid/information",
      "sourceLabel": "Lire le dossier complet"
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
| `sourceLabel` | Chaîne facultative : intitulé du lien source. Absent, vide ou composé d’espaces, affiche « Consulter la source ». Sans URL, reste enregistré sans produire de lien. |

Les identifiants de blocs doivent être uniques dans une composition. Ils peuvent être des chaînes lisibles ; l’import crée de nouveaux identifiants pour fusionner sans collision. Une bibliothèque possède aussi un `activeId` qui désigne sa composition active.

## Décrire la mise en page

Construire la composition avec plusieurs blocs adaptés : en-tête, titre, rubrique, paragraphes, liste, image, action et pied de page. Un composant reste dans sa charte et sa variante. Le builder ne déduit pas cette structure à partir d’un long texte.

Pour produire un JSON avec un autre outil, partir d’un modèle exporté du builder et remplir ses champs. Le schéma contient les 52 définitions de composants, avec leurs libellés et champs ; les exemples par famille permettent de choisir une variante. Les clés `f0`, `f1`, etc. appartiennent au composant indiqué, et ne sont pas interchangeables entre composants.

Les textes restent du texte : aucun HTML ni script fourni par le JSON n’est exécuté. Pour plusieurs paragraphes réorganisables, créer plusieurs blocs. Les images sont incorporées en données PNG, JPEG, GIF ou WebP ; un chemin de fichier ou une URL distante ne convient pas dans `values`. Pour ajouter un visuel manuellement, utiliser le chargement local dans le builder puis exporter la composition.

## Variantes éditoriales

Le seul champ image `mail-31.values.f0` accepte une chaîne vide pour un article
sans vignette. Son alternative `f1` est vidée par le bouton de retrait. Le titre
`f4` et sa destination HTTPS `f3` restent dans le même composant ; `f5` peut
contenir les métadonnées. Les textes facultatifs `f2` et `f6` restent rendus
lorsqu’ils sont renseignés. Les autres champs image conservent leurs contrôles.

Le seul composant `mail-50` accepte la propriété facultative `additionalLinks`,
une liste de zéro à deux objets stricts `{ "url": "…", "label": "…" }`.
Le premier lien reste dans `values.f1` et `values.f2`. Sans propriété ou avec
une liste vide, le rendu antérieur est conservé. Chaque lien supplémentaire
doit avoir un intitulé avant une sortie HTML ; les caractères de contrôle sont
refusés dans cet intitulé.

Les URL des pieds de page `mail-47` à `mail-50` acceptent HTTPS et `mailto:`
vers une adresse ASCII unique, avec le seul paramètre facultatif `subject`.
Les liens `source` et les autres composants restent limités à HTTPS.

Ces variantes conservent la version 1 et l’empreinte du catalogue. L’atelier
lit les compositions anciennes et conserve leur rendu par défaut. Les anciennes
versions peuvent refuser `additionalLinks`, une image vide dans `mail-31`, ou
les liens `mailto:` : employer l’atelier à jour, dans sa variante web ou
portable, pour ouvrir ces fichiers.

## Validation et compatibilité

Le [JSON Schema 2020-12](https://json-schema.org/understanding-json-schema/reference/object) décrit les propriétés requises et refuse les champs inconnus. Il sert aux éditeurs et validateurs ; ne pas ajouter `$schema` au fichier de composition. Le moteur complète ce schéma par les contrôles d’URL, d’identifiants uniques, de composition active et de catalogue.

Un JSON refusé ne remplace pas le travail existant. Une autre version ou un autre catalogue exige une migration explicite ; changer seulement l’empreinte ne convertit pas les données.

La validation des données et la préparation à la diffusion sont distinctes. Les anciens JSON contenant un texte vide restent acceptés et récupérables. Les 13 champs qui servent d’intitulé aux liens intégrés au catalogue doivent cependant être renseignés avant copie ou téléchargement HTML. L’aperçu les signale sans activer leur lien ; leur correction ne change ni le format, ni sa version, ni l’empreinte du catalogue. Cette obligation ne concerne pas `sourceLabel`, qui possède son texte par défaut.

L’ajout facultatif de `sourceLabel` conserve la version 1, le catalogue et la base locale. Cette livraison lit les anciens fichiers sans les réécrire pour ajouter ce champ. Les anciennes livraisons qui refusent les propriétés inconnues ne lisent pas un fichier contenant `sourceLabel` : utiliser le builder à jour pour ces fichiers. L’intitulé est du texte échappé dans le HTML et accompagne l’URL dans la version texte du courriel.

À l’import et au chargement d’une nouvelle image, le navigateur contrôle le contenu Base64, le format annoncé et le décodage réel. Chaque image est limitée à **10 Mio de données encodées dans le fichier image**, **8192 pixels par côté** et **16 777 216 pixels au total**. La limite d’octets concerne les données de l’image, avant leur expansion Base64 ; elle ne concerne pas la taille totale de la bibliothèque. Le refus nomme l’image et conserve le fichier original ainsi que le travail déjà présent. Le navigateur peut refuser un fichier plus petit si ses propres capacités de décodage ou de stockage sont dépassées.

Ces contrôles ne redimensionnent aucune image et ne migrent aucun document : un fichier importé garde ses images octet pour octet. Seul le chargement d’une nouvelle image locale dans l’éditeur la réduit et la recompresse, selon le contrat décrit dans [le guide d’utilisation](UTILISATION.md#images-et-identité-du-service). Les bibliothèques v1 déjà enregistrées restent lisibles et exportables ; une image ancienne dépassant ces limites nécessite une copie réduite pour un nouvel import. Les modèles et identités importés passent les mêmes contrôles que les compositions.

## Collecte SNUM séparée

Ouvrir [snum.html](../app/distribution/snum.html), coller le paquet V519 ou le bloc complet de Collecte, puis convertir. La page crée une composition de ce même contrat : rubriques, titres d’articles, faits, enseignements, intérêt SNUM et mots-clés sont répartis en blocs. Les remarques de collecte restent hors du courriel.

Exporter la composition JSON puis l’importer dans le builder pour modifier l’identité, le contenu ou les blocs. Le rendu HTML utilise le même moteur dans les deux pages. Le paquet métier SNUM est analysé seulement par cette page dédiée ; le builder reçoit la composition générique.


## Références d’images HTTPS — version 2 (#192)

Les fichiers v1 ne changent pas. Un bloc peut sélectionner une source distante via `remoteImages`, objet non vide dont les clés sont exclusivement celles de ses champs image : par exemple `"remoteImages": {"f0": "https://images.example.org/logo.png"}`. La valeur `values.f0` garde l’image locale de repli, soumise aux limites et contrôles habituels. Ne pas mettre l’URL dans `values`. Seul le champ facultatif image de mail-31 peut avoir un repli vide.

Toute composition portant un tel bloc est en version 2. Une bibliothèque contenant une composition, un modèle ou une identité distante est en version 2 ; ses compositions locales restent en version 1. Les identités n’ont pas de champ version autonome. Une version 2 sans aucune référence distante est refusée, comme une version 1 contenant `remoteImages`. Les écrivains de l’application reviennent à v1 lorsque toutes les références ont été retirées. Le schéma livré décrit ces alternatives fermées.

Les URL doivent être HTTPS, avec hôte et sans identifiants, contrôles ou syntaxe ambiguë ; les règles des autres URL du modèle restent appliquées. L’import valide la structure et les images locales, sans imposer la disponibilité du serveur distant : une panne ne doit pas rendre une bibliothèque entière irrécupérable. L’ouverture peut en revanche demander ces images pour l’aperçu. Ni copie ni export ne téléchargent ou ne réincorporent la référence. Les anciennes distributions refusent v2 avant tout remplacement ; test de compatibilité avec la vraie distribution 09eff89 conservé dans les fixtures.
