# Historique des livraisons

## 2 novembre 2026 - Exemples de newsletters et départs allégés (#202)

- **Espace « Exemples » :** sur l’accueil, à l’écart de Mes newsletters, quatre newsletters remplies avec un contenu fictif crédible : information de service, lettre d’information, invitation, revue de presse.
  - « Prévisualiser » les montre en lecture seule, dans un aperçu isolé.
  - « Créer à partir de cet exemple » en ajoute une copie indépendante à Mes newsletters ; l’exemple reste inchangé.
- **Versionnement :** les exemples sont décrits dans le code de l’atelier (`app/source/examples.js`), en composants et valeurs. L’atelier les construit à la demande avec le catalogue courant. Ils sont absents de la bibliothèque et des sauvegardes, et ne sont pas touchés par « Tout effacer ».
- **Hors connexion :** l’aperçu et la création fonctionnent dans le portable dès la première ouverture, et dans la version web préparée hors connexion.
- **Identité :** l’identité reste celle du catalogue (« Votre service »), et les seules images sont les logos Marianne.
- **Liens :** les liens visent des domaines de démonstration.
- **Contrôle avant copie :** une nouvelle règle signale les textes d’exemple restés tels quels (`example-text`). Avec les liens de démonstration et « Votre service », une copie non personnalisée est donc signalée avant l’envoi.
- **Départs allégés :** les départs « Lettre d’information » et « Invitation » prennent la structure des exemples.
  - « Deux cartes d’information » et « Titre principal avec image », qui exigeaient une illustration, sont remplacés.
  - L’invitation place le bouton d’inscription avant le contact.
  - La vignette des articles reste à fournir.
  - Le départ « Lettre d’information » passe de 110,7 Kio à 73,3 Kio en HTML de copie, sous le repère de 90 Kio.
- L’aide de « Tout effacer » parle de newsletters et précise que les exemples restent proposés.
- Le skill `newsletter-contribution` charge et teste les exemples.
- Sept tests ajoutés :
  - accueil et aperçu, copie indépendante et « Tout effacer », poids, départs sans illustration requise, version web hors connexion ;
  - la règle de contrôle et le test du skill.

  Une mutation qui désactive la règle est détectée.

## 2 novembre 2026 - Le skill ne bloque plus sur un simple changement de présentation (#209, suite)

- **Avant :** le contrat du skill `newsletter-contribution` comparait l’empreinte complète du catalogue. Une retouche de CSS du courriel bloquait donc la fabrication (« PRÉREQUIS TECHNIQUE »), alors que l’atelier relit ces données depuis #209 et que le skill exclut les styles de ce dont il dépend.
- **Après :** une empreinte antérieure de même contrat de données (`catalog.compatible`) ne bloque plus. Une empreinte inconnue bloque toujours. Les clés, types et gabarits restent comparés composant par composant.
- Le test « un style modifié ne bloque pas » ne changeait pas l’empreinte et passait artificiellement. Un nouveau test reproduit le cas réel ; il échouait avant le correctif.

## 2 novembre 2026 - Installer et travailler sans connexion : lien du portable, aide et états lisibles (#210)

- **Télécharger l’atelier portable :** un lien sur le site enregistre le portable (`atelier-courriels-portable.html`). C’est un vrai téléchargement : le portable n’est jamais ouvert dans le site, où il partagerait les newsletters de la version web. Le lien est absent du portable lui-même et demande une connexion.
- **Aide à l’installation :** quand le navigateur ne propose pas le bouton « Installer l’atelier », une phrase indique le menu du navigateur ou le portable. Elle se retire quand le bouton est proposé ou que l’atelier est installé.
- **États lisibles :**

  | Avant | Après |
  |---|---|
  | Version web · ressources disponibles hors connexion | Version web · disponible hors connexion |
  | Version web · hors connexion non vérifié | Version web · hors connexion pas garanti |
  | Hors connexion indisponible · utilisez le fichier portable | Version web · ne s’ouvrira pas sans connexion |
  | Version web · mise à jour non préparée | Mise à jour reportée · version actuelle disponible hors connexion |
  | Mise à jour non préparée · hors connexion non vérifié | Mise à jour reportée · hors connexion pas garanti |
  | Préparation du hors connexion… | Préparation de l’accès hors connexion… |
  | Hors connexion web indisponible · utilisez le fichier portable | Ce navigateur ne permet pas le hors connexion · utilisez l’atelier portable |
  | Fichier portable · prêt hors connexion | Atelier portable · fonctionne sans connexion |

  Les messages détaillés gardent leur contenu opérationnel et renvoient au lien de téléchargement.
