Expérience utilisateur de l’atelier : notes cuisine-moi
=====================================================

Date : 2026-11-02 | Objectif : clarifier cinq sujets avant toute réalisation : installer sa copie locale, comprendre la bibliothèque personnelle, réinitialiser l’atelier, disposer de newsletters de démonstration, recentrer l’expérience sur l’utilisateur.

Cadre fixé par Alex : brainstorm seulement, sans réalisation, en s’appuyant sur la documentation, avec connus et inconnus.

## Résumé / décisions clés

- **Q1, mode d’usage : web d’abord.** L’atelier guide vers le site, à installer quand le navigateur le permet. Le portable devient un secours clairement proposé, avec un lien de téléchargement et les cas où il sert.
- **Q2, bibliothèque : vocabulaire et rappels.**
  - Un seul mot visible, « Mes newsletters », avec trois onglets : newsletters, modèles, identités.
  - Un encart permanent dit où sont les données et donne la date de la dernière sauvegarde en fichier.
  - Un rappel propose de sauvegarder.
  - Le stockage navigateur actuel est conservé.
- **Q3, remise à zéro : effacer mes données.** « Tout effacer » vide newsletters, modèles et identités, propose de sauvegarder avant, exige une confirmation et ramène à l’état de première visite. Le programme hors connexion reste en place.
- **Q4, démonstrations : onglet Exemples.** Une galerie en lecture seule, distincte de Mes newsletters, où « Créer à partir de cet exemple » fait une copie personnelle. Elle n’est pas touchée par « Tout effacer » et se met à jour avec l’atelier.
- **Q5, démarche : accueil puis test.**
  - Concevoir d’abord le parcours de première visite qui réunit Q1 à Q4.
  - Déplacer le jargon technique dans une aide repliable.
  - Faire du README un mode d’emploi court, les audits allant dans `docs/`.
  - Valider ensuite avec 3 à 5 utilisateurs réels sur maquette.
- **Q6, hébergement : décider avant de lancer.** L’adresse définitive est fixée avant d’orienter les utilisateurs vers le web, car elle porte les bibliothèques. À défaut, la spécification prévoit une migration guidée.
- **Q7, postes : nominatifs.** « Tout effacer » reste une remise à zéro ; l’aide mentionne seulement le cas d’un profil partagé.
- **Q8, ajouts : les deux.** L’atelier demande la conservation durable du stockage et en affiche l’état. « Restaurer une sauvegarde » remplace la bibliothèque après confirmation, à côté de l’import qui ajoute.

**Verdict après réponses :** prêt pour rédiger la spécification. Deux conditions restent avant la diffusion : l’adresse définitive (Q6) et une installation réelle sur un poste du parc (Q1).

## État vérifié dans les sources (2 novembre 2026, `main` à `f8db433`)

### 1. Installer sa copie locale

- **Connu.** Il existe deux voies.
  - **Version web :** le bouton « Installer l’atelier » n’apparaît que si le navigateur propose l’installation, dans un en-tête qui reste muet sinon (`app/source/pwa.js`, `docs/UTILISATION.md` § Variante web).
  - **Fichier portable :** `portable.html`, ouvert par double-clic et hors ligne dès la première ouverture (README).
- **Connu.** Le site ne contient **aucun lien de téléchargement du portable**. Le message d’échec dit « utilisez le fichier portable » sans dire où le trouver. Le lien du README mène à la page GitHub du fichier, pas à un téléchargement.
- **Connu.** Les deux voies ont des bibliothèques **séparées**, car le navigateur les isole par origine. Pour passer de l’une à l’autre, il faut exporter puis importer à la main.
- **Inconnu connu.** Le comportement sur le parc reste à qualifier, comme le dit le README : installation des applications web autorisée ou non, navigateur imposé, double-clic sur un fichier HTML local permis.
- **Connu non exploité.** Les libellés d’état existent déjà (« Fichier portable · prêt hors connexion », « Version web · ressources disponibles hors connexion », « Atelier installé dans ce navigateur »), mais ils ne guident vers aucune action.

### 2. Bibliothèque personnelle

