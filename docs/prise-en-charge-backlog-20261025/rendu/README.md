# Rendu et reprise — preuves du lot #136, #137, #138

Périmètre : fichiers sources de rendu et tests du lot dans le checkout partagé `fix/backlog-qualification-20261025`, base `395c08d`. Le parent reconstruit les distributions. Aucun changement de référence DSFR ; aucune publication.

## #136 — comparaison du pré-en-tête et largeur réécrite

Rouge initial : `firefox-red.log` et `webkit-red.log`. L’écart de texte apparaît avant les assertions de largeur. `probe.cjs` suit le parcours complet : HTML initial, adaptation presse-papiers, copie puis simulation reçue. Les JSON `firefox-probe-before.json` et `webkit-probe-before.json` prouvent que le pré-en-tête conserve `display:none` et `mso-hide:all` jusqu’au HTML copié. Le harnais applique ensuite `style.width = '800px'` à chaque enfant du corps, y compris le div masqué. Cette mutation CSSOM retire la propriété Office inconnue ; le div reste masqué. L’ancien oracle le comptait pourtant comme texte reçu.

Correction du test : vérifier explicitement la présence et les protections du pré-en-tête dans les sorties initiales, puis comparer les textes effectivement affichés dans le document reçu monté. Un pré-en-tête rendu visible ou un autre texte masqué ferait échouer la comparaison. Les liens, signatures des images et texte brut restent comparés.

Le premier rejeu corrigé atteint les largeurs : Firefox et Chromium 3/3 ; WebKit échoue à 800 px (800 px de contenu pour 784 disponibles). Le journal `webkit-green.log` conserve cet échec intermédiaire, malgré son nom prévu avant résultat. La sonde `width-probe.cjs` démontre la seconde cause : la réécriture retire la borne `width:min(...)`, et WebKit ignore le `max-width` de la table fixée. `webkit-width-probe.json` mesure avant/après à 1024, 800, 600 et 390 px ; avant 800 px de contenu, après zéro débordement de table/cellule/image.

Correctif minimal : seulement dans `clipboardHtml`, borne logique `inline-size:min(100%,620px)!important` sur les tables racines. La largeur physique et son repli restent disponibles ; la borne logique survit au remplacement de `width`. Après reconstruction du parent : les trois tests de `mail-layout-browser.test.cjs` passent dans chacun des trois moteurs (journaux `chromium-final-layout.log`, `firefox-final-layout.log`, `webkit-final-layout.log`). Le chemin des 52 composants atteint et réussit désormais texte, liens, images et largeurs dans chaque moteur.

## #137 — cellule de 4 px, filet peint de 3 px

L’écart est une erreur de mesure du rectangle, pas un filet violet trop large. `webkit-border-probe.json`, les captures `webkit-baseline.png` et `painted-pixels.json` établissent : rectangle 4 px, dont 1 px de bordure grise fusionnée, violet sur trois colonnes x=19,20,21. En Chromium, les mêmes trois colonnes sont violettes.

Contre-expériences diagnostiques uniquement, sans correction produit : retirer la bordure élimine le pixel supplémentaire ; imposer `box-sizing:border-box` donne un rectangle WebKit de 3 px mais seulement 2 px violets, donc serait un faux correctif ; séparer les bordures conserve 3 px violets. Le produit reste inchangé pour cette issue.

Oracle corrigé : capture une ligne au milieu de chaque filet réellement affiché, décodage par Canvas puis mesure de la plus longue suite de pixels violets. La cible 3 px et tolérance ±0,75 restent inchangées. Le témoin négatif fixe une vraie largeur de 4 px et doit être refusé. Capture `webkit-four-pixels.png` et `webkit-border-probe-with-counterexample.json` : violet sur x=19,20,21,22. Aucun snapshot attendu produit par le code applicatif.

## #138 — repli retenu par délégation explicite

Alex a délégué l’arbitrage au parent (« je sais pas fais pour le mieux »). Le parent a explicitement retenu : notification précoce permise, garantie de lecture seule au plus tard à la première modification de l’ancien onglet, aucun écrasement, travail conservé en mémoire et exportable. Cette décision vient de cette délégation utilisateur ; elle n’est pas déduite de l’implémentation. Aucun polling ajouté ; `state.js` et `storage.js` restent inchangés.

Le rouge historique a été rejoué avant adaptation (`webkit-takeover-contract-red.log`, 7/9) : deux exigences de bandeau proactif échouent. C’est un désaccord de contrat, pas une preuve de perte. Les preuves historiques relues observent un stockage intact malgré l’absence du bandeau après reprise, six secondes et retour au premier plan ; aucune cause BroadcastChannel n’en est déduite.

Tests adaptés :

