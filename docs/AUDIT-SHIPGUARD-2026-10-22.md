# Campagne ShipGuard du 22 octobre 2026

Les 35 scripts de test de la version installée ont été exécutés : **32 réussites, 3 échecs, aucun saut ni délai dépassé**. Les échecs concernent l’outillage. Les tests du builder passent, mais les revues de code remontent des problèmes à traiter : aucun GO global de livraison n’est prononcé.

## Résultats et preuves

| Affirmation | Source observable | Verdict | Portée |
|---|---|---|---|
| Tous les scripts de test fournis ont été tentés | [Inventaire et résultats](../evidence/shipguard-20261022/self-tests/self-tests-results.json) | 35/35 tentés, 32 PASS, 3 FAIL | ShipGuard installé 2.17.0, copie isolée |
| Les distributions correspondent aux sources | [Génération](../evidence/shipguard-20261022/build-check.log) | PASS | Application et prototype |
| La suite du projet réussit | [Journal des tests](../evidence/shipguard-20261022/project-tests.log) | 28/28, aucun saut | Chromium local et tests purs |
| Firefox conserve les fichiers, images et données hors connexion | [Recette Firefox](../evidence/shipguard-20261022/firefox.log) | PASS | Firefox natif sur Mac, profil dédié |
| La PWA est installée puis relancée hors connexion après redémarrage | [Recette installation](../evidence/shipguard-20261022/native-install.log) | PASS | Chromium sur Mac ; installation de test ensuite retirée |
| Les parcours ShipGuard aboutissent | [Résultats visuels](../visual-tests/_results/visual-results.json) | 8/8 PASS | Cinq entrées publiques et gestion de bibliothèque |
| L’import apparaît réellement dans l’éditeur et son aperçu | [Contrôle DOM](../evidence/shipguard-20261022/dom-probe.json) | PASS | Texte du document incorporé, erreurs et images vérifiés |
| L’accueil tient à 390 pixels | Même contrôle DOM et capture `sg-home-mobile.png` | PASS | Aucun débordement horizontal mesuré |
| Le prérequis du recorder fonctionne | [Journal recorder](../evidence/shipguard-20261022/record-check.log) | PASS | Playwright, Chromium et lancement avec interface |
| Le code est couvert par zones | [Rapport code](../visual-tests/_results/audit-results.json) | 7 zones, 48 fichiers lus | 41 constats, aucun correctif |
| La logique a été examinée | [Rapport logique](../visual-tests/_results/logic-results.json) | 6 candidats, 20 obligations ; 0 violation confirmée, 1 question | 14 scénarios raisonnés, 6 mesurés ; pas une preuve exhaustive |
| Les changements de comportement sont cadrés | [Rapport avant/après](../visual-tests/_results/process-results.json) | 5 unités, 15 cas ; 3 changements attendus | 3 comparaisons pures mesurées ; 12 scénarios raisonnés |

Les tests du projet et recettes natives ont tourné dans une copie identique des sources sous `evidence/shipguard-20261022/project-runtime/`. Les anciennes preuves restent préservées. Le manifeste des commandes, codes de sortie, durées et empreintes est [project-checks.json](../evidence/shipguard-20261022/project-checks.json).

## Les trois échecs ShipGuard

- `dialogue-check-smoke-test.mjs` attend un `CLAUDE.md` au-dessus du paquet installé ; ce fichier n’est pas livré à cet emplacement.
- `code-audit-contract-smoke-test.mjs` attend un `README.md` au-dessus du paquet ; même limite de distribution.
- `recorder-navigation-smoke-test.mjs` échoue au cas CE-03 du retour historique après onze contrôles réussis, puis rencontre `SecurityError` sur `sessionStorage`.

