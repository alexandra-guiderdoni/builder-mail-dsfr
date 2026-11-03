# Parcours de première visite (#205)

État : réalisé et fusionné sur `main` le 3 novembre 2026, avant le test #206, à la demande d’Alex. Suite complète et `npm run check` au vert le 3 novembre 2026.

## Constat sur l’atelier actuel

Relevé le 3 novembre 2026 sur la version web servie en local, profil vierge, 1280 px de large.

1. **La première ouverture ressemble à un retour.** `Model.initial()` crée « Mon premier courriel » (6 blocs). L’accueil affiche donc « Reprendre « Mon premier courriel » », une carte « Newsletter ouverte » et « 1 newsletters », alors que l’utilisateur n’a rien fait. Les états « première ouverture » et « bibliothèque existante » ne se distinguent pas à l’écran.
2. **Aucun ordre de lecture.** De haut en bas : aide à l’installation, encart de sauvegarde, bouton Reprendre, création par liste déroulante « Point de départ », la newsletter de départ, puis les Exemples sous la ligne de flottaison. Rien ne dit par où commencer.
3. **Deux voies de création séparées.** La liste « Point de départ » (squelettes) et la zone Exemples (newsletters remplies) portent les mêmes noms (« Information de service », « Lettre d’information », « Invitation ») pour des contenus différents.
4. **« Sauvegarde » a deux sens.** L’encart dit « Aucune sauvegarde : créez ou personnalisez une composition. » (enregistrement automatique dans le navigateur), alors que l’aide de #210 réserve « sauvegardé » à un fichier exporté.
5. **Jargon résiduel.** Relevé dans `app/source/*.js` et `shell.html` : environ 34 chaînes visibles avec « JSON », 37 avec « composition », 65 avec « bibliothèque », 10 avec « cache », 9 avec « prototype », 3 avec « brutes ». Une bonne part sont des messages d’erreur ou de récupération.

## Parcours proposé

