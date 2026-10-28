# Qualification des issues #192, #190, #188, #179 et #173

Candidat issu de f635da90b56d8ccaedf423f5ec7783b0d616be16. Le SHA exact de livraison et les résultats de suite finale sont consignés séparément après commit. Aucun résultat de réception Outlook/Mélissa n’est apporté.

## #192 — images HTTPS

Source distante explicite sur les 24 champs de 17 composants ; données locales de repli conservées, v2 pour les références, v1 pour le tout-local. La vraie distribution 09eff89 refuse le fichier v2 sans remplacer la bibliothèque. Les tests du modèle, du schéma distribué et du navigateur vérifient ces frontières. Le contrôle réseau est limité au chargement/dimensions ; il ne prouve ni poids distant, ni MIME, ni réception. La CSP ne change que pour les images du builder ; les autres directives et les sandbox restent figés. Voir FORMAT-JSON.md et UTILISATION.md.

La revue indépendante statique a relevé deux écarts UI (nom « sans image » incorrect avec URL, sélecteur incohérent après garde refusée) et l’absence d’un test de politique distribuée. Les corrections et tests dédiés ont été ajoutés. La sélection via selectOption ne prouve pas le clavier natif ; les touches n’ont pas changé le select Chromium macOS sans fenêtre. Aucun test existant n’est supprimé ou affaibli pour ce résultat.

## #190 — garde partagé activé, qualification bornée

Après accord utilisateur, trois documents seulement ont été installés dans le skill VoiceOver partagé Claude/Codex : SKILL.md, references/protocole-natif.md et references/cible-et-propriete.md. Avant-empreintes, sauvegarde, après-empreintes et retour arrière sont conservés localement. Aucun script, hook ou droit système changé.

Un témoin et trois processus Chromium jetables ont exercé succès, erreur et abandon contrôlé. Seuls les handles possédés sont fermés, les identités sont revérifiées, le témoin reste utilisable. Sans allocation, zéro fermeture. Ces essais vérifient le workflow, pas un verrou universel ni une garantie après interruption brutale. Une vraie fenêtre Safari de recette a ensuite été fermée via CloseWindow ; sa fenêtre préexistante témoin est restée intacte.

## #179 — NOT_EXECUTED pour le zoom 200 %

Firefox visible a été créé via le helper possédé, profil neuf et identité BiDi/processus concordante. Mesure initiale : viewport 1280×769, fenêtre 1280×854, DPR2, écran1512×982, visualViewport.scale1. Aucune de ces mesures ne prouve un pourcentage absolu.

L’outil UI a sélectionné un Firefox préexistant (extensions et marque-pages étrangers), même après activation du contexte possédé. Aucune commande de zoom n’y a été envoyée. L’instance créée a été fermée par son handle, session.end acquitté et sortie observée, cleanup_error nul. Pas de simulation CSS ou viewport ; pas de nouveau droit. Une voie capable de lier l’UI au processus possédé reste nécessaire. L’issue reste ouverte.

## #188 — qualification native partielle, INCONCLUSIVE

VoiceOver a été réellement lancé ; une lecture native a annoncé le dialogue Renommer et le nom du champ, puis « données non valides » après soumission vide. Cela prouve le canal et l’état invalide, pas l’annonce intégrale du message d’erreur.

| Cas | Résultat |
| --- | --- |
| Dialogue positif | Phrase native capturée, cible Safari possédée confirmée |
| Première erreur library-dialog-error | État invalide capturé ; texte de l’erreur non confirmé |
| Disparition/réapparition et répétition du message | Non vérifiées : pas de fenêtre de collecte valide complète |
| Première erreur globale #error, remplacement et réapparition | Non exécutées après arrêt de la collecte |
| Catalogue zéro résultat | Effet visuel confirmé, collecte exclue : une phrase hors cible observée |
| Catalogue un et plusieurs résultats | Non exécutés après arrêt de la collecte |

La lecture de last phrase est globale, non exhaustive et dédupliquée. Vérifier Safari avant/après une collecte ne suffit pas à garantir le focus pendant celle-ci : une phrase d’une autre surface a été observée. La collecte est arrêtée, les données hors cible ne sont pas publiées. Aucune absence d’annonce ni non-conformité n’est déduite de cet essai. Aucun changement de politesse/live-region sans défaut reproduit. Fenêtre possédée fermée, témoin préservé, serveur fermé ; VoiceOver revenu à l’état initial arrêté. Autorisations laissées inchangées. L’issue reste ouverte.

## #173 — cause historique toujours inconnue

Journal brut de la CI40703811056 relu : à la génération2, le nouveau document Blob est chargé, body638×51, iframe visible et pointer-events:auto, aucun modal, parent focalisé mais enfant non focalisé ; ses cinq compteurs d’événements sont vides après le clic demandé. Les gestes pendant la modale sont reçus par le parent. Ces faits n’établissent pas où le clic positif a été routé.

La trace parent déjà existante est désormais incluse seulement dans le diagnostic après échec. Aucun geste, timeout, assertion ou synchronisation du chemin normal n’est changé. Un essai local exploratoire avec instrumentation parent préalable a passé ; cette instrumentation préalable a été retirée pour ne pas modifier le chemin avant geste. Cet essai n’est donc pas la validation du delta final. La suite finale doit exercer le diagnostic conservé. Une réussite ne prouvera pas la cause historique. Le défaut Chromium connu de clic derrière modale ne démontre pas une cause commune au clic positif manquant après fermeture.

## Preuves locales et limites de diffusion

Dossier privé : /Users/alex/Claude-worktrees/builder-backlog-five-proof-20261028/. Il contient snapshots des issues, journaux ciblés, manifeste à finaliser, activation190, reçus natifs179/188 et journal historique173. Les traces vocales brutes restent locales. Elles ne sont pas toutes des preuves favorables, et ne sont pas supposées publiées sur GitHub.
