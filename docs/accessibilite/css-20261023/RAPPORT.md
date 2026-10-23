# CSS des courriels : propriété inconnue retirée, qualification RGAA ouverte

Échantillon : P01 webapp, P02 portable, P03 convertisseur SNUM et P04 à P13, dix compositions couvrant les 52 composants. Les 20 scènes AY11 ajoutent éditeur, panneaux dépliés, saisie invalide, dialogues et erreurs SNUM. La recette utilise temporairement `http://127.0.0.1:4197/`, `/portable.html`, `/snum.html` et `/mail/01.html` à `/mail/10.html`, avec des données synthétiques ; cette origine locale est distincte de la publication HTTPS.

**Objectif maintenu : démontrer 100 % des critères RGAA applicables. Aucun taux officiel validé.** La [campagne précédente](../html-20261023/RAPPORT.md) reste figée. Cette tranche retire quinze déclarations `font-color` invalides du seul CSS dérivé, sans les remplacer par `color`.

Le [complément de zoom natif](../zoom-20261023/RAPPORT.md), sur les mêmes octets produit, ajoute 245 observations Firefox et les preuves des tests 10.4.1 et 10.4.2. Il complète la simulation de viewport ci-dessous sans la requalifier rétroactivement ; les matrices restent ouvertes.

Le [complément de balisage 8.2.1](BALISAGE-8.2.1.md) examine 393 entrées, les cinq conditions officielles et les limites éprouvées du parsing. Il conserve séparément neuf familles dans le résultat brut, dont 245 doctypes omis par le sérialiseur, puis huit familles dans des copies dérivées sous le doctype source. Ces diagnostics ne justifient pas de nouveau correctif produit ; la qualification reste ouverte.

Le [complément clavier Firefox](CLAVIER-FIREFOX.md) ajoute 19 états, 38 segments et 572 contrôles inventoriés atteints nativement en croisant les deux sens. Il conserve les échecs du harnais, l’interruption HTTP et la reprise ciblée, les amorçages programmatiques et les limites de visibilité. Aucun nouveau correctif produit ni qualification RGAA n’en est déduit.

Le [complément d’activation Firefox](ACTIVATION-FIREFOX.md) exerce les 52 composants et 178 champs sur chaque surface portable et web locale : 412 allers-retours de saisie avec deux états stockés vérifiés, 104 sources refusées puis rétablies vides et 48 contrôles image seulement atteints. Les quatre candidats géométriques et les échecs du collecteur restent explicites ; les qualifications ne changent pas.

## Décision fondée sur les sources

