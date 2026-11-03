# Protocole du test utilisateur de l’accueil (#206)

État : à relire par Alex avant la première séance. Parcours testé : #205, branche `feature/accueil-premiere-visite-205` au commit `712855c`.

## Objectif

Vérifier que des utilisateurs qui découvrent l’atelier savent, sans aide :

- l’ouvrir ;
- créer une newsletter depuis un exemple ;
- la sauvegarder ;
- la retrouver ;
- la restaurer.

Le test relève aussi les mots mal compris. Il ne produit pas de score global.

## Testeurs

À recruter par Alex : 3 à 5 personnes.

- **Profil :** agents qui rédigent ou diffusent des communications (lettre interne, information aux usagers, invitations), sur un poste du parc.
- **Condition :** n’avoir jamais utilisé l’atelier.
- **Diversité :** une aisance numérique variée, avec au moins un poste Windows.

## Matériel

- **Fichier :** le portable de la branche, `app/distribution/portable.html`, renommé `atelier-courriels-portable.html`. Il est remis par messagerie ou sur clé, comme un vrai envoi.
- **Navigateur :** celui du poste, noté dans la grille.
- **Profil neuf :** un profil de navigateur neuf par testeur. Ne pas utiliser de fenêtre de navigation privée : sa fermeture efface les données, et la tâche 4 ne pourrait plus réussir.
- **Fichier de secours :** une sauvegarde préparée à l’avance avec une newsletter fictive. Elle ne sert que si la tâche 3 échoue, pour que la tâche 5 reste possible.
- **Capture de secours :** l’étape « Installer l’atelier » de la version web, imprimée ou affichée à part. Le portable ne la montre pas.

**Avant chaque séance**, ouvrir le fichier dans le profil neuf et vérifier que l’accueil affiche « Vous n’avez encore aucune newsletter dans ce navigateur ». Fermer ensuite le navigateur.

## Déroulé, environ 30 minutes

1. **Accueil (2 min).** « Nous testons l’outil, pas vous. Pensez à voix haute. Je ne pourrai pas vous aider pendant les tâches. »
2. **Cinq tâches.** L’animateur lit la consigne telle quelle, sans les mots de l’interface.
3. **Trois questions finales.**

**Règle d’aide :** ne pas guider. Si le testeur est bloqué plus de 3 minutes, ou s’il demande de l’aide deux fois, l’animateur note le blocage. Il donne ensuite l’indice le plus petit possible et marque la tâche « réussie avec aide ».

## Tâches

| # | Consigne lue au testeur | Exécution | Réussite si |
|---|---|---|---|
| 1 | « Vous avez reçu ce fichier par messagerie. Rangez-le là où vous le retrouverez, puis ouvrez l’outil. » | **Réelle** pour le portable : ranger le fichier et l’ouvrir. **Simulée** pour l’installation web : montrer la capture et demander « Que feriez-vous ici ? Que veut dire “installé” ? ». | L’atelier est ouvert depuis l’emplacement choisi. Pour la partie simulée, on note seulement la compréhension. |
| 2 | « Préparez l’annonce d’une fermeture exceptionnelle de votre accueil, en partant d’un message déjà rédigé. » | **Réelle** | Une newsletter est créée depuis l’exemple « Information de service », et au moins le titre est modifié. |
| 3 | « Vous voulez être sûr de ne pas perdre ce travail, même si votre navigateur est réinitialisé. » | **Réelle** | Un fichier de sauvegarde est téléchargé, et le testeur sait où il se trouve. |
| 4 | L’animateur fait fermer complètement le navigateur. « Le lendemain, vous reprenez votre annonce. » | **Réelle**, dans le même profil | Le testeur rouvre le fichier et retrouve sa newsletter. |
| 5 | L’animateur fait « Tout effacer » devant le testeur. « Votre poste a été réinitialisé. Retrouvez votre annonce. » | **Réelle**, la perte étant **simulée** par l’animateur | La newsletter est restaurée depuis le fichier de la tâche 3, ou depuis le fichier de secours si la tâche 3 a échoué (à noter). |

L’installation réelle de la version web sur un poste du parc est hors de ce test. Elle reste une qualification technique distincte (#207).

## Questions finales

1. « Où sont enregistrées vos newsletters ? »
2. « Avec vos mots : “installé”, “disponible hors connexion”, “sauvegardé”, qu’est-ce que ça change pour vous ? »
3. « Qu’est-ce qui vous a le plus gêné ? »

## Grille de résultats, une par testeur

Testeur : T1 à T5 · profil : · système et navigateur : · date :

| Tâche | Résultat (seul / avec aide / échec) | Durée approximative | Blocages observés | Mots ou formulations mal compris (citer) | Remarques |
|---|---|---|---|---|---|
| 1 Ouvrir, et installer en simulé | | | | | |
| 2 Créer depuis un exemple | | | | | |
| 3 Sauvegarder | | | | | |
| 4 Retrouver après réouverture | | | | | |
| 5 Restaurer | | | | | |

Réponses aux questions finales :

## Blocages critiques

Un blocage critique empêche d’accomplir une tâche sans aide.

Avant le démarrage de #207, chaque blocage critique est :
- soit corrigé sur la branche, puis contre-vérifié sur la tâche concernée avec un nouveau testeur ou le même ;
- soit arbitré explicitement par Alex.

La synthèse reprend chaque tâche avec ses blocages et les formulations à revoir, sans score global.

## Données et consentement

- **Pseudonymes :** les testeurs sont désignés T1 à T5, sans nom.
- **Enregistrement :** pas d’enregistrement audio ou vidéo sans accord écrit.
- **Contenu :** les newsletters du test restent fictives, sans donnée réelle.
- **Fin de séance :** le profil de navigateur et les fichiers du test sont supprimés.
