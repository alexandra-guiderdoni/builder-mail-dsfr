# Balisage HTML : trois causes corrigées, qualification RGAA ouverte

Échantillon : P01 webapp, P02 portable, P03 convertisseur SNUM et P04 à P13, dix compositions de qualification couvrant les 52 composants. Les 20 scènes AY11 ajoutent éditeur ouvert, panneaux dépliés, saisie invalide, dialogue, dialogue invalide, SNUM invalide et SNUM converti. Le serveur de collecte utilise temporairement `http://127.0.0.1:4196/`, `/portable.html`, `/snum.html` et `/mail/01.html` à `/mail/10.html` ; ce sont des adresses de recette, distinctes de la publication HTTPS. Les fichiers exacts sont conservés dans les preuves locales.

**Objectif maintenu : démontrer 100 % des critères RGAA applicables. Aucun taux officiel validé.** Trois causes de balisage invalide sont corrigées dans le rendu dérivé. Le validateur conserve des erreurs résiduelles : le test 8.2.1 et les qualifications humaines restent ouverts.

## Constat et correctif

Le [test officiel 8.2.1](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#8.2.1) demande un balisage correctement écrit et imbriqué, avec ouverture et fermeture appropriées et sans duplication d’identifiant ou d’attribut. Un contrôle local Nu HTML Checker complète les sondes AY11 ; il ne devient pas une qualification humaine.

| Cause reproduite | Correction dans le rendu dérivé | Garde |
|---|---|---|
| mail-06 : `height="auto"` sur une image | Hauteur automatique portée par CSS ; attribut HTML retiré | Dimensions numériques conservées ; CSS préexistant garde sa priorité |
| mail-33 : `width=""` produit `width:;` | Dimension vide omise sans déclaration CSS invalide | Valeur inconnue non vide refusée |
| mail-46 : deux attributs `colpos` résiduels | Attributs retirés après contrôle de leur signature | Tableaux et ordre gauche/droite vérifiés |

La compilation exige les trois signatures exactes de la référence épinglée. Sa reconnaissance des dimensions est bornée à ce catalogue : ce n’est pas un validateur universel de toute syntaxe CSS ou de tout élément HTML. Les quatre mutations négatives sont refusées. Le catalogue canonique, son empreinte, les 178 champs et les fichiers JSON existants restent inchangés. Aucun dépôt officiel ni AY11 n’a été modifié.

## Vérifications actuelles

Le [reçu et les empreintes](recu-20261023.json), les [observations](observations.json) et la [matrice structurée](matrice-rgaa.json) rattachent les résultats aux sources actuelles. Les chemins sous `evidence/` sont des preuves brutes locales ignorées par Git ; leurs empreintes sont partageables.

| Contrôle | Résultat observé | Limite |
|---|---|---|
| Suite applicative | 106 tests réussis, aucun échec, saut ou annulation | Scénarios automatisés, aucune qualification humaine |
| Catalogue | 1 248 cas de rendu et copie des 52 composants | Aucun rendu reçu en messagerie de cette version |
| Comparaison historique | 156 titres, textes et déclarations Office conservés ; HTML identique pour 49 composants et modifié pour les trois composants qualifiés | Parseur DOM pour les titres ; ouverture réelle des téléchargements dans les parcours distincts |
| Comparaison visuelle | 324 paires identiques en pixels, géométrie, couleurs calculées et contenu | Trois composants, neuf largeurs, clair/sombre, contenus normaux/longs avec image remplacée, HTML/aperçu/copie sans styles de tête ; aucun client mail |
| Audit navigateur | 11 états, zéro violation axe détectée et zéro erreur JavaScript | Résultats incomplets conservés ; contournement CSP d’injection axe déclaré |
| AY11 | 1 160 commandes terminées sans erreur, 20 scènes et 57 variantes exactes | 20 indisponibilités de candidats statiques explicites ; commande réussie ne vaut pas test RGAA validé |
| Contrastes | 80 observations renouvelées et cinq contrôles négatifs détectés | [Protocole et angles morts](../contrastes-20261022/RAPPORT.md), aucune qualification globale des couleurs |
| Firefox natif sur Mac | Parcours complet et trois téléchargements de titre réellement ouverts | Aucun lecteur d’écran écouté, Windows ou client mail |
| Applicabilité | 21 documents inventoriés et six capacités décrites | Aucune absence de cible transformée en non-applicabilité |

La comparaison historique utilise la distribution du commit `bb4d70dbde59153c6ccae866e2b765e6e59290a4`. Les trois objets par composant donnent 156 cas : les neuf HTML modifiés correspondent exactement aux trois composants corrigés. Les comparaisons visuelles rendent le HTML d’aperçu dans une page isolée ; l’intégration dans le cadre sandboxé est exercée séparément par la suite. La copie comparée est une chaîne HTML rendue sans styles de tête ; elle ne constitue ni collage dans une messagerie ni qualification Outlook. Les parcours de presse-papiers réels restent ceux des tests applicatifs et de Firefox.

## Validateur sans filtrage

Nu HTML Checker **26.9.16 (e63d468)**, déjà installé, examine 148 entrées avant et après : trois distributions, 104 sorties HTML et aperçu des 52 composants, 11 DOM d’interface, dix exports de compositions et 20 DOM AY11. Les sources servies et les DOM après JavaScript sont distingués ; les cadres sont instruits par leurs sorties autonomes et leurs parcours de navigateur distincts. Aucun document n’a été envoyé à un validateur distant.

Les signalements d’erreur passent de **4 672 à 4 656**. Les 16 occurrences retirées correspondent aux trois causes : quatre hauteurs, quatre largeurs CSS et huit attributs `colpos`, observés sur plusieurs sorties. Ce ne sont pas 16 causes distinctes. Les fichiers d’interface et leurs DOM capturés n’ont aucune erreur vnu détectée dans ces entrées.

**Neuf familles d’erreurs subsistent**, dont les espaces de noms Office et des déclarations CSS `mso-*`, `supported-color-schemes` et `font-color`. Elles restent dans les résultats bruts ; aucun filtre ni code de sortie forcé n’est utilisé, et le processus conserve son **code 1**. La compatibilité mail ne constitue pas ici une dispense de conformité. Chaque signalement résiduel reste à instruire contre le référentiel et les contraintes des clients.

Les informations du validateur, notamment sur des titres vides ou la CSP, sont également conservées. Elles proviennent d’une analyse statique des fichiers soumis ; elles ne démontrent ni blocage réel du programme ni absence d’erreur dans un état non exercé. Les traces du navigateur restent des preuves distinctes.

`font-color` est une propriété inconnue. Quatorze règles possèdent aussi une déclaration standard `color` ; la règle du corps n’en possède pas. Un remplacement global peut changer la cascade et les contrastes en mode sombre. Cette analyse reste une suite du chantier, sans correction silencieuse ni suppression des propriétés Office.

## Matrices, erreurs conservées et limites

Les [106 critères](MATRICE-106.md) et [258 tests](MATRICE-258.md) conservent 1 127 observations par instance : 365 formulaires, 80 contrastes, 45 liens, 165 titres, 148 entrées vnu et 324 comparaisons visuelles. Les 1 220 observations de critère AY11 restent distinctes des tests. Les critères sont répartis en **101 `NON_TESTE` et cinq `A_RETESTER`** (6.2, 8.2, 8.6, 9.1 et 10.1). Aucun nouveau conforme ou non applicable n’est confirmé ; le taux reste `null`.

Les quatre nouvelles régressions échouaient avant correction. Un premier contrôle de priorité CSS exigeait une adjacence injustifiée entre déclarations ; il vérifie désormais leur ordre réel. La première suite complète avait 105 réussites sur 106 : un ancien test exigeait l’attribut invalide `height="auto"`. Il contrôle maintenant la hauteur CSS, le ratio et les dimensions de l’image, avec la référence canonique toujours vérifiée par empreinte. Ces échecs restent conservés ; la suite terminale passe à 106/106 sans saut.

La [campagne précédente](../titre-page-20261023/RAPPORT.md) reste figée. La nouvelle matrice renouvelle les formulaires, contrastes, liens et titres sur les sources corrigées, puis ajoute les preuves de balisage et de non-régression.

## Contre-revue et publication

Astra donne **GO technique, documentaire et PDV pour la publication personnelle**. Le vérificateur a été relancé, puis le différentiel vnu et le manifeste ont été recomptés indépendamment : 26 sources, dix scripts et 3 306 artefacts concordants, 1 127 pointeurs résolus, 86 liens locaux valides, 20 ensembles exacts de 57 variantes. Les 16 occurrences corrigées et les neuf familles restantes sont confirmées sans filtre ni modification du code de sortie. Aucun navigateur ni lecteur d’écran n’a été exécuté par cette contre-revue ; elle ne qualifie pas le RGAA global.

La recette publique de cette version reste une preuve distincte à joindre après le déploiement terminal et le contrôle des octets servis.

Personne n’est disponible pour les qualifications manuelles et les essais vocaux ; aucun poste Windows n’est disponible. Les issues #2 et #13 restent ouvertes, avec la pertinence éditoriale, les décisions exhaustives d’applicabilité, l’installation sur le parc et l’autorisation métier d’accès à l’origine publique. Un arbre d’accessibilité et un GO technique ne prouvent aucune annonce vocale. L’objectif à 100 % n’est pas atteint.