- **Connu.** La bibliothèque regroupe les compositions, modèles et identités. Elle est stockée dans IndexedDB, propre au navigateur et à son origine, et n’est ni synchronisée ni partagée.
- **Connu.** Le vocabulaire varie pour des notions voisines : « Mes newsletters » (accueil), « bibliothèque », « composition », « Fichiers et récupération », « Mes modèles », « Identités de service ».
- **Connu.** La sauvegarde est automatique. L’export régulier est recommandé dans la documentation, pas dans l’interface au moment utile.
- **Inconnu connu.** On ignore si les utilisateurs comprennent que leurs données restent dans ce navigateur, et ce qu’ils attendent : un fichier, un compte, un dossier partagé.

### 3. Réinitialisation complète

- **Connu.** Rien de tel n’existe. On peut seulement supprimer une composition à la fois ; quand on supprime la dernière, une composition de départ est recréée.
- **Connu.** « Effacer les données du navigateur » retire à la fois le programme en cache et la bibliothèque (guide), sans passer par l’atelier.
- **Connu.** Une disparition du stockage est traitée comme une erreur (« La bibliothèque enregistrée a disparu du stockage de ce navigateur »). Une réinitialisation voulue devra donc passer par ce mécanisme sans le déclencher.
- **Inconnu connu.** La portée attendue reste à définir. Effacer les données seulement, ou aussi le programme hors connexion ? Garder les modèles et les identités ? Proposer un export obligatoire avant ?

### 4. Newsletters de démonstration

- **Connu.** Trois départs natifs existent, sous forme de listes de blocs : information, lettre, invitation (`library-actions.js`). Ils servent de squelettes, pas de démonstrations remplies.
- **Connu.** Plusieurs contenus existent déjà, sans être proposés comme démonstrations dans l’interface :
  - `exemple.courriel.json`, importable ;
  - `qualification.courriels.json`, pour la recette (52 sections) ;
  - le modèle éditorial validé du skill `newsletter-contribution` (revue de presse sans image).
- **Inconnu connu.** Le choix des démonstrations reste ouvert : lesquelles, avec quel contenu fictif crédible, et où les placer (modèles, compositions préinstallées, bouton « Essayer un exemple »). Leur effet sur une bibliothèque déjà remplie est aussi à prévoir.

### 5. Expérience centrée utilisateur

- **Connu.** Le README sert à la fois de page d’accueil, de journal de recette et de rapport d’accessibilité : la première consigne d’usage arrive après trois paragraphes de qualification.
- **Connu.** L’interface emploie des termes techniques : JSON, v1/v2, origine, cache, hors connexion non vérifié.
- **Inconnu connu.** Les utilisateurs cibles, leurs postes, leur fréquence d’usage et leur niveau technique ne sont pas documentés dans les sources lues.
- **Inconnu inconnu probable.** Aucun test d’usage avec un utilisateur réel n’est tracé. Les frictions réelles peuvent donc différer de cette analyse documentaire.

## Ordre de décision proposé

1. Mode d’usage recommandé (web installé ou portable). Ce choix conditionne les sujets 1, 2 et 3.
2. Modèle mental de la bibliothèque et vocabulaire.
3. Portée de la réinitialisation.
4. Démonstrations embarquées.
5. Parcours de première utilisation, qui synthétise les choix précédents.

## Journal questions-réponses

### Q1 - Mode d’usage recommandé par défaut
- Question : quelle voie l’atelier doit-il recommander par défaut, le site web installé ou le fichier portable ?
- Options présentées :
  - Web d’abord : une bibliothèque par défaut, mises à jour automatiques.
  - Portable d’abord : sans installation ni réseau, mais sans mise à jour automatique.
  - Choix guidé à l’arrivée.
- Recommandation : web d’abord.
- Capture : Alex retient « Web d’abord ». En conséquence :
  - l’installation web devient le parcours principal à expliquer ;
  - le portable reste disponible comme secours, avec un lien de téléchargement depuis le site, absent aujourd’hui ;
  - le passage d’une bibliothèque à l’autre devient un cas marginal à documenter, pas un parcours courant.
- Drapeaux : installation d’une application web sur les postes du parc non qualifiée -> Alex ou DSI. Si elle est interdite, la recommandation est à revoir.

### Q2 - Rendre la bibliothèque évidente
- Question : comment rendre évidente la bibliothèque, enregistrée seulement dans ce navigateur et sur ce poste ?
- Options présentées :
  - Vocabulaire et rappels.
  - Vocabulaire seul.
  - Bibliothèque dans un fichier : ouvrir et enregistrer comme un document, ce que seuls Chrome et Edge permettent.
