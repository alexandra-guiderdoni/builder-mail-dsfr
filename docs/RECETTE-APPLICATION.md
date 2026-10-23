# Recette de l’application autonome

La [campagne d’accessibilité du 23 octobre](accessibilite/css-20261023/RAPPORT.md) complète cette recette : **110 tests applicatifs réussis sans saut**, titres natifs et présentation CSS, 1 248 cas de rendu et copie, contraintes obligatoires et transitions d’erreur, parcours complet Firefox rejoué, matrices 106/258 et limites explicites. Quatre causes sont corrigées dans le rendu dérivé ; 148 entrées du validateur local, 832 comparaisons historiques de rendu et 16 comparaisons de couleurs conservent leurs résultats et limites. Huit familles d’erreurs du validateur restent à instruire. Le retrait des quinze déclarations `font-color` conserve les couleurs calculées dans les moteurs disponibles, sans recette de messagerie déduite. Le titre HTML utilise le nom de composition quand l’objet est vide ; trois exports ouverts dans Firefox complètent les tests Chromium. La lecture filtrée du presse-papiers Chromium retire ce titre ; aucun collage en messagerie de cette version n’est qualifié. Les 13 liens intégrés sans intitulé empêchent copie et téléchargement HTML ; anciens imports, aperçu neutralisé et récupération JSON restent disponibles. La copie conserve les gouttières avec des colonnes égales ; l’export garde les proportions d’origine. Les campagnes antérieures ci-dessous restent historiques. Qualifications humaines et clients restent ouvertes ; aucun taux RGAA validé.

Le [protocole de contraste](accessibilite/contrastes-20261022/RAPPORT.md) distingue 74 mesures et six constats d’inactivité modale, avec cinq contrôles négatifs. La campagne courante renouvelle ces observations et conserve les résultats axe incomplets ; la qualification globale des couleurs reste ouverte.

Le [zoom natif Firefox](accessibilite/zoom-20261023/RAPPORT.md) possède sa recette distincte : 245 observations de documents, valeurs complémentaires et accès au dialogue par Tab et molette. Les captures ne qualifient ni la lisibilité globale ni les annonces vocales.

**Application publiée, qualification métier incomplète.** Observations des 21 et 22 octobre 2026 sur macOS 26.5.2, Firefox natif 156.0 et Chromium 156.0.8078.4. Les campagnes couvrent l’accueil « Mes newsletters », le builder générique et la page SNUM séparée, puis l’origine HTTPS publique. La recette du [prototype](RECETTE.md) reste historique et distincte.

Le [reçu initial](recette-application-observee.json) identifie la campagne historique. Les profils isolés, captures et téléchargements restent sous `evidence/`, ignorés par Git. Les essais automatisés n’utilisent aucun compte ; les recettes Gmail et Mélissa ci-dessous utilisent uniquement les sessions et le destinataire autorisés. Les preuves publiées ne reproduisent aucune donnée personnelle.

## État de livraison du 22 octobre

La campagne historique après personnalisation des intitulés, intégration du DSFR web et correction de la mise à jour face au cache HTTP donnait **70 tests réussis, 0 échec, 0 saut**, en 26,764 s. `npm run check` renvoyait `APPLICATION_DISTRIBUTIONS_OK` et `DISTRIBUTIONS_OK`. Le [reçu de livraison](recette-publication.json) conserve ses empreintes des sources, distributions et journal ; son journal brut est `evidence/pages-20261022/suite-liens-dsfr-cache.log`. La campagne initiale de cette tranche donnait 70 réussites en 27,252 s. La campagne précédente de focus comptait 65 tests en 24,161 s, dans `evidence/ay11-20261022/suite-65.log`, après une campagne de 64 tests en 23,666 s. Les observations historiques plus bas gardent leurs nombres et limites propres.

Les essais réels sur macOS 26.5.2, Firefox 156.0 et Chrome 155.0.8059.85 ont constaté :

- Gmail vers Gmail : six images MIME résolues ; les PNG et JPEG principaux ont les mêmes octets et SHA-256 que les originaux. Le collage part du bouton du builder et de la commande native de collage.
- Mélissa dans Chrome vers Gmail : message reçu, 42 tableaux, cinq références CID vers quatre parties image résolues, dont la signature conservée ; les deux images principales PNG/JPEG sont identiques aux originaux. La version précise du serveur Mélissa n’est pas connue.
- Un défaut réel de largeur : le HTML reçu contient une table extérieure figée à 800 px et n’a plus les règles `.wlkm` ni les media queries de la tête. Le centrage seul n’est pas une cause démontrée.
- Une correction locale de copie : bornes inline et cellules de contenu sans largeur figée. Un test initial reproduit 785 px de contenu dans 584 px disponibles. Les tests passent ensuite sans CSS de tête à 390, 600, 800 et 1024 px, y compris après fixation des tables extérieures à 800 px. Texte, liens et images visibles sont comparés ; Chromium peut retirer les logos blancs masqués de sa copie en mode clair.
- La revue a trouvé une régression visuelle des filets de `mail-35` et `mail-36`, passée de 3 px à environ 299,5 px. Les cellules décoratives gardent désormais leur largeur ; le test après copie mesure 3,5 px avec la demi-bordure fusionnée.

