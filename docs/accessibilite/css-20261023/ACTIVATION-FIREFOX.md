# Activation et saisie Firefox : les 52 composants exercés

**Aucun correctif produit ni conformité RGAA prononcée.** Ce complément du [parcours clavier](CLAVIER-FIREFOX.md) exerce l’édition des champs dans Firefox 156.0, sur le portable et la webapp locale. Les [564 observations](activation-firefox.json) complètent les preuves de [7.3.1 et 7.3.2](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#7.3), sans modifier les qualifications des matrices.

## Affirmations et preuves

| Affirmation | Source | Verdict et portée |
|---|---|---|
| Les 52 composants et leurs 178 champs sont présents sur chaque surface | Catalogue attendu comparé aux contrôles rendus | Confirmé sur les deux surfaces |
| Les champs éditables acceptent un aller-retour de saisie | Touches natives, événements et comparaisons du modèle et du stockage | Confirmé pour le caractère et les états exercés |
| Un champ image est utilisable jusqu’au choix du fichier | Atteinte et libellé seulement | Non démontré : le sélecteur système reste à qualifier |
| Un résultat sans événement de saisie passerait l’oracle | Témoin négatif avec valeur DOM modifiée seule | Faux : modèle et stockage différents de l’attendu, témoin refusé |
| Ces résultats qualifient le clavier intégral et les annonces vocales | Périmètre et limites ci-dessous | Non démontré |

## Couverture et résultats

| Contrôle par surface | Portable | Web locale |
|---|---:|---:|
| Blocs activés par Entrée native | 52 | 52 |
| Champs du catalogue atteints | 178 | 178 |
| Dont textes longs, URL et alternatives édités | 154 | 154 |
| Dont fichiers image atteints, sans choix système | 24 | 24 |
| Sources facultatives : refus puis retour vide | 52 | 52 |
| Intitulés de source édités | 52 | 52 |

Les **104 activations** sont précédées du focus programmatique du bouton de bloc, explicitement réservé à l’amorçage. Le produit place ensuite le focus sur son premier champ ; les autres sont atteints par **460 tabulations natives**. Le collecteur ne refocalise pas les champs après cette activation. Chaque instance est identifiée par surface, composant, bloc et champ, car les identifiants HTML sont réutilisés entre blocs.

Les **412 allers-retours éditables** vérifient séparément le caractère ajouté, son enregistrement, puis son retrait et le second état enregistré. Chaque comparaison porte sur la bibliothèque entière, avec le seul delta attendu ; les empreintes du modèle, du stockage et de l’attendu concordent. La position d’insertion réellement observée est conservée : Commande + Flèche droite ne signifie pas systématiquement fin du texte multiligne.

Les **104 sources facultatives** reçoivent un caractère invalide. Le modèle et le stockage restent inchangés, l’erreur est reliée au champ ; Retour arrière rétablit le champ vide et retire cette erreur. Ce complément ne teste pas une nouvelle URL complète pour ces sources. Les 516 vérifications après retour comprennent ces 104 contrôles de cohérence ; elles ne prouvent pas 516 écritures distinctes du stockage.

L’intitulé de source est facultatif dans le format. Les blocs de départ n’ont pas la propriété `sourceLabel` ; après son édition puis son effacement, une chaîne vide existe. L’oracle conserve explicitement cette propriété dans l’état attendu. Aucun changement de schéma ou migration n’est introduit par cette recette.

Les événements `keydown`, `beforeinput`, `input`, clic et focus sont conservés. Les saisies ont des événements fiables ; les commandes natives émises et leur cible restent aussi nécessaires à la preuve. Le témoin négatif affecte uniquement la valeur DOM sans événement, puis vérifie le refus de l’oracle. Sa remise en état par script est signalée avant la reprise native.

## Échecs du collecteur et diagnostic

Trois tentatives échouées restent archivées : expression BiDi mal formée, sélection restant active après la touche Fin, puis confusion entre type métier `alt` et type HTML `text`. Après le troisième échec, les relances ont été suspendues pour un diagnostic exhaustif des types, sans navigateur. Le rendu réel de `UI.fields()` dans une VM minimale, analysé indépendamment par `HTMLParser`, concorde sur 117 textes longs, 13 URL, 24 images et 24 alternatives.

Le diagnostic rejoué produit les mêmes octets. Son témoin d’omission retire une entrée de la liste analysée ; il démontre la sensibilité de la comparaison, sans supprimer un champ du DOM. Le témoin natif du curseur distingue Fin, Droite et Commande + Droite sur une URL. Un pilote de deux composants sur chaque surface réussit ; la campagne complète suivante termine ensuite avec 52 blocs par surface, sans erreur.

Les gardes exigent les clés et types attendus du catalogue, les deux champs source, l’unicité des composants et les 178 champs par surface. Un type inconnu arrête la collecte. Toute erreur finale d’empreinte impose un reçu non réussi et un code de sortie non nul. Les échecs précédents restent séparés de cette exécution terminale.

## Géométrie et limites

Quatre candidats concernent `mail-33/f3` et `mail-45/f3`, sur les deux surfaces : centre du champ hors viewport, sans perte de focus observée. Les mesures attendent trois échantillons identiques, dans une borne de quinze essais. Les captures sont pleine page ; elles ne qualifient ni la perception du focus au point de lecture, ni un éventuel recouvrement. Les images sont seulement atteintes et nommées : aucune visibilité complète dans le viewport n’en est déduite.

Les traces brutes des candidats omettent le répertoire `firefox/` dans leur référence PNG. Le JSON dérivé conserve la référence brute et indique le fichier réellement produit, avec son empreinte ; aucune trace originale n’est réécrite pour masquer cette erreur de chemin.

La préparation ouvre un panneau par script et injecte un fichier synthétique. Les deux fenêtres sont abonnées aux erreurs Firefox ; aucune erreur n’est observée dans ces contextes. Le profil est isolé, avec navigation clavier complète ; les CSP et le sandbox de l’aperçu restent intacts. Les 26 empreintes produit concordent avec les sources de la campagne courante. Le JSON partageable contient 260 empreintes d’artefacts et de sources ; les scripts, reçus, captures et traces restent sous `evidence/activation-firefox-20261023/`, ignoré par Git.

Une insertion puis un retrait n’exercent pas toutes les valeurs, tous les modes de saisie ou toutes les fonctionnalités de l’application. Aucun sélecteur système, essai vocal, usage assistif, poste Windows ou transport mail n’est qualifié. L’objectif à 100 % demeure inchangé et non atteint ; les qualifications humaines restent ouvertes.

La contre-revue indépendante Astra donne **GO technique, documentaire et PDV pour cette publication documentaire personnelle**. Elle recalcule les 260 empreintes et les 26 sources, vérifie les 104 activations, les 460 tabulations, les pointeurs des 564 instances et les 1 032 comparaisons entre attendu, modèle et stockage. Les états édités et restaurés des 412 allers-retours ont des empreintes distinctes. Elle contrôle les quatre résolutions PNG, les 38 liens locaux et l’identité de la matrice après retrait des seuls trois rattachements ajoutés. Aucun navigateur ni test fonctionnel n’est relancé par cette contre-revue ; les qualifications RGAA restent identiques.
