# Maintenir l’application

Le [dossier d’accessibilité](accessibilite/css-20261023/RAPPORT.md) conserve la campagne courante, ses matrices, les scripts et leurs limites. Les fichiers sous `evidence/` sont locaux ; les reçus partageables et matrices figurent sous `docs/accessibilite/`. Aucun script d’audit ne produit une conformité humaine.

Le [complément de zoom natif](accessibilite/zoom-20261023/RAPPORT.md) décrit les préférences Firefox des profils isolés, les collecteurs et leurs limites. Ses JSON sont des données exhaustives générées, avec empreintes et pointeurs par instance ; leur volume ne constitue pas une nouvelle couche applicative. Ne pas assimiler une capture HTML réexécutée par AY11 à un exercice du zoom natif.

Pour [valider le balisage](accessibilite/css-20261023/BALISAGE-8.2.1.md), distinguer source avant parsing, DOM capturé et copie dérivée. `document.documentElement.outerHTML` omet le doctype et le parsing peut réparer des erreurs ; conserver la sortie brute et documenter toute transformation avant une seconde validation.

Pour [collecter le clavier Firefox](accessibilite/css-20261023/CLAVIER-FIREFOX.md), distinguer élément actif et focus réel, respecter l’ordre composé des cadres, attendre leur document et conserver les arrêts natifs non inventoriés. Une phase interrompue garde son statut même lorsque ses scènes terminées sont exploitées avec une reprise ciblée.

Pour [vérifier la saisie native](accessibilite/css-20261023/ACTIVATION-FIREFOX.md), comparer les contrôles au catalogue attendu, distinguer le type métier `alt` du type HTML `text`, puis vérifier les deux états stockés avant de conclure à un aller-retour persistant. Les amorçages, le sélecteur système et les limites des captures restent explicites.

`mail_layout.css_template` qualifie trois formes particulières de la référence : hauteur automatique de l’image de mail-06, largeur vide de mail-33 et attributs `colpos` de mail-46. Le rendu dérivé les corrige ; les signatures, dimensions numériques et déclarations Office sont contrôlées. `tests/mail-html.test.cjs` et le test de référence couvrent les mutations et la géométrie. Le validateur local Nu complète ces tests ; ses huit familles d’erreurs résiduelles restent ouvertes. Sa présence n’est pas requise par `npm test` et aucune conformité ne découle de son seul résultat.

`mail_layout.render_css` retire uniquement quinze déclarations `font-color` qualifiées par sélecteur, valeur et priorité ; toute dérive des signatures contrôlées arrête la compilation. Le repérage est limité à cette référence, sans parseur CSS général ni resérialisation CSSOM. `catalog.css` et l’identité canonique restent intacts ; `renderCss` alimente le rendu commun. Ne pas remplacer cette propriété inconnue par `color` : le corps sombre changerait d’héritage. Les tests `mail-css` et `mail-css-browser` contrôlent les autres déclarations, six mutants et les couleurs dans les formes exportées, avec témoin négatif. Les essais de messagerie restent distincts.

`Render.html` utilise l’objet renseigné pour le titre de page, sinon le nom obligatoire de composition ; les données restent intactes. L’aide du champ Objet annonce ce repli. `page-title.test.cjs` et `page-title-browser.test.cjs` vérifient échappement, anciens JSON, aperçu isolé et téléchargements ouverts. La lecture brute du presse-papiers conserve ce titre ; la lecture filtrée Chromium le retire dans les cas mesurés. Aucun résultat de collage en messagerie n’en est déduit.

L’application livrée est statique et autonome. Python et Node.js sont des outils de développement ; aucun serveur métier, compte ou paquet distant n’est requis à l’exécution. Le [cadrage](cadrage-source.md) conserve les limites d’autorité : amonts en lecture seule, publication et accès aux messageries séparément autorisés.

## Sources de vérité