- Recommandation : vocabulaire et rappels.
- Capture : Alex retient « Vocabulaire et rappels ».
  - « Mes newsletters » devient le seul terme visible pour la bibliothèque, avec trois onglets : newsletters, modèles, identités.
  - Les termes « bibliothèque », « composition » et « Fichiers et récupération » sortent du vocabulaire principal ou sont renommés.
  - Un encart permanent indique « dans ce navigateur, sur ce poste » et la date de la dernière sauvegarde en fichier.
  - Un rappel de sauvegarde apparaît après des modifications ou au bout de quelques jours.
  - Le stockage reste celui du navigateur ; la bibliothèque dans un fichier est écartée pour l’instant.
- Drapeaux :
  - Seuil du rappel (nombre de modifications ou nombre de jours) à fixer -> conception.
  - Libellé exact de l’action d’export, aujourd’hui « Exporter la bibliothèque » -> conception.
  - Mise en œuvre du mot « composition » dans l’éditeur, à revoir avec Q5.

### Q3 - Portée de la remise à zéro
- Question : que doit effacer la remise à zéro ?
- Options présentées :
  - Effacer mes données.
  - Effacer données et programme : le cache hors connexion et le service de mise à jour en plus.
  - Effacer au choix.
- Recommandation : effacer mes données.
- Capture : Alex retient « Effacer mes données ».
  - L’action « Tout effacer », placée dans Mes newsletters, supprime newsletters, modèles et identités.
  - Elle propose d’abord « Sauvegarder puis tout effacer » et demande une confirmation explicite.
  - Elle ramène à l’état de première visite, avec les démonstrations si Q4 les retient.
  - Le cache du programme et l’application installée ne sont pas touchés ; une page web ne peut pas désinstaller l’application elle-même.
- Drapeaux :
  - Forme de la confirmation (simple modale, ou saisie d’un mot) -> conception, selon le niveau de risque accepté.
  - Le mécanisme actuel traite une disparition du stockage comme une erreur (« La bibliothèque enregistrée a disparu ») ; l’effacement voulu devra s’en distinguer -> réalisation.
  - Comportement d’un autre onglet ouvert pendant l’effacement, l’atelier gérant déjà plusieurs fenêtres -> réalisation.

### Q4 - Emplacement des démonstrations
- Question : où placer des newsletters de démonstration réalistes au contenu fictif ?
- Options présentées :
  - Onglet Exemples en lecture seule.
  - Préinstallées dans Mes newsletters.
  - Dans Mes modèles.
- Recommandation : onglet Exemples.
- Capture : Alex retient « Onglet Exemples ».
  - Les exemples sont fournis avec l’atelier, versionnés avec lui et non stockés dans la bibliothèque.
  - Chacun se prévisualise ; « Créer à partir de cet exemple » ajoute une copie modifiable dans Mes newsletters.
  - « Tout effacer » ne touche pas les exemples.
  - Avec Q2, Mes newsletters compterait trois onglets plus cet espace d’exemples ; leur articulation est à trancher avec Q5.
- Drapeaux :
  - Choix des exemples et de leur contenu fictif crédible, par exemple la revue de presse validée, une lettre d’information illustrée et une invitation à un événement -> Alex.
  - Images des exemples : incorporées (fichier plus lourd) ou absentes -> conception.
  - Sort des trois départs natifs actuels (fusion avec les exemples ou maintien comme « partir de zéro ») -> Q5.
  - Le skill `newsletter-contribution` pourrait produire et maintenir ces exemples avec ses tests -> réalisation.

### Q5 - Démarche de recentrage utilisateur
- Question : par quoi commencer pour recentrer l’expérience sur l’utilisateur ?
- Options présentées :
  - Accueil puis test.
  - Test d’abord, sur l’atelier actuel.
  - Visite guidée.
- Recommandation : accueil puis test.
- Capture : Alex retient « Accueil puis test ».
  - Le parcours de première visite réunit les décisions précédentes : installer (Q1) ; Mes newsletters avec son encart de sauvegarde (Q2) ; créer depuis un exemple ou de zéro (Q4) ; reprendre ; « Tout effacer » (Q3), placé à l’écart.
  - Le jargon (JSON, v1/v2, origine, cache, « hors connexion non vérifié ») passe dans une aide repliable ou est reformulé.
  - Le README devient un mode d’emploi court ; recettes et audits rejoignent `docs/`.
  - Une maquette est testée avec 3 à 5 utilisateurs réels, sur des tâches concrètes (installer, créer depuis un exemple, sauvegarder, retrouver une newsletter), avant toute réalisation complète.
  - La visite guidée est écartée : le DSFR n’a pas de composant pour cela, elle pose des risques d’accessibilité et masque les défauts au lieu de les corriger.
