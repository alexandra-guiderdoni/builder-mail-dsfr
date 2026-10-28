# Builder de courriels DSFR : notes cuisine-moi

Date : 2026-10-21 | Objectif : cadrer avec l’utilisateur une application HTML autonome, modulaire et portable de composition de courriels, à partir de l’existant.

## Résumé / décisions clés

- Demande explicite : exploiter `git-hors-workflow/builder-mail-dsfr` et le mini-builder Newsletter SNUM pour personnaliser l’en-tête, le pied de page et le contenu à partir des composants disponibles.
- Qualités demandées : autonomie, flexibilité, modularité et possibilité d’installation sur les postes cibles.
- Sorties retenues : copier le courriel mis en forme dans Outlook et télécharger un fichier HTML autonome. Réponse utilisateur à Q1 : « 1 et 2 ».
- Distribution retenue : fichier HTML portable ouvrable par double-clic et webapp installable depuis une URL, préparée pour fonctionner hors connexion, issus du même socle. Réponse utilisateur à Q2 : « oui » à cette proposition.
- Édition retenue : blocs ajoutables, déplaçables, duplicables et supprimables, avec personnalisation des contenus, de l’en-tête et du pied de page, dans une charte encadrée. Des modèles prêts à personnaliser servent de points de départ. Réponse utilisateur à Q3 : « 1 ».
- Conservation retenue : bibliothèque locale, sauvegarde automatique des brouillons, modèles et identités de service réutilisables ; fichiers de travail exportables/importables pour reprendre une composition sur un autre poste ou la transmettre à un collègue. Réponse utilisateur à Q4 : « 1 ».
- Entrées retenues : saisie manuelle et import de contenu structuré, notamment le paquet JSON SNUM, puis poursuite de l’édition par blocs. Le contenu peut être préparé en amont avec un assistant ; le builder reste autonome sans connexion nécessaire à cet assistant. Réponse utilisateur à Q5 : « 1 ».
- Environnements métier annoncés : Windows avec Firefox et Outlook installé ; messagerie web Mélissa. La version de Firefox, la variante d’Outlook et la version du webmail restent à relever. Réponse utilisateur à Q6 précisant les deux parcours.
- Catalogue retenu : l’ensemble des composants de courriel existants, avec leurs variantes maîtrisées et une qualification par famille de blocs dans Outlook et Mélissa. Aucun bloc métier supplémentaire n’est retenu à ce stade. Réponse utilisateur à Q7 : « 1 ».
- Images retenues : import de fichiers locaux uniquement, incorporés à la composition et conservés dans les fichiers de travail échangés. Réponse utilisateur à Q8 : « 1 ». La fidélité des images après collage et envoi reste à qualifier.
- Périmètre confirmé après Q9 : travail local et seul dépôt applicatif distant `https://github.com/alexandra-guiderdoni/builder-mail-dsfr`. Le dépôt officiel et son clone local restent en lecture seule ; aucune écriture, branche, publication ou contribution dans l’amont n’est prévue.
- Les mécanismes précis de worker, l’hébergement et les contraintes d’installation des postes restent à préciser.
- Clôture de l’entretien : réponse utilisateur « oui » à la synthèse globale. Compréhension partagée confirmée ; prompt prêt pour une future mission de réalisation. Prochaine étape proposée : spécification technique et tranche de faisabilité sur les environnements cibles. Les modifications restent limitées à cette trace documentaire.
- Méthode : `cuisine-moi` pour une question à la fois ; `connu-inconnu` pour les hypothèses et angles morts ; `research` pour les faits techniques ; `ask-matt` comme routeur ; `prompt-ambitieux` pour la reformulation une fois les décisions structurantes recueillies.
- Correction Q9 : le dépôt applicatif distant existe à `https://github.com/alexandra-guiderdoni/builder-mail-dsfr`. Le dossier local est toujours rattaché au dépôt parent et reste à raccorder au dépôt applicatif. Dépôt applicatif séparé retenu, avec référence officielle versionnée et adaptations tracées.

## Sources et affirmations vérifiées