**Déclencheur :** l’accueil de bienvenue s’affiche quand aucune newsletter n’a encore été enregistrée dans ce navigateur, ou après « Tout effacer » (même état, décision sur #201). Dès la première modification enregistrée, l’accueil habituel « Mes newsletters » reprend sa place. Le stockage illisible garde son parcours de récupération actuel, sans accueil de bienvenue.

**Contenu, en trois étapes numérotées :**

1. **Créer votre première newsletter.** Les exemples remplis, avec « Prévisualiser » et « Créer à partir de cet exemple », puis le plan vide choisi par type de message (« Point de départ », « Créer une newsletter »).
2. **Garder une copie de vos newsletters.** L’atelier enregistre automatiquement dans ce navigateur ; pour les retrouver ailleurs ou après un effacement, « Exporter Mes newsletters ». Un bouton « Restaurer une sauvegarde » ouvre « Sauvegarde et import » sur le champ de restauration, pour qui possède déjà un fichier.
3. **Installer l’atelier (facultatif).** L’aide et le lien du portable livrés par #210, déplacés de l’en-tête vers cette étape. Étape absente du portable, où l’aide n’existe pas.

Pendant la première visite, la liste des newsletters, « Reprendre », le compteur et « Repartir de zéro » sont masqués : il n’y a rien à reprendre ni à effacer.

**Réalisation :** les zones existantes (exemples, plan vide, aide à l’installation) sont déplacées dans les étapes, jamais dupliquées, puis regagnent leur place. La newsletter de départ « Mon premier courriel » reste créée en interne, car l’éditeur suppose au moins une newsletter ; elle est écartée à la première création (exemple, plan vide, import). L’état cesse à la première modification enregistrée ; il revient après « Tout effacer ».

## Vocabulaire

### Appliqué sur la branche (libellés rencontrés pendant les tâches du test #206)

| Endroit | Libellé actuel | Reformulation |
|---|---|---|
| Encart, première visite | Aucune sauvegarde : créez ou personnalisez une composition. | Rien n’est encore enregistré dans ce navigateur. |
| Encart, après enregistrement (5 occurrences, `state.js`) | Newsletters sauvegardées dans ce navigateur. | Newsletters enregistrées dans ce navigateur. |
| Encart, champs invalides (2 occurrences) | Newsletters sauvegardées ; les champs invalides restent non enregistrés. | Newsletters enregistrées dans ce navigateur, sauf les champs invalides. |
| Sauvegarde et import, champ fichier | Importer une newsletter ou une sauvegarde (JSON) | Ajouter une newsletter ou une sauvegarde depuis un fichier |
| Sauvegarde et import, aide | L’import ajoute des copies, sans remplacer vos compositions existantes. Les anciens fichiers du prototype sont acceptés. | L’ajout crée des copies, sans remplacer vos newsletters existantes. Les fichiers des anciennes versions de l’atelier sont acceptés. |
| Sauvegarde et import, bouton | Sauvegarder maintenant | Enregistrer maintenant dans ce navigateur |
| Message d’import d’une seule newsletter (`library.js`) | … utilisez « Importer une newsletter ou une sauvegarde (JSON) » pour l’ajouter. | … utilisez « Ajouter une newsletter ou une sauvegarde depuis un fichier ». |

« Sauvegardé » désigne désormais seulement un fichier exporté, comme dans l’aide de #210 ; l’enregistrement automatique dans le navigateur se dit « enregistré ».

### Conservé volontairement

- **« Importer du JSON »** : zone technique repliable pour coller un fichier. Le libellé est cité par le skill `newsletter-contribution` (`SKILL.md`) et vérifié par son test de contrat (`builder-contract.test.cjs`). Le renommer change ce contrat.
- **« cache »** : seulement dans l’aide repliable « Comprendre : installé, disponible hors connexion, sauvegardé » (#210) et dans le détail technique de l’état.
- **« Outil de composition institutionnelle »** : « composition » y désigne l’action de composer, pas l’objet.

### Proposé pour #207 (parcours de secours, hors tâches du test)

Réalisé et fusionné sur `main` le 3 novembre 2026, selon les principes ci-dessous. Sont conservés : « Importer du JSON » (contrat du skill), « Outil de composition institutionnelle » et les messages de l’ancienne distribution 09eff89 que vérifie `remote-images-browser`. « Copie brute » et « données enregistrées brutes » deviennent « copie de diagnostic ».

Environ 90 messages d’erreur et de récupération (lecture seule entre fenêtres, stockage inaccessible, ancienne bibliothèque, versions de fichier) gardent « bibliothèque », « composition » et « JSON ». Exemples : « Exportez la bibliothèque en mémoire », « Modifications non sauvegardées. Exportez votre bibliothèque. », « Version de composition non prise en charge. ». Leur reformulation touche une vingtaine de fichiers de test et se fait avec #207, selon les principes ci-dessous. L’inventaire s’obtient par une recherche des mots « JSON », « composition », « bibliothèque », « brutes », « prototype » dans `app/source/`.

### Principes

- « composition » → « newsletter » ;
- « bibliothèque » → « Mes newsletters », ou « vos newsletters » dans une phrase ;
- « JSON » → « fichier de sauvegarde » ou « fichier de newsletter » ; le format reste nommé dans une aide repliable et dans `accept` ;
- « cache » → reste dans l’aide repliable de #210 seulement ;
- « sauvegarde » → réservé au fichier exporté ; l’enregistrement automatique devient « enregistré dans ce navigateur ».

Les messages d’erreur gardent toute leur information opérationnelle ; seul le vocabulaire change.

## Hors périmètre

README en mode d’emploi : #207, après le test #206. La bascule visible avant la lecture du stockage est corrigée le 3 novembre 2026.

## Décisions d’Alex (3 novembre 2026)

1. **Ordre des étapes :** créer, garder une copie, installer (facultatif).
2. **« Mon premier courriel » :** masqué à l’accueil tant que rien n’est enregistré ; il reste créé en interne, sans changement du modèle de données.
3. **Accès des testeurs (#206) :** fichier portable construit depuis la branche, sans publication. Conséquence : l’étape « installer » ne s’affiche pas dans le portable (`pwa.js` s’arrête sur `file:`) ; la tâche « installer l’atelier » de #206 sera donc **simulée**, comme le prévoit déjà son protocole.