- Drapeaux :
  - Recrutement des 3 à 5 utilisateurs et choix des tâches -> Alex.
  - Forme de la maquette (HTML cliquable DSFR ou branche de l’atelier) -> conception.
  - Articulation entre les trois onglets de Mes newsletters et l’espace d’exemples -> conception de l’accueil.

## Drapeaux ouverts

### Avant de concevoir

- Profil des utilisateurs cibles et recrutement de 3 à 5 testeurs -> Alex.
- Choix des exemples et de leur contenu fictif -> Alex.

### Avant la diffusion du nouvel accueil

- Adresse définitive et son propriétaire (Q6) -> Alex.
- Installation réelle de l’application web sur un poste du parc (Q1 : accès confirmé, installation « normalement oui ») -> Alex.

### Pendant la conception de l’accueil

- Comportement quand le navigateur refuse la conservation durable (Q8).

- Articulation entre Mes newsletters (trois onglets) et l’espace d’exemples.
- Sort des trois départs natifs : fusion avec les exemples ou maintien comme « partir de zéro ».
- Seuil et libellé du rappel de sauvegarde.
- Forme de la confirmation de « Tout effacer ».
- Images des exemples : incorporées ou absentes.
- Forme de la maquette de test.

### À la réalisation

- Distinguer l’effacement voulu de l’erreur « bibliothèque disparue ».
- Comportement des autres onglets ouverts pendant l’effacement.
- Production et tests des exemples, éventuellement par le skill `newsletter-contribution`.

## Validation connu-inconnu des décisions Q1 à Q5

Analyse demandée par Alex après la session, fondée sur les sources du dépôt à `fb3cf25`. Il s’agit d’une auto-vérification, pas d’une revue indépendante.

**Reformulation.** Recentrer l’atelier sur un usage web d’abord, autour de « Mes newsletters » : sauvegarde rendue visible, remise à zéro des données, espace d’exemples. Concevoir l’accueil de première visite avant de le tester avec 3 à 5 utilisateurs.

### Ancrage (connus connus)

- Deux distributions partagent le même moteur. Chacune a sa bibliothèque, séparée par origine (guide, § Variante web).
- Bibliothèque en IndexedDB, sauvegarde automatique, ni synchronisation ni partage (guide, § Modèles et bibliothèque).
- Le site ne propose aucun lien vers le portable. Aucune remise à zéro n’existe. Trois départs natifs servent de squelettes (`library-actions.js`).
- `docs/cadrage-source.md` laisse « l’hébergement et les contraintes d’installation des postes » à préciser.

### Brouillard (connus inconnus)

- `[!]` **Accès et installation sur le parc.**
  - Questions : le proxy autorise-t-il `alexandra-guiderdoni.github.io` ? Le navigateur imposé permet-il d’installer une application web ? Les stratégies de groupe le bloquent-elles ?
  - Enjeu : Q1 repose entièrement sur ces réponses.
  - Décision : obtenir l’avis de la DSI avant de concevoir l’accueil autour de l’installation.
- `[^]` **Hébergement durable.**
  - Constat : « web d’abord » fait de l’URL publique le produit, mais elle dépend d’un compte GitHub personnel.
  - Questions : quelle pérennité, quelle gouvernance, faut-il un domaine institutionnel ou une homologation ?
  - Décision : où l’atelier doit-il vivre s’il devient le parcours principal ?
- `[^]` **Utilisateurs cibles.** On ignore leur profil, leur fréquence d’usage et leur niveau technique. Décision : définir la cible avant de rédiger le contenu des exemples et le vocabulaire.
- `[~]` **Exemples.** On ignore qui les rédige et qui valide leur contenu éditorial, avec quelles images et quels droits. Décision : un responsable éditorial.
- `[~]` **Seuil du rappel de sauvegarde et destination du fichier.** Le fichier exporté atterrit dans les téléchargements. Décision : seuil, libellé et conseil de rangement.

### Déni (inconnus connus)