| Chemin | Responsabilité |
| --- | --- |
| `reference/dsfr-mail/` et `reference/provenance.json` | Copie épinglée et empreintes des gabarits et images amont. |
| `reference/catalogue.json` | Noms et familles des 52 sections, dans l’ordre de la référence. |
| `reference/dsfr-web/`, `scripts/dsfr_assets.py` | Sous-ensemble officiel DSFR 1.15.4, empreintes et incorporation locale des CSS, icônes et fontes pour l’interface du builder. |
| `scripts/catalogue.py` | Compilation des tables en champs typés, CSS et empreinte du contrat. |
| `scripts/mail_layout.py` | Adaptation CSS dérivée et colonnes natives ; arrêt sur dérive de la référence, sans modification du contrat canonique. |
| `app/source/model.js`, `render.js`, `imports.js` | Validation, rendu commun et import des compositions et bibliothèques génériques. |
| `app/source/preview.js`, `preview-measure.js` | Affichage de l’aperçu et mesure dans son origine opaque ; aucun ajout aux exports ou à SNUM. |
| `app/snum/` | Page autonome et adaptation métier SNUM vers le contrat générique, sans stockage automatique. |
| `app/source/storage.js`, `state.js` | Transaction locale, conflits, mémoire et sauvegardes. |
| `app/source/library.js`, `library.css` | Accueil, navigation transitoire vers l’éditeur et actions ciblées sur une composition ; aucun stockage supplémentaire. |
| `app/source/checks.js` | Contrôle avant copie ou téléchargement : six avertissements confirmables, sans réseau ; absent du convertisseur SNUM. |
| Autres fichiers `app/source/` | Interface, fichiers, bibliothèque et cycle hors connexion. |
| `app/assets/` | Icônes locales utilisées par le manifeste. |
| `scripts/build_app.py` | Assemblage déterministe du builder portable, de sa variante web et du convertisseur SNUM autonome. |
| `scripts/interchange.py` | Schéma JSON générique, exemple importable et bibliothèque de qualification. |
| `tests/`, `scripts/recipe_firefox.mjs`, `scripts/recipe_installation.cjs` | Vérifications automatiques, recette Firefox et installation PWA de recette. |

