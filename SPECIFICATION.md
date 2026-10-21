# Atelier autonome de courriels DSFR

Statut : cadrage produit confirmé ; spécification technique de la tranche de faisabilité. La recette détermine ce qui peut être retenu pour l’implémentation complète.

## Résultat métier

Un agent compose un courriel institutionnel à partir des composants disponibles, adapte l’en-tête, le pied de page et le contenu, puis récupère un courriel exploitable dans sa messagerie. La composition et les modèles restent réutilisables sans service distant de données.

Les deux parcours métier annoncés sont Windows avec Firefox vers Outlook installé, et un webmail Mélissa. Les versions, restrictions et le navigateur exact du webmail restent à relever. La cible de portabilité générale est conservée ; aucune compatibilité universelle n’est affirmée.

## Décisions produit

| Domaine | Exigence retenue |
| --- | --- |
| Distribution | Fichier HTML portable dès sa première ouverture ; webapp installable et utilisable hors connexion après préparation. |
| Composition | Ajouter, déplacer, dupliquer et supprimer des blocs ; charte encadrée et variantes maîtrisées. |
| Catalogue final | Tous les composants de courriel existants, sans nouveaux blocs métier spéculatifs. |
| Personnalisation | En-tête, pied de page, identité du service et contenu. |
| Démarrage | Modèles prêts à personnaliser. |
| Entrées | Saisie manuelle et import structuré, dont le paquet SNUM V519. |
| Images | Fichiers locaux, conservés avec la composition et le fichier de travail. |
| Conservation | Bibliothèque locale, sauvegarde automatique, modèles et identités réutilisables ; export/import de fichiers de travail. |
| Sorties | Copier le mail mis en forme et télécharger le HTML autonome. |
| Dépôt | Application séparée dans le dépôt existant ; provenance et version amont explicites. |

## Frontières impératives

- Toutes les écritures restent locales et concernent l’application. Toute éventuelle publication exige un mandat distinct et ne peut viser que son dépôt GitHub.
- Le dépôt officiel et son clone local sont en lecture seule. Aucun fork de contribution, branche officielle, PR ou push amont.
- Le projet SNUM et les changements concurrents du workspace sont préservés.
- Le poste métier fonctionne sans Python ni Node.js. Aucun compte ou service d’IA n’est requis par l’application.
- Les imports ne fournissent aucun code exécutable. Un import invalide ne remplace pas le brouillon courant.
- Un aperçu réussi ne vaut ni mail reçu fidèle ni conformité RGAA.

## Hypothèse technique mise à l’épreuve

Conserver un document de composition versionné, indépendant du DOM et du HTML de sortie. Un moteur pur valide et transforme ce document ; la page gère l’édition et les entrées/sorties. Les deux distributions incorporent exactement les mêmes sources métier.

Le fichier de travail inclut les images. La sauvegarde automatique utilise IndexedDB dans une base explicitement réservée au prototype. Le fichier exporté reste indispensable pour transporter ou sauvegarder indépendamment d’un profil de navigateur. Un échec de stockage est affiché.

La variante web ajoute un manifeste et un Service Worker, sans backend métier. Le fichier portable ne tente aucun enregistrement de Service Worker. Aucun Web Worker de calcul n’est requis en l’absence de blocage mesuré.

## Tranche de faisabilité

Question : un même document de composition peut-il parcourir édition → sauvegarde → fermeture/réouverture → fichier de travail → restauration avec images → rendu → copie/export, en fichier local et en variante web hors connexion ?

Le prototype comporte en-tête/pied de page et trois familles de blocs : paragraphe, image et action. Il peut réordonner, dupliquer et retirer ces blocs. Il possède un seul brouillon automatique. Le catalogue complet, les profils multiples et la bibliothèque complète ne sont donc pas déclarés réalisés par ce prototype.

Le rendu adapté reprend les couleurs, la logique de tableaux de présentation et les ressources du modèle mail officiel ; il ne charge pas le DSFR web dans le message. La validation SNUM est reprise à l’identique ; son rendu historique n’est pas modifié.

Les sources restent modulaires ; les HTML distribués sont assemblés par un générateur déterministe sans dépendance supplémentaire. Les adaptations du rendu sont propres à l’application et identifiées comme telles, sans attribuer une certification à la référence amont.

## Recette et décisions attendues

| Observation nécessaire | Ce qu’elle peut réfuter |
| --- | --- |
| Ouvrir le fichier dans un profil neuf, sans réseau. | Une dépendance cachée ou un démarrage qui exige une visite préalable. |
| Modifier, attendre la sauvegarde, fermer et rouvrir. | Une sauvegarde seulement annoncée ou dépendante de la mémoire de la page. |
| Exporter et restaurer dans un autre profil, avec image. | Un fichier de travail incomplet ou lié au profil d’origine. |
| Importer des données invalides et du contenu ressemblant à du HTML. | Une perte du brouillon courant ou une exécution de contenu. |
| Vérifier le presse-papiers enrichi et le téléchargement réel. | Une copie seulement simulée ou un lien d’export périmé. |
| Recharger la variante web hors connexion après activation du cache. | Une installation de worker sans ressources utilisables. |
| Coller, retoucher, envoyer et lire dans les messageries cibles. | La fidélité supposée des tableaux, styles et images. |

Les derniers essais exigent un opérateur et les postes réels. Aucun accès à une boîte et aucun envoi ne sont autorisés par cette tranche. Leur préparation ne vaut pas exécution.

## Inconnues et angles morts

- Connu : décisions produit, composants de référence, contrat SNUM, dépôt cible et frontières.
- À éprouver : persistance sous `file://`, capacités du presse-papiers, version de Firefox administrée, installation native et restrictions du parc.
- Hypothèse à contredire : deux distributions utilisant le même moteur n’offrent pas nécessairement les mêmes capacités navigateur.
- Scénarios à couvrir ensuite : fermeture pendant une sauvegarde, quota dépassé, changement d’origine, suppression du profil et mise à jour avec brouillon ouvert.

## Critère de fin de cette tranche

Livrer un prototype ouvrable, les sources et leur génération, une recette observée avec versions et preuves, puis conclure sur l’hypothèse et les inconnues restantes. La prochaine réalisation reprend les conclusions utiles, sans convertir automatiquement le prototype en produit complet.
