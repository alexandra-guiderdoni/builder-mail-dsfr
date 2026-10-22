# Audit RGAA : titre HTML et campagne renouvelée

Objectif maintenu : démontrer 100 % des critères RGAA applicables. **Aucun taux de conformité validé.** La correction technique du titre de page est vérifiée ; sa pertinence éditoriale et les qualifications humaines restent ouvertes.

## Correction et preuves avant/après

Un objet vide ou blanc produisait un élément `title` vide dans le HTML autonome. Le candidat relève de la pertinence du titre ([test officiel 8.6.1](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#8.6.1)), sans conclure à une absence de balise. Le rendu utilise désormais le nom obligatoire de la composition quand l’objet est vide après suppression des espaces. L’objet renseigné reste prioritaire et le titre est échappé. Le nom peut donc apparaître dans l’onglet du fichier exporté ; l’aide visible associée au champ Objet l’explique.

Les fichiers JSON, l’objet, le catalogue et les contenus du courriel restent inchangés. La comparaison avec la distribution du commit `99f8ec6fa8a7b035e654c6dde0b75b41642bec13` couvre 156 cas : trois objets pour chacun des 52 composants. Le corps, le texte brut et le HTML hors titre sont identiques dans chaque cas. Les objets renseignés conservent aussi leur titre et leur HTML exacts. Ce contrôle de génération ne vaut pas ouverture de chacun des 156 exports.

Les nouveaux tests ouvrent des téléchargements réels dans Chromium et Firefox natif : objet vide, blanc et renseigné. Ils vérifient l’aperçu isolé, l’export, la récupération JSON sans mutation et l’aide associée. Le parcours SNUM normal est exercé ; son cas négatif d’objet vide est explicitement injecté à la frontière du convertisseur, sans prétendre représenter une collecte métier normale.

La copie produit un titre correct et la lecture brute du presse-papiers Chromium le conserve. **La lecture filtrée le retire dans les trois cas mesurés.** Aucun essai de collage dans une messagerie ni envoi de cette version n’a été réalisé. Le titre généré, le contenu de presse-papiers et le résultat transformé par une messagerie sont des preuves distinctes.

## Campagne actuelle

Le [reçu et les empreintes](recu-20261023.json) permettent de rapprocher les sources, scripts et artefacts locaux. Les chemins sous `evidence/` désignent les preuves brutes locales ignorées par Git ; les matrices et reçus partageables sont versionnés ici.

| Contrôle | Résultat observé | Limite |
|---|---|---|
| Suite applicative complète | 102 tests réussis ; aucun échec, saut ou annulation ; dont cinq nouveaux tests de titre | Scénarios automatisés, pas qualification humaine |
| Régression du catalogue | 1 248 cas de rendu et copie ; comparaison historique supplémentaire de 156 titres | Rendu reçu en messagerie non exercé |
| Audit navigateur | 11 états, zéro violation axe détectée et zéro erreur JavaScript | Résultats incomplets conservés ; injection axe avec contournement CSP déclaré |
| AY11 | 1 160 commandes terminées sans erreur : 20 captures et 57 variantes sur 20 scènes | 20 collecteurs de candidats statiques indisponibles sont conservés comme tels |
| Contrastes | 80 observations renouvelées : 74 mesures et six constats d’inactivité modale ; cinq contrôles négatifs détectés | [Protocole et angles morts](../contrastes-20261022/RAPPORT.md), aucune conformité globale des couleurs |
| Firefox natif | Parcours complet et trois téléchargements de titre ouverts | Profil isolé sur Mac, aucune écoute de lecteur d’écran |
| Applicabilité | 21 documents capturés inventoriés, six capacités décrites | Aucune décision finale de non-applicabilité déduite d’une absence de cible |

Les matrices des [106 critères](MATRICE-106.md) et des [258 tests](MATRICE-258.md) conservent **655 observations par instance**, dont 165 nouvelles pour les titres, ainsi que 1 220 observations de critère AY11. Ces observations ne qualifient pas à elles seules un test sur toutes les pages et tous les états. Les 106 critères restent répartis en 102 `NON_TESTE` et quatre `A_RETESTER` (6.2, 8.6, 9.1 et 10.1). Le taux officiel est `null`.

La [matrice structurée](matrice-rgaa.json) garde les constats historiques et les pointeurs avant/après. Les formulaires, liens et contrastes sont renouvelés sur les sources actuelles ; les 165 [observations de titre](observations.json) distinguent parseur, navigateur instrumenté et Firefox natif. Un titre non vide ne démontre pas qu’il est pertinent.

Les cinq tests de titre ont d’abord échoué avant correction. Les essais intermédiaires conservent les erreurs du harnais : attente inadaptée dans `head`, URL relative de téléchargement et confusion entre lecture brute et filtrée du presse-papiers. Le contrôle final exige strictement le titre attendu en lecture brute et consigne séparément la lecture filtrée ; aucun échec d’outillage n’est présenté comme une réussite produit.

## Qualifications restantes

Personne n’est disponible pour les vérifications manuelles ou les essais de lecteur d’écran réellement écoutés. Aucun poste Windows n’est disponible. Ces moyens manquants restent explicites, sans diminuer l’objectif. Les annonces après déplacement, duplication ou suppression d’un bloc restent non qualifiées (#2) ; la qualification Windows/Firefox/Outlook et les essais de messagerie manquants restent ouverts (#13). L’installation sur le parc et l’autorisation d’accès à l’origine publique ne sont pas déduites de GitHub Pages.

Il reste à qualifier par instance les décisions d’applicabilité, alternatives, pertinence des intitulés et des titres, ordre de lecture, restitution, états dynamiques et contrôles perceptifs. L’arbre d’accessibilité, les parcours clavier scriptés et les sondes ne prouvent aucune annonce vocale. Aucun critère n’est déclaré conforme ou non applicable dans cette tranche.

La [campagne précédente](../liens-20261023/RAPPORT.md) et ses échecs restent figés. Les sources AY11 et les dépôts officiels n’ont pas été modifiés.

## Contre-revue et publication

Astra donne **GO technique, documentaire et PDV pour la publication personnelle**. Elle a relancé le vérificateur et contrôlé les correspondances du manifeste ainsi que l’intégration des 165 nouvelles observations : 26 sources, huit scripts et 3 085 artefacts concordants, 655 pointeurs résolus et 85 liens locaux valides. La réserve sur la couverture exacte des variantes est levée. Cette contre-revue n’a exécuté aucun navigateur ni écoute de lecteur d’écran et ne qualifie pas le RGAA global.

La recette publique de cette nouvelle version reste une preuve distincte, à joindre après le déploiement terminal et la vérification des octets servis.