- **Aide repliable :** « Comprendre : installé, disponible hors connexion, sauvegardé » définit les trois notions et donne l’état technique du cache.
- « Vos compositions » devient « Vos newsletters » dans ces messages.
- Trois tests navigateur : téléchargement réel comparé au portable publié, aide selon l’invite et l’installation, absence sur le portable. Quatre tests réalignés sur les nouveaux libellés. Une mutation qui laisse l’aide affichée à côté du bouton est détectée.

## 2 novembre 2026 - Un changement de présentation ne coupe plus l’accès aux newsletters (#209)

- **Avant :** l’empreinte du catalogue mêlait le contrat de données et la présentation (gabarits HTML, CSS du courriel). Une seule règle CSS ajoutée rendait illisibles les newsletters enregistrées, les exports et les sauvegardes, puisque la mise à jour atteint tous les postes en même temps.
- **Après :** quand seule la présentation change, une bibliothèque, un export ou une sauvegarde d’une version antérieure est accepté, mis à jour vers le modèle courant et annoncé. Le contrat de données couvre les composants, les clés et les types des champs. Au démarrage, la bibliothèque mise à jour est enregistrée ; l’état précédent garde l’original, et ce n’est pas compté comme une modification.
- **Contrat de données différent :** le refus actuel est conservé, avec l’export brut.
- **Registre :** `app/catalogue-history.json` associe chaque empreinte publiée à son contrat. La construction l’alimente ; `npm run check` échoue si l’empreinte courante n’y figure pas.
- L’essai du constat (bibliothèque enregistrée avec N, rouverte avec N+1) est rejoué en test, sur un atelier N+1 réellement construit. Il échouait avant le changement. Une mutation qui neutralise la mise à jour est détectée.

## 2 novembre 2026 - Un seul vocabulaire : « Mes newsletters » (#199, second lot)

- **Parcours principal :** « Mes newsletters » remplace « bibliothèque » et « composition » dans les libellés, les intitulés accessibles, les dialogues et les notices. Par exemple, « Exporter Mes newsletters », « Dupliquer la newsletter … » et « Newsletters sauvegardées dans ce navigateur ». La rubrique « Fichiers et récupération » devient « Sauvegarde et import ». Pas d’onglets, conformément à la décision.
- **Vocabulaire conservé :** les messages d’erreur, de lecture seule et de récupération gardent leurs termes, par exemple « Exporter la bibliothèque en mémoire » ou « Retrouver votre bibliothèque ». Les validations du format de fichier et les noms de fichiers exportés ne changent pas non plus.
- **Guide :** réaligné, avec un paragraphe sur l’encart de sauvegarde, le rappel et la conservation durable. La page SNUM, la référence et les tests du skill `newsletter-contribution` sont alignés.
- Tests réalignés sur les nouveaux libellés, sans changement de comportement.

## 2 novembre 2026 - L’export de secours n’écrit plus dans le stockage (#199, correctif du premier lot)

- Quand le navigateur refuse d’ouvrir les données au démarrage, « Exporter le travail temporaire » enregistrait la date d’export dans le stockage, que cette fenêtre ne doit pas toucher. L’export de secours ne date plus rien et n’écrit plus rien.
- Détecté par le test existant d’écriture concurrente pendant la récupération, en échec sur `main` (CI du commit f40655f).

## 2 novembre 2026 - Encart de sauvegarde, rappel d’export et conservation durable (#199, premier lot)

