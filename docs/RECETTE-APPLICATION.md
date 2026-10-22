# Recette de l’application autonome

**Application réalisée localement, qualification métier incomplète.** Observations des 21 et 22 octobre 2026 sur macOS 26.5.2, Firefox natif 156.0 et Chromium 156.0.8078.4. La dernière campagne couvre l’accueil « Mes newsletters », le builder générique et la page SNUM séparée. La recette du [prototype](RECETTE.md) reste historique et distincte.

Le [reçu initial](recette-application-observee.json) identifie la campagne historique. Les profils isolés, captures et téléchargements restent sous `evidence/`, ignorés par Git. Les essais automatisés n’utilisent aucun compte ; les recettes Gmail et Mélissa ci-dessous utilisent uniquement les sessions et le destinataire autorisés. Les preuves publiées ne reproduisent aucune donnée personnelle.

## État de livraison du 22 octobre

La campagne après corrections donne **64 tests réussis, 0 échec, 0 saut**, en 23,666 s. `npm run check` renvoie `APPLICATION_DISTRIBUTIONS_OK` et `DISTRIBUTIONS_OK`. Le [reçu de livraison](recette-publication.json) conserve les empreintes des sources, distributions et journal ; le journal brut local est `evidence/suite-publication-20261022.log`. Les observations historiques plus bas gardent leurs nombres et limites propres.

Les essais réels sur macOS 26.5.2, Firefox 156.0 et Chrome 155.0.8059.85 ont constaté :

- Gmail vers Gmail : six images MIME résolues ; les PNG et JPEG principaux ont les mêmes octets et SHA-256 que les originaux. Le collage part du bouton du builder et de la commande native de collage.
- Mélissa dans Chrome vers Gmail : message reçu, 42 tableaux, cinq références CID vers quatre parties image résolues, dont la signature conservée ; les deux images principales PNG/JPEG sont identiques aux originaux. La version précise du serveur Mélissa n’est pas connue.
- Un défaut réel de largeur : le HTML reçu contient une table extérieure figée à 800 px et n’a plus les règles `.wlkm` ni les media queries de la tête. Le centrage seul n’est pas une cause démontrée.
- Une correction locale de copie : bornes inline et cellules de contenu sans largeur figée. Un test initial reproduit 785 px de contenu dans 584 px disponibles. Les tests passent ensuite sans CSS de tête à 390, 600, 800 et 1024 px, y compris après fixation des tables extérieures à 800 px. Texte, liens et images visibles sont comparés ; Chromium peut retirer les logos blancs masqués de sa copie en mode clair.
- La revue a trouvé une régression visuelle des filets de `mail-35` et `mail-36`, passée de 3 px à environ 299,5 px. Les cellules décoratives gardent désormais leur largeur ; le test après copie mesure 3,5 px avec la demi-bordure fusionnée.

Les reçus privés sont dans `evidence/gmail-mac-20261022/`, `evidence/melissa-mac-20261022/` et `evidence/qualification-finale-20261022/`. Un nouveau message texte avec footer a été envoyé depuis le bouton natif Mélissa après correction ; sa réception et sa largeur restent à contrôler. Ces recettes ne qualifient ni Outlook, ni Windows, ni les images bloquées, ni toutes les familles en clair/sombre. Le [suivi des critères](SUIVI-CORRECTIONS.md) garde #2 et #13 ouvertes.

## Observations exécutées

