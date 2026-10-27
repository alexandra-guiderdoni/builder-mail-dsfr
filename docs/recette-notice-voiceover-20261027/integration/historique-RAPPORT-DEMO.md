# Démonstration newsletter avec VoiceOver — 27 octobre 2026

Newsletter **La Fabrique publique — novembre 2026**, 9 blocs, créée par l’interface dans une bibliothèque locale isolée. Le HTML final est ouvert dans Chrome for Testing. Aucun envoi ni publication.

## Résultat des annonces

- Éditeur : **41/41 commandes** avec nom et rôle bouton prononcés par VoiceOver.
- Accueil : **13/13 commandes** avec nom et rôle bouton prononcés.
- **7 dialogues** parcourus : copie, téléchargement HTML, application d’identité, retrait d’identité, retrait de modèle, renommage et suppression. Leurs boutons de confirmation et d’annulation sont vocalisés. Retraits et suppression annulés.

Oracle : sortie réelle de VoiceOver via `content of last phrase`, capturée dans `voiceover-demo*.jsonl` et `tab-walk-testing.jsonl`. Aucune phrase de résultat n’a été injectée avec une commande de synthèse vocale. Les reçus `couverture-editeur.json`, `couverture-accueil.json` et `couverture-dialogues.json` renvoient aux annonces.

## Actions exercées

Création, rédaction, ajout de bloc, déplacement, duplication, retrait et restauration d’un bloc ; sauvegarde d’un modèle et d’une identité ; copie enrichie réelle ; téléchargement HTML ; export de composition et de bibliothèque. Les fichiers téléchargés ont été relus : 9 blocs ; bibliothèque de 2 compositions, 1 modèle et 1 identité. Presse-papiers antérieur restauré, sauvegarde temporaire retirée.

## Fichiers

- `newsletter-export.html` : HTML téléchargé par l’interface.
- `newsletter.courriel.json` : composition réimportable.
- `bibliotheque-demo.json` : bibliothèque de démonstration réimportable.
- `newsletter-copie.html` et `.txt` : contenu réel du presse-papiers après la copie.

## Limites et avertissements conservés

Les contrôles sont ceux des états parcourus ; ceci ne couvre pas chaque état d’erreur ou chaque composant du catalogue et ne vaut pas verdict RGAA global. Les intitulés ont été vérifiés par la sortie native VoiceOver ; toutes les actions destructrices n’ont pas été exécutées.

La copie signale **102,5 Kio**, au-dessus du seuil prudent de 90 Kio, et une URL de confidentialité issue du catalogue. Les alertes ont été conservées et confirmées explicitement pour la démonstration. Ce contenu fictif n’est pas qualifié pour réception Outlook/Mélissa.

La démo emploie la distribution du correctif `notice` dans son worktree isolé, pas une nouvelle version publiée. Aucun code ajouté ou intégré à main pour cette démo.

## Nettoyage

Collecteurs arrêtés ; contrôle AppleScript de VoiceOver désactivé et vérifié. La révocation du seul droit temporaire Terminal → VoiceOver attend l’authentification Touch ID de macOS. VoiceOver est encore actif à ce stade. Le serveur local 127.0.0.1:18792 reste disponible pour l’éditeur visible. Voir `RESULTAT-DEMO.json` pour l’état de clôture.