| Affirmation | Source lue | Verdict | Impact |
| --- | --- | --- | --- |
| Le mini-builder SNUM se distribue sous forme d’un fichier HTML autonome. | `git-hors-workflow/assistant-ia-newsletter-com-snum/NOTICE-RENDU-DSFR-V1.0.md` | Confirmé par la notice actuelle ; exécution non relancée ici. | Réutiliser les principes de distribution et examiner ses sources. |
| L’outil SNUM maintient ses sources séparément du fichier distribué. | Même notice ; `AGENTS.md` du projet. | Confirmé : sources `_source/mail-tool-*` et génération dédiée. | Préserver cette séparation ; éviter de modifier une sortie générée. |
| Le dossier builder contient déjà une application générique à blocs. | Inventaire local et `recherche-mails-dsfr-outlook.md`. | Non démontré : modèles HTML, référence officielle et étude présents. | Étendre les ressources existantes ; ne pas supposer qu’un éditeur générique existe. |
| Le résultat fonctionne dans le parc Outlook administratif. | Notice SNUM et recherche Outlook existante. | Inconnu : aucune recette Outlook attestée dans ces sources. | Choisir le parcours de récupération du mail et prévoir une preuve sur poste cible. |

## Cartographie connu-inconnu provisoire

- **Ancrage — connus connus :** les huit choix produit sont capturés ci-dessous ; le dépôt applicatif distant existe ; Windows, Firefox, Outlook installé et Mélissa sont les environnements métier annoncés.
- **Brouillard — connus inconnus [^] :** versions et restrictions du parc, comportement du stockage, installation, transport des images et fidélité des deux sorties à qualifier dans les deux distributions ; hébergement statique et rattachement local à réaliser lors d’une mission d’exécution.
- **Déni — inconnus connus [^] :** l’autonomie du fichier HTML et celle d’une application installée ne prouvent pas la même chose ; la fidélité de l’aperçu ne prouve pas celle du message envoyé. Ces écarts sont déjà visibles dans les sources locales.
- **Abîme — inconnus inconnus [^] :** scénario à éprouver : une politique de poste autorise l’aperçu mais interdit le presse-papiers enrichi, l’installation ou la conservation locale ; une modification dans Outlook altère les blocs ou le logo. Signes à rechercher dans une recette représentative.
- **Verdict de cadrage :** choix produit, séparation des dépôts et compréhension globale confirmés par l’utilisateur. Architecture technique, implémentation et qualification non réalisées.

## Recherche technique

Lectures locales : sources SNUM `mail-tool-render.js` (133 lignes), `mail-tool-ui.js` (65 lignes), `mail-tool-shell.html` et générateur `scripts/build_mail_tool.py`. Le moteur valide strictement le paquet V519 et ses cinq rubriques ; l’interface produit une URL Blob, un aperçu dans une iframe isolée et un téléchargement. La politique de sécurité bloque les connexions réseau. Aucun éditeur générique de blocs ou système de brouillons n’apparaît dans ces sources. Les tests existants ont été inventoriés, sans être exécutés pour cet entretien.

| Existant | Chevauchement | Limite constatée |
| --- | --- | --- |
| Mini-builder SNUM | Réutiliser les principes de génération déterministe, de distribution et d’isolement de l’aperçu. | Son contrat de données, ses rubriques et son gabarit sont propres au SNUM. |
| Modèle officiel DSFR Mail | Étendre à partir des familles de blocs disponibles. | Le modèle ne fournit pas l’éditeur ni une recette du parc cible. |
| Fiche locale sur les workers | Réutiliser. | Les mécanismes sont documentés ; aucun prototype ou test du futur builder n’est attesté. |
| EmailBuilder.js ou GrapesJS | Options à comparer si les besoins d’édition le justifient. | Documentation consultée ; aucune installation ni qualification dans ce chantier. |