| Affirmation | Source | Verdict | Conséquence |
|---|---|---|---|
| Une propriété CSS inconnue est ignorée par un moteur conforme | [Règles CSS officielles](https://www.w3.org/TR/CSS2/syndata.html#parsing-errors) | Confirmé pour ces moteurs | Retirer la propriété conserve leur cascade |
| Quinze occurrences sont présentes, dont quatorze avec un `color` standard de même valeur et priorité | Référence épinglée et signatures du compilateur | Confirmé | Retrait textuel de ces seules lignes |
| Le corps sombre possède `font-color` sans `color` standard | Référence épinglée | Confirmé | Une substitution activerait une nouvelle couleur héritée |
| Le retrait est neutre dans toutes les messageries | Aucune recette mail de cette version | Inconnu | Ne pas déduire de compatibilité Outlook ou Mélissa |

`scripts/mail_layout.py` qualifie les quinze sélecteurs, valeurs et priorités avant retrait et refuse toute dérive de ces signatures contrôlées. Ce repérage est borné à la référence épinglée ; ce n’est pas un parseur CSS général. `catalog.css` reste canonique et participe à la même identité ; `renderCss` alimente les exports, l’aperçu et la préparation de copie. Les autres déclarations gardent leurs octets et leur ordre, notamment les styles Office. Le contrat JSON v1, les 178 champs, les 52 composants, les images et les données sont conservés.

## Résultats et portée des preuves

- **110 tests applicatifs sur 110 réussis**, sans saut ni annulation. Six mutants de signature sont refusés. Un mutant diffusant de nouveau le CSS canonique fait échouer deux assertions avec le harnais corrigé ; le premier journal rouge contenait aussi un défaut de globals du harnais VM, conservé et corrigé avant le vert.
- **156 comparaisons d’exports**, soit les 52 composants sur trois objets : seuls les quinze retraits sont observés ; titre, texte, données et déclarations Office sont conservés. Les copies sans styles sont strictement identiques.
- **832 paires avant/après**, soit 52 composants × deux thèmes × deux largeurs (1 024 et 320 pixels) × quatre formes (HTML, aperçu, copie brute préparée et copie sans styles). Pixels pleine page, géométrie, couleurs calculées, texte, liens et alternatives sont identiques. Les PNG et mesures de chaque côté sont archivés, y compris les paires positives. Ce ne sont pas des collages en messagerie ; l’HTML d’aperçu est ici rendu dans une page isolée.
- **16 comparaisons de cascade**, huit Chromium et huit Firefox : marqueurs synthétiques du corps et des quatorze sélecteurs, deux thèmes et quatre formes. Les témoins négatifs détectent la substitution erronée par `color` dans chaque moteur. Le test Chromium mesure tous les éléments du catalogue assemblé ; ses PNG couvrent seulement le viewport de 390 × 900 pixels, contrairement aux captures pleine page de la comparaison précédente. Les marqueurs Firefox complètent une composition de titre et texte.
- **80 observations ciblées de contraste** renouvelées, dont six états rendus inactifs par une modale, avec cinq témoins négatifs détectés. Elles ne qualifient pas globalement les critères de couleur.
- **11 états d’interface** collectés : DOM, arbre d’accessibilité, axe et captures, sans violation axe observée. Les parcours clavier, erreurs, dialogues, imports et restauration sont renouvelés ; le zoom reste une simulation de viewport explicitement distinguée d’un zoom réel.
- **1 160 commandes AY11** terminées sans erreur : vingt captures et 1 140 sondes, couvrant les vingt ensembles exacts de 57 variantes disponibles. `candidate-static` reste indisponible vingt fois ; une sonde sans candidat n’est pas un contrôle qualifié.
- **Firefox natif** : cinq parcours fonctionnels, téléchargement et ouverture réels de trois exports de titre, puis comparaison des couleurs dans chaque thème. Aucun profil personnel, lecteur d’écran ou client mail n’est utilisé.

La commande BiDi d’émulation de thème n’est pas disponible dans le Firefox installé : son échec reste archivé. La reprise utilise uniquement une préférence du profil isolé, `layout.css.prefers-color-scheme.content-override` (0 sombre, 1 clair), avec `matchMedia` vérifié dans chaque document. La valeur vient des [sources Mozilla](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml). Aucune installation ni modification du profil personnel. Le premier essai de contraste a refusé une capture de référence ancienne ; la reprise utilise la capture fraîche et conserve ce refus.

## Validateur HTML et matrice exhaustive

Nu HTML Checker local contrôle **148 entrées** avant/après, sans filtre : les erreurs passent de **4 656 à 2 796**, avec retrait exact des **1 860 occurrences** de la seule famille `font-color`. Les huit autres familles et les messages d’information sont conservés ; le code de sortie reste **1**. Les entrées distinguent sources servies, 104 exports et aperçus des composants, onze DOM d’interface, dix compositions et vingt DOM AY11.

Les huit familles restantes concernent `xmlns:v`, `xmlns:o`, `supported-color-schemes` et cinq propriétés `mso-*`. Les préfixes Office ne sont pas employés par un élément ou attribut du catalogue actuel ; leur suppression et les effets d’import dans Word restent à instruire sans qualification Windows. Les styles Office sont conservés pour la compatibilité mail. Aucun de ces diagnostics CSS n’est transformé à lui seul en non-conformité RGAA confirmée, ni dispensé pour obtenir un succès artificiel. Le [test officiel 8.2.1](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#8.2.1) reste à qualifier.

Les [106 critères](MATRICE-106.md) et [258 tests](MATRICE-258.md) conservent les décisions ouvertes : 101 critères non testés au sens de la qualification et cinq à retester. La [matrice détaillée](matrice-rgaa.json) contient **1 651 observations par instance**, dont 1 161 observations de titre, balisage et non-régression dans le [complément](observations.json), et 1 220 observations de critère. Le [reçu](recu-20261023.json) rattache les sources et artefacts exacts ; l’[inventaire d’applicabilité](inventaire-applicabilite.json) ne prononce aucune non-applicabilité.

## Qualifications restantes

Personne n’est disponible pour les qualifications manuelles et les essais vocaux ; aucun poste Windows n’est disponible. Les issues #2 et #13 restent ouvertes, avec la pertinence éditoriale, les décisions exhaustives d’applicabilité, les recettes de messagerie après transformation, l’installation sur le parc et l’autorisation métier de l’origine publique. Un arbre d’accessibilité, un résultat axe ou un GO technique ne prouvent aucune annonce vocale. L’objectif à 100 % reste ouvert.

Astra donne **GO technique, documentaire et PDV pour la publication personnelle**. Sa contre-revue recalcule les 26 sources, douze scripts et 6 626 artefacts sans divergence, puis relance le vérificateur : 1 651 pointeurs, 87 liens et vingt ensembles exacts de 57 variantes. Les compteurs VNU bruts, les 104 informations conservées, les profils de capture et les identités des observations sont contrôlés indépendamment. Aucun navigateur ni lecteur d’écran n’est relancé par cette contre-revue ; ce GO ne qualifie pas le RGAA global.

La [recette publique distincte](publication.json) porte sur le commit produit `c1d26830504b96fd304814d95e983ea8c44ea980`, après déploiement Pages terminé avec succès. Les huit fichiers publics répondent en HTTP 200 avec des empreintes identiques aux distributions locales. Un profil Chromium neuf exerce un import synthétique, l’aperçu sandboxé, le téléchargement HTML réellement ouvert, l’export JSON sans changement des données et la restauration hors connexion. La propriété `font-color` est absente des styles de l’aperçu, de l’export ouvert et de l’aperçu restauré ; les déclarations Office restent présentes. Le CSS canonique conserve ses quinze occurrences et la même identité de catalogue.

SNUM public est comparé par empreinte ; ses interactions restent celles des recettes locales. Aucun envoi, collage ou reçu en messagerie, essai vocal, poste Windows ou déploiement sur le parc n’est déduit de cette recette. Les huit familles d’erreurs vnu restent ouvertes.
