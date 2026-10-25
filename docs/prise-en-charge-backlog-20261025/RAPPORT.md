# Prise en charge du backlog validé — 25 octobre 2026

Les 22 issues (#13, #52, #130 à #149) disposent d’un résultat local, d’une investigation bornée ou d’une dépendance explicite. Les correctifs sont dans le worktree `/Users/alex/Claude-worktrees/builder-backlog-qualification-20261025`, branche `fix/backlog-qualification-20261025`, base `395c08d1dfa4d0b8e41416da798bf0313a8bd379`. Aucun commit, push, merge, déploiement, courrier ou ticket clôturé.

## Résultat technique

Les défauts produit démontrés sont corrigés localement : les navigations d’aperçu sont sérialisées avec un seul chargement actif et le dernier rendu en attente ; les ouvertures évitent les rendus redondants ou masqués ; les tables du HTML copié gardent leur largeur maximale après réécriture par le destinataire WebKit. Le contenu, les gardes de stockage, la CSP et les sorties non concernées sont conservés.

Le harnais distingue désormais quota physique et panne injectée, AX natif et noms calculés, presse-papiers natif et relecture interceptée, PWA hors connexion et réseau réellement coupé. Les attentes de fin d’écriture/réparation sont observables. L’image préparée reste strictement conservée dans les sorties, sans exiger son égalité avec une source dont le réencodage est autorisé.

#138 : arbitrage délégué, repli accepté au plus tard à la première modification de l’ancien onglet, sans écrasement et avec contenu exportable. Le garde de jeton est éprouvé par un mutant refusé. Le produit n’a pas été modifié pour imposer un bandeau proactif. Le filet violet de #137 était déjà de trois pixels : la bordure fusionnée expliquait le rectangle de quatre pixels.

fast-uri est passé de 3.1.8 à 3.1.9 dans le verrou, puis réellement réinstallé ; audit npm à zéro vulnérabilité. Le skill newsletter-contribution reste inchangé et à sa place.

## Preuves

- macOS, Node 24.18.0 et Playwright 1.64.1 : **npm test final 397/397, zéro échec, zéro skip**, code 0, durée 427690 ms, sources figées conformes aux 76 empreintes. Journal et reçu dans coordination/gates/macos-final-*. Les ciblés passent aussi **13/13 sous chacun des trois moteurs**.
- Provenance et distributions : trois contrôles de npm run check réussis ; log et reçu dans coordination/gates/.
- Linux Ubuntu 24.04.5 arm64, Node officiel 24.18.0, Playwright 1.64.1 : **npm test final 397/397, zéro échec, zéro skip**, code 0, durée 501075 ms, sans inspecteur ni intervention. Les 346 empreintes du snapshot et les 76 de la candidate sont inchangées ; conteneur supprimé. Reçu et log : parcours/linux/final-oracle-integrated/. La campagne antérieure interrompue code 143 reste conservée comme non concluante.
- Dernier delta récupération/intitulés/frappe : cinq tests par moteur sur Mac et Linux ; aperçu huit tests par moteur ; frappe CPU×6 sans préchargement initial ; preuves dans parcours/integration/ et portabilite/.
- Rendu : trois tests par moteur ; copie 590 cas Chromium et 590 WebKit ; vrai filet de quatre pixels refusé.
- Audit natif ShipGuard 2.18 : cinq zones isolées, 72 fichiers, cinq artefacts acceptés et identités vérifiées. Supplément ciblé sur le dernier delta : manifeste 74 fichiers conforme, dix invariants indépendants rejoués. Aucun P0/P1, trois P2 et un P3 préexistants conservés. Voir audit-final/RAPPORT.md et SUPPLEMENT-APERÇU.md.

L’audit natif initial porte sur son overlay historique, le supplément sur l’overlay `d02270f421f92ab06b10eeeba9cd1616085c931234a8f5a4fb2b56978f1272cb`. La candidate finale a l’overlay **`c43f9e5f67bcee948de67b57d9a51d4b20454bd1ed5a5bdd291de3ecc57b2ec5`** : trois fichiers de tests changent depuis le supplément, produit et distributions identiques. Identité et 76 empreintes : coordination/gates/final-candidate-identity.json. Revue indépendante du delta et des preuves : audit-final/REVUE-ORACLE-RESSOURCES.md. Les distributions sont identifiées séparément : portable version `de68d7f3ea4e8fc9`, SHA256 `622a289ddbaa4fdacc0ff96ff85caba21e4ab85225c3e622dc0ecebf2d3c23f7`. Le commit de base seul ne désigne pas cette candidate modifiée.

Les anciennes campagnes 390/391 et la matrice Firefox/WebKit refusée sont conservées dans coordination/gates/. Elles ont révélé les attentes et la fixture rejetées ; leurs échecs n’ont pas été reclassés. Les totaux du runner contiennent des sous-scénarios sur d’autres moteurs et ne sont pas des totaux purs par moteur. Aucune matrice finale complète Firefox/WebKit n’est revendiquée à partir de ces anciens fichiers.

## Adaptation du harnais d’aperçu

La préparation générique ne dépend plus du règlement non borné des promesses decode qui ignoraient tous leurs rejets. Elle exige le document final (URL, titre, readyState), les 24 images du catalogue ou zéro image de la fixture courte, toutes complètes avec dimensions naturelles positives, puis fonts.ready. Les images CSS masquées restent incluses ; l’état complet est revalidé après les polices. Chaque étape a une borne de dix secondes et tout dépassement échoue.

Ce nouvel oracle prépare la géométrie ; il ne prétend ni équivalence avec decode(), ni décodage réussi ou peinture effective des pixels. Le test d’image tardive conserve ses deux decode sans catch et ses assertions d’agrandissement/réduction. Les contrôles de sécurité, géométrie et URL sont conservés. Cinq contre-épreuves natives (image cassée masquée, manquante, réponse image retenue, URL/titre périmés, vraie police HTTP retenue) refusent les états invalides puis acceptent leur correction. Voir parcours/linux/DECISION-ORACLE.md et oracle-resources/RAPPORT-ORACLE.md.

La cause interne du blocage des promesses natives reste inconnue. Cette adaptation du test ne prétend pas corriger Chromium ou démontrer l’innocence de l’application dans tous les contextes. Les essais A/B et les minimisations non discriminantes restent conservés.

## Dépendances et inconnus

- **#13/#52 : recette réelle Windows, Outlook classique/nouveau et Mélissa requise.** Kit prêt dans coordination/recette-messageries/ : portable figée, compositions PNG/JPEG réellement importées, références natives HTML/texte, empreintes, procédure et douze reçus NOT_EXECUTED. Deux imports Chromium passent ; aucun collage/client/envoi/réception exécuté.
- **#130 : cause originelle CI Linux inconnue.** La perte contrôlée du marqueur prouve le défaut de fixture ; la nouvelle fixture n’en dépend plus. Une campagne Linux locale arm64 ne constitue pas une exécution du runner GitHub x86.
- **#142/#145 : timeouts historiques non reproduits, causes inconnues.** Diagnostics améliorés ou historique localisé ; décision explicite de conserver ces tickets ouverts et d’attendre une trace reproductible avant toute correction spéculative.
- **#149 : intégration ShipGuard requise.** Patch préparé, trois scénarios CLI réels (succès/erreur/SIGINT) préservent une session témoin indépendante. Le skill installé et son générateur restent inchangés ; cycle natif complet non qualifié.
- **Audit résiduel :** agrégats du runner mêlant les moteurs, deux recettes anciennes aux attentes obsolètes et catalogPreview dupliqué. Aucun nouveau ticket créé ni correction hors périmètre.
- Quota physique hors Chromium, lecteur d’écran, IME natif, Safari installé, installation PWA du parc et messageries restent des couches non qualifiées.

## Tickets et préservation

Les amendements de #13, #138, #141 et #148 sont publiés et relus via GitHub : corps/titres exacts, états ouverts et métadonnées conservées. Reçus : coordination/recu-amendements.json. Le suivi final de #13, #52, #130, #141, #148 et #149 est également publié et relu, avec états ouverts et métadonnées préservés : coordination/recu-suivi-final.json. Le connecteur a refusé l’écriture (403), le client gh authentifié du même compte a servi de repli.

Le checkout principal et ses fichiers préexistants sont préservés. Aucun travail concurrent capturé. Les ressources de tests sont privées ; aucun nettoyage global ni navigateur personnel piloté. Les worktrees d’audit sont conservés comme preuve.

Le détail des 22 décisions est dans registre-preuves.md ; la méthode et les limites dans recette-execution.md. Ce dossier présente une candidate locale révisable. **Gates automatisés locaux acquis ; NO-GO production tant que les recettes Windows/Outlook/Mélissa et l’intégration du nettoyage ShipGuard restent requises.**