Le parseur SNUM utilisé est la copie conservée sous `prototype/reference/snum-packet.js` ; seule sa fonction `parse` est appelée dans la page SNUM dédiée. Cette copie locale contrôle maintenant la cohérence du jour de semaine avec la date (#24) ; le projet SNUM source reste intact. Sa provenance a deux niveaux (empreinte amont historique `sha256`, empreinte de la copie adaptée `adapted_sha256`) et `npm run check` contrôle la seconde. Le parseur n’est pas assemblé dans le builder générique. L’ancien prototype et ses distributions restent indépendants. Ne pas éditer les HTML générés pour corriger le produit.

Les gabarits canoniques du catalogue restent inchangés. `scripts/catalogue.py` produit aussi une adaptation sémantique et les 32 champs de titre qualifiés ; `render.js` calcule leurs niveaux selon le contexte de la composition. Modifier ces champs exige de vérifier la référence, les titres frères, les parents absents ou vides, les sorties réelles, le contrat v1 et les comparaisons visuelles des 52 composants. L’empreinte du catalogue reste celle du contrat canonique.

Le DSFR web est incorporé dans le builder uniquement, avec Marianne 400/500/700 et les modules CSS inventoriés dans sa provenance. Aucun accès réseau ni JavaScript DSFR n’est requis. Le convertisseur SNUM garde `app/snum/base.css`, copie de son ancien socle visuel ; le modèle et le rendu génériques restent partagés. Une mise à jour de ces ressources web se fait séparément d’une mise à jour du catalogue de courriels.

## Générer et vérifier

Prérequis de développement : Python 3.10+, Node.js 22+ et npm. Playwright est épinglé dans le verrou ; `.npmrc` fixe une maturité de trois jours. L’application n’a aucune dépendance d’exécution npm.

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts
python3 scripts/build_app.py
python3 scripts/build.py
npm run check
npm test
```

`npm run check` contrôle l’empreinte de la copie SNUM adaptée, compare les octets générés aux sources et contrôle aussi que le prototype conservé est reproductible. Les tests utilisent le Chromium attendu par Playwright. Si ce navigateur manque sur le poste de développement, le préparer explicitement avec le CLI de la version épinglée (`npx --no-install playwright install chromium`) ; cette préparation n’est pas une installation sur le poste métier.

Les scénarios navigateur créent des contextes isolés, téléchargent des fichiers réels et produisent des preuves sous `evidence/application/`, ignorées par Git. `MAIL_BUILDER_EVIDENCE` peut désigner un autre répertoire pour préserver une campagne précédente. Le parcours presse-papiers Chromium utilise les permissions du profil de recette. Les pannes de quota et les bibliothèques inconnues sont injectées dans ce seul profil.

### Suite navigateur multi-moteur

`npm test` reste la suite de référence sous Chromium. `npm run test:engines` rejoue les fichiers qui lancent un navigateur sur Chromium, WebKit et Firefox (Playwright), un moteur après l'autre. Options : `--engines=webkit,firefox`, `--files=<fichier>.test.cjs,...`, `--json=<chemin>` pour garder le rapport structuré. Le moteur se choisit pour un fichier seul avec `MAIL_BUILDER_ENGINE=webkit node --test tests/<fichier>`. Le point d'extension est `tests/browser-support.cjs` ; le nom `chromium` importé par les tests désigne désormais le moteur choisi.

Le rapport sépare quatre issues, jamais mélangées :

- les échecs produit non expliqués : tout échec absent du registre `tests/engine-expectations.json` ; ils font échouer la commande (code 1) ;
- les échecs produit connus : inscrits au registre avec leur raison et, quand elle existe, l'issue qui les porte (par exemple #39 pour la largeur sous WebKit) ; ils sont listés mais ne font pas échouer la commande ;
- les limitations d'automatisation : échecs inscrits au registre avec la classe `automation`, et moteurs indisponibles ;
- les tests ignorés explicitement (`skip` avec raison).

Un moteur dont le navigateur Playwright n'est pas installé est rapporté « indisponible, non exécuté » et la commande rend le code 2 : il n'est jamais compté comme réussi. Le téléchargement d'un navigateur reste une décision explicite (`npx playwright install webkit firefox`, avec la version épinglée) ; la commande n'en installe aucun. Playwright exige son propre build de Firefox : le Firefox natif de `/Applications` n'est pas utilisé par cette commande ; `tests/firefox-support.mjs` le pilote séparément par WebDriver BiDi.

Les oracles propres à Chromium sont remplacés par des propriétés vraies dans les trois moteurs. L'arbre d'accessibilité natif (CDP) ne sert qu'à renforcer le test sous Chromium ; ailleurs le test lit les attributs ARIA, le focus du DOM et `ariaSnapshot()`. Les reçus des autres moteurs s'écrivent sous `evidence/application-<moteur>/` et n'écrasent jamais ceux de Chromium.

Presse-papiers : seul Chromium accorde `clipboard-read` à Playwright, donc seul Chromium relit un vrai presse-papiers. Sous WebKit et Firefox, l'écriture de l'application s'exécute pour de bon, mais la relecture rend les éléments enregistrés à l'écriture. C'est une interception, pas un collage : le rapport la signale fichier par fichier (« relecture du presse-papiers par interception, jamais un collage réel »). Aucun de ces tests ne prouve ce qu'une messagerie reçoit : voir #13.

Les installations et résultats locaux ShipGuard sous `visual-tests/` restent aussi ignorés : ils contiennent une copie de l’outillage et des chemins propres à la campagne. La suite produit reproductible et versionnée est sous `tests/`. Le compte rendu d’audit conserve les erreurs du plugin et faux liens du crawler ; ils ne sont pas transformés en défauts produit.

Pour les défilements internes (#28), voir la [recette ciblée](RECETTE-DEFILEMENT.md). Le catalogue natif reçoit une taille égale au nombre de résultats ; les textareas de contenu sont mesurés à la création, à la saisie et au changement de largeur, y compris après masquage. Ne pas étendre cette adaptation au JSON technique.

L’utilisateur a autorisé le seul script canonique de mesure dans l’aperçu : `allow-scripts` sans `allow-same-origin`, empreinte SHA-256 ajoutée aux CSP cumulées du parent et du Blob, réseau toujours interdit dans l’enfant. Le parent vérifie fenêtre source, origine opaque, jeton de navigation, largeur et hauteur entière avant tout ajustement. La mesure utilise le corps et la gouttière native éventuelle, sans réutiliser l’ancienne hauteur du cadre. Conserver l’échappement `<\/script>` dans le module parent assemblé en HTML. `preview-contract`, `preview-size-browser` et `page-flow-browser` exercent ce contrat ; `scripts/recipe_page_flow_firefox.mjs` le complète dans Firefox natif, sur profils isolés, sans installer de navigateur.

`Render.html` produit l’adaptation accessible dérivée ; le champ `template` conserve le gabarit canonique. `Render.clipboardHtml` prépare la copie, y compris SNUM : colonnes de contenu égales et gouttières conservées, proportions d’origine dans l’export et l’aperçu. Les styles Office sont modifiés par chaînes brutes ; une réécriture CSSOM les retirerait. Le contrat et les fichiers JSON existants restent inchangés. `tests/mail-presentation-browser.test.cjs` couvre les seuils responsive, les textes longs, l’espacement, la copie réelle et ses lectures brute et filtrée. `tests/mail-layout-browser.test.cjs` conserve aussi les contrôles de largeurs réécrites et de filets décoratifs. WebKit ignore `max-width` sur une table de largeur fixe en pixels : la copie ajoute `width:min(100%,…)` à ces tables, et un moteur qui ignore `min()` garde la largeur fixe. `tests/mail-copy-engines-browser.test.cjs` vérifie sous Chromium et WebKit que la copie des 52 composants, styles de tête retirés, ne déborde pas et ne masque ni ne coupe aucun contenu. Une largeur imposée de l’extérieur ou une règle de tête `!important` conservée l’emporte sur cette borne : WebKit peut alors encore déborder. Le rendu dans les clients réels reste une recette distincte.

`Render.weight` compte en octets UTF-8 le HTML de `Render.clipboardHtml`, images incorporées comprises ; `Files.copy` pèse la chaîne même qu’il remet au `ClipboardItem`. Les repères de 90 Kio (92 160 octets) et 102 Kio (104 448 octets) déclenchent un avertissement puis une alerte, sans jamais bloquer la copie ; ils ne garantissent ni la taille reçue ni une troncature par Gmail. Le calcul relit tout le courriel : `Files.scheduleWeight` l’exécute après une pause de saisie d’au moins 500 ms, ou du triple de son dernier coût, et jamais à chaque frappe. `tests/mail-weight.test.cjs` et `tests/mail-weight-browser.test.cjs` vérifient les octets, les quatre valeurs autour des seuils, le report pendant la frappe et la page SNUM, sous Chromium et WebKit.

`Render.assertOutput` refuse une composition sans bloc, avant les intitulés manquants : la copie, le téléchargement et le poids deviennent indisponibles, l’aperçu reste possible. `Checks.warnings(document, poids)` applique ensuite une liste fermée de six règles : domaine de démonstration (dernier libellé `invalid`, `example` ou `test`, ou libellé `example` avant le dernier) ; texte ou adresse de lien égal à la valeur par défaut non vide du catalogue, hors adresse déjà signalée comme domaine de démonstration ; poids de niveau `notice` ou `alert` ; domaine lisible dans un intitulé qui n’est ni l’hôte réel ni l’un de ses parents, hors extensions de documents courantes ; contrôle bidirectionnel brut ou encodé ; lettres de plusieurs alphabets dans le domaine décodé, TLD compris, les combinaisons japonaise, coréenne et chinoise exceptées. Les liens examinés sont ceux du catalogue, les liens supplémentaires de `mail-50` et le lien source ; l’hôte d’un `mailto:` est le domaine de l’adresse. `Checks.confirm` ouvre `#check-dialog` une fois par sortie ; `tests/copy-check.test.cjs` donne les exemples positifs et négatifs de chaque règle, `tests/copy-check-browser.test.cjs` le parcours sous Chromium et WebKit. Les tests existants confirment la fenêtre par `confirmChecks` de `browser-support.cjs`.

`Render.exportHtml` prépare le HTML téléchargé, dans le builder comme dans SNUM ; `Render.html` reste inchangé pour l’aperçu et la copie. L’export garde ses styles de tête et ajoute en fin de style des bornes qui ne jouent que si une messagerie les retire, les règles `!important` de tête l’emportant sinon : `width:min(100%,…)` sur les tables de largeur fixe, à leur largeur rendue quand une image fixe bornée les élargit ; dans les colonnes empilables, la colonne qui porte une image fixe garde sa largeur, l’autre passe en `width:auto` et la gouttière est fixée à sa largeur de conception ; `max-width:min(…,100%)` sur les images fixes hors colonnes ; variante sombre du logo masquée en ligne. Hors de ces règles `!important`, seules des déclarations `min()`, `width:auto`, des largeurs égales à la conception et `min-width:0`, sans effet sur une largeur fixe, sont ajoutées : un moteur qui lit les styles de tête sans comprendre `min()` garde donc le rendu dérivé. Sans styles de tête ni `min()`, l’export retombe sur ses largeurs fixes et déborde comme avant. Éviter `max-width` en pourcentage sans `min()` (l’image devient compressible et sa table revient à sa largeur déclarée) et `aspect-ratio` (ignoré par plusieurs messageries qui lisent les styles de tête). Contrairement à la copie, l’export ne change ni les largeurs de conception, ni les proportions des colonnes avec styles de tête, ni les logos. Les largeurs fixes des cellules restent inchangées : elles ne forcent pas une table bornée, y compris en mode quirks. `tests/mail-export-engines-browser.test.cjs` télécharge l’export des 52 composants sous Chromium et WebKit : sans styles de tête à 320, 600 et 800 px, ni débordement, ni contenu masqué, coupé ou superposé, ni table hors de sa cellule au-delà des dépassements du gabarit, ni image déformée, et seul le logo pour fond clair est visible ; avec ces styles, en clair et en sombre, aux seuils responsive, rendu identique au pixel à `Render.html`, y compris après retrait des déclarations `min()`. Le logo opérateur de mail-03 et mail-48 dépasse toujours sa cellule de colonne, comme dans le gabarit.

Les métadonnées `links` sont dérivées des seuls nœuds texte des gabarits. La compilation refuse une destination sans intitulé unique, un intitulé ambigu ou répété et une activation incompatible avec la neutralisation d’aperçu. `Render.assertOutput` protège le HTML final et la copie ; `Render.html(document, true)` conserve l’aperçu des anciens fichiers avec un repère non activable. Le modèle JSON accepte toujours ces données et permet leur réparation progressive. Les erreurs de préparation à la diffusion ne sont pas ajoutées au registre des saisies refusées.

`tests/link-labels.test.cjs` et `tests/link-labels-browser.test.cjs` couvrent les 13 champs, 12 mutations de structure, anciens imports par fichier et texte, rechargement, récupération JSON, focus et correction, aperçu isolé, URL identiques, modèles, identités, duplication et garde SNUM. L’arbre natif du cadre est lu par sa propre session CDP ; le `sandbox` n’est pas assoupli. La recette SNUM négative injecte une sortie altérée à la frontière du convertisseur ; elle ne prétend pas reproduire une collecte métier normale.

La même commande `npm test` inclut désormais le prototype : erreurs de saisie et sorties, clavier, import et décodage différés, restauration, concurrence de fenêtres, images, sources et réduction des données inutilisées. Les tests de compilation exercent aussi une locale ASCII, les octets UTF-8/LF et chaque icône précachée. Les observations d’erreur et de requête sont branchées avant la navigation ; un scénario négatif injecte un vrai défaut de démarrage dans un profil isolé. Les garde-fous d’import sont décrits dans [le contrat JSON](FORMAT-JSON.md).

Les parcours d’édition ouvrent d’abord une composition depuis l’accueil, par un contrôle visible. Le test `library-browser.test.cjs` exerce aussi l’accueil directement, les actions sur une entrée non active, l’annulation et le retour de focus, la dernière suppression, une fenêtre de 390 px et les refus de navigation sans perte. Le helper clavier attend la visibilité du contrôle avant de lui donner le focus : `focus()` seul ne prouve pas qu’un utilisateur puisse activer le bouton.

`tests/form-interactions-browser.test.cjs` contrôle les 178 champs rendus, les contraintes du nom et des 13 URL, les rejets sans mutation, les corrections, les annulations et le focus DOM/AX. Les reçus portent un indicateur de fin ; les rapprocher du journal terminal. La collecte générique AY11 découvre aussi le formulaire du dialogue masqué et ne vide pas les champs avant sa première soumission. Préparer son état explicitement et distinguer ses noms de scénario du comportement observé. Les mentions obligatoires de l’interface dérivent des contraintes existantes du modèle ; `aria-required` conserve la validation applicative actuelle.

`scripts/audit_contrasts.cjs` complète les indéterminés des sélecteurs et dialogues par les couleurs nominales, la géométrie et les captures. Le [protocole](accessibilite/contrastes-20261022/RAPPORT.md) décrit ses 80 observations et cinq contrôles négatifs, dont un masque laissant passer le pointeur. Il exige une capture de référence sur les mêmes sources, refuse les compositions qu’il ne sait pas mesurer et contrôle les empreintes avant/après. Ce collecteur ciblé ne qualifie pas tous les contrastes ni toute occultation.

Sur le Mac de développement avec Firefox installé :

```sh
node scripts/recipe_firefox.mjs
```

`FIREFOX_BINARY` permet de désigner l’exécutable Firefox ; `SNUM_RECIPE_PACKET` permet d’utiliser un paquet de recette local. Sans ce dernier, le scénario utilise un paquet synthétique. Le scénario convertit dans la page SNUM dédiée, télécharge le JSON puis l’importe dans le builder. La recette crée son propre profil, ferme uniquement le processus qu’elle a lancé et conserve un reçu sous `evidence/application/`. Elle n’exerce pas Windows.

Pour éprouver sur le Mac l’installation réelle dans un profil Chromium isolé :

```sh
node scripts/recipe_installation.cjs
```

Cette recette lance Chrome for Testing avec fenêtres visibles, effectue l’installation de la webapp par les [commandes PWA de DevTools](https://chromedevtools.github.io/devtools-protocol/tot/PWA/), puis ferme complètement le navigateur. Serveur arrêté et connexion refusée, elle relance l’application installée en fenêtre autonome, contrôle bibliothèque et image, puis la désinstalle. Le profil et les reçus restent sous `evidence/application/`. Elle ne vérifie ni le dialogue humain d’installation, ni un raccourci du système, ni HTTPS réel. Sur ce Mac, la cible initialement renvoyée par le protocole est remplacée ; le scénario identifie la fenêtre autonome survivante par son URL, son état prêt et son mode d’affichage.

Pour inspecter la variante web en développement :

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory app/distribution/web
```

Ouvrir `http://127.0.0.1:8765/`. L’exception de sécurité de boucle locale sert à la recette ; cette ouverture seule ne démontre ni une origine HTTPS publique ni une installation. L’installation est exercée séparément par le scénario ci-dessus.

## Données et migrations

Les fichiers `dsfr-mail/document` et `dsfr-mail/library` portent `version: 1` et l’empreinte du catalogue. La bibliothèque contient compositions, modèles, identités et composition active. Les images sont des données incorporées ; aucun gabarit utilisateur ni HTML actif n’est accepté. Le [contrat JSON](FORMAT-JSON.md) et son schéma sont générés à partir du modèle existant : la séparation SNUM ne change ni le contrat v1, ni son empreinte, ni la base locale.

`sourceLabel` est une propriété facultative de bloc, validée comme chaîne. Le schéma conserve les quatre propriétés obligatoires antérieures ; les autres propriétés inconnues restent refusées. Le rendu fournit le texte par défaut sans l’ajouter aux anciennes données. La compatibilité avec les anciens lecteurs stricts est détaillée dans le contrat JSON.

Les champs de lien des pieds de page `mail-47` à `mail-50` acceptent aussi
`mailto:` vers une seule adresse ASCII, avec un objet `subject` facultatif
encodé dans l’URL. Les destinataires multiples, les autres paramètres et les
caractères de contrôle sont refusés. Les liens source de tous les blocs et
les champs de lien des autres familles gardent leur contrat HTTPS. Cet ajout
ne change ni les champs, ni la version, ni l’empreinte du catalogue. Un ancien
lecteur strict peut refuser une nouvelle composition contenant `mailto:` :
ouvrir celle-ci avec la livraison qui prend en charge ces pieds de page.

Le schéma JSON Schema 2020-12 vérifie la structure ; les contrôles d’URL, d’unicité et de référence active restent aussi dans le moteur. Il ne crée aucune dépendance d’exécution. La suite utilise `tests/schema-validation.test.cjs`, via `tests/validate-schema.cjs`, pour valider les deux exemples livrés, un export de composition et un export de bibliothèque produits par l’application, et pour rejeter des témoins invalides. Le validateur s’appuie sur `ajv` 8 et `ajv-formats` 3, inscrits en `devDependencies` et installés par `npm ci --ignore-scripts` ; sans eux le test échoue explicitement avec le code 2, il n’est jamais ignoré. Aucune dépendance Python n’est requise.

IndexedDB utilise `builder-mail-dsfr-library`, version 1, magasin `library`. L’enregistrement courant et l’état précédent sont écrits dans la même transaction. Le token courant empêche une fenêtre obsolète d’écraser silencieusement une autre fenêtre. Chaque sauvegarde réussie remplace l’unique état précédent. Un abandon est classé « saturé » si le nom `QuotaExceededError` arrive par l’une des trois voies de `Storage.save` : levée synchrone dans `put` (`refusal`, couverte sur les trois moteurs par `refuseWrites` dans `tests/save-rescue-browser.test.cjs`), `tx.error` à l’abandon (`tests/storage-browser.test.cjs`, « abandon porteur … par tx.error », trois moteurs ; quota réel par CDP dans `tests/save-rescue-browser.test.cjs`, Chromium seul, ignoré ailleurs avec sa raison) ou `event.target.error` d’une requête (« abandon porteur … par event.target.error », Chromium seul : WebKit ne remonte pas à la transaction un événement distribué par script sur la requête) ; tout autre abandon est « inaccessible » (« abandon de transaction après écriture », trois moteurs).

Chaque enregistrement nomme aussi la version de l’application qui l’a écrit (`app`, empreinte du script assemblé, publiée dans `<meta name="application-version">`). Une fenêtre dont l’écriture est refusée par le token, ou qui reçoit l’annonce d’une reprise sur le canal `BroadcastChannel` `builder-mail-dsfr-library`, passe en lecture seule. « Reprendre la main » relit l’enregistrement courant, ajoute en copies horodatées les compositions, modèles et identités modifiés depuis la base de la fenêtre (dernière bibliothèque relue ou écrite sous son token), puis écrit sous le token relu : le contrôle du token reste la seule garde contre l’écrasement, y compris pendant la reprise. La reprise est refusée si `app` diffère de la version de la page, ou après un changement de contrôleur du Service Worker que la page n’a pas demandé : cette fenêtre doit exporter puis se recharger. Sans diffusion entre fenêtres (constaté sous WebKit pour le portable), l’ancienne fenêtre ne passe en lecture seule qu’à sa prochaine écriture refusée.

La règle de reprise est écrite pour deux fenêtres ; le comportement à trois fenêtres ou plus n’est pas défini. Le canal `BroadcastChannel` peut ne pas relier deux fenêtres (Safari avec la protection contre le pistage, navigation privée, pages `file://` sous WebKit) : la fenêtre sans la main ne passe alors en lecture seule qu’à sa prochaine écriture, refusée par le token, sans perte.

Une sauvegarde lente retient au plus une écriture engagée et la dernière bibliothèque en attente. Les frappes intermédiaires ne forment plus une file de copies complètes ; l’état précédent reste la dernière transaction réussie. Une ouverture IndexedDB refusée peut être retentée ; une connexion fermée par changement de version est abandonnée. Dans le prototype, une restauration attend la fin des sauvegardes déjà demandées avant de relire son jeton.

L’accueil et l’éditeur utilisent le même objet de bibliothèque. La vue courante n’est pas une donnée métier persistée ; l’ouverture revient à l’accueil. Le changement de vue ne recharge pas la page. Les gardes et la fin de sauvegarde sont vérifiés avant le retour ; les commandes d’export restent hors des vues masquées. L’édition temporaire de récupération garde l’accès au travail en mémoire quand une bibliothèque inconnue a été préservée.

Le cache du Service Worker contient uniquement les ressources de l’application. Son nom versionné dérive de tous les octets précachés, dont manifeste et icônes, et de la source du worker avant substitution de version ; son préfixe inclut le périmètre d’installation. Une modification du worker seul crée ainsi un cache distinct. Le précache utilise des requêtes avec [`cache: "reload"`](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache) pour éviter de reprendre un ancien fichier encore frais dans le cache HTTP. Le worker ne conserve ni les compositions ni leurs fichiers. Dans l’application, l’activation d’une nouvelle livraison attend une action et une sauvegarde réussie. Le nettoyage reste limité au même périmètre. Les anciens caches du prototype sans origine identifiable ne sont pas supprimés automatiquement : leur propriétaire ne peut pas être déterminé sans risquer un autre déploiement. Sur une même origine, les bibliothèques IndexedDB sont partagées entre chemins ; leurs caches de programme restent distincts. Les paramètres d’un favori sont acceptés pour les seules pages de démarrage ; aucune ressource arbitraire ne reçoit un repli HTML. Le portable, même servi par HTTP, ne tente pas d’inscrire un worker.

Une modification des champs, gabarits ou CSS change l’empreinte du catalogue. L’ancien fichier est alors refusé explicitement : **prévoir une migration testée avant de diffuser ce changement**. Ne pas modifier seulement son empreinte pour forcer l’import. Garder un exemplaire de l’ancienne livraison et les exports de bibliothèque jusqu’à la qualification de migration.

## Faire évoluer la référence ou livrer

1. Lire le nouvel amont sans y écrire ; comparer sections, champs, CSS, images et conditions d’utilisation.
2. Mettre à jour la copie de référence, les empreintes, l’inventaire et la [notice](../reference/NOTICE.md) dans le seul dépôt applicatif autorisé.
3. Adapter la compilation et, si nécessaire, la migration des données. Éprouver un ancien fichier, les sources SNUM et les deux variantes du logo.
4. Régénérer, relire le diff, exécuter les vérifications adaptées et qualifier chaque famille concernée dans le mail reçu.
5. Fournir le dossier de recette et les limites. Tout push ou déploiement exige le mandat correspondant.

Publier trois variantes : le contenu de `app/distribution/web/` (atelier web), `app/distribution/snum.html` (publié sous `snum.html`) et `app/distribution/portable.html` (publié sous `atelier-portable.html`). Seule la variante web est installable et hors connexion ; SNUM et le portable sont des fichiers autonomes servis à côté d’elle. Les servir sur l’origine HTTPS autorisée, dans un périmètre stable. Ne pas mettre un profil navigateur ou `evidence/` en ligne. La recette de mise à jour locale utilise une variation contrôlée du cache ; elle ne prouve pas une migration de schéma ni les politiques d’un hébergeur réel.

GitHub Pages est l’hébergement choisi par l’utilisateur. `.github/workflows/pages.yml` vérifie les octets générés puis publie seulement la variante web, `snum.html` et `atelier-portable.html`. Les Actions officielles sont épinglées par SHA ; aucun secret personnel n’est requis. Activer Pages avec la source « GitHub Actions » dans les paramètres du dépôt et utiliser `main` comme branche par défaut. Cette activation exige les droits d’administration ou de gestion de Pages ; un accès Git en écriture ne suffit pas. Voir la [procédure GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Publication réalisée le 22 octobre : `main` est la branche par défaut et la source Pages est « GitHub Actions ». Le [déploiement vérifié](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/39830471099) publie l’[atelier en HTTPS](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/), le [convertisseur SNUM](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/snum.html) et le [portable](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/atelier-portable.html). Huit fichiers servis sont identiques aux distributions ; la montée de version publique par le bouton de mise à jour conserve la bibliothèque et affiche la nouvelle interface. Le rechargement hors connexion conserve aussi l’intitulé personnalisé. Le [reçu](recette-pages.json) garde la preuve. L’activation initiale avait échoué en HTTP 404 avec le compte de contribution ; les réglages ont été effectués dans la session Chrome du propriétaire, sans extraction de son authentification.

Après publication, contrôler l’URL HTTPS renvoyée par le déploiement, l’ouverture de l’atelier et du convertisseur, le manifeste, le worker et la réouverture hors connexion dans un profil de recette. L’origine web possède sa propre bibliothèque : importer un export JSON du portable pour y retrouver ses compositions. Un site accessible sur Internet ne prouve pas que le parc administratif en autorise l’accès ou l’installation.

## Limites à conserver visibles

La comparaison des 52 structures et du CSS n’exerce pas l’affichage de tous les clients mail, la réécriture du presse-papiers par la messagerie, les images reçues, les restrictions du parc ni un audit RGAA complet. Les versions de recette et l’état de qualification figurent dans [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md).
