# Template éditorial sans image

Charger cette référence pour réutiliser la mise en page validée ou fabriquer
une revue de presse sans image d’article. La recette et les données génériques
sont embarquées ; le rendu reste exclusivement celui du builder détecté.

## Référence visuelle

Un titre bleu directement cliquable par article, en 18 px avec interligne de
26 px ; les métadonnées en gris, en 13 px avec interligne de 20 px. Fond blanc,
filets fins, colonne de lecture alignée sur les rubriques. Conserver l’identité
Marianne du composant d’en-tête lorsqu’elle convient au service émetteur.

Le pied de page regroupe les actions d’abonnement, de désabonnement et de
contact. Elles restent sur une ligne quand la largeur le permet, puis se
replient naturellement sur mobile. Préserver l’ordre et les destinations
fournies ; employer des espaces insécables dans ces intitulés courts.

| Contenu | Composant natif | Remplissage |
|---|---|---|
| Identité | `mail-02` | Service émetteur |
| Titre principal | `mail-05` | Titre de la lettre |
| Date et introduction | `mail-19` | Sous-titre puis introduction |
| Rubrique | `mail-17` | Un titre par rubrique |
| Article | `mail-31` sans image | `f0`, `f1`, `f2`, `f6` vides ; `f3` URL ; `f4` titre ; `f5` métadonnées |
| Mention et signature | `mail-19` | Texte fourni |
| Actions finales | `mail-50` | Première action dans `f1` et `f2`, suivantes dans `additionalLinks` |

Un article correspond à un bloc indépendant. Aucun résumé ni visuel ajouté.
La sélection des couleurs, espacements et tailles appartient au moteur natif :
ne pas retoucher le HTML après export pour simuler cette recette.

## Compatibilité avant fabrication

Depuis le dossier du skill, lancer :

```sh
node scripts/editorial.cjs probe "$BUILDER"
```

Exiger `supported: true` et un code de sortie nul. Le contrôle exécute le modèle
et le rendu pour l’image facultative de `mail-31`, les trois liens de `mail-50`
et les URL `mailto:` du pied de page. L’empreinte du catalogue seule ne prouve
pas ces capacités. Les anciennes livraisons peuvent partager cette empreinte
et refuser les variantes.

En cas d’échec, conserver le portable compatible sauvegardé avec le template
ou rendre le prérequis technique. Le skill ne change ni le modèle ni le rendu
du builder et ne remplace pas silencieusement la mise en page.

## Deux voies de réutilisation

**Dans le builder** : importer `assets/editorial-template.json`, puis utiliser
la duplication native ou l’enregistrement comme modèle, si l’interface le
propose. Remplacer chaque texte, lien et destinataire de démonstration. Observer
l’état enregistré et réexporter avant de conclure à la sauvegarde.

**Depuis un contenu structuré** : copier `assets/editorial-example.json` dans
le dossier privé du chantier et remplacer ses données. Ce fichier décrit
l’entrée de la recette ; ce n’est pas le JSON natif à importer. Chaque article
requiert `title`, `url`, `source`, `date` ; `crd` est un booléen facultatif.
Les sources et dates absentes restent des chaînes vides, sans invention.
Le pied de page contient un à trois objets `{url, label}`. L’exemple inclut
les trois actions ; employer les destinations réellement fournies.

```sh
node scripts/editorial.cjs compose "$BUILDER" contenu.json nouvelle-edition
node scripts/builder-document.cjs validate "$BUILDER" nouvelle-edition/composition.json
```

Le dossier doit être neuf. Il contient `composition.json`, `newsletter.html`
et `newsletter.txt`. Le script conserve l’ordre et les textes ; il construit
les blocs natifs et laisse le modèle valider les URL. Le contrôle des données
et de la compatibilité précède toute écriture. Ne pas réessayer dans un dossier
partiellement écrit après une erreur de système de fichiers.

Reprendre ensuite l’import, le réexport et les contrôles visuels du workflow
commun. Un succès CLI ne prouve pas l’import navigateur ni la réception mail.

Pour vérifier une mise à jour de cette recette, exécuter
`node --test tests/editorial.test.cjs`. Son cas négatif extrait de l’historique
Git un builder antérieur aux capacités éditoriales ; `OLD_BUILDER` peut désigner
un autre checkout ancien. Sans historique ni `OLD_BUILDER`, le test échoue au
lieu d’être ignoré.