Les reçus privés sont dans `evidence/gmail-mac-20261022/`, `evidence/melissa-mac-20261022/` et `evidence/qualification-finale-20261022/`. Un nouveau message texte avec footer a été envoyé depuis le bouton natif Mélissa après correction ; sa réception et sa largeur restent à contrôler. Ces recettes ne qualifient ni Outlook, ni Windows, ni les images bloquées, ni toutes les familles en clair/sombre. Le [suivi des critères](SUIVI-CORRECTIONS.md) garde #2 et #13 ouvertes.

## Intitulés et interface DSFR

Astra a confirmé deux défauts dans sa revue préalable : le texte source était écrit en dur et l’interface utilisait une grille, des polices et des contrôles locaux. Le correctif ajoute `sourceLabel`, facultatif et échappé, et incorpore les modules officiels DSFR 1.15.4 `core`, `form`, `input`, `select`, `button`, avec Marianne 400/500/700 et les icônes référencées. La provenance et les transformations sont décrites dans la [notice](../reference/NOTICE.md#interface-web-du-builder).

Les trois nouveaux tests de modèle ont été exécutés en échec avant correction, puis réussis. Deux tests navigateur complètent la suite : saisie clavier du nouvel intitulé, aperçu, vrai presse-papiers HTML/texte, téléchargement, rechargement et transfert JSON hors connexion ; puis typographie chargée, conteneurs communs, grille, espacements, accueil et repli à **320, 768, 992, 1248 et 1440 px**, sans débordement de la page. Le conteneur maximal mesure 1248 px, dont 1200 px utiles ; les colonnes de l’éditeur et de l’aperçu suivent le rapport 5/7 à partir de 992 px. À 320 px, l’ouverture d’une section et le passage vers son champ ont aussi été exercés au clavier.

L’intégration a révélé un aperçu initial de taille interne nulle dans Chromium. Une comparaison isolée a établi que rendre l’éditeur visible avant de charger l’aperçu corrige ce cas ; le parcours complet vérifie aussi les changements de composition et les rechargements. L’observation d’un nouvel aperçu après saisie commence par amener son cadre dans le champ visible. Un clic automatisé immédiatement après défilement pouvait également ne produire aucun événement ; le helper effectue désormais un défilement explicite, un clic normal unique et attend l’ouverture, sans forcer le clic ni modifier `open`.

Pour contrôler ce dernier point indépendamment du helper, un parcours saisie → remontée par molette → clic unique sur « Mes modèles » → saisie du nom a réussi dans Chromium 156.0.8078.4, en mode sans interface et avec fenêtre visible, puis dans Firefox natif 156.0. Firefox affiche l’intitulé dans son aperçu, charge les trois fontes Marianne et conserve l’intitulé après rechargement. Aucune erreur JavaScript n’a été relevée. Preuves locales : `evidence/application/editeur-dsfr.json`, les captures associées, `souris-dsfr-chromium.json` et `evidence/pages-20261022/firefox-dsfr/receipt.json`. La cause moteur précise du clic automatisé perdu n’est pas démontrée.

La référence de courriel et son empreinte restent intactes ; les 52 comparaisons DOM et les régressions de copie passent. Le CSS SNUM est identique au socle antérieur. Les ressources DSFR web ne sont pas incorporées dans les courriels. Ces contrôles ne qualifient ni tous les composants de l’interface au sens DSFR, ni le lecteur d’écran, ni les clients mail ou Windows. Les limites métier et les issues #2 et #13 restent ouvertes.

La revue finale d’Astra donne **GO local et GO PDV**, sans défaut P0/P1/P2 relevé. Diff maintenu, dépendants directs, contrat, génération, provenance et tests ajoutés ont été relus. Astra a exécuté indépendamment la génération en contrôle, les 24 comparaisons avec le paquet officiel, l’identité du CSS SNUM, l’inspection du champ facultatif dans les 52 définitions du schéma et `git diff --check`. Il a examiné les journaux et reçus navigateur sans relancer les navigateurs ni la suite entière. Aucun moteur parallèle, nouveau stockage ou migration implicite ; le module d’incorporation possède une responsabilité distincte. Distributions et références tierces volumineuses sont générées ou vérifiées par empreinte. Aucun bloqueur structurel ni simplification évidente manquée n’a été relevé ; ce verdict n’étend pas les limites de recette.

La recette publique de montée de version a ensuite révélé une lacune : les huit fichiers servis étaient bien à jour et la bibliothèque conservée, mais le nouveau cache contenait encore l’ancien HTML, reçu avec `Cache-Control: max-age=600`. Le précache utilisait le cache HTTP frais ; les serveurs locaux de test en `no-store` masquaient ce cas. L’échec est conservé dans `evidence/pages-20261022/runtime-dsfr-before-cache-fix.json`.

Deux régressions ont été reproduites en échec : reprise d’une ancienne icône malgré la nouvelle version et identifiant de cache inchangé lors d’une modification du seul code du worker. Le précache utilise désormais des requêtes `cache: "reload"` ; la source du worker participe aussi à la version de cache. Les trois tests ciblés passent après correction, avec cache HTTP de dix minutes : contrôleur et ancienne ressource restent actifs avant le clic de mise à jour ; nouvelle ressource, bibliothèque et autre périmètre sont conservés comme attendu après activation. Les journaux rouge et vert sont `cache-http-red.log` et `cache-http-green.log`, dans le même dossier local. La suite complète repasse avec 70 réussites. Astra donne GO local et GO PDV sur ce correctif ciblé après relecture et génération indépendante en contrôle. Le prototype reste inchangé.

## Publication HTTPS sur GitHub Pages

La [publication initiale](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/39822607625) a été suivie du [déploiement vérifié des intitulés, du DSFR et du correctif de cache](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/39830471099), terminé avec succès. L’[atelier public](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/) répond en HTTP 200 sur HTTPS ; `main` est la branche par défaut et Pages utilise le workflow existant. L’activation initiale a été réalisée dans la session Chrome autorisée du propriétaire, après les refus 404 du compte de contribution.

Dans le profil Chromium isolé précédemment affecté par le cache HTTP : les huit fichiers publiés sont identiques octet pour octet aux distributions locales. L’ancienne interface était encore présente avant le clic sur « Appliquer la mise à jour ». Après ce clic, la bibliothèque témoin est identique, les trois fontes Marianne sont chargées et le nouvel intitulé apparaît dans l’aperçu. Accueil, catalogue de 52 variantes, éditeur et page SNUM s’ouvrent. Le worker est activé et contrôle la page. La composition et son intitulé restent présents après passage hors connexion et rechargement d’un favori avec paramètre ; une requête non cachée échoue effectivement. Aucune erreur JavaScript ni requête vers une origine externe n’a été observée. L’ouverture dans la session Chrome de l’utilisateur appartient à la publication initiale ; cette nouvelle recette utilise uniquement un profil synthétique.

Le [reçu Pages](recette-pages.json) conserve les empreintes et limites ; preuves locales dans `evidence/pages-20261022/`, dont `runtime-dsfr-receipt.json`. Cette recette vérifie le site public, sa montée de version et son cache ; l’installation native depuis ce site, l’autorisation d’accès depuis le parc et Windows/Outlook restent non vérifiés. Le portable et l’origine web conservent des bibliothèques distinctes ; transférer ses compositions par export/import JSON.

## Sondes AY11 et focus (#2)

**Préqualification via arbre d'accessibilité - validation humaine avec NVDA, JAWS ou VoiceOver requise.** Aucun lecteur d’écran n’a été exécuté. Le [reçu AY11](recette-ay11.json) donne l’inventaire, les résultats et les empreintes des preuves locales.

Les 18 familles actives du CLI AY11 ont été exécutées dans leurs 57 variantes sur quatre états : accueil, éditeur générique, prototype et convertisseur SNUM, soit **228 exécutions de sondes**. `candidate-static` n’expose aucun critère exécutable dans cette version. Trois dossiers complets et la capture de l’éditeur utilisent le profil `rgaa-106`, avec axe, interactions de formulaires et sondes temporelles. Les sources AY11 n’ont pas été modifiées par cette recette ; une mise à jour concurrente n’a touché que sa documentation et un reçu d’orchestration.

| État | Violations axe | Règles incomplètes | Parcours de focus AY11 collecté |
| --- | --- | --- | --- |
| Accueil | 0 | 0 | 11/20 |
| Éditeur générique | 0 | 1 | 23/53 |
| Prototype | 0 | 1 | 36/37 |
| SNUM | 0 | 0 | 3/3 |

Les deux règles incomplètes concernent les aperçus en iframe : leur contenu n’a pas été analysé par axe dans cette capture. Les parcours de focus restent déclarés partiels par AY11, y compris lorsque le nombre de cibles atteint 3/3. Les contrastes d’indicateur restent souvent indéterminés. La sonde 3.3 signale un fond de lien à 1,08:1 dans les quatre états et six bordures de boutons à 1,36:1 dans l’éditeur : signaux candidats à examiner visuellement, sans verdict de non-conformité. Le texte ou d’autres repères peuvent identifier ces contrôles ; leur suffisance n’a pas été jugée.

Un essai de liaison CSSOM a été refusé pour identité SHA-256 incompatible ; cet échec est conservé. La sonde statique de fond CSS a ensuite réussi. Le collecteur de formulaires termine en `failed_target_unresolved` sur `library-form`, y compris lors d’une capture supplémentaire après ouverture du dialogue de renommage. Cette cinquième capture a zéro violation axe et une règle incomplète ; elle ne résout pas la limite du collecteur. Ces résultats ne sont pas présentés comme des tests réussis de validation de formulaire.

Un parcours complémentaire relie `document.activeElement` au même nœud de l’arbre d’accessibilité Chromium, par son identifiant natif. **Dix observations** couvrent déplacement, duplication, retrait, dernier retrait et reprise au clavier dans les deux éditeurs. Après correction, les dix cibles sont nommées, non ignorées et marquées comme ayant le focus. Le prototype rend le focus au titre du bloc ou au bouton d’ajout. L’éditeur générique le rend au champ du bloc ou, après le dernier retrait, à « Ajouter un composant ».

Le dernier retrait générique rendait auparavant le focus au `BODY`. Le test de régression a d’abord échoué (`BODY` au lieu de `SUMMARY`), puis réussi : activation par Entrée de la section fermée, puis Tab vers la recherche du catalogue. Sources : `app/source/editor.js` et `tests/focus-browser.test.cjs`. Les 228 sondes portent sur la livraison précédant cette correction ; le parcours ciblé et les 65 tests portent sur la distribution corrigée. Les preuves brutes restent dans `evidence/ay11-20261022/`, sans persistance dans la base AY11.

**#2 reste ouverte** pour vérifier les annonces réellement prononcées avec VoiceOver puis le lecteur du poste Windows. Zéro violation axe et un nœud nommé ne prouvent ni ces annonces ni la conformité RGAA.

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
- Campagne historique de l’accueil : **28 réussites, 0 échec, 0 test sauté**, en 11,233 s ; journal `accueil-suite-finale.log`. La campagne courante figure en tête de cette fiche.
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

Accès restant : Windows/Firefox, Outlook installé, lecteur d’écran du parc et accord pour utiliser l’origine HTTPS publiée depuis ce parc. Mélissa a été utilisé sur Mac avec un mandat d’envoi distinct. Aucun accès supplémentaire ni autorisation de déploiement sur le parc ne découle de ce dossier. La recette Windows et cette autorisation organisationnelle restent nécessaires ; l’URL publique existe déjà.

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

**GO pour la livraison des corrections vérifiées et la publication HTTPS ; qualification métier complète non atteinte.** Restent non vérifiés : Windows/Outlook, fidélité reçue après correction de largeur et par famille, images bloquées, lecteur d’écran, parcours humain d’installation sur le parc, raccourci du système et autorisation du parc pour accéder au site. L’installation via DevTools reste bornée au Mac. Le contrôle structurel ne couvre pas les effets de tous les CSS dans chaque moteur mail, les restrictions d’entreprise, la pérennité après effacement de profil ni une migration de schéma. Aucun audit RGAA complet n’est revendiqué.

Le mandat courant autorise la publication sur `main` dans le seul dépôt personnel et la clôture des 25 issues techniquement satisfaites. #2 et #13 restent ouvertes. Les amonts et l’historique du prototype restent préservés.

PDV de la correction de copie : `render.js`, `files.js`, leurs dépendants builder/SNUM et les tests de mise en page ont été relus. La préparation reste dans le moteur de rendu, sans nouveau stockage, format, moteur parallèle ou dépendance. Les sources concernées restent sous 200 lignes ; les distributions volumineuses sont générées et justifiées dans la notice. La revue indépendante a fait corriger les filets décoratifs et donne GO local ; les 64 tests du fil principal passent. **GO structurel pour cette correction**, sans déduire une qualification des messageries ou du parc.