- Le scénario de fermeture conserve les copies divergentes horodatées, la mémoire et l’export de l’ancien onglet inchangé, sa fermeture sans avertissement et l’absence d’écriture au stockage du nouveau propriétaire, avec ou sans bandeau précoce.
- Le scénario de reprise inverse utilise, si nécessaire, « Sauvegarder maintenant » pour constater le jeton périmé sans changer le contenu. Le bandeau reste obligatoire après cette tentative ; la reprise inverse ne crée aucun doublon et conserve le contenu.
- Un scénario distinct rend BroadcastChannel indisponible à la frontière navigateur, dans un contexte jetable, sans remplacer de collaborateur de l’application. Il exerce ainsi le repli dans chaque moteur : après reprise et retour au premier plan, le champ est encore disponible ; la première modification produit la lecture seule et l’erreur d’écriture. La mémoire contient exactement cette modification, l’export aussi, tandis que jeton et bibliothèque du nouveau propriétaire restent strictement identiques. Aucune temporisation fixe ne sert de correctif.

Contre-épreuve discriminante : `takeover-token-mutant.cjs` fabrique seulement une copie portable éphémère de l’ancien onglet avec le contrôle du jeton neutralisé. La CSP est contournée uniquement dans ce contexte de mutation afin de charger cette copie modifiée ; le code versionné n’est pas touché. Le même test échoue sur « Une tentative refusée ne doit pas remplacer le jeton du nouveau propriétaire », et non sur un délai de bandeau. `webkit-takeover-token-mutant-workspace.log` conserve `MUTANT_EXIT=1` ; le script réussit uniquement si cet échec précis est obtenu. Il retire ensuite les deux fichiers temporaires qu’il a créés.

Vert : `chromium-takeover-final.log`, `firefox-takeover-final.log`, `webkit-takeover-final.log` contiennent chacun **10/10**, aucun test sauté. Les téléchargements de preuve vivent dans `reprise-chromium/`, `reprise-firefox/`, `reprise-webkit/`. Les scénarios de quota, version différente, mise à jour, image différée et restauration restent exécutés.

Portée : portable `file://` pour la reprise, HTTP local pour le scénario de mise à jour déjà présent. Le repli est éprouvé avec transport de notification volontairement absent ; cela ne prouve pas un défaut du transport natif. Safari installé et environnements métier ne sont pas qualifiés.

## Commandes

Depuis le checkout du chantier :

```sh
MAIL_BUILDER_ENGINE=firefox node --test tests/mail-layout-browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node --test tests/mail-layout-browser.test.cjs
MAIL_BUILDER_ENGINE=chromium node --test tests/mail-layout-browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node docs/prise-en-charge-backlog-20261025/rendu/probe.cjs
MAIL_BUILDER_ENGINE=webkit node docs/prise-en-charge-backlog-20261025/rendu/border-probe.cjs
MAIL_BUILDER_ENGINE=webkit node docs/prise-en-charge-backlog-20261025/rendu/width-probe.cjs
```

Les profils sont jetables, chaque navigateur créé est fermé dans `finally`. Sous Firefox/WebKit, la relecture du presse-papiers est interceptée par le harnais existant ; sous Chromium elle est native. Ces preuves ne valent pas collage ni réception dans Outlook/Mélissa, ni recette Safari installé.

## Vérifications finales du lot rendu

- `mail-layout-browser.test.cjs` : 3/3 Chromium, 3/3 Firefox, 3/3 WebKit, sans test sauté.
- Témoin négatif renforcé : `[4,4]` pixels peints affirmés explicitement, puis verdict de la cible 3 px refusé. Rejeu ciblé des filets : 1/1 dans chaque moteur ; journaux `*-counterexample-verified.log`.
- `MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/rendu/recette-copie node --test tests/mail-copy-engines-browser.test.cjs` : 590 cas Chromium et 590 cas WebKit, aucun débordement, texte/image masqué ou coupé ; neuf largeurs de 320 à 800 px, variantes longues et deux variantes éditoriales. Preuve : `recette-copie/mail-copy-engines.json` et `copy-content-final.log`. Cette recette exerce la copie sans styles de tête ; la simulation de réécriture à 800 px est couverte séparément par `mail-layout`.
- `git diff --check -- app/source/render.js tests/mail-layout-browser.test.cjs` : succès. Contrôle des accents du présent document : succès.

État : #136 correctif local vérifié, #137 oracle local corrigé et discriminant, #138 contrat arbitré et tests locaux vérifiés. La campagne intégrée et la revue indépendante appartiennent au parent. Aucun verdict de production ni de messagerie réelle.

## Commandes de reprise #138

```sh
MAIL_BUILDER_ENGINE=webkit MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/rendu/reprise-webkit node --test tests/tab-takeover-browser.test.cjs
MAIL_BUILDER_ENGINE=firefox MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/rendu/reprise-firefox node --test tests/tab-takeover-browser.test.cjs
MAIL_BUILDER_ENGINE=chromium MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/rendu/reprise-chromium node --test tests/tab-takeover-browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node docs/prise-en-charge-backlog-20261025/rendu/takeover-token-mutant.cjs
```