Le [compte rendu des autotests](../evidence/shipguard-20261022/self-tests/COMPTE-RENDU.md) conserve chaque commande, journal et tentative. Deux défauts de préparation ont été corrigés uniquement dans les fixtures : compagnon de revue manquant et socket macOS trop long. L’argument de lancement du navigateur a ensuite été stabilisé pour la recette de navigation. Son échec restant est conservé ; aucune source installée n’a été corrigée.

Aucun des 35 scripts n’a été omis. Un script arrêté sur une erreur ne prouve toutefois pas ses cas internes suivants ; la recette de navigation n’a pas atteint tous ses cas après l’échec fatal conservé.

## Les constats de code

Le [rapport détaillé](../visual-tests/_results/audit-report.md) présente **41 instances** : 3 hautes, 12 moyennes, 26 faibles. Ce décompte n’est pas un nombre de problèmes distincts.

- **13 instances concernent l’application actuelle et le convertisseur partagé** : validation des images importées, fidélité de migration du prototype, reconnexion IndexedDB, coût des sauvegardes, sélection après refus, message de composition « vide », installation, navigation hors connexion avec paramètre, jour de semaine SNUM et portable servi en HTTP.
- **9 concernent le prototype conservé et sa compilation**, dont les trois constats hauts : import, restauration et image différés pouvant remplacer une saisie plus récente ou viser un autre document. Trois contre-revues statiques indépendantes les confirment ; les simulations ne sont pas présentées comme des reproductions navigateur.
- **17 sont héritées du gabarit officiel épinglé** : quinze déclarations `font-color`, une règle répétée et une hauteur HTML non numérique. La référence reste inchangée.
- **2 concernent la portée des assertions de test** : observation réseau installée après le démarrage et assertion unitaire de conservation sur un objet non transmis à la fonction testée.

La revue logique classe le terme « composition vide » comme une question de contrat ; la revue code relève un décalage de message avec les six blocs produits. Le comportement attendu doit être précisé ; aucune perte de données n’est déduite de cette ambiguïté.

Les constats moyens et faibles ne sont pas contre-notés par un second agent selon le protocole ShipGuard. Le score de risque indicatif ne constitue ni une certification ni une décision de livraison.

## Contrôles du harnais visuel

Les premières tentatives sont archivées sous `visual-attempt-1/` et `visual-attempt-2/`. Deux attentes textuelles erronées, un chemin relatif de fichier et un contrôle portant sur du texte masqué ont été identifiés dans la préparation. L’import réel, sa visibilité et le texte de son aperçu ont ensuite été vérifiés indépendamment dans le navigateur. Une capture pleine page complète les captures initiales prises avant stabilisation de l’aperçu.

Le crawler brut signale **11 URL inexistantes contenant `${…}`** extraites des chaînes JavaScript incorporées. Ces chaînes ne sont pas des liens réels du DOM. Son résultat brut et son code de sortie restent conservés ; le contrôle DOM sur les trois entrées HTTP ne trouve ni erreur navigateur ni image cassée. Ces 11 signaux ne doivent pas devenir des tickets de ressources cassées.

Le tableau de revue affiche 55 signaux bruts : 41 instances code, 3 changements de comportement attendus et ces 11 faux positifs du crawler. Son badge Process affiche 4 en additionnant des compteurs qui se chevauchent ; le JSON décrit bien 3 unités changées. Ces limites d’affichage ne deviennent pas des défauts produit.

Les captures inspectées montrent l’accueil, l’éditeur, le dialogue de suppression, l’import, le rendu SNUM, les deux variantes web et le prototype portable. Le contrôle mobile complète ces vues. Une capture prouve son état affiché, pas toutes les interactions possibles.

## Périmètre exact

La campagne `sg-20261022T090942Z` est ancrée sur le HEAD `c329339aee8e6ba36288197ab22000772bb248ae` et une copie des **90 fichiers locaux**. Ce commit seul ne contient pas la nouvelle application : les fichiers non suivis ont été inclus explicitement. Les empreintes et l’identité de chaque rapport sont contrôlées avant consolidation.

