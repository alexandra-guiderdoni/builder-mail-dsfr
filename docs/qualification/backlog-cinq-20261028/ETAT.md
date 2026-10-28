# Qualification des issues #192, #190, #188, #179 et #173

Candidat issu de f635da90b56d8ccaedf423f5ec7783b0d616be16. Le SHA exact de livraison et les résultats de suite finale sont consignés séparément après commit. La première suite Linux sur c75901a a terminé avec 593/600 réussites et sept échecs, conservés : montage inutile des commandes distantes inactives, cinq stubs PWA non adaptés à Model.versions et classification réseau du test de ressource non-image. Le montage a été corrigé sans changer les assertions existantes ; les doubles de test et la fixture de réseau sont explicitement adaptés. Une suite finale doit qualifier ce delta. Aucun résultat de réception Outlook/Mélissa n’est apporté.

## #192 — images HTTPS

Source distante explicite sur les 24 champs de 17 composants ; données locales de repli conservées, v2 pour les références, v1 pour le tout-local. La vraie distribution 09eff89 refuse le fichier v2 sans remplacer la bibliothèque. Les tests du modèle, du schéma distribué et du navigateur vérifient ces frontières. Le contrôle réseau est limité au chargement/dimensions ; il ne prouve ni poids distant, ni MIME, ni réception. La CSP ne change que pour les images du builder ; les autres directives et les sandbox restent figés. Voir FORMAT-JSON.md et UTILISATION.md.

La revue indépendante statique a relevé deux écarts UI (nom « sans image » incorrect avec URL, sélecteur incohérent après garde refusée) et l’absence d’un test de politique distribuée. Les corrections et tests dédiés ont été ajoutés. La sélection via selectOption ne prouve pas le clavier natif ; les touches n’ont pas changé le select Chromium macOS sans fenêtre. Un contrôle représentatif du renderer commun a ensuite changé de source dans Firefox natif avec Espace/Bas/Entrée, puis est revenu au local par Espace/Début/Entrée. Les états finaux ont été relus après les événements, car la première lecture AX était trop précoce. Il ne s’agit pas d’une recette native répétée sur les 24 champs. Aucun test existant n’est supprimé ou affaibli pour ce résultat.

## #190 — garde partagé activé, qualification bornée

Après accord utilisateur, trois documents seulement ont été installés dans le skill VoiceOver partagé Claude/Codex : SKILL.md, references/protocole-natif.md et references/cible-et-propriete.md. Avant-empreintes, sauvegarde, après-empreintes et retour arrière sont conservés localement. Aucun script, hook ou droit système changé.

Un témoin et trois processus Chromium jetables ont exercé succès, erreur et abandon contrôlé. Seuls les handles possédés sont fermés, les identités sont revérifiées, le témoin reste utilisable. Sans allocation, zéro fermeture. Ces essais vérifient le workflow, pas un verrou universel ni une garantie après interruption brutale. Une vraie fenêtre Safari de recette a ensuite été fermée via CloseWindow ; sa fenêtre préexistante témoin est restée intacte.

## #179 — 200 % natif observé ; recette complète distincte

La première voie CUA restait NOT_EXECUTED car elle ciblait un Firefox préexistant. Après autorisation explicite de la voie AppleScript/System Events, une nouvelle instance possédée a fourni l’URL native portant son marqueur, un PID égal à celui de BiDi et une identité de naissance revérifiée. Les actions UI ont été limitées à ce processus. La référence AS mémorisée par nom était ambiguë : cette voie a été abandonnée au profit des requêtes JXA différées par PID et indices validés. Aucune saisie, commande de zoom ou fermeture n’a été envoyée par la voie AS ambiguë.

Firefox a affiché successivement 170, 180, 190 puis **200 %** dans le libellé natif « Réinitialiser le niveau de zoom ». Le plafond initial de huit augmentations s’était révélé insuffisant ; les trois dernières ont reçu un accord utilisateur distinct. La fenêtre physique mesurée via System Events est restée 1280×854. Les métriques BiDi sont passées de viewport 1280×769 / DPR2 à 640×385 / DPR4, deux mesures identiques à 200 %. L’éditeur, le catalogue et le dialogue ont été utilisés dans cet état. Le menu Taille réelle a restauré les métriques initiales ; le zoom a été restauré avant fermeture.