- L’encart de sauvegarde indique trois choses :
  - où sont les newsletters (« dans ce navigateur, sur ce poste ») ;
  - la date du dernier export proposé, ou l’absence d’export ;
  - si le navigateur s’engage à les conserver.
- Seul « Exporter la bibliothèque » date l’export, avec le libellé « dernier export proposé le… » : le navigateur ne confirme pas l’enregistrement du fichier. L’export d’une composition seule ou un export de secours ne le datent pas.
- **Rappel :** après 7 jours de modifications sans export, un rappel propose d’exporter. Ouvrir une autre newsletter ne compte pas comme une modification. Le rappel disparaît après un export complet.
- **Conservation durable :** elle est demandée une fois, à la première modification enregistrée, jamais à l’ouverture. Ses quatre états (accordée, non accordée, indisponible, erreur) ont chacun un message. Mesure dans Chromium 156, sans interface, version web et portable : non accordée. Le comportement d’une application installée, de Firefox et de Safari n’a pas été mesuré.
- **Métadonnées :** rangées hors du modèle, dans une clé séparée du stockage. « Tout effacer » les supprime ; une restauration garde la date d’export et remet le compteur de modifications à zéro.
- **Stockage en échec :** l’encart ne promet plus aucune conservation.
- Quatre tests navigateur. Une mutation qui fait dater l’export par une composition seule est détectée.

## 2 novembre 2026 - Réagencer les blocs par glisser-déposer (#204)

- **Glisser-déposer :** chaque entrée de « Composants du courriel » a une poignée, « Déplacer le bloc n « nom » ». À la souris, la faire glisser déplace le bloc à la position marquée. Un dépôt sur place, hors de la liste ou interrompu par Échap ne change rien et rend le focus à la poignée. Au toucher, la poignée ne glisse pas.
- **Déplacer à la position… :** l’éditeur du bloc propose une liste des positions, chacune avec le nom du bloc qui l’occupe, et le bouton « Déplacer à cette position ». Avec « Monter » et « Descendre », c’est l’alternative sans glissement (WCAG 2.2, 2.5.7). Au clavier, la poignée sélectionne le bloc et mène à cette liste.
- **Annuler le déplacement :** il suit tout déplacement et reste proposé tant que l’ordre obtenu est inchangé. Une saisie le garde ; un retrait, un ajout, une duplication, l’annulation d’un retrait ou tout autre changement d’ordre le retire. L’annulation du retrait garde son comportement.
- **Protections et annonces :** même garde que « Monter » ; en cas de refus, l’ordre reste inchangé et le focus va au champ à corriger. Chaque déplacement annonce la nouvelle position, et l’ordre est conservé après rechargement.
- Cinq tests navigateur ; un test de liste ajusté à la poignée ; spécification `docs/tickets/reagencer-blocs.md` alignée.

## 2 novembre 2026 - Poids du courriel et aide à la copie en langage courant (#203)

- Builder seulement ; la page SNUM garde ses textes, protégés par ses tests.
- Tant que le courriel reste sous 92 160 octets (90 Kio), l’aperçu n’affiche aucune information de poids. À partir de ce repère, un seul message, sans chiffres : « Courriel lourd : Gmail risque de n’en afficher qu’une partie », suivi d’un conseil pour alléger. Le message est le même pour les deux niveaux, et un calcul en cours n’affiche rien.
- L’aide permanente sur la copie avec Chromium disparaît. Après une copie, le message conseille de faire un envoi de test.
- Le détail technique (octets, répartition, repères, Chromium) reste dans l’aide dépliable, visible seulement au-delà du repère.
- Le dialogue de vérification affiche une alerte courte, qui garde l’image ou le texte à alléger.
- Seuils et calculs inchangés. Retour assumé sur le contrat de #160, qui affichait en permanence une synthèse du poids.
- Nouveau test des frontières exactes et du langage. Huit fichiers de tests réalignés sur ce contrat ; guide mis à jour.

## 2 novembre 2026 - Tout effacer (#201)