L’audit code suit le mode **standard, un passage complet**, avec tous les contrôles de langage pertinents. Les modes quick, deep et paranoid sont des variantes de profondeur, pas des scripts supplémentaires prétendument exécutés. La comparaison avant/après utilise le snapshot local authentifié de quatorze pièces avant l’accueil ; aucun ancien moteur absent n’a été reconstruit.

Les outils de correction, d’amélioration et de publication ne sont pas lancés sur le produit. Leurs autotests fournis ont été exécutés dans la copie isolée. Les comparaisons réelles entre modèles ne font pas partie des tests produit : le skill `sg-model-scope-test` dit « Use only when the user explicitly requests model or effort comparisons, scope probes, or a Strict Delta Lock test; never select this skill implicitly. Do not use as a product test ». Son test déterministe de notation figure parmi les 35 scripts.

Un enregistrement humain de démonstration n’a pas été inventé. Les tests fournis du recorder et son prérequis graphique ont été exécutés. Les actions de clarification, de comparaison à une référence et de génération de rapport de changement n’ajoutent pas de scripts de test distincts à l’inventaire.

**Restent non vérifiés :** poste Windows réel, Firefox sur ce poste, Outlook et Mélissa avec envoi/réception, installation humaine sur le parc, origine HTTPS autorisée, lecteurs d’écran et conformité exhaustive. L’absence de ces environnements empêche un GO global.

## Issues et intégrité

Les treize issues de la revue initiale ont été publiées et relues : [issues du dépôt personnel](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues). Le [reçu initial](../evidence/shipguard-20261022/publication-issues-astra/receipt.json) conserve les sources et les corps publiés.

Le sous-agent Astra a ensuite publié **14 issues complémentaires, #14 à #27**, avec contrôle API de l’égalité des titres et corps. Les 13 premières restent inchangées. La [cartographie complète](../evidence/shipguard-20261022/issues-complementaires-astra/mapping.json) rattache les 41 constats à 7 problèmes déjà couverts et 34 instances réparties dans les 14 nouveaux tickets ; les 17 instances du gabarit sont regroupées dans #21. Le [reçu complémentaire](../evidence/shipguard-20261022/issues-complementaires-astra/receipt.json) conserve les empreintes, les numéros et les liens. Les défauts du plugin et faux positifs ne sont pas publiés comme défauts produit.

Aucun correctif produit, commit, push ou accès à une messagerie n’a été réalisé pendant cette campagne. Les sept worktrees d’audit sont conservés pour les preuves ; leur index ne porte que la rétention exacte du rapport. Le plugin installé et les dépôts officiels restent inchangés.

## PDG pass

Contrôle du fil principal : **PDG self-check, not independent review**. Les revues de zones et contre-revues des trois constats hauts sont indépendantes de cette restitution.

- Couverture : inventaire des 35 scripts, 48 fichiers de code et 90 fichiers figés confronté aux reçus ; les limites externes sont explicites.
- Ancrage : chaque affirmation principale renvoie à un résultat, une commande ou une source effectivement lue ; les comparaisons absentes restent inconnues.
- Régression : sortie HTML de revue ouverte au navigateur, JSON contrôlés, liens locaux contrôlés et sources figées comparées par SHA256.
- Réutilisation : contrats et générateur de revue ShipGuard existants ; aucune nouvelle bibliothèque, persistance ou infrastructure produit.
- Préservation : code, distributions, références officielles, bibliothèque utilisateur et anciennes preuves. MUST NOT corriger, supprimer ou publier du code dans ce mandat d’audit.
- Risque résiduel : les tests passants n’annulent ni les constats ouverts ni les qualifications humaines manquantes.

Les rapports JSON générés restent atomiques pour les consommateurs ShipGuard ; les rapports par zone portent le détail. Aucun moteur documentaire supplémentaire n’est installé dans ce dépôt pour cette fiche de preuve.