| Contrat | Observation et limite | Preuve |
| --- | --- | --- |
| Référence | Les cinq copies sont identiques aux fichiers amont épinglés et aux empreintes déclarées. | Vérification SHA-256 et comparaison des octets ; `reference/provenance.json`. |
| Catalogue | 52 sections, 178 champs ; structures DOM et attributs de présentation comparés dans le navigateur, CSS identique. | `tests/browser.test.cjs` ; `evidence/application/catalogue-dom.json`. Les textes et attributs de contenu adaptés sont exclus de cette égalité structurelle. |
| Première ouverture portable | Profil neuf hors connexion, catalogue et ressources disponibles. | Parcours Chromium, sans requête distante réussie ni dépendance à un cache préparé. |
| Composition | Ajout, sélection, édition, déplacement, duplication, retrait, modèles, identités, fichiers et images locales exercés. | Parcours Chromium et Firefox ; téléchargements réellement relus. |
| Bibliothèque | Plusieurs compositions, modèle et identité ; export/import dans un profil neuf avec images. | `parcours-chromium.json` ; recette Firefox vers une origine web distincte. |
| Accueil et gestion | Éditions conservées à la réouverture ; ouverture, création, renommage, copie et export sur une entrée non active ; suppression annulée puis confirmée, dont la dernière composition. Focus restauré et fenêtre de 390 px sans débordement. | `tests/library-browser.test.cjs`, `bibliotheque-accueil.json`, `accueil-newsletters.png` et `accueil-newsletters-mobile.png`. |
| Navigation protégée | Champ invalide et image en chargement : retour refusé avec travail affiché. Panne de sauvegarde : export de bibliothèque toujours accessible et stockage précédent intact. | Trois scénarios d’accueil, complétés par les scénarios de concurrence et récupération existants. |
| Persistance | Réouverture puis redémarrage complet de Firefox ; bibliothèque retrouvée. | `firefox-last.json` et son reçu détaillé. |
| JSON générique | Texte collé et fichier importés sans perte des compositions existantes ; ancien contrat v1 conservé. | `tests/model.test.cjs`, `tests/interchange-browser.test.cjs` ; exemple et bibliothèque des 52 variantes validés contre le schéma. Le moteur exerce les règles complémentaires. |
| SNUM séparé | Paquet réel converti dans la page dédiée puis JSON importé dans Firefox ; titre avec source dupliqué, URL présente deux fois dans le HTML téléchargé. | Recette native ; `separation-snum.json`. La duplication porte sur un bloc, pas sur tout le groupe d’un article. Remarques de collecte exclues du courriel. |
| Présentation SNUM | Cinq rubriques et cinq titres d’articles dans le scénario synthétique ; titres de 22 px et contenus répartis en blocs. HTML exporté identique après import dans le builder. | `tests/interchange-browser.test.cjs`, `snum-standalone.png`. Première ouverture sans réseau ; saisie modifiée ou invalide : exports désactivés et dernière conversion conservée. |
| Copie | HTML et texte relus dans le presse-papiers Chromium, source dupliquée et image incorporée. Écriture réussie dans Firefox par activation clavier native. | `parcours-chromium.json` ; permissions accordées au profil Chromium de recette. Pas de relecture du presse-papiers Firefox. |
| Contenus invalides | Champs inconnus, mauvaise version, autre catalogue, script et liens actifs refusés ou échappés ; import existant préservé. | Tests du modèle et parcours réels d’import invalide. |
| Stockage | Quota simulé : aucune écriture partielle, export du travail en mémoire, récupération échouée sans remplacement puis reprise réussie. | `tests/storage-browser.test.cjs`. Ce n’est pas une mesure de quota réel du parc. |
| Concurrence | Une fenêtre obsolète ne peut ni sauvegarder ni restaurer par-dessus l’autre ; stockage et travail local conservés. | Scénarios navigateur de conflit et récupération obsolète. |
| Version inconnue | Stockage conservé jusqu’à récupération explicite ; export brut disponible. | Injection de version 99 dans le profil de recette. Aucune migration de données future n’est prouvée. |
| Lecture en cours | Export empêché pendant le chargement d’image et en présence d’un champ invalide. | Scénario navigateur avec lecture retardée. |
| Fermeture pendant sauvegarde | Avertissement réel `beforeunload`, départ annulé avec travail intact, puis fermeture sans avertissement après sauvegarde et composition retrouvée à la réouverture. | `fermeture-sauvegarde.json` ; écriture retardée avant la transaction IndexedDB réelle. Aucun arrêt forcé du processus n’est exercé. |
| Cycle web | Nouvelle version de cache proposée, sauvegarde, activation explicite et bibliothèque inchangée. | `pwa-chromium.json` ; variation contrôlée du cache et commentaire HTML, sans déploiement réel. |
| Hors connexion web | Serveur effectivement arrêté et connexion refusée ; rechargement réussi dans les deux moteurs, puis redémarrage complet de Firefox. | Reçus PWA et Firefox. |
| Périmètres web | Deux installations dans des chemins distincts gardent chacune leur cache après activation et arrêt du serveur. | `pwa-scopes.json`. Leur bibliothèque reste partagée par origine. |
| Manifeste | Aucune erreur de manifeste ou d’installabilité rapportée par Chromium. | Diagnostics CDP ; distincts de la recette d’installation ci-dessous. |
| Installation PWA sur Mac | Installation réelle pilotée par DevTools, fenêtre autonome, navigateur entièrement redémarré, relance installée serveur arrêté avec accueil, bibliothèque et image ; désinstallation de recette observée. | `native-install-1792658205490/receipt.json`. Boucle locale uniquement ; dialogue humain et raccourci du système non vérifiés. |

