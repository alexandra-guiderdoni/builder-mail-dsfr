# Historique des livraisons

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
