# Notice : recette VoiceOver du 27 octobre 2026

**Défaut reproduit et correction validée sur VoiceOver 10 / Chrome 156.0.8078.48 / macOS 26.5.2.** Base : `377b2a864ee47b4d45e3127e2d941642cf6e84ea`.

La région `#notice` portait déjà `role="status"` et `aria-live="polite"`. Sa règle `:empty { display:none; }` la retirait de l’arbre avant la première annonce et après chaque effacement. La variante conserve la région vide et supprime seulement ses marges. La logique de messages, ses jetons et le canal de sauvegarde restent identiques.

| Cas | Avant | Après |
| --- | --- | --- |
| Témoin positif initial | Capturé | Capturé |
| Première notice après vide | Absente | Capturée |
| Remplacement d’une notice remplie | Capturé | Capturé |
| Nouvelle notice après effacement | Absente | Capturée |
| Témoin négatif hors région live | Silencieux | Silencieux |
| Témoin positif final | Capturé | Capturé |

## Méthode et preuves

`avant.jsonl` et `apres.jsonl` sont les changements réellement lus dans `content of last phrase` de VoiceOver par son API AppleScript native. Aucun appel à `VoiceOver.output` ou à un moteur de synthèse pour fabriquer les phrases attendues. Le collecteur préserve les erreurs et ne les transforme pas en silence.

Les essais utilisent une copie de la distribution portable, des textes distincts et sept étapes espacées de huit secondes. Les trois notices appellent la fonction existante `MailBuilder.notice`. Le bouton de lancement est activé avec le curseur VoiceOver ; aucun pilotage de fenêtre pendant la séquence. Les premières tentatives où le témoin positif n’était pas capturé sont exclues de cette comparaison et conservées dans le dossier de travail.

La comparaison avant/après ne change que la règle CSS de la copie. Les témoins positifs encadrent les absences, les messages sont distincts et suffisamment espacés ; le témoin négatif confirme que le collecteur ne lit pas simplement le DOM. La capture textuelle native constitue une preuve de sortie du lecteur, pas une écoute humaine.

## Limites

Recette ciblée sur cette combinaison macOS/Chrome/VoiceOver. Le scénario vocal utilise des stimuli temporisés ; un parcours réel complet de duplication n’a pas été exécuté avec succès, car son repositionnement initial du curseur n’était pas confirmé. Aucun verdict Outlook, lecteur d’écran Windows, Firefox natif ou conformité RGAA globale n’en découle.

Le test navigateur ajouté garde la région exposée avant, pendant et après l’effacement, vérifie son rôle, son mode live et la conservation du focus. Il échoue sur la version de base. Il ne prétend pas vérifier lui-même la parole.

VoiceOver, son contrôle AppleScript et l’autorisation temporaire Terminal → VoiceOver ont été désactivés et leur état vérifié. Les seuls onglets de recette et le serveur local ont été fermés.

Pour AY11/RGAA 7.5 : conserver les régions live vides comme candidats contextuels et tester leurs transitions ; ni la présence de `role=status` ni le signalement d’une balise vide ne prouvent la restitution. Le masquage initial doit déclencher une vérification vocale, pas une non-conformité automatique.

## Vérification du correctif

- Node 24.22.1 ; `npm run check` réussi.
- Test ajouté rouge avant la correction, puis 13 tests ciblés réussis.
- Suite complète : **429/429**, aucun échec, aucun test ignoré.
- Nouvelle garde également réussie sous Firefox et WebKit automatisés ; ces contrôles ne sont pas des tests de lecteur d’écran.
- Aucun test existant affaibli, aucune modification des attentes des autres investigations.

Le correctif est dans le worktree `builder-notice-fix-20261027`, branche `fix/notice-live-region-20261027`, non commité et non poussé. Le dépôt principal reste inchangé et propre. Aucune publication du site.

## Reprise de l’intégration et copie réelle

Le bilan ci-dessus décrit la première campagne CSS, conservée avec ses limites. La reprise sur la même base et le complément nécessaire pour la copie après confirmation sont documentés dans [INTEGRATION.md](INTEGRATION.md). Les états de nettoyage des deux campagnes doivent être lus séparément.
