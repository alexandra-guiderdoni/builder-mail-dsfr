# Atelier de courriels DSFR

Créez vos newsletters aux couleurs de l’État, puis collez-les dans votre messagerie. Sans compte et sans rien installer. L’atelier fonctionne même sans connexion.

**[Ouvrir l’atelier](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/)**

## Deux façons de l’ouvrir

- **En ligne :** ouvrez [l’atelier](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/) dans votre navigateur. Si le navigateur le propose, « Installer l’atelier » l’ajoute à vos applications.
- **En fichier :** [téléchargez l’atelier portable](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/atelier-portable.html), rangez-le dans vos documents, puis ouvrez-le par un double-clic. Il fonctionne sans connexion.

## Créer une newsletter en quatre étapes

Pas à pas et en images : le [guide de prise en main](docs/PRISE-EN-MAIN.md), cinq minutes.

1. **Partez d’un modèle.** Dans « Exemples », choisissez « Créer à partir de cet exemple » : la newsletter est déjà remplie, il ne reste qu’à l’adapter. Pour partir d’un plan vide, choisissez un « Point de départ », puis « Créer une newsletter ».
2. **Remplacez les contenus.** Cliquez sur un bloc pour modifier ses textes, ses liens et ses images (« Depuis mon ordinateur »). « Ajouter un composant » ajoute un bloc.
3. **Relisez l’aperçu** du courriel.
4. **Copiez le courriel.** « Copier le courriel », puis collez dans un nouveau message de votre messagerie (`Ctrl+V`, ou `⌘V` sur Mac). Ajoutez l’objet, puis **envoyez-vous d’abord un test.**

Avant la copie, l’atelier signale ce qui reste à vérifier : textes d’exemple non remplacés, liens de démonstration, « Votre service » à la place du nom de votre service.

## Ne pas perdre votre travail

- **Vos newsletters sont enregistrées automatiquement,** dans ce navigateur et sur ce poste seulement.
- **Gardez-en une copie dans un fichier :** « Exporter Mes newsletters », dans « Sauvegarde et import » en bas de page. Faites-le régulièrement, et toujours avant de changer de poste ou de navigateur. Effacer les données du navigateur efface aussi vos newsletters.
- **Pour les retrouver,** dans « Sauvegarde et import » : « Restaurer une sauvegarde », puis choisissez votre fichier.
- **La version en ligne et le fichier portable ne partagent pas leurs newsletters.** Pour passer de l’un à l’autre, exportez dans l’un, puis, dans l’autre, choisissez « Ajouter une newsletter ou une sauvegarde depuis un fichier ».

## Bon à savoir

- L’atelier n’envoie rien et ne se connecte à aucune messagerie : c’est vous qui collez et envoyez le message.
- L’affichage dans Outlook et dans Mélissa n’est pas encore vérifié dans tous les cas. Le test envoyé à vous-même reste indispensable.
- Un courriel trop lourd peut être coupé par certaines messageries. L’atelier vous prévient et indique quoi alléger.

Pour aller plus loin (modèles, identités de service, images en ligne, plusieurs fenêtres, messages d’erreur) : le [guide d’utilisation](docs/UTILISATION.md).

---

## Pour l’équipe technique

Les distributions sont générées depuis `app/source/`, `app/snum/`, `app/assets/`, `scripts/` et `reference/catalogue.json`. Python 3.10+ et Node.js, dans la version de `.node-version`, servent seulement sur le poste de développement :

```sh
python3 scripts/build_app.py
npm run check
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts
npm test
```

| Besoin | Document |
|---|---|
| État livré, preuves et limites | [Bilan de livraison](docs/ETAT-LIVRAISON.md), [historique des livraisons](CHANGELOG.md) |
| Recettes | [Recette de l’application](docs/RECETTE-APPLICATION.md), [défilements #28](docs/RECETTE-DEFILEMENT.md), [reçu de publication](docs/recette-defilement-publication.json) |
| Accessibilité | [Campagne RGAA](docs/accessibilite/css-20261023/RAPPORT.md), [contrastes](docs/accessibilite/contrastes-20261022/RAPPORT.md), [zoom Firefox](docs/accessibilite/zoom-20261023/RAPPORT.md), [accueil refondu](docs/accessibilite/accueil-20261103/RAPPORT.md) |
| Maintenance | [Sources, prérequis, stockage, mises à jour](docs/MAINTENANCE.md) |
| Format des fichiers | [Format JSON générique](docs/FORMAT-JSON.md), [exemple importable](app/distribution/exemple.courriel.json), [schéma](app/distribution/courriels.schema.json) |
| Recette métier | [Bibliothèque des neuf familles](app/distribution/qualification.courriels.json), avec les 52 sections à examiner dans les messages reçus |
| Collecte SNUM | [Page autonome](app/distribution/snum.html) : convertit le paquet métier en fichier à importer dans l’atelier |
| Skill d’agent | [`newsletter-contribution`](.claude/skills/newsletter-contribution/SKILL.md) ; ses tests vérifient son contrat avec l’atelier (`assets/builder-contract.json`), à mettre à jour dans le même commit qu’une évolution qui le casse |
| Intention et contraintes | [Cadrage](docs/cadrage-source.md), [spécification](SPECIFICATION.md), [suivi des critères](docs/SUIVI-APPLICATION.md), [notice des références](reference/NOTICE.md) |
| Prototype conservé | [Fichier](prototype/distribution/portable.html) et [recette historique](docs/RECETTE.md) |

Le dépôt officiel du modèle de courriel, son clone de référence et le projet SNUM restent en lecture seule. La publication autorisée concerne uniquement `main` de ce dépôt ; aucun déploiement sur le parc n’en découle.

<!-- PDG-LARGE-FILE-JUSTIFICATION: les distributions HTML incorporent le moteur, le catalogue et les ressources pour le premier démarrage hors connexion ; le gabarit amont est conservé intégralement comme référence vérifiable. Les sources applicatives restent modulaires. -->

<!-- PDG-BINARY-ASSET-JUSTIFICATION: quatre images amont et les icônes locales rendent la génération et la distribution indépendantes du réseau. -->