Le témoin revenu à 100 % refuse l’étiquette200 %. L’oracle relatif existant reste inchangé : à 200 %, Firefox réduit aussi les dimensions JavaScript outer/screen. L’oracle exigeait leurs valeurs fixes et rejette donc cette mesure. Le reçu conserve **ce résultat non concluant**, à côté de la lecture native200 %, sans réécrire qualified/absoluteZoomVerified de l’oracle. Les assertions de reflow, absence de débordement et navigation de la recette originale sont préservées ; leur exécution complète native n’est pas revendiquée. Voir [NATIF.json](NATIF.json).

## #188 — trois régions exercées, réserves de collecte explicites

Le premier essai Safari a été exclu pour contamination de la collecte globale par une phrase hors cible. La voie suivante collecte dans une même opération native, avec vérification PID/naissance, fenêtre/URL, processus au premier plan **avant chaque lecture**. La collecte s’arrête dès perte de cible. Les sorties partielles et les premiers essais ne sont pas remplacés par les succès ultérieurs.

| Cas | Résultat natif |
| --- | --- |
| Dialogue positif | Nom du champ et contenu sélectionné capturés |
| Première erreur library-dialog-error | « Renseignez un nom pour la composition. » |
| Répétition et réapparition du dialogue | Même phrase capturée après soumission puis réouverture ; une collecte intermédiaire interrompue reste consignée |
| Première erreur globale #error | « Renseignez un nom pour cet élément. » |
| Remplacement de l’erreur globale | « Choisissez un élément enregistré. » capturé avant l’arrêt de cette fenêtre pour perte de focus |
| Effacement puis réapparition globale | Commande réelle Annuler les champs invalides exécutée ; message de nom manquant capturé à la nouvelle soumission ; la collecte lors de l’effacement avait été interrompue |
| Répétition globale strictement identique | Non confirmée : nom du champ puis bouton capturés, texte répété non capturé dans la fenêtre bornée ; le polling ne prouve pas son absence globale |
| Catalogue 0 / 1 / 2 résultats | « Aucun composant trouvé sur 52. », « 1 composant trouvé sur 52. », « 2 composants trouvés sur 52. » capturés après pause ; textes exacts et horodatages dans le reçu |

Le canal positif est attesté par plusieurs commandes et messages frais. Les phrases natives ne prouvent pas une écoute humaine. Le flux last phrase reste non exhaustif ; aucune conformité RGAA globale ou absence absolue n’en est déduite. La répétition identique ne permet pas à elle seule d’établir une nouvelle non-conformité ; aucun correctif spéculatif de politesse ou de live-region n’est appliqué.

La session native chargeait 404b817. Les correctifs suivants concernent le montage des commandes image inactives et des harnais ; les producteurs de messages testés et les emplacements vocaux n’ont pas changé. Cette portée est conservée dans le reçu, sans déclarer qu’un parcours natif complet a tourné sur le SHA final. VoiceOver est revenu à son état initial arrêté ; autorisations inchangées, fermeture du seul navigateur créé observée.

## #173 — cause historique toujours inconnue

Journal brut de la CI40703811056 relu : à la génération2, le nouveau document Blob est chargé, body638×51, iframe visible et pointer-events:auto, aucun modal, parent focalisé mais enfant non focalisé ; ses cinq compteurs d’événements sont vides après le clic demandé. Les gestes pendant la modale sont reçus par le parent. Ces faits n’établissent pas où le clic positif a été routé.

La trace parent déjà existante est désormais incluse seulement dans le diagnostic après échec. Aucun geste, timeout, assertion ou synchronisation du chemin normal n’est changé. Un essai local exploratoire avec instrumentation parent préalable a passé ; cette instrumentation préalable a été retirée pour ne pas modifier le chemin avant geste. Cet essai n’est donc pas la validation du delta final. La suite finale doit exercer le diagnostic conservé. Une réussite ne prouvera pas la cause historique. Le défaut Chromium connu de clic derrière modale ne démontre pas une cause commune au clic positif manquant après fermeture.

## Preuves locales et limites de diffusion

Dossier privé : /Users/alex/Claude-worktrees/builder-backlog-five-proof-20261028/. Il contient snapshots des issues, journaux ciblés, manifeste à finaliser, activation190, reçus natifs179/188 et journal historique173. Les traces vocales brutes restent locales. Elles ne sont pas toutes des preuves favorables, et ne sont pas supposées publiées sur GitHub.
