# Accessibilité — présentation des courriels

**Objectif maintenu : 100 % des critères RGAA applicables. Non atteint ; aucun taux validé.** Cette tranche retire les attributs de présentation interdits du rendu et de la copie, conserve les données existantes et renouvelle les contrôles techniques. Les essais de lecteur d’écran réellement écoutés et Windows/Outlook restent indisponibles.

Le [dossier des titres](../titres-20261022/RAPPORT.md) conserve la campagne précédente. Ses collectes et ses essais CSS sont historiques. Les nouvelles preuves identifient leurs sources par empreinte dans le [reçu](recu-20261022.json). AY11 et les références officielles restent en lecture seule ; aucune installation ni aucun envoi de courriel n’a été réalisé dans cette tranche.

## Registre RGAA

Les [106 critères](MATRICE-106.md), [258 tests](MATRICE-258.md) et la [matrice détaillée](matrice-rgaa.json) conservent les attendus et les liens officiels. L’applicabilité reste à qualifier par instance. Une absence de cible ou une exécution de sonde sans erreur ne devient aucune conformité ni non-applicabilité.

Le constat `MAIL-PRESENTATION-002` du [test officiel 10.1.2](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#10.1.2) était confirmé : 2 991 attributs interdits dans dix exports. Les dimensions autorisées des images et objets, ainsi que la taille des sélecteurs, restent exclues du comptage conformément au référentiel. Il n’existe pas d’exemption générale pour les courriels ou les tableaux de présentation.

Les sorties mesurées sont corrigées. Le constat et le critère 10.1 passent à `A_RETESTER`, sans validation automatique des autres tests du critère ni de toutes les instances. Le critère 9.1 reste également à qualifier après sa correction structurelle. Aucun autre critère n’est déclaré conforme par cette tranche.

## Adaptation livrée

`scripts/mail_layout.py` adapte uniquement le gabarit dérivé : attributs transférés vers CSS, centrage et cascade conservés, dix groupes de colonnes transformés en cellules natives. Il n’utilise ni flottants ni duplication générale du contenu. Les bases, largeurs, côtés et signatures calculées sont vérifiés ; une dérive non reconnue arrête la compilation.

`render.js` applique aussi cette correction aux liens sources ajoutés. Le CSS complémentaire est distinct du CSS canonique. Le retour à la ligne traite les mots longs ; une plage média stricte corrige le débordement entre 600 et 620 px. L’ancienne borne décimale incluait effectivement 620 px dans Chromium : ce cas a échoué avant correction et fait partie des régressions.

Les 52 gabarits canoniques, leurs 178 champs, la référence, le CSS et l’empreinte du contrat restent inchangés. Les fichiers v1 et les bibliothèques antérieures restent acceptés, sans migration. L’adaptation concerne aperçu, portable, webapp, SNUM, téléchargement HTML et copie.

### Particularité de la copie

Les six groupes de contenu à deux colonnes se partagent également l’espace dans la copie et conservent leur gouttière de 5, 16, 21 ou 24 px. Les groupes de logos gardent leur traitement distinct. **L’export et l’aperçu conservent les proportions d’origine ; la copie peut donc avoir une géométrie différente sur grand écran également.**

Ce compromis évite de figer les colonnes après filtrage. L’essai avec pourcentages tenait dans la lecture brute, mais la lecture filtrée Chromium les convertissait en pixels : largeur totale de 500 px dans une fenêtre de 320 px. Les variantes rejetées et leurs erreurs instrumentales sont conservées localement. Les propriétés Office restent manipulées par chaînes brutes ; les réécrire avec CSSOM les supprimait.

La lecture brute du presse-papiers est contrôlée avec `unsanitized`; ses styles de tête sont ensuite retirés explicitement. La lecture filtrée est contrôlée telle que renvoyée par Chromium. Ses transformations ne représentent ni Outlook ni Mélissa. La [documentation Chromium](https://developer.chrome.com/docs/web-platform/unsanitized-html-async-clipboard) distingue ces deux modes de lecture.

## Vérifications observées

| Vérification | Résultat et portée |
|---|---|
| Suite complète | **85 réussites, zéro échec, annulation ou saut**. Distributions comparées aux sources par `npm run check`. |
| Rendu normal | **936 cas** : 52 composants, neuf largeurs 320/390/480/481/600/601/619/620/1024 px, clair et sombre. |
| Contenus remplacés | **312 cas** avec textes longs, mots sans espaces, nouvelles images et liens sources longs ; 104 cas avec espacement renforcé. |
| Rendu et copie sans styles de tête | Sur les 1 248 cas : aucun attribut interdit, flottant, débordement ou chevauchement entre colonnes détecté ; textes, liens et titres conservés entre rendu et copie. |
| Comparaisons visuelles | **742/936 PNG identiques**. Les 194 différences concernent exclusivement 601 px, 619 px et le pied de page 48 à 320 px. Ces variations de géométrie sont explicites et les captures divergentes sont conservées. |
| Presse-papiers système | Les 52 composants importés puis copiés par les contrôles réels ; textes, liens et titres concordants dans les lectures brute et filtrée. Styles Office conservés dans la lecture brute. |
| Interface indépendante | Onze états recapturés : aucune violation axe relevée ni erreur JavaScript. Les règles axe incomplètes restent consignées. L’injection d’axe utilise `bypassCSP` ; elle ne valide pas la CSP. |
| Firefox natif sur Mac | Édition, modèles, identités, SNUM converti puis importé, image locale, fichiers, copie, refus d’import invalide et restauration portable/web après redémarrage hors connexion observés. Aucun lecteur d’écran ni client de messagerie exercé. |
| Contrôles négatifs | Modifications de base, largeur, côté et attribut non qualifié refusées. Le test sur le côté manquait initialement ; la contre-revue Astra l’a fait ajouter. |

Le détecteur de chevauchement compare les rectangles de texte et d’images entre les cellules des dix groupes natifs. Il ne couvre pas exhaustivement le rognage ni tous les éléments superposés. L’espacement est injecté par CSS ; aucun zoom réel ni aucune annonce vocale ne sont prouvés par cette opération.

## Collectes AY11

La nouvelle collecte directe reprend les treize pages et les sept états interactifs : captures `rgaa-106`, axe, interactions de formulaires et temporalité explicitement demandés, puis toutes les familles et variantes exécutables du CLI. Le reçu conserve le manifeste, les statuts de collecte, les scénarios de formulaires et les omissions. Un scénario non résolu reste non résolu.

**20 captures et 1 140 appels de sondes**, dix-huit familles et 57 variantes CLI distinctes par état ; aucun échec de commande. Les sorties conservent 634 `collected_no_candidate`, 410 `partially_collected`, 11 `not_collected`, 5 `collected_no_target` et 80 sans ce champ. Six scénarios de formulaires restent `failed_target_unresolved`, un est `captured`. `candidate-static` ne propose toujours aucune valeur pour son argument obligatoire ; il reste indisponible dans les vingt états. Les parcours indépendants complètent ces lacunes sans réécrire les statuts.

Les 819 appels du workflow Creator précédent ne sont pas réattribués à cette version : ce workflow n’a pas été relancé dans cette tranche. Les preuves actuelles viennent des nouvelles captures et sondes directes, des parcours indépendants et de la suite produit. La matrice ne transforme aucune observation de critère en résultat d’un test individuel.

Les preuves brutes restent sous `evidence/accessibilite-presentation-20261022/courant/` et `evidence/presentation-20261022/`, ignorés par Git. Le reçu partageable inventorie leurs empreintes. Leur contre-vérification détaillée ailleurs exige les artefacts ou une nouvelle exécution.

## Contre-revue et suite

Astra a relu les sources, reproduit le mutant de côté en mémoire, recompté les 1 248 combinaisons, vérifié les empreintes et examiné un échantillon des différences visuelles : **GO local**, aucun GO RGAA global. Il n’a ni modifié les fichiers ni réexécuté un navigateur pendant cette revue.

Restent à qualifier les tests applicables par instance, les contrôles éditoriaux et visuels manquants, les contrastes indéterminés, les annonces vocales, Windows/Firefox/Outlook et la réception après transformation par les messageries. L’accès HTTPS depuis le parc et son installation restent distincts de la publication GitHub Pages. Les recettes historiques #2 et #13 restent ouvertes.

## Publication vérifiée

Le [déploiement de cette correction](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/39855831750) termine avec succès. Les huit fichiers publics ont les mêmes octets que les distributions contrôlées. Dans un profil Chromium neuf, une composition synthétique exerce cinq groupes natifs, huit titres de niveaux attendus, un lien source personnalisé et une erreur associée à son champ. Aucun attribut interdit ni débordement dans l’aperçu mesuré ; aucune erreur JavaScript. Bibliothèque et aperçu sont retrouvés après coupure réseau et rechargement. Le [reçu public](publication.json) conserve les empreintes et observations. Cela ne prouve ni une installation sur le parc ni la réception dans une messagerie.

## Reproduire

Depuis la racine, avec les dépendances déjà présentes :

```sh
npm run check
MAIL_BUILDER_EVIDENCE=evidence/presentation-reproduction npm test
node scripts/recipe_firefox.mjs
```

Pour les collectes, lancer `scripts/audit_server.cjs`, puis `scripts/audit_browser.cjs` et `scripts/audit_ay11.py` avec le même `BUILDER_AUDIT_OUTPUT`, `BUILDER_AUDIT_PORT` et `BUILDER_AUDIT_ALL_PAGES=1`. Le Python et les dépendances AY11 doivent déjà être disponibles. Conserver un répertoire neuf et ne pas modifier le produit pendant les captures. Ces commandes produisent des observations, pas une certification.