La référence [DSFR Mail](https://github.com/GouvernementFR/dsfr-mail) présente notamment en-tête, titre, texte, listes, images, boutons, contacts, cartes et pied de page. [EmailBuilder.js](https://github.com/usewaypoint/email-builder-js) propose des blocs et des sorties JSON/HTML ; [GrapesJS newsletter](https://github.com/GrapesJS/preset-newsletter) propose notamment un export avec styles incorporés. Ces capacités documentées ne choisissent ni notre interface ni notre moteur.

Recherche complémentaire confiée à un agent en lecture seule, conformément au skill `research`, puis consolidée ici par le fil principal. Les conclusions distinguent documentation et comportement observé ; aucun essai de navigateur ou de messagerie n’a été exécuté.

| Fait documenté | Source primaire | Conséquence à discuter |
| --- | --- | --- |
| Le Service Worker exige des URL HTTP(S) et une origine digne de confiance ; `file://` ne convient pas à son enregistrement. | [Standard Service Workers](https://w3c.github.io/ServiceWorker/#start-register), [API Mozilla relue par le fil principal](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register). | Distinguer fichier portable et application obtenue depuis une origine web. Un hébergement statique n’implique pas un serveur de données métier. |
| Un Web Worker déporte un traitement ; il ne fournit pas l’installation. | [HTML Standard](https://html.spec.whatwg.org/multipage/workers.html). | Son emploi devra répondre à un traitement réellement coûteux. |
| La première visite, les ressources conservées et la mise à jour du cache sont des étapes distinctes. | [Cycle de vie du Service Worker](https://web.dev/articles/service-worker-lifecycle). | Une PWA installée ne prouve pas à elle seule un démarrage hors connexion. |
| La conservation navigateur n’est pas une sauvegarde indépendante ; la persistance peut ne pas être accordée. | [Storage Standard](https://storage.spec.whatwg.org/#persistence). | Sauvegarde automatique et export/import retenus en Q4 ; leur fiabilité reste à éprouver. |
| Le presse-papiers peut transporter HTML et texte ; les contraintes navigateur restent à respecter. | [Clipboard API](https://www.w3.org/TR/clipboard-apis/), [API Mozilla relue par le fil principal](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write). | Copier ne prouve pas la fidélité après collage, retouche et réception. |
| Le parc administré peut interdire l’installation utilisateur dans Edge. | [Politique Microsoft WebAppInstallByUserEnabled](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/WebAppInstallByUserEnabled). | Ne pas assimiler absence de droits administrateur requis et autorisation sur tout poste. |

Actualisations signalées par la recherche : [Firefox Windows](https://support.mozilla.org/en-US/kb/web-apps-firefox-windows) documente désormais ses web apps (143, ou 150 pour l’édition Microsoft Store) ; ne pas généraliser d’anciens constats d’absence d’installation. [Apple](https://support.apple.com/en-us/104996) précise que la web app Safari ne partage pas ses données de site avec Safari. Ces constats sont documentaires, sans recette locale.

Preuves proposées pour une étape ultérieure, à ajuster aux décisions : démarrer depuis un profil neuf ; fermer puis rouvrir hors connexion ; restaurer une composition exportée dans un autre profil ; comparer aperçu, collage, retouche et message reçu. Aucun de ces tests n’est présenté comme exécuté.

L’étude existante `git-hors-workflow/builder-mail-dsfr/recherche-mails-dsfr-outlook.md` fournit le pourquoi initial : composer des courriels institutionnels réutilisables avec un rendu adapté aux contraintes de messagerie. Aucun paquet `why-context` propre à ce builder n’a été trouvé dans `wiki/raw/why/` lors de la recherche ciblée.

Source complémentaire retrouvée : `wiki/raw/veille/workers-service-workers-et-hors-ligne-2026-10-21.md`. Elle traite déjà l’application au mini-builder SNUM ; elle nourrit la présente réflexion sans préjuger des besoins de la nouvelle application.

Complément après Q6 : une [source institutionnelle de 2020](https://actionsociale.finances.gouv.fr/files/live/sites/actionsociale/files/Contributed/documents/COVID_missionsSS.pdf) mentionne l’accès à la messagerie par Mélissa. Elle étaye l’existence historique du service, sans renseigner sa version ou son moteur actuel. La recherche publique retrouve une page d’accueil Mélissa sur le domaine Finances ; l’ouverture directe de la racine publique a expiré. Aucune session, boîte ou interface de composition n’a été consultée. Aucune compatibilité du futur builder avec Mélissa n’est déduite de ces résultats.

## Journal questions-réponses

### Q1 — Résultat après composition

- Question : une fois le courriel composé, que doit pouvoir faire l’agent ?
- Options présentées : copier le mail mis en forme dans Outlook avec export HTML complémentaire ; télécharger seulement le HTML comme pour SNUM ; créer un brouillon directement dans la messagerie avec intégration.
- Recommandation proposée : viser le passage dans la messagerie habituelle pour pouvoir qualifier le résultat réellement exploitable.
- Capture : réponse utilisateur « 1 et 2 ». Les deux sorties sont requises : copie du courriel mis en forme dans Outlook et téléchargement HTML autonome.
- Drapeaux : compatibilité réelle de la copie et de l’export → recette ultérieure sur le parc retenu.

### Q2 — Distribution

- Question : pour distribuer le builder, faut-il un fichier ouvrable par double-clic, une webapp installable depuis une URL, ou les deux ?
- Options présentées : deux distributions ; fichier HTML uniquement ; webapp installable uniquement.
- Recommandation proposée : deux modes issus du même socle pour couvrir davantage de postes, en assumant leur maintenance et leur qualification.
- Capture : après présentation explicite des deux modes dans le chat, réponse utilisateur « oui ». Fichier HTML portable et webapp installable sont retenus, à partir du même socle. Cette décision reste dans le cadrage ; elle ne lance aucune implémentation ou publication.
- Drapeaux : compatibilité des deux modes et autorisation d’installation sur les postes cibles → recette et responsable du parc.

### Q3 — Liberté de composition

- Question : jusqu’où l’utilisateur doit-il pouvoir personnaliser son courriel ?
- Options proposées : blocs réorganisables et personnalisables avec charte encadrée ; modèles dont seuls les champs et quelques variantes sont modifiables ; édition avancée de la mise en page et des styles.
- Recommandation : blocs réorganisables et personnalisables avec charte encadrée, pour concilier la modularité demandée et la maîtrise du rendu.
- Capture : réponse utilisateur « 1 ». Blocs modulaires et charte encadrée retenus ; la proposition présentée inclut des modèles prêts à personnaliser pour démarrer rapidement.
- Drapeaux : variantes de styles et éléments précis de marque à préserver → utilisateur et référence officielle.

### Q4 — Conservation et réutilisation

- Question : comment conserver et réutiliser les brouillons, modèles et identités de service ?
- Options proposées : bibliothèque locale avec sauvegarde automatique et fichiers de travail exportables/importables ; fichiers de travail uniquement avec sauvegarde et réouverture explicites.
- Recommandation : bibliothèque locale et fichiers de travail transportables, pour retrouver ses compositions et les transmettre à un collègue sans compte ni serveur de données.
- Capture : réponse utilisateur « 1 ». Bibliothèque locale, sauvegarde automatique et fichiers de travail échangeables retenus. Le fichier de travail doit permettre de reprendre l’édition des blocs et réglages ; il se distingue du HTML destiné à l’envoi.
- Drapeaux : fiabilité de la conservation, disponibilité et limites de la sauvegarde automatique, restauration des compositions et de leurs ressources → preuve ultérieure dans les deux distributions.

### Q5 — Entrée du contenu

- Question : faut-il une saisie manuelle seulement, ou également un import de contenu structuré produit à l’extérieur du builder ?
- Options proposées : saisie manuelle et import structuré, avec compatibilité du paquet SNUM ; saisie manuelle uniquement.
- Recommandation : saisie manuelle et import structuré pour réutiliser le parcours SNUM et permettre d’autres préparations externes, tout en conservant l’autonomie de l’application.
- Capture : réponse utilisateur « 1 ». Saisie manuelle et import structuré retenus, notamment le paquet SNUM, avec poursuite de l’édition. L’application fonctionne indépendamment de l’assistant éventuellement utilisé en amont.
- Drapeaux : formats et validation des données importées, correspondance du paquet SNUM avec les blocs génériques → conception et vérification ultérieures.

### Q6 — Postes de référence pour la recette

- Question : quel environnement représente les utilisateurs pour les premiers essais de copie et de rendu reçu ?
- Options proposées : Windows avec Outlook installé ; messagerie web dans le navigateur ; parc mixte ou encore à préciser.
- Recommandation : prendre le poste administratif réellement utilisé comme premier témoin, puis étendre les vérifications aux autres environnements cibles. Ce choix de preuve ne réduit pas la cible multiplateforme.
- Capture : l’utilisateur indique Windows avec Outlook installé et Firefox, ainsi qu’une messagerie web nommée Mélissa. Deux parcours à qualifier : Firefox vers Outlook installé, et utilisation avec le webmail annoncé. Le navigateur exact du second parcours reste à confirmer si différent de Firefox.
- Drapeaux : versions de Firefox et d’Outlook, interface exacte du webmail et restrictions du poste → utilisateur ou responsable du parc. Ces informations n’empêchent pas de poursuivre le cadrage ; elles conditionnent la recette réelle.

### Q7 — Catalogue de blocs

- Question : les composants de courriel existants suffisent-ils, ou faut-il ajouter des blocs métier spécifiques dès la première version ?
- Options proposées : catalogue complet des composants de courriel existants ; même catalogue complété par des blocs métier que l’utilisateur précisera.
- Recommandation : reprendre le catalogue existant et qualifier ses blocs dans les deux messageries, avant d’ajouter des composants sans besoin concret identifié.
- Capture : réponse utilisateur « 1 ». Le catalogue complet des composants de courriel existants est retenu, sans ajout de bloc métier spécifique à ce stade.
- Drapeaux : inventaire exact, variantes et qualification du catalogue existant → sources et recette.

### Q8 — Import des logos et images

- Question : comment l’utilisateur doit-il ajouter ses logos et images ?
- Options proposées : fichiers locaux incorporés aux compositions ; fichiers locaux et récupération depuis une URL lorsque le navigateur l’autorise, avec incorporation aux compositions dans les deux cas.
- Recommandation : import de fichiers locaux, pour un parcours prévisible hors connexion sans dépendre de la récupération d’images distantes.
- Capture : réponse utilisateur « 1 ». Import des logos et images depuis des fichiers locaux, conservés avec la composition et son fichier de travail. Aucune récupération par URL n’est retenue.
- Drapeaux : conservation des ressources, poids et formats acceptés, fidélité des images après collage et envoi → conception et recette.

### Q9 — Dépôt existant et relation avec l’amont

- Question : faut-il versionner l’application dans son propre dépôt Git, à partir du dossier existant, ou conserver pour l’instant ce dossier de travail sans dépôt autonome ?
- Fait local vérifié : `git -C git-hors-workflow/builder-mail-dsfr rev-parse --show-toplevel` renvoie `/Users/alex/Claude`. Le même contrôle dans `reference-officielle/` renvoie ce sous-dossier ; son origine est `GouvernementFR/dsfr-mail`. Ce constat porte sur le dossier local, pas sur l’existence d’un dépôt distant.
- Options proposées : dépôt Git autonome pour l’application, dans le dossier existant, avec préservation du clone de référence ; maintien du dossier de travail et décision de versionnement reportée.
- Recommandation : dépôt autonome pour maintenir ensemble sources, composants adaptés, génération, tests et notices, en distinguant clairement l’application et sa référence amont.
- Capture : l’utilisateur fournit `https://github.com/alexandra-guiderdoni/builder-mail-dsfr`, indique avoir accordé les droits au compte de travail et demande s’il serait préférable de faire un fork ou une branche du dépôt officiel. Le premier choix proposé est donc reformulé autour du dépôt distant existant ; aucune création de dépôt supplémentaire n’est nécessaire pour disposer d’une cible applicative.
- Décision : réponse utilisateur « ok » au dépôt applicatif séparé avec référence officielle versionnée et adaptations tracées. Les précisions suivantes confirment le travail uniquement en local et dans ce dépôt applicatif. Le dépôt officiel et son clone local restent strictement en lecture seule ; la piste d’un fork de contribution n’est pas retenue dans ce chantier.
- Drapeaux : rattachement local et publication → actions distinctes, non exécutées. L’accord d’architecture et la limitation des destinations ne sont pas assimilés à un lancement du développement ou à une demande de push.

| Affirmation | Source lue en direct | Verdict | Impact |
| --- | --- | --- | --- |
| Le dépôt builder existe et n’est pas un fork. | API GitHub du dépôt applicatif : `fork: false`, liste des branches vide. | Confirmé ; dépôt encore vide lors du contrôle. | Réutiliser la cible déjà créée. |
| La connexion peut écrire dans le builder, mais pas dans l’amont officiel. | Métadonnées GitHub des deux dépôts : `push: true` / `push: false`. | Confirmé pour la connexion. L’endpoint des droits nominatifs retourne 403 pour cette intégration. | Ne pas assimiler l’accès au builder à un accès d’écriture au dépôt officiel. |
| L’amont fournit déjà une application de composition. | Arbre racine et `readme.md` officiels, lignes 31–60. | Contredit : modèle HTML, ressources et documentation ; pas d’éditeur applicatif dans l’arbre inspecté. | Notre application porte un périmètre produit supplémentaire. |
| Fork et branche sont équivalents. | [Documentation GitHub](https://docs.github.com/en/pull-requests/reference/forks). | Contredit : le fork est un dépôt relié à l’amont ; la branche appartient à un dépôt. | Choisir séparément la relation amont et les branches de développement. |

## Drapeaux ouverts

- Fidélité des deux parcours de sortie retenus → recette ultérieure sur le parc retenu.
- Mécanismes de worker et contraintes d’installation des deux distributions retenues → documentation navigateur et responsable du parc.
- Versions des deux environnements métier annoncés et restrictions du poste → utilisateur ou responsable du parc.
- Catalogue des composants réellement réutilisables et limites du moteur SNUM → inspection locale.
- Fiabilité de la bibliothèque locale, de la sauvegarde automatique et de la restauration des fichiers de travail → recette dans les deux distributions.
- Contrat de l’import structuré et correspondance du paquet SNUM avec les blocs génériques → conception et vérification ultérieures.
- Variantes de styles et éléments précis de marque à préserver dans la charte encadrée → utilisateur et référence officielle.
- Qualification du rendu reçu, des images et de l’accessibilité → recette ultérieure sur les cibles retenues.
- Rattachement du dossier local au dépôt applicatif existant → intervention ciblée lors d’une mission d’exécution.

## PDG pass

**PDG self-check, not independent review.** Déclencheur : recommandation d’architecture et futur prompt d’implémentation. Le contrôle est utile pour distinguer les dépôts et préserver la portée des choix ; une réponse fondée uniquement sur le nom du dossier aurait maintenu l’erreur sur le dépôt distant.

Sources inspectées : trace des réponses, sources du mini-builder et de sa génération déjà lues, métadonnées GitHub, arbre et passage du README officiel, documentation GitHub sur les forks. Chevauchements : réutiliser le dépôt applicatif et les composants ; étendre le moteur de composition ; préserver le clone amont et le projet SNUM. Les sources internes du futur builder n’existent pas encore : architecture exécutable et compatibilité restent inconnues.

Les quatre quadrants figurent dans la cartographie ci-dessus. Mauvaise voie : développer l’application dans le clone officiel, confondre fork et mise à jour automatique, ou présenter un aperçu comme preuve de mail reçu. Garde-fous : provenance/version amont, adaptation explicite, moteur commun aux distributions, contrôle des écarts avant actualisation. Ce sont des propositions d’architecture, pas des mécanismes installés.

Préserver les modèles sources, les images, les sources génératrices SNUM et les changements concurrents du workspace. Interdire l’édition du clone amont, l’écrasement de travaux étrangers et les modifications de sorties générées à la place des sources. Preuves futures : démarrage hors connexion, restauration d’un projet avec images, import SNUM et parcours aperçu/copie/collage/retouche/réception sur les cibles réelles. Ces essais ne sont pas exécutés.

Relecture documentaire : couverture des neuf décisions et des restrictions ajoutées ; ancrage contre les lectures locales et GitHub ; régression limitée au diff de cette trace et au contrôle d’accents. Aucun produit, installation ou envoi n’est qualifié. La trace est une source primaire d’entretien, sans génération d’une documentation par PDD ni reçu PDD revendiqué. Validation humaine : l’utilisateur confirme la synthèse globale par « oui », après confirmation de la séparation des dépôts et du périmètre exclusif local/dépôt applicatif.

## Prompt autonome proposé

Mission future à lancer explicitement ; ce bloc ne déclenche aucune exécution dans la session de cadrage.

```text
Développe un atelier autonome de composition de courriels DSFR, à partir du dossier /Users/alex/Claude/git-hors-workflow/builder-mail-dsfr et du mini-builder SNUM. Travaille uniquement en local et pour le dépôt applicatif https://github.com/alexandra-guiderdoni/builder-mail-dsfr. Commence par identifier les limites Git réelles et préserver les fichiers existants avant de raccorder le dossier au dépôt applicatif. Le dépôt GouvernementFR/dsfr-mail et son clone reference-officielle restent strictement en lecture seule : aucune modification, branche, publication ou contribution vers cet amont. Préserve aussi le projet SNUM et les travaux voisins. Ce mandat porte sur le développement local ; une publication distante se décide séparément et ne peut concerner que le dépôt applicatif indiqué.

L’utilisateur compose avec tout le catalogue de composants de courriel existants : en-têtes, titres, textes, listes, images, boutons, encadrés, contacts, cartes et pieds de page, avec variantes maîtrisées. Il peut ajouter, déplacer, dupliquer, supprimer et renseigner les blocs, dans une charte encadrée, puis personnaliser l’identité du service. Fournis des modèles prêts à personnaliser. Permets la saisie manuelle et l’import structuré, notamment du paquet JSON SNUM, suivi de l’édition par blocs. Les logos et images proviennent uniquement de fichiers locaux. Valide les imports et n’exécute jamais leur contenu.

Prévois une bibliothèque locale, la sauvegarde automatique des brouillons, des modèles et identités réutilisables, ainsi que l’export/import de fichiers de travail contenant les blocs, réglages et images nécessaires à la reprise sur un autre poste. Distingue ces fichiers du HTML destiné à l’envoi. Les opérations métier doivent fonctionner localement, sans compte, backend métier ni service d’IA. Éprouve la conservation réelle dans chaque contexte et rends tout échec de sauvegarde explicite, sans annoncer des données conservées lorsqu’elles ne le sont pas.

Livre deux distributions issues du même moteur et de sources modulaires maintenables : un fichier HTML portable ouvrable par double-clic, autonome dès sa première ouverture, et une webapp installable depuis une URL HTTPS, préparée pour fonctionner hors connexion. Le poste métier ne doit nécessiter ni Python ni Node.js. Adapte les mécanismes de cache et d’installation au contexte : aucun Service Worker sous file:// ; ne déporte un calcul dans un Web Worker que si une mesure le justifie. La portabilité visée ne doit pas être réduite silencieusement aux seuls postes disponibles pour les essais.

Ancre les choix dans les sources : études recherche-mails-dsfr-outlook.md et recherche-mails-dsfr-outlook-sources.md du dossier builder ; référence officielle et ses ressources ; AGENTS.md et NOTICE-RENDU-DSFR-V1.0.md du dépôt voisin assistant-ia-newsletter-com-snum, puis ses sources _source/mail-tool-render.js, mail-tool-ui.js, mail-tool-shell.html et scripts/build_mail_tool.py. Réutilise ce qui convient sans imposer le schéma métier SNUM au modèle générique. Trace l’origine, la version amont, les mentions applicables et les adaptations des composants. Sépare l’interface web du HTML de courriel. Justifie la pile technique après une tranche métier complète qui éprouve édition, image, sauvegarde, restauration, copie et téléchargement ; cette tranche ne remplace pas le catalogue complet demandé.

Fournis les deux sorties : copie du mail mis en forme pour collage dans la messagerie et téléchargement HTML autonome. Vérifie les parcours réels, dont Windows avec Firefox vers Outlook installé et le webmail Mélissa : aperçu, copie, collage, retouche puis message reçu, notamment les images. Relève les versions et restrictions avant d’affirmer une compatibilité. Si le poste ou l’envoi de recette n’est pas accessible, prépare les étapes pour un opérateur autorisé et marque cette qualification non réalisée ; ne te connecte pas aux comptes ni n’envoie de messages de ta propre initiative. Vérifie aussi ouverture hors connexion, installation et réouverture hors connexion, restauration dans un autre profil, imports invalides et usage au clavier sans dépendance au glisser-déposer. Un aperçu ou une simulation du DOM ne prouve pas ces parcours.

Livre les sources, les distributions générées, les commandes de génération et de contrôle réellement vérifiées, les notices d’usage et de maintenance, ainsi qu’une fiche de recette avec commandes, résultats, erreurs, limites et éléments non éprouvés. Distingue faits, hypothèses et décisions encore requises ; si un obstacle empêche une exigence, mesure l’écart et les moyens de le lever avant de proposer un changement de périmètre. N’invente aucune preuve et ne déclare jamais « installable sur n’importe quel poste » à partir d’un seul environnement testé.
```


## Décision complémentaire du 28 octobre 2026 — #192

L’utilisatrice a autorisé toute adresse HTTPS directe en complément du chargement local. Cette décision remplace, pour le mode distant explicite, l’exclusion d’URL de Q8 ; elle ne retire ni ne convertit les images locales. Le format v2 distingue les bibliothèques avec références en ligne, et les anciennes versions les refusent. Le contrôle de chargement dans le navigateur ne vaut pas qualification de réception. Hébergement, politiques réseau du parc et rendu Outlook/Mélissa restent non démontrés.