Les contrôles clavier utilisent des activations par Entrée et les contrôles natifs ; la saisie Firefox est pilotée via des événements d’entrée dans son profil de recette. Ces observations ne constituent pas un audit d’accessibilité complet.

## Commandes et résultats

Exécutées depuis la racine du dépôt applicatif :

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts
python3 scripts/build_app.py
npm run check
npm test
node --test tests/browser.test.cjs tests/interchange-browser.test.cjs
node --test tests/library-browser.test.cjs
SNUM_RECIPE_PACKET=evidence/snum-input.json node scripts/recipe_firefox.mjs
node scripts/recipe_installation.cjs
ruff check scripts/build_app.py scripts/catalogue.py scripts/interchange.py
```

- Installation de développement : deux paquets ajoutés, audit npm sans vulnérabilité signalée. Aucun navigateur nouvellement téléchargé ; Chromium existant utilisé.
- Génération et comparaison : `APPLICATION_DISTRIBUTIONS_OK` et `DISTRIBUTIONS_OK`.
- Campagne historique de l’accueil : **28 réussites, 0 échec, 0 test sauté**, en 11,233 s ; journal `accueil-suite-finale.log`. La campagne courante de 64 tests figure en tête de cette fiche.
- Accueil : **3 tests ciblés réussis**, journal `accueil-parcours-cibles-final.log`. La distribution sans accueil avait d’abord échoué sur l’absence de cet écran : `accueil-test-rouge.log`.
- Parcours ciblés de séparation : **4 tests réussis**, journal `separation-parcours-cibles.log`.
- Firefox : **PARCOURS_FIREFOX_OBSERVE**, cinq groupes de contrôles incluant accueil, conversion séparée puis import générique, aucune erreur enregistrée ; reçu `firefox-1792657967435/receipt.json`.
- Installation Mac : **INSTALLATION_RELANCE_OBSERVEES**, quatre groupes de contrôles, aucune erreur enregistrée ; reçu `native-install-1792658205490/receipt.json`. Les fenêtres autonomes sont identifiées dans le navigateur et les données comparées après redémarrage complet, serveur effectivement arrêté.
- Syntaxe des scripts et worker généré vérifiée par `node --check` ; les trois compilateurs passent Ruff.
- Schéma : métaschéma 2020-12, exemple et bibliothèque des 52 variantes contrôlés par `jsonschema` 4.26.0 déjà présent sur le poste de développement. Aucune dépendance ajoutée à l’application.

Sans le paquet réel local ignoré, `node scripts/recipe_firefox.mjs` utilise le paquet synthétique livré. Les prérequis et commandes de reproduction figurent dans [MAINTENANCE.md](MAINTENANCE.md).

## Incidents et revue indépendante

La revue indépendante du code et des preuves a trouvé trois défauts absents des 16 premiers tests : récupération concurrente réutilisant un token trop récent, nettoyage des caches trop large et composition active perdue à l’import. Les trois scénarios ajoutés ont d’abord échoué, puis réussi après correction. Une relecture indépendante ciblée a confirmé la résolution du P1 de récupération ; les deux P2 ont été vérifiés par les scénarios de régression du fil responsable.

La récupération conserve désormais le token observé, attend une transaction réussie avant de remplacer la mémoire et désactive temporairement les commandes. Le cache inclut le périmètre d’installation ; l’import conserve la correspondance de l’identifiant actif. Les tests de quota vérifient aussi qu’une récupération refusée préserve le travail en mémoire.

Une première campagne finale a eu 19 réussites et une fermeture de contexte Chromium pendant la lecture retardée d’image, alors qu’une recette Firefox indépendante tournait aussi. La cause de cette fermeture n’est pas établie. Le cas isolé a réussi, puis la campagne complète sans autre recette simultanée a réussi. Journaux conservés : `tests-final.log`, `reprise-lecture-fichier.log`, `tests-apres-reprise.log`.

Le contrôle local Ruff a aussi imposé la liaison explicite d’une variable de remplacement dans le compilateur et l’emploi de dictionnaires littéraux dans le générateur de qualification. Une attente de scénario de récupération a été corrigée pour attendre sa notification effective. Les sources passent ensuite les contrôles décrits ci-dessus.

Installation : une sonde initiale a réussi, puis trois exécutions du scénario ont échoué, une à la capture et deux en recherchant la cible renvoyée par `PWA.launch`. Le diagnostic a montré que cet identifiant disparaissait alors qu’une autre fenêtre de l’application apparaissait. Après arrêt de cette stratégie, le scénario suit la fenêtre survivante par son URL de recette et son mode autonome, refuse les cas ambigus et contrôle ses données. La recette réussie constate le remplacement de cible aux deux lancements et ne constate que les fermetures volontaires. Les reçus d’échec restent sous `native-install-1792618601633/`, `native-install-1792618654519/` et `native-install-1792618716219/`. Toutes les installations de recette ont été retirées par le navigateur.

Séparation SNUM : le premier parcours a recherché un article avant la fin de la lecture asynchrone du JSON importé. Le test attendait une indication de sauvegarde déjà présente pour la composition précédente. L’attente porte désormais sur la notification de fin d’import, puis sur la sauvegarde. Le journal initial `separation-premier-parcours.log` est conservé ; les quatre parcours ciblés puis la campagne complète de 25 tests réussissent. Cette correction concerne le scénario de recette.

La revue indépendante de cette séparation n’a relevé aucun P0, P1 ou P2. Elle a lu la compatibilité du contrat, l’isolation SNUM, la conservation des données, le rendu et les sorties périmées ; elle n’a lancé ni tests ni navigateur. Les recettes exécutées ci-dessus constituent la preuve comportementale complémentaire.

Accueil « Mes newsletters » : la revue préalable ShipGuard `sg-pre-review` donne GO pour étendre l’interface et réutiliser modèle, stockage et imports. L’appel Claude demandé en parallèle a dépassé 180 secondes sans avis exploitable ; l’utilisateur a ensuite explicitement autorisé de poursuivre sans cet avis. Aucun accord Claude n’est revendiqué. La revue finale indépendante du code n’a relevé aucun P0/P1/P2 ; elle reste statique et distincte des 28 tests exécutés.

Le helper clavier de recette pouvait donner le focus à un contrôle encore masqué pendant une transition puis envoyer Entrée au mauvais élément. Les symptômes étaient un retour de focus manquant après annulation et un dialogue de renommage jamais ouvert. Il attend maintenant la visibilité avant l’activation. Les journaux ciblés d’échec et d’instrumentation restent sous `accueil-focus-*` et `accueil-parcours-cibles.log` ; l’instrumentation temporaire a été retirée. Les trois cas puis la campagne complète réussissent. Le retour de focus applicatif prévoit aussi une ligne de repli après suppression.

## Recette sur le poste métier

Accès restant : Windows/Firefox, Outlook installé, lecteur d’écran du parc et origine HTTPS autorisée. Mélissa a été utilisé sur Mac avec un mandat d’envoi distinct. Aucun accès supplémentaire ni autorisation de déploiement ne découle de ce dossier. Une recette Windows et une URL approuvée restent nécessaires.

Fichiers préparés : [atelier portable](../app/distribution/portable.html) et [bibliothèque de qualification](../app/distribution/qualification.courriels.json). Importer cette bibliothèque par « Fichiers et récupération » : elle ajoute neuf compositions, couvrant chacune une famille et ensemble les 52 sections une fois. Remplacer les valeurs de démonstration et les liens réservés par des données de recette autorisées.

| Famille | Sections | Contrôle particulier dans le message reçu |
| --- | --- | --- |
| En-têtes | 4 | Pré-en-tête, lien en ligne, variantes de logos clair/sombre. |
| Titres | 11 | Hiérarchie, fonds, tailles et titre avec image. |
| Textes | 11 | Paragraphes, listes, accents et ordre de lecture. |
| Images | 6 | Proportions, alternatives, sources et images bloquées. |
| Cartes | 5 | Colonnes, vignettes et boutons. |
| Mises en avant | 4 | Fonds, chiffres clés et séparateur. |
| Contacts | 1 | Libellés, coordonnées de recette et lien. |
| Actions | 5 | Trois boutons et liens de texte. |
| Pieds de page | 5 | Logos, liens, abonnements et clôture. |

Pour chaque messagerie, un opérateur autorisé relève les versions exactes et les restrictions, puis :

1. Ouvrir le portable réseau coupé, modifier texte et image, attendre la sauvegarde, fermer puis rouvrir.
2. Exporter la bibliothèque et l’importer dans un autre profil ou poste ; contrôler compositions, modèles, identités et images.
3. Importer les familles de qualification. Copier une composition dans un nouveau message, reporter l’objet et effectuer une retouche dans la messagerie.
4. Selon le mandat d’envoi fourni séparément, faire envoyer le message de recette puis examiner le message reçu, les liens, l’ordre, les fonds, les images disponibles et bloquées, ainsi que les modes clair/sombre proposés.
5. Répéter dans l’autre messagerie et consigner chaque famille avec son résultat, une preuve expurgée et les différences observées. Un résultat local d’aperçu ne remplace pas cette réception.
6. Depuis une origine HTTPS autorisée, préparer le cache, observer séparément l’installation native si permise, fermer l’application puis la relancer réseau coupé. Relever si le lancement vient effectivement de l’application installée.

À consigner : environnement, méthode de reprise, famille, résultat du collage, retouche, résultat reçu avec/sans images, résultat hors connexion et limites. Les preuves partagées doivent être expurgées de données personnelles et de contenus métier non autorisés.

## Verdict et limites

Validation structurelle PDV — cible : séparation JSON générique / SNUM. Sources inspectées : `app/source/imports.js`, `library-actions.js`, les deux gabarits de page, `app/snum/`, `scripts/build_app.py`, `interchange.py`, moteur et tests dépendants. La logique métier quitte le builder ; le modèle, le rendu et les sorties restent partagés. Aucun moteur parallèle ni migration artificielle n’est ajouté. Diff et dépendants relus, simplifications recherchées, responsabilités et fichiers volumineux contrôlés : **GO, aucun bloqueur structurel relevé**. La revue indépendante est statique ; les contrôles exécutés sont listés plus haut.

Les sources applicatives et les compilateurs restent sous 200 lignes par fichier ; le plus long atteint 194 lignes. Les distributions, le schéma et la bibliothèque de recette sont générés, le gabarit amont conservé intégralement : [justifications](../reference/NOTICE.md). Modèle, rendu, stockage, import et interface ont des responsabilités séparées ; aucun worker de calcul ni dépendance d’exécution n’a été ajouté. La duplication des livraisons est produite par le générateur.

PDV, tranche accueil : `library.js` possède les deux vues et les actions par identifiant ; les contrôles communs de fichiers restent hors des vues masquées. Aucun nouveau stockage, format ou état de navigation persistant. Les dépendants et recettes ont été adaptés ; aucun bloqueur structurel relevé, **GO**. Les empreintes du modèle, du stockage, de l’état, des imports, du rendu et du HTML SNUM sont identiques à celles de la recette précédant cet accueil. Ce résultat ne démontre pas une conformité DSFR/RGAA complète.

**GO local pour la livraison des corrections vérifiées ; qualification métier complète non atteinte.** Restent non vérifiés : Windows/Outlook, fidélité reçue après correction de largeur et par famille, images bloquées, lecteur d’écran, parcours humain d’installation sur le parc, raccourci du système et HTTPS approuvé. L’installation via DevTools reste bornée au Mac. Le contrôle structurel ne couvre pas les effets de tous les CSS dans chaque moteur mail, les restrictions d’entreprise, la pérennité après effacement de profil ni une migration de schéma. Aucun audit RGAA complet n’est revendiqué.

Le mandat courant autorise la publication sur `main` dans le seul dépôt personnel et la clôture des 25 issues techniquement satisfaites. #2 et #13 restent ouvertes. Les amonts et l’historique du prototype restent préservés.

PDV de la correction de copie : `render.js`, `files.js`, leurs dépendants builder/SNUM et les tests de mise en page ont été relus. La préparation reste dans le moteur de rendu, sans nouveau stockage, format, moteur parallèle ou dépendance. Les sources concernées restent sous 200 lignes ; les distributions volumineuses sont générées et justifiées dans la notice. La revue indépendante a fait corriger les filets décoratifs et donne GO local ; les 64 tests du fil principal passent. **GO structurel pour cette correction**, sans déduire une qualification des messageries ou du parc.
