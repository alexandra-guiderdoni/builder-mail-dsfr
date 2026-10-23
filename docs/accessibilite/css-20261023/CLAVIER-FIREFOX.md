# Clavier Firefox : 19 états collectés, qualification ouverte

**Aucune conformité RGAA prononcée. Aucun changement produit.** Ce complément ajoute les parcours natifs Tab et Maj+Tab de Firefox 156.0 aux traces Chromium existantes. Les [données par instance](clavier-firefox.json) rattachent les preuves à 7.3.1, 12.8.1, 12.9.1 et, pour les seuls candidats géométriques, 10.7.1. Les qualifications des matrices [106 critères](MATRICE-106.md) et [258 tests](MATRICE-258.md) restent ouvertes.

## Affirmations et preuves

| Affirmation | Source | Verdict et portée |
|---|---|---|
| Les contrôles de l’échantillon peuvent recevoir le focus par Tab | Traces natives, avec amorçage exclu de `nativeReached` | Confirmé pour les 572 instances inventoriées, en croisant les deux sens |
| L’inventaire décrit tous les arrêts Firefox | Traces et cibles `unlisted` | Faux : 22 arrêts supplémentaires sur des conteneurs natifs sont conservés |
| La phase portable possède un reçu terminal réussi | Journal et fichiers individuels de `campagne-v4` | Faux : huit scènes attestées, puis interruption HTTP ; aucun reçu terminal inventé |
| Un centre hors viewport prouve un focus invisible | Mesures et captures des huit candidats | Non établi ; candidats à qualifier |
| Cette collecte valide le clavier intégral | [Tests RGAA officiels](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#7.3.1), preuves et limites ci-dessous | Non : atteinte des contrôles et traces d’ordre ne suffisent pas à qualifier toutes les actions et leur cohérence |

## Échantillon et résultats

| État | Contrôles portable | Contrôles web locale |
|---|---:|---:|
| Accueil | 11 | 11 |
| Renommage | 3 | 3 |
| Renommage en erreur | 3 | 3 |
| Suppression à confirmer | 2 | 2 |
| Éditeur | 35 | 35 |
| Panneaux ouverts | 57 | 57 |
| URL invalide | 57 | 57 |
| Composition de 52 composants | 109 | 109 |

SNUM ajoute trois états : initial et erreur, trois contrôles chacun ; conversion synthétique terminée, douze contrôles. Les aperçus sont les vraies iframes opaques, avec `sandbox=""` conservé. Les contrôles de leurs documents sont inspectés par BiDi sans modifier leur isolation. Les captures conservent aussi le doctype réellement observé.

Les **38 segments** produisent **1 204 positions** : 38 amorçages programmatiques, 1 128 atteintes natives comptées par sens et 38 sorties observées vers l’interface du navigateur. Aucun segment n’atteint sa borne et aucun état n’est marqué instable par l’échantillonnage. Ce sont des segments, pas des boucles fermées : les 38 sorties ne sont ni assimilées à un piège clavier, ni supprimées des traces.

L’union des atteintes natives avant/arrière couvre les **572 contrôles inventoriés**. L’amorçage propre à chaque sens n’est pas compté comme une atteinte native. Les inventaires avant/arrière sont comparés ; aucun contrôle inventorié n’est manquant dans les segments observés.

Les **22 arrêts natifs hors inventaire** sont seize passages sur `#block-list` et six sur `#library-dialog`, avec `tabIndex:-1`. Ils ne sont ni supprimés, ni déclarés anormaux. L’inventaire de départ est donc borné ; la trace native apporte des cibles supplémentaires.

Les **huit candidats géométriques** concernent uniquement le centre de `#block-list` hors viewport en parcours avant. Les captures sont conservées. Un conteneur peut avoir une partie et un contour visibles malgré son centre extérieur ; ces candidats ne prouvent aucune non-conformité. Le candidat précédent du champ `#field-f3` ne remonte plus après stabilisation. La perception du focus et les recouvrements éventuels restent à qualifier.

## Échecs conservés et reprise ciblée

Trois tentatives initiales restent en échec. Elles ont révélé des défauts du collecteur : descendants de `details` fermés inclus par `getClientRects`, état initial supposé déjà sauvegardé, élément actif nul pendant le chargement d’un cadre et mauvais départ inverse. Ces erreurs ne deviennent pas des défauts du builder.

Le témoin indépendant vérifie le parcours parent → iframe → suite du parent, puis son inverse. Il reproduit l’élément actif nul dans un cadre retardé, attend sa disponibilité et exclut le champ replié. Après ces corrections relues par Astra, une nouvelle campagne a produit les huit scènes portable, puis s’est arrêtée sur `ERR_HTTP_HEADERS_SENT` dans le serveur de recette avant les scènes web. Les huit fichiers JSON concordent avec les empreintes du journal ; l’absence de reçu terminal reste explicite.

Après correction de la lecture HTTP avant envoi des en-têtes, une reprise distincte exécute uniquement les huit scènes web et les trois SNUM. Son reçu est terminal et réussi. La collecte consolidée couvre les 19 états ; elle conserve le statut de phase portable interrompue, ses fichiers individuels et l’ensemble des échecs antérieurs.

## Méthode et limites

Le profil Firefox est isolé et active la navigation clavier complète avec `accessibility.tabfocus=7`. L’inventaire utilise la visibilité effective des éléments ; l’ordre composé place les contrôles avant le cadre, ceux du cadre, puis la suite du parent. La préparation des états, la saisie et le choix de fichier utilisent des scripts ; les touches des segments sont envoyées par les actions natives BiDi. Chaque contrôle de départ reçoit explicitement le focus avant ces touches.

Dans ces essais headless, après la sortie du contenu, un nouvel onglet, une activation ou un clic ne rétablissent pas `document.hasFocus()` ; une nouvelle fenêtre de recette le fait. Cela ne démontre aucune impossibilité générale de revenir au contenu dans Firefox. La préparation sauvegarde explicitement le modèle valide, contrôle son identité, recrée la fenêtre et rétablit l’état d’interface ; elle ne prouve pas une restauration spontanée du focus. Les champs invalides sont reproduits séparément, sans être enregistrés comme données valides.

Les mesures attendent trois échantillons géométriques identiques consécutifs, avec quinze essais maximum. Cette stabilisation bornée ne garantit pas l’immobilité future. Le chargement du cadre est vérifié avant inspection ; la promesse des fontes reste protégée par le délai BiDi de 30 secondes, sans borne locale supplémentaire. L’abonnement aux erreurs Firefox vise le premier contexte : sa liste vide n’est pas une preuve d’absence globale d’erreur dans les fenêtres recréées.

Les scripts et traces restent dans `evidence/clavier-firefox-20261023/`, ignorés par Git. Les deux collecteurs réellement utilisés sont archivés dans `campagne-v4/collecteur.mjs` et `reprise-web-snum/collecteur.mjs`. Le JSON partageable conserve **120 empreintes**, les pointeurs des 572 instances, les arrêts supplémentaires, les candidats et les limites. Les 26 empreintes produit sont recontrôlées ; les données générées exhaustives ne constituent pas une nouvelle couche applicative.

Les actions ne sont pas toutes activées dans chaque état, le sélecteur de fichiers du système n’est pas qualifié physiquement et les 178 champs des 52 blocs ne sont pas édités individuellement. Les tests d’activation et de restitution du focus précédents restent distincts. Aucun essai vocal, poste Windows, client mail ou qualification humaine n’est déduit de ces traces. L’objectif RGAA à 100 % reste inchangé et non atteint.

La contre-revue indépendante Astra conclut **GO technique, documentaire et PDV pour cette publication documentaire uniquement**. Elle recalcule les 120 empreintes d’artefacts et les 26 sources, résout les 1 106 pointeurs natifs des contrôles inventoriés et les 22 arrêts supplémentaires, contrôle les compteurs et les 35 liens locaux, puis compare récursivement la matrice à sa version précédente. Seuls les huit rattachements complémentaires sont ajoutés ; les qualifications restent identiques. Aucun navigateur ni test fonctionnel n’est relancé pour cette contre-revue.
