# Intégration de #157 et recette de copie réelle

Base : `377b2a864ee47b4d45e3127e2d941642cf6e84ea`. Node **24.22.1**, Playwright **1.64.1**, Google Chrome for Testing **156.0.8078.4**, VoiceOver natif français sur macOS. Les distributions sont régénérées depuis les sources ; aucune dépendance ni attente des autres investigations n’est modifiée.

## Pourquoi le CSS seul ne suffisait pas pour la copie

La région de statut reste maintenant rendue lorsqu’elle est vide. Cela corrige les transitions de message observées dans la première campagne. Mais, sur le parcours réel de copie avec confirmation, le succès est présent dans l’interface et le presse-papiers sans être capturé par VoiceOver. La même copie sans confirmation fournit bien la phrase attendue.

Une contre-épreuve isolée reporte uniquement l’annonce de succès de 250 ms, après l’écriture effective du presse-papiers. Sur le même contenu à deux blocs, l’annonce est alors capturée ; elle ne l’est pas sur la variante CSS seule. Les deux captures natives HTML et texte sont identiques : HTML 34 326 octets (`d60653920e80ea7337c35dd351cb5694e4198555863e21f7d0836ab8ebfcfb99`), texte 142 octets (`1f77e0a6e648f282b7a1a58b4b8cde6c4894cd41556e9cdda28bc3fd6312959d`). Cela étaye le choix d’un délai sur cette combinaison lecteur/navigateur ; ce n’est pas une preuve de la cause interne exacte ni une garantie universelle de 250 ms.

Le complément produit applique ce report seulement si des avertissements ont demandé une confirmation. L’écriture HTML/texte n’est pas différée ; le jeton d’annonce initial est conservé. Un message plus récent ne peut donc pas être écrasé pendant le délai. Il n’y a ni seconde région live, ni file d’annonces, ni changement des textes. Le chemin SNUM sans contrôle confirmable conserve son comportement.

## Preuves et cas non concluants

- `integration/native-copy.jsonl` conserve les premiers essais, la copie sans confirmation et la contre-épreuve différée. L’essai différé positif contient la phrase de succès à **20:36:35.998836 UTC**.
- `integration/native-copy-confirmation-uninstrumented.jsonl` conserve la comparaison à contenu identique sur la variante CSS seule.
- `integration/native-final-transitions.jsonl` et `sequence-timeline.json` relient les trois transitions du candidat final aux témoins alpha/foxtrot. Bravo, Charlie et Delta sont capturés ; Echo, hors région live, est absent pendant sa fenêtre attendue silencieuse. Le collecteur sonde la dernière phrase : cette absence est bornée à ce protocole.
- `integration/native-final-real-copy.jsonl` est une tentative interrompue après la reprise du serveur : les fenêtres de la suite automatisée ont perturbé le focus natif. Elle ne constitue pas la validation finale de copie.
- Une première fixture de contre-épreuve a été mal construite par insertion dans une chaîne HTML interne ; aucun résultat de copie n’en est tiré. La seconde insère le stimulus uniquement avant la dernière fermeture du document. Les stimuli temporisés et le report expérimental sont distincts du produit final non instrumenté.

Aucun appel ne fabrique la parole attendue. La sortie `content of last phrase` est native ; elle ne prouve pas une écoute humaine. Cette recette ne vaut pas audit RGAA global, test Safari, Firefox natif avec VoiceOver ou essai Outlook/Mélissa.

## Vérifications automatisées

Le nouveau garde-fou modal échoue avant le complément (`red-copy-modal-order.log.gz`), puis passe avec lui. Il vérifie l’ordre de l’annonce par rapport au retour asynchrone du document et une seule écriture HTML/texte ; il ne simule pas une preuve vocale. La garde d’accessibilité exige un nœud natif non nul sous Chromium et sépare explicitement les contrôles DOM sous les autres moteurs.

Build et check passent. Les 28 tests ciblés Chromium passent ; les 9 tests ciblés passent aussi sous Firefox et WebKit. Les contrôles existants de priorité des annonces restent inchangés.

La recette finale, la suite complète, l’intégration Git et le nettoyage sont consignés dans le reçu de fin de campagne.

## Résultat final du produit non instrumenté

**430 tests sur 430 passent, aucun ignoré**, code de sortie 0. Le HTML servi pour l’essai natif est identique octet pour octet à `app/distribution/portable.html` : SHA-256 `de046311361fc02aa22981e93ac22e4ef7b85c6eb8f2eb4be2fc725b3ced6325`. Les empreintes des sources, tests et distributions sont dans `integration/RESULTAT-INTEGRATION.json` ; le manifeste couvre les preuves associées.

Sur une composition isolée à six blocs, l’action native VoiceOver ouvre la confirmation ; le curseur parcourt les avertissements puis active « Copier quand même ». Après fermeture, le focus revient à « Copier le courriel ». Le presse-papiers natif fournit effectivement le HTML et le texte (`copied-final.html.gz`, `copied-final.txt`). VoiceOver émet à **20:57:52.345437 UTC** :

> Courriel copié en HTML et texte. Contrôlez le collage et les images dans votre messagerie.

La trace est `integration/native-copy-after-reader-restart.jsonl`. Une relance off/on du lecteur a été nécessaire pour rétablir son curseur après des tentatives où le focus restait sur `WindowSharingSessionButton`. La trace `native-final-copy-isolated.jsonl` conserve ces tentatives et l’erreur de déconnexion provoquée par cette relance ; elle n’est pas présentée comme un échec du produit ni comme une recette réussie.

La démo antérieure avait déjà exercé l’ajout, le déplacement, la duplication, le retrait et la restauration des blocs avec la variante CSS. Le segment natif original est conservé dans `demo-blocs-extrait.jsonl`, avec son origine et son empreinte, ainsi que le rapport historique. Ce segment n’est pas une nouvelle exécution sur le complément Files ; le code de ces actions n’a pas changé. Les tests de focus et d’annonces de ces actions repassent dans la suite complète.

## Nettoyage et publication

Les collecteurs et les deux serveurs possédés (18807/18809) sont arrêtés. Seul l’onglet de recette a été fermé ; les autres onglets et le serveur de démo antérieur sont préservés. Le presse-papiers original a été restauré, avec vérification de tous les types et octets, puis sa sauvegarde privée supprimée. Cette sauvegarde n’est jamais incluse dans les preuves.

VoiceOver reste actif comme au début de cette reprise. L’autorisation macOS Terminal → VoiceOver, préexistante, n’a pas été modifiée et aucun accès n’a été ajouté. La désactivation du contrôle AppleScript a été tentée ; l’Utilitaire VoiceOver a ensuite expiré sur deux lectures natives. La confirmation visuelle de la case reste donc **en attente**, malgré le refus de lecture AppleEvent observé ensuite. Ce refus seul ne prouve pas l’état de la case.

Les revues Fable/ShipGuard/connu-inconnu antérieures validaient le cadrage du ticket, pas ce complément de code. Le scan textuel du diff ne détecte aucun des motifs dangereux recherchés. Aucun déploiement ni push : `.github/workflows/pages.yml` déclenche la publication Pages sur `push main`. Le ticket ne doit pas être déclaré livré sur le site à partir de cette seule intégration locale.

Les captures HTML du presse-papiers et le journal rouge sont stockés en gzip déterministe pour conserver leurs octets bruts, y compris les espaces de fin de ligne. Les empreintes HTML citées portent sur les données décompressées ; `gzip -dc fichier.html.gz` permet leur inspection.
