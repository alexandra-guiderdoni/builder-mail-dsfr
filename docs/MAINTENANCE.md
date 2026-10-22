# Maintenir l’application

Le [dossier d’accessibilité](accessibilite/formulaires-20261022/RAPPORT.md) conserve la campagne courante, ses matrices, les scripts et leurs limites. Les fichiers sous `evidence/` sont locaux ; les reçus partageables et matrices figurent sous `docs/accessibilite/`. Aucun script d’audit ne produit une conformité humaine.

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
| `app/snum/` | Page autonome et adaptation métier SNUM vers le contrat générique, sans stockage automatique. |
| `app/source/storage.js`, `state.js` | Transaction locale, conflits, mémoire et sauvegardes. |
| `app/source/library.js`, `library.css` | Accueil, navigation transitoire vers l’éditeur et actions ciblées sur une composition ; aucun stockage supplémentaire. |
| Autres fichiers `app/source/` | Interface, fichiers, bibliothèque et cycle hors connexion. |
| `app/assets/` | Icônes locales utilisées par le manifeste. |
| `scripts/build_app.py` | Assemblage déterministe du builder portable, de sa variante web et du convertisseur SNUM autonome. |
| `scripts/interchange.py` | Schéma JSON générique, exemple importable et bibliothèque de qualification. |
| `tests/`, `scripts/recipe_firefox.mjs`, `scripts/recipe_installation.cjs` | Vérifications automatiques, recette Firefox et installation PWA de recette. |

Le parseur SNUM utilisé est la copie conservée sous `prototype/reference/snum-packet.js` ; seule sa fonction `parse` est appelée dans la page SNUM dédiée. Cette copie locale contrôle maintenant la cohérence du jour de semaine avec la date (#24) ; le projet SNUM source reste intact. Le parseur n’est pas assemblé dans le builder générique. L’ancien prototype et ses distributions restent indépendants. Ne pas éditer les HTML générés pour corriger le produit.

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

`npm run check` compare les octets générés aux sources et contrôle aussi que le prototype conservé est reproductible. Les tests utilisent le Chromium attendu par Playwright. Si ce navigateur manque sur le poste de développement, le préparer explicitement avec le CLI de la version épinglée (`npx --no-install playwright install chromium`) ; cette préparation n’est pas une installation sur le poste métier.

Les scénarios navigateur créent des contextes isolés, téléchargent des fichiers réels et produisent des preuves sous `evidence/application/`, ignorées par Git. `MAIL_BUILDER_EVIDENCE` peut désigner un autre répertoire pour préserver une campagne précédente. Le parcours presse-papiers Chromium utilise les permissions du profil de recette. Les pannes de quota et les bibliothèques inconnues sont injectées dans ce seul profil.

Les installations et résultats locaux ShipGuard sous `visual-tests/` restent aussi ignorés : ils contiennent une copie de l’outillage et des chemins propres à la campagne. La suite produit reproductible et versionnée est sous `tests/`. Le compte rendu d’audit conserve les erreurs du plugin et faux liens du crawler ; ils ne sont pas transformés en défauts produit.

`Render.html` produit l’adaptation accessible dérivée ; le champ `template` conserve le gabarit canonique. `Render.clipboardHtml` prépare la copie, y compris SNUM : colonnes de contenu égales et gouttières conservées, proportions d’origine dans l’export et l’aperçu. Les styles Office sont modifiés par chaînes brutes ; une réécriture CSSOM les retirerait. Le contrat et les fichiers JSON existants restent inchangés. `tests/mail-presentation-browser.test.cjs` couvre les seuils responsive, les textes longs, l’espacement, la copie réelle et ses lectures brute et filtrée. `tests/mail-layout-browser.test.cjs` conserve aussi les contrôles de largeurs réécrites et de filets décoratifs. Le rendu dans les clients réels reste une recette distincte.

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

Le schéma JSON Schema 2020-12 vérifie la structure ; les contrôles d’URL, d’unicité et de référence active restent aussi dans le moteur. Il ne crée aucune dépendance d’exécution. Lors de cette recette, le validateur Python local `jsonschema` 4.26.0 a contrôlé le métaschéma et les deux fichiers d’exemple ; il n’est pas requis pour ouvrir l’application.

IndexedDB utilise `builder-mail-dsfr-library`, version 1, magasin `library`. L’enregistrement courant et l’état précédent sont écrits dans la même transaction. Le token courant empêche une fenêtre obsolète d’écraser silencieusement une autre fenêtre. Chaque sauvegarde réussie remplace l’unique état précédent.

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

Servir uniquement le contenu de `app/distribution/web/` sur l’origine HTTPS autorisée, dans un périmètre stable. Ne pas mettre un profil navigateur ou `evidence/` en ligne. La recette de mise à jour locale utilise une variation contrôlée du cache ; elle ne prouve pas une migration de schéma ni les politiques d’un hébergeur réel.

GitHub Pages est l’hébergement choisi par l’utilisateur. `.github/workflows/pages.yml` vérifie les octets générés puis publie seulement la variante web, `snum.html` et `atelier-portable.html`. Les Actions officielles sont épinglées par SHA ; aucun secret personnel n’est requis. Activer Pages avec la source « GitHub Actions » dans les paramètres du dépôt et utiliser `main` comme branche par défaut. Cette activation exige les droits d’administration ou de gestion de Pages ; un accès Git en écriture ne suffit pas. Voir la [procédure GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Publication réalisée le 22 octobre : `main` est la branche par défaut et la source Pages est « GitHub Actions ». Le [déploiement vérifié](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/39830471099) publie l’[atelier en HTTPS](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/), le [convertisseur SNUM](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/snum.html) et le [portable](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/atelier-portable.html). Huit fichiers servis sont identiques aux distributions ; la montée de version publique par le bouton de mise à jour conserve la bibliothèque et affiche la nouvelle interface. Le rechargement hors connexion conserve aussi l’intitulé personnalisé. Le [reçu](recette-pages.json) garde la preuve. L’activation initiale avait échoué en HTTP 404 avec le compte de contribution ; les réglages ont été effectués dans la session Chrome du propriétaire, sans extraction de son authentification.

Après publication, contrôler l’URL HTTPS renvoyée par le déploiement, l’ouverture de l’atelier et du convertisseur, le manifeste, le worker et la réouverture hors connexion dans un profil de recette. L’origine web possède sa propre bibliothèque : importer un export JSON du portable pour y retrouver ses compositions. Un site accessible sur Internet ne prouve pas que le parc administratif en autorise l’accès ou l’installation.

## Limites à conserver visibles

La comparaison des 52 structures et du CSS n’exerce pas l’affichage de tous les clients mail, la réécriture du presse-papiers par la messagerie, les images reçues, les restrictions du parc ni un audit RGAA complet. Les versions de recette et l’état de qualification figurent dans [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md).