- `[^]` **« Web d’abord donne une bibliothèque fiable. »**
  - Indice : l’atelier ne demande jamais `navigator.storage.persist()`. Ses données sont donc dans un stockage que le navigateur peut évincer, par exemple sous pression de disque.
  - Indice : WebKit limite à sept jours sans interaction le stockage des sites non installés. Hypothèse à vérifier pour Safari et pour les applications ajoutées au Dock.
  - Ce qui est masqué : passer au web d’abord augmente l’exposition à cette perte silencieuse ; le rappel de sauvegarde n’en est qu’un palliatif.
- `[^]` **« Sauvegarder suffit. »**
  - Indice : l’import ajoute les éléments avec de nouveaux identifiants (`imports.js`).
  - Ce qui est masqué : restaurer une sauvegarde dans une bibliothèque non vide crée des doublons, et aucune action « Restaurer » n’existe.
  - Conséquence : une sauvegarde sans restauration claire ne protège qu’à moitié. Le couple « Tout effacer » puis import fonctionne, mais aucun parcours ne le dit.
- `[~]` **« Unifier le vocabulaire est une simple reformulation. »**
  - Indice : 69 lignes de tests, ceux du skill `newsletter-contribution` compris, citent les libellés actuels (« Fichiers et récupération », « Mes modèles », « Importer du JSON »).
  - Ce qui est masqué : un chantier de renommage, avec tests, skill, guide et README à réaligner. Le contrat du skill le signalera, ce qui est voulu.
- `[~]` **« Les exemples se mettent à jour avec l’atelier. »**
  - Indice : une copie créée depuis un exemple n’évolue plus ensuite.
  - Ce qui est masqué : les exemples deviennent du code à maintenir à chaque évolution du catalogue. Leurs images alourdissent le portable et la première mise en cache.
- `[.]` **« Le README est la porte d’entrée des utilisateurs. »**
  - Indice : les utilisateurs arrivent sur le site, pas sur GitHub.
  - Ce qui est masqué : le recentrage doit se faire dans l’atelier ; nettoyer le README sert surtout les contributeurs.

### Abîme (inconnus inconnus)

- `[^]` **Mise à jour simultanée de tous les postes.**
  - Constat : en web d’abord, une version qui change le catalogue ou le format atteint tout le monde en même temps.
  - Signe précurseur : des signalements « composition d’un autre catalogue » ou des imports refusés le même jour sur plusieurs postes.
  - Atténuation à concevoir : note de version visible et export proposé avant « Appliquer la mise à jour », qui existe déjà en partie.
- `[^]` **Poste ou profil partagé.**
  - Constat : sur un poste partagé, la bibliothèque d’un agent est visible par le suivant, brouillons internes compris.
  - Signe précurseur : des newsletters inconnues dans « Mes newsletters ».
  - Liens : « Tout effacer » sert alors aussi de mesure de confidentialité, ce qui change son libellé et son emplacement.
- `[~]` **Exemple envoyé tel quel.**
  - Constat : une copie d’exemple peu modifiée peut partir à de vrais destinataires.
  - Signe précurseur : des domaines de démonstration dans les envois.
  - Atténuation existante : le contrôle avant copie signale déjà les domaines de démonstration ; il faut le garantir pour tout contenu d’exemple.
- `[~]` **Requalification d’accessibilité de l’accueil refondu.**
  - Constat : la campagne RGAA publiée porte sur l’interface actuelle.
  - Signe précurseur : des écarts entre le rapport et l’accueil livré.
  - Conséquence : le nouvel accueil, ses onglets et sa confirmation de « Tout effacer » demandent une requalification ciblée.

### Risques prioritaires

1. `[!]` Accès au site et installation sur le parc non qualifiés : ils conditionnent Q1.
2. `[^]` Perte silencieuse du stockage navigateur, aggravée par le web d’abord, sans persistance demandée ni restauration propre.
3. `[^]` Hébergement sur un compte personnel devenant le produit principal.
4. `[^]` Poste partagé : confidentialité des brouillons.
5. `[~]` Coût réel du renommage, avec tests, skill et documentation.

### Questions prioritaires

- La DSI autorise-t-elle l’accès à l’URL et l’installation d’une application web ? Raison : Q1 en dépend entièrement.
- L’atelier doit-il rester hébergé sur ce compte GitHub s’il devient le parcours principal ? Raison : pérennité et gouvernance.
- Les postes sont-ils nominatifs ou partagés ? Raison : confidentialité et sens de « Tout effacer ».