- En bas de « Mes newsletters », la zone « Repartir de zéro » propose « Tout effacer ». Une simple fenêtre indique ce qui sera supprimé, propose d’exporter d’abord la bibliothèque, puis demande confirmation.
- L’effacement passe par le point d’entrée commun (#208) :
  - aucun état précédent n’est gardé, si bien que « Restaurer l’état précédent » ne retrouve rien ;
  - les annulations en mémoire sont vidées ;
  - les autres fenêtres passent en lecture seule avec le motif « effacée » ;
  - une bibliothèque enregistrée illisible n’est jamais effacée.
- L’état obtenu est identique à celui d’un navigateur neuf, y compris après rechargement : même composition de départ et même message. Le cache hors connexion de la version web reste en place.
- Fenêtre de restauration (#200) : description reformulée. Deux tests navigateur ajoutés, dont un sur la version web hors connexion ; guide complété.

## 2 novembre 2026 - Restaurer une sauvegarde de la bibliothèque (#200)

- Dans « Fichiers et récupération », « Restaurer une sauvegarde de la bibliothèque » remplace toutes les compositions, modèles et identités par celles d’un export de bibliothèque, sans doublon. L’import qui ajoute reste inchangé.
- Le fichier est entièrement validé avant la fenêtre de confirmation. Une composition seule renvoie vers « Importer » ; des données enregistrées brutes, un JSON invalide ou un autre catalogue sont refusés sans rien changer.
- La fenêtre indique ce qui sera remplacé, propose « Exporter d’abord la bibliothèque actuelle », puis demande une confirmation distincte. La bibliothèque remplacée reste récupérable par « Restaurer l’état précédent ».
- Le remplacement passe par le point d’entrée commun (#208) :
  - en cas d’échec d’écriture, la bibliothèque actuelle reste affichée et enregistrée, avec le message dans la fenêtre ;
  - les autres fenêtres passent en lecture seule avec le motif « remplacée ».
- Quatre tests navigateur ; guide d’utilisation complété.

## 2 novembre 2026 - Point d’entrée commun pour remplacer ou effacer la bibliothèque (#208)

- Fondation technique de la restauration (#200) et de l’effacement (#201), sans nouveau bouton :
  - **Écriture d’abord :** `A.State.replaceLibrary` écrit la nouvelle bibliothèque en une seule transaction, avec contrôle du jeton, puis seulement l’affiche. En cas d’échec (quota, stockage indisponible, jeton périmé), mémoire et stockage restent strictement inchangés.
  - **État précédent :** il est gardé pour une restauration et effacé pour un effacement, si bien que « Restaurer l’état précédent » ne retrouve plus rien.
  - **Mémoires vidées :** les annulations de retrait, les brouillons et les champs invalides de l’ancien état.
  - **Autres fenêtres :** elles passent en lecture seule avec le motif, « remplacée » ou « effacée », jamais « disparu ». Le passage est immédiat par diffusion, ou au plus tard à leur prochaine modification dans un navigateur sans `BroadcastChannel`.
  - **Bibliothèque illisible :** une bibliothèque enregistrée illisible n’est jamais écrasée ; l’atelier demande d’exporter d’abord ses données brutes.
- Quatre tests navigateur. Une mutation qui affiche avant d’écrire est détectée.

## 2 novembre 2026 - Grille DSFR des champs et ANDI

- Grille DSFR dans toute l’interface, d’abord dans « Modèles et identité » :
  - chaque champ et chaque liste forment un groupe DSFR (`fr-input-group`, `fr-select-group`), à 1,5 rem de l’élément suivant ;
  - les boutons d’un groupe d’actions sont espacés de 1 rem, comme dans `fr-btns-group`, au lieu de 8 px ;
  - un texte d’aide propre à un champ reste dans son groupe, à 0,5 rem.
  Avant, 20 champs étaient hors groupe ; certains touchaient leur aide (0 px) ou leurs boutons (8 à 16 px).
- ANDI, outil d’audit d’accessibilité, peut s’exécuter sur le builder : la CSP de la page, web et portable, autorise exactement ses scripts et styles (`https://www.ssa.gov/accessibility/andi/`) et le jQuery 3.7.1 qu’il charge. Tout autre script externe reste bloqué. La page SNUM et l’aperçu isolé gardent leur politique.
- Tests : un test de grille sur l’éditeur et l’accueil, un contrat CSP et un essai navigateur ANDI. Distributions régénérées.

## 2 novembre 2026 - Nom des champs fichier pour Tanaguru

- Tanaguru signalait les champs d’image « sans nom accessible » : son calcul ne lit le `<label for>` que pour les champs texte, case à cocher, liste ou nombre, pas pour un champ fichier. Les navigateurs, eux, nommaient déjà ces champs par leur libellé. Chaque champ fichier pointe désormais aussi vers ce libellé par `aria-labelledby`, que Tanaguru lit pour tout élément ; le nom calculé reste identique. Le signalement de `size` sur la liste du catalogue est un faux positif de Tanaguru : le RGAA autorise `size` sur `select` ; rien n’est changé. Test de régression ajouté ; distributions régénérées.

## 2 novembre 2026 - Liste des composants et champ image

- La liste « Composants du courriel » n’affiche plus le numéro DSFR en marge, redondant avec « 1. », « 2. »… de chaque bouton. Elle reste une liste ordonnée (`fr-raw-list`, `role="list"` pour que WebKit la conserve sans puce). Le trait du détail « Traitement de l’image » est désormais à 1 rem du champ fichier qu’il touchait. Test de régression ajouté ; distributions régénérées.

## 2 novembre 2026 - Espacement des modèles et identités

- Dans « Mes modèles » et « Identités de service », le bouton d’enregistrement touchait le champ de nom. Champs et listes forment désormais des groupes DSFR (`fr-input-group`, `fr-select-group`) et le bouton rejoint un groupe d’actions : 1,5 rem sous le champ, 1 rem avant la liste. Test de régression ajouté ; distributions régénérées.

## 2 novembre 2026 — Tirets de l’application

- Les tirets quadratins de l’application deviennent des tirets simples : libellés des champs d’image (« Source - », « Adresse HTTPS directe - », « Appliquer l’adresse - »), intitulé de lien obligatoire, liste des blocs, objet « Revue de presse - date » de la version SNUM, descriptions du schéma JSON et prototype. Documentation et archives inchangées. Distributions régénérées ; tests SNUM et images distantes alignés.

## 2 novembre 2026 — Skill d’agent newsletter versionné avec le builder (#197)

- Outillage d’agent seulement, sans changement de l’application. Le skill `newsletter-contribution` rejoint ce dépôt (origine : `5eb43a046` du dépôt de travail de son auteur). Ses empreintes figées au 23 octobre bloquaient toute fabrication (10 tests sur 66 en échec) à cause du renommage des libellés (#88) et de l’empreinte de fichiers sources entiers.
- Le contrat ne retient plus que ce dont le skill dépend : clés et types des champs, gabarits, titres, liens et noms des composants, fonctions `Model` et `Render` utilisées, versions de composition acceptées et attribuées. Preuves par mutation du builder : un libellé ou une valeur par défaut modifiés passent ; un gabarit modifié, une version 3 acceptée, une fonction retirée ou un libellé d’interface cité renommé échouent.
- Références mises à jour pour les images par adresse HTTPS et la version 2 (#192), le contrôle avant copie ou téléchargement (#36) et le HTML téléchargé produit par `Render.exportHtml` (#117). Les tests navigateur du skill passent ce contrôle explicitement.
- `npm test` et la CI exécutent les 73 tests du skill, dont le refus d’un builder antérieur réel extrait de l’historique ; la CI récupère donc l’historique complet.

## 2 novembre 2026 — Répétition CI du test modal (#173)

- Observation seulement, sans changement de l’application ni de la publication. L’échec modal survenait environ une fois sur 20 exécutions de CI : quatre exécutions vertes ne départagent rien. Un workflow manuel, sans droit de publication, rejoue le seul fichier modal le nombre de fois demandé (60 par défaut) et échoue au premier bilan non nul, avec la trace de chaque exécution en échec. Le test journalise désormais le délai d’atteinte de l’aperçu aussi au succès, pour savoir si la garde a dû attendre.

## 1er novembre 2026 — Contrôle positif de l’aperçu après la modale (#173)

- Tests seulement, sans changement de l’application. La récidive de la CI 41322924838 montre le clic de contrôle reçu par l’iframe hôte, dans le parent, alors que le nouveau document d’aperçu avait moins de 112 ms. Avant ce clic, une garde survole l’aperçu jusqu’à ce qu’un mouvement de pointeur de confiance atteigne ce document, dans une limite de 2 s qui échoue avec diagnostic ; le geste souris d’origine est conservé. Un témoin négatif (aperçu jamais atteint) et une atteinte tardive sont testés. Aucune reproduction locale de l’intermittence : l’effet sur la CI reste à observer.

## 1er novembre 2026 — Oracle de zoom Firefox (#196)

- Recette de qualification seulement, sans changement de l’application. L’oracle de la recette Firefox à 200 % exigeait une fenêtre et un écran stables en pixels CSS ; la mesure native de #179 montre que Firefox les contracte aussi par le facteur, si bien que le vrai zoom était refusé. L’oracle exige désormais toutes les dimensions CSS divisées par le facteur et le DPR multiplié. Testé sur les mesures natives enregistrées : vrai 200 % accepté ; témoin inchangé, zooms à 170 et 240 %, fenêtre ou viewport redimensionnés sans zoom et changement d’écran refusés. L’exécution native complète de la recette reste à faire.

## 1er novembre 2026 — Contrôles des images distantes (#195)

- Tests seulement, sans changement de comportement. La politique de sécurité de l’aperçu, incluse dans les trois distributions, est désormais figée comme celle de la page ; un élargissement vers `http:` ou `*` fait échouer le contrat. Les échecs « dimensions d’image exploitables » (SVG 0 × 0) et « délai prévu » (horloge de page maîtrisée) sont éprouvés : source enregistrée inchangée, adresse conservée en brouillon, diagnostic affiché.

## 1er novembre 2026 — Retrait d’image refusé (#194)

- Un « Retirer l’image » refusé (champ invalide, chargement en cours) conserve l’adresse d’image saisie et non appliquée : copie et exports restent bloqués tant qu’elle n’est ni appliquée ni annulée. Un retrait accepté l’abandonne comme avant. Un test de régression ajouté ; distributions régénérées.

## 29 octobre 2026 — Annulation pendant le chargement d’une image distante

- Un résultat tardif ne recrée plus un brouillon après annulation et remontage du champ. Les erreurs du champ courant restent signalées. Quatre tests de régression ajoutés ; distributions régénérées.
- Livré dans `cbe93e3` ; [CI complète](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40842375729) : 606/606, aucun échec ni test ignoré.

## 29 octobre 2026 — Images par adresse HTTPS (#192)

- Les 24 champs image proposent une source locale ou une adresse HTTPS directe. Le fichier local précédent est conservé pour revenir en arrière ; aucune image existante n’est recompressée ou convertie.
- Les références distantes sont conservées dans les sorties et portent un format v2 explicite, refusé par les anciennes versions. Les fichiers entièrement locaux restent v1. La politique réseau ne s’ouvre que pour les images du builder ; les autres restrictions restent inchangées.
- La disponibilité est constatée seulement dans le navigateur. Le poids distant reste inconnu, les hébergeurs reçoivent des requêtes et le mode distant ne garantit ni hors connexion, ni archivage, ni réception en messagerie.


## 28 octobre 2026 — Comprendre le poids du courriel (#191)

- La synthèse et le détail nomment le HTML préparé pour la copie ; la confirmation de téléchargement nomme sa propre sortie. Répartition exacte entre styles de tête, données d’images et reste du HTML, avec occurrences, fichiers distincts et variantes de logos.
- Le conseil dépend de la catégorie dominante et conserve les logos de charte ; le renvoi n’accuse plus le premier champ image par défaut. Les repères locaux restent 90 et 102 Kio, sans blocage ni changement des copies, exports, images ou données. Le poids local est distingué du HTML réellement reçu, qui reste non mesuré.

## 28 octobre 2026 — Récupération des anciennes URL HTTPS abrégées (#193)

- Une bibliothèque enregistrée avant le refus des URL `https:` sans `//` dispose d’un écran de récupération : inventaire du contenu, export brut de l’original et correction explicite des destinations, sans écriture au démarrage ni normalisation automatique. La composition de départ ne masque plus les données retrouvées.
- La restauration valide toute la bibliothèque, contrôle le jeton du stockage et conserve l’original comme état précédent dans la même transaction. Les nouvelles URL abrégées et la diffusion d’une bibliothèque non corrigée restent refusées. Le secours brut d’origine est indépendant des écritures d’une autre fenêtre.
- Les anciens imports concernés restent refusés sans modifier la bibliothèque courante, avec emplacements à corriger et procédure documentée. Les autres erreurs de schéma, images, catalogue ou protocole ne bénéficient d’aucune tolérance supplémentaire.

## 25 octobre 2026 — Contrat de politesse des emplacements vocaux (#122)

- `#error` sépare deux familles : alertes persistantes (échec de sauvegarde, lecture seule) stockées dans l’état et restaurées depuis `A.State.restoreErrorFromState` ; erreurs ponctuelles (champs invalides, actions refusées) qui n’éteignent plus la persistante. `failing(false)` n’efface la mémoire persistante que lorsque plus aucune cause ne la soutient (ni `failed`, ni `readOnly`), pour que `restoreErrorFromState` sache rétablir l’alerte après une sauvegarde qui réussit pendant une lecture seule. Correction du secours disparu après « Annuler les champs invalides » (#86).
- `#notice` étend le jeton `since` aux écrivains différés restants : chargement d’image, copie du courriel, récupération, offre de ré-ouverture, reprise de la main, invite d’installation PWA, export de la copie brute du stockage et annonce de rechargement après activation d’une mise à jour PWA. L’import de projet (`project-input`) utilise un compteur de reads actifs : seul le premier import en cours pose la notice et capture le jeton, les suivants s’empilent sans toucher au `#notice` ni au ticket.
- Section « Annonces » ajoutée à `docs/MAINTENANCE.md` : trois emplacements, propriétaires, deux familles de `#error`, règle du jeton `since`, inventaire des écrivains protégés avec l’exemption motivée du formulaire modal de la bibliothèque, et sous-sections dédiées aux chaînages optionnels nécessaires (dette `pwa.js` et contrainte SNUM `files.js`) et à l’alerte persistante masquée temporairement par `attempt()` (hors scope du contrat).
- Exclusion motivée : volet #107 non reproduit en test (cadre d’audit sans scénario stable), retiré de #122.

## 25 octobre 2026 — Lien source dans le cadre du bloc (#71)

- Le lien « Consulter la source » n'est plus rendu dans une table enveloppe de 600 px distincte : il est injecté comme ligne additionnelle dans la table `wlkm-cl` (496 px) du bloc qui le porte, pour qu'il appartienne visuellement au même cadre éditorial que son article.
- L'intitulé personnalisable `sourceLabel` et son repli « Consulter la source » restent inchangés ; échappement HTML conservé.
- Sur la variante `articleTextTemplate` (SNUM, `mail-31` sans vignette), la bordure basse de séparation est déplacée de la cellule de contenu à la ligne du lien, afin que l'article et sa source forment un seul bloc avant la séparation avec le bloc suivant.
- Repli de compatibilité : si un bloc ne porte pas de cadre `wlkm-cl` (`mail-04`, `mail-07`, `mail-51`), l'ancienne table enveloppe est conservée.
- Tests dédiés : `tests/source-in-frame.test.cjs` (structure, placement dans le cadre, repli, échappement).

## 24 octobre 2026 — Convertisseur SNUM aligné sur le modèle éditorial (#46)

- Un seul bloc « Article sans image » (`mail-31`) par article, sous une partie `mail-17` numérotée par rubrique V519 présente ; titre lié à l’URL, métadonnées « Essentiel · source · date en toutes lettres », puis fait, « À retenir », « Pour le SNUM » et mots-clés dans le même bloc. Les sous-titres de niveau 4 disparaissent par choix de simplification ; le texte reste.
- Introduction alignée sur la convention du paquet : dates de période en toutes lettres, compte d’articles et d’essentiels au singulier ou au pluriel.
- Mention et signature, gestion des abonnements à trois actions et pied Marianne avec le lien vers les données personnelles conservé ; nom de service, signature et adresses fictifs à remplacer par l’identité locale.
- Paire synthétique publique `tests/fixtures/snum-46/` et test de conversion dédié ; dix assertions de forme réécrites. Fidélité visuelle au modèle et réception en messagerie (#13) non vérifiées.

## 23 octobre 2026 — Page de composition extensible (#28)

- Liste et catalogue natif entièrement dans le flux de la page ; champs de contenu ajustés au texte et aperçu ajusté à son document réel. Zone JSON compacte conservée.
- Retour au bloc sélectionné disponible depuis les champs, y compris avec une saisie invalide.
- Seul script de mesure isolé autorisé par décision utilisateur : origine opaque, CSP par empreinte, réseau bloqué ; exports, copie et SNUM préservés.
- 119 tests applicatifs réussis sans saut, recette Firefox portable et web à trois largeurs et au zoom natif de 200 %, frappe et image tardive vérifiées ; [preuves et limites](docs/RECETTE-DEFILEMENT.md).

## 22 octobre 2026 — Atelier autonome et corrections

- Application portable et webapp issues du même socle : 52 composants, accueil « Mes newsletters », bibliothèque locale, modèles, identités et images incorporées.
- Échange JSON générique documenté ; conversion Collecte SNUM dans une page autonome, avec conservation du contrat v1.
- Corrections des courses de sauvegarde, restauration, import et images ; validation des données et erreurs explicites ; cache limité au périmètre et mises à jour reproductibles.
- Copie adaptée aux messageries qui retirent les styles de tête ou figent les largeurs, avec conservation des filets décoratifs et du contenu.
- Focus après suppression du dernier bloc générique rétabli sur « Ajouter un composant », même si cette section est fermée ; régression reproduite puis corrigée.
- Intitulé du lien source personnalisable par bloc, conservé dans les modèles, identités, exports/imports et copie HTML/texte ; anciens fichiers acceptés, texte par défaut conservé si le champ est vide.
- Interface du builder sur les ressources DSFR web 1.15.4 incorporées : Marianne, conteneurs communs, grille à douze colonnes, champs et boutons. Repli et espacements vérifiés sur cinq largeurs ; CSS des courriels et apparence SNUM préservés.
- Mise à jour web corrigée après reproduction d’un ancien HTML repris du cache HTTP de dix minutes : précache rechargé depuis le réseau et version du cache liée aussi au code du worker, sans activation anticipée ni perte de bibliothèque.
- Suite courante de 70 tests réussis sans saut, génération reproductible, recettes natives Mac et essais de messages reçus depuis Gmail et Mélissa.
- Campagne AY11 : 228 variantes de sondes sur quatre états, complétées par dix observations DOM/arbre d’accessibilité du focus. Limites des collecteurs conservées ; aucune annonce de lecteur d’écran ni conformité RGAA déduite.
- Publication GitHub Pages réalisée depuis `main`, limitée aux fichiers statiques de l’atelier, au convertisseur SNUM et au portable ; huit fichiers servis identiques aux distributions, cache public et bibliothèque conservés au rechargement hors connexion.

Les 25 issues techniquement satisfaites ont été fermées sur GitHub. #2 reste ouverte pour les recettes de lecteur d’écran ; #13 pour la qualification complète du transport. Windows/Outlook, les images bloquées, l’installation sur le parc et l’autorisation de son accès à l’origine HTTPS restent à vérifier. La correction de largeur possède des tests locaux ; sa fidélité reçue demeure en qualification. L’activation de Pages et le choix de `main` par défaut ont été effectués dans la session Chrome du propriétaire.