### Ajouts proposés à la spécification

Ce sont des propositions, pas des décisions.

- Demander la persistance du stockage (`navigator.storage.persist()`) et afficher son état dans l’encart de Q2.
- Ajouter « Restaurer une sauvegarde », qui remplace la bibliothèque après confirmation, en plus de l’import qui ajoute.

### Verdict

**Prêt sous conditions** pour rédiger la spécification. Q2 à Q5 tiennent, sous réserve des deux ajouts ci-dessus. **Q1 n’est pas prêt** tant que l’accès et l’installation sur le parc ne sont pas confirmés : la spécification doit garder le portable comme repli de premier rang tant que ce drapeau reste ouvert.

### Réponses d’Alex après la validation

- Accès des postes du parc à `alexandra-guiderdoni.github.io` : **oui**.
- Installation d’une application web : **« normalement oui »**, sans essai sur un poste du parc.
- Effet sur le verdict : le risque `[!]` du parc tombe à `[~]`. Q1 passe à **prêt sous condition** : une installation réelle sur un poste du parc doit le confirmer avant la livraison de l’accueil, pas avant la spécification.
- Nouvelle question révélée : l’origine du site porte la bibliothèque. Changer d’hébergement après coup ferait perdre leurs données à tous les utilisateurs, qui devraient les exporter puis les réimporter. L’hébergement devient donc une décision à prendre avant d’orienter le parcours vers le web.

### Q6 - Hébergement définitif
- Question : où l’atelier doit-il vivre, puisque l’adresse porte la bibliothèque de chaque utilisateur ?
- Options présentées :
  - Décider avant de lancer.
  - Garder l’adresse actuelle, sur un compte personnel.
  - Prévoir un parcours de migration.
- Recommandation : décider avant de lancer.
- Capture : Alex retient « Décider avant de lancer ».
  - L’adresse définitive est fixée avant d’orienter les utilisateurs vers le web : organisation GitHub de service, ou domaine institutionnel pointant vers GitHub Pages.
  - Le nouvel accueil n’est diffusé qu’une fois cette adresse stable.
  - Si l’adresse n’est pas fixée à temps, la spécification prévoit un parcours de migration appuyé sur la restauration.
- Drapeaux : choix de l’adresse définitive et de son propriétaire -> Alex, avec la gouvernance du service. Il bloque la diffusion du nouvel accueil, pas la rédaction de la spécification.

### Q7 - Postes nominatifs ou partagés
- Question : comment sont utilisés les postes, puisque la bibliothèque est visible de quiconque utilise le même profil de navigateur ?
- Options présentées :
  - Nominatifs.
  - Parfois partagés.
  - Je ne sais pas.
- Recommandation : nominatifs, si c’est le cas.
- Capture : Alex répond « Nominatifs ».
  - « Tout effacer » reste une remise à zéro, sans rôle de confidentialité ni proposition en fin de session.
  - L’aide ajoute une seule phrase sur les postes ou profils partagés.
  - Le risque « poste partagé » de la validation passe de `[^]` à `[.]`.
- Drapeaux : aucun.

### Q8 - Ajouts issus de la validation
- Question : intègre-t-on la conservation durable du stockage et « Restaurer une sauvegarde » ?
- Options présentées :
  - Les deux.
  - Restauration seule.
  - Aucun pour l’instant.
- Recommandation : les deux.
- Capture : Alex retient « Les deux ».
  - L’atelier demande `navigator.storage.persist()` et l’encart de Q2 affiche si le navigateur l’a accordé.
  - « Restaurer une sauvegarde » remplace la bibliothèque après confirmation. L’import actuel, qui ajoute, reste disponible.
  - La restauration sert aussi de base à la migration d’adresse de Q6.
- Drapeaux :
  - Comportement quand le navigateur refuse la conservation durable : message et conseil associés -> conception.
  - Restauration d’un fichier venant d’une version plus récente ou v2 sur un atelier plus ancien : message de refus déjà existant à reprendre -> conception.

## Prochaine étape proposée

Rédiger la spécification du parcours de première visite (Q1 à Q5) avec sa maquette DSFR, puis préparer le protocole de test utilisateur. Rien n’est réalisé dans l’atelier avant validation de cette spécification par Alex.
