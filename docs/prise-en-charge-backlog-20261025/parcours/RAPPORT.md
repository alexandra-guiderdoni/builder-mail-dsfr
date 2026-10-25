# Parcours et attentes — issues 130, 131, 139, 140, 142, 145

Complément courant : [delta après intégration](integration/DELTA-FINAL.md). La première fixture window.name décrite ci-dessous a été réfutée par Firefox/WebKit puis remplacée par une demande de refus dans le fragment URL consommé. Les anciens journaux restent des preuves historiques, pas la qualification de cette variante rejetée.

Travail local dans `fix/backlog-qualification-20261025`, base `395c08d1dfa4d0b8e41416da798bf0313a8bd379`. macOS 26.5.2, Node 24.18.0, Playwright 1.64.1. Aucun code produit, distribution, dépendance, skill ou helper partagé modifié par ce lot. Aucun commit, push ou déploiement.

Sources : corps et critères des six issues dans le snapshot validé ; journaux de qualification du 25 octobre ; sources des tests, `storage.js`, `images.js`, `view.js`, `library-actions.js` ; contrat de mission. Les surfaces vérifiées sont les contrôles du navigateur, les événements de saisie et les fichiers importés/exportés. TDD appliqué aux causes démontrées. Le cadrage du pourquoi est fourni par la mission et `docs/cadrage-source.md`.

| Issue | Résultat local | Limite restante |
| --- | --- | --- |
| #130 | Précondition CI reproduite : marqueur sessionStorage absent au rechargement ; le fixture réinjecte alors son refus. Fixture finale indépendante du stockage/name, portée par le fragment URL consommé ; récupération et conflits 3/3 par moteur sur Mac et Linux. | Cause de la disparition originelle du marqueur sous Linux inconnue ; voir le delta final pour le périmètre précis de la preuve. |
| #131 | Course reproduite dans Chromium et WebKit en retenant explicitement la notification de succès IndexedDB. Attente de l’annonce finale après libération. Fichier complet : 10/10. | CI Linux complète à exécuter ; aucune corruption produit démontrée. |
| #139 | Même assertion fautive identifiée dans Firefox et WebKit : octets de l’icône source exigés après une préparation qui autorise son réencodage. Conservation de l’image incorporée vérifiée dans les exports et la restauration. Parcours complets Chromium/Firefox/WebKit : 1/1 chacun. | La copie Firefox/WebKit utilise la relecture interceptée du helper ; aucune preuve de collage dans une messagerie. |
| #140 | Firefox termine lui-même une composition lors de keyboard.insertText. Scénario synthétique corrigé : InputEvent avec isComposing:true, compositionend explicite. Fichier complet : 5/5 dans chacun des trois moteurs. | IME natif et perte de caractères native non qualifiés. |
| #142 | Deux parcours complets WebKit réussis. Diagnostic enrichi avec étape, cause complète, état actif et DOM de l’aperçu en cas d’échec. | Timeout historique non reproduit ; cause inconnue, issue ouverte. Aucun timeout augmenté. |
| #145 | Historique localisé : premier export HTML du nom avec accents et esperluette, dialogue de contrôle ouvert, fenêtre focalisée, aucune erreur affichée. Fichier courant : 4/4 Chromium/WebKit. | Non-reproduction bornée ; aucune cause ni correction historique revendiquée, issue ouverte. |

## Preuves et décisions

### #130 — refus artificiel injecté une seule fois

`refusal-missing-marker-red.log` conserve le rouge obtenu en supprimant volontairement `refus-initial` avant le rechargement. L’assertion observe `recoveryOnly:true`. Cette manipulation reproduit la précondition mesurée en CI ; elle n’explique pas pourquoi le marqueur avait disparu dans ce run Linux.

La première variante employait un marqueur `window.name` propre à sa page jetable. Elle a passé Chromium puis échoué dans la matrice Firefox/WebKit : refus déjà consommé trop tôt dans Firefox, refus réinjecté au reload dans WebKit. Elle est remplacée par le fragment URL décrit dans le delta final. Les contrôles de travail temporaire exportable, d’absence d’écriture avant reload, d’état concurrent et de conflit après reload restent présents.

`refusal-final-green.log` : trois tests réussis. Aucun contournement du stockage produit.

### #131 — annonce d’une création terminée

`creation-held-red.log` : deux échecs avec l’ancienne annonce « Modèle neutre enregistré ». La sonde retient le callback `oncomplete` d’une transaction IndexedDB readwrite réussie ; aucune modification d’interface privée produit ni délai fixe. Le test attend désormais la disponibilité de la libération, constate la sauvegarde en cours, libère la notification puis attend l’annonce spécifique de création datée avant les assertions de contenu et focus.

`creation-green.log` : les dix tests réussissent, modèles datés/neutres, créations et copies compris. Les exigences de nom, objet daté remplacé, annonce et focus restent inchangées.

### #139 — image préparée puis conservée

`baseline-firefox.log` et `baseline-webkit.log` conservent la pile complète : `assert(JSON.stringify(project).includes(image))` à l’ancienne ligne 77. Le contrat `Images.prepare` réencode localement les nouvelles images et conserve la variante la moins lourde quand les dimensions et le format restent identiques.

Une première investigation a ajouté une exigence de pixels RGBA identiques à la source : WebKit la respecte, Firefox non. `flow-firefox-green.log` porte malgré son nom un échec de cette hypothèse intermédiaire. `firefox-image-diagnostic.json` mesure un PNG passant de 6110 à 4742 caractères et 44 canaux différents aux bords partiellement transparents. Cette exigence supplémentaire a été abandonnée sur décision de la racine : la préparation et le réencodage ont leur suite dédiée `image-import-browser.test.cjs`.

L’icône réelle reste la fixture du parcours. Le test exige que l’image incorporée dans l’éditeur soit PNG, décodable, de 192 × 192 pixels, puis soit conservée à l’identique dans le JSON, le HTML et la bibliothèque restaurée. Toutes les assertions de bibliothèque, déplacement, source, copie, refus d’import, absence de scripts, absence de réseau et persistance restent présentes. `flow-chromium-final.log`, `flow-firefox-final.log` et `flow-webkit-final.log` : un parcours complet réussi chacun.

### #140 — composition synthétique explicitement ouverte

`ime-trace-red.log` montre la séquence Firefox : compositionstart synthétique, compositionstart trusted, compositionend trusted, input avec isComposing:false. Elle précède la libération d’image : le scénario avait déjà terminé sa composition et le remplacement du champ était alors autorisé.

Le scénario conserve son compositionstart synthétique et insère le caractère avec `setRangeText` puis un `InputEvent` synthétique `isComposing:true`. Il vérifie le même nœud focalisé, `ABé`, curseur à 3, puis compositionend, image finale et suite `ABéDEF`. La trace est jointe à l’échec éventuel. Aucun comportement produit n’est changé. Les autres invariants de saisie du fichier restent testés.

`editor-firefox-green.log`, `editor-chromium-green.log`, `editor-webkit-green.log` : cinq réussites chacun. Ce résultat ne valide pas un IME natif. Les gardes produit contre des chargements obsolètes ne sont pas modifiées ; aucun nouveau test natif de ces gardes n’a été ajouté par ce lot.

### #142 et #145 — investigations sans cause démontrée

#142 : `baseline-webkit.log` puis `article-webkit-repeat.log` passent le parcours complet article/pied. Le test conserve maintenant le nom de l’étape et la cause d’origine ; en cas d’échec, il écrit `article-footer-failure.json` dans le dossier de preuves choisi, avec état actif et DOM de l’aperçu. Aucun défaut mail-31/mail-50 déclaré corrigé.

#145 : le journal historique `ci-previous-failure.log`, lignes 422–440, nomme `[data-action=export-mail]`, le premier nom du tableau, `checkDialog:true`, `focused:true` et des annonces/erreurs vides. Nom attendu : `Édition-&-dossier-suivi-2026-10-25.html`. L’élément précis focalisé n’avait pas été capturé. `git show eadd426:tests/export-names-browser.test.cjs` et le helper de cette révision montrent que `confirmChecks(page,event)` existait déjà. Pas de causalité établie. `refusal-and-export-green.log` contient les quatre tests actuels réussis ; ce fichier de test est inchangé.

## Commandes exécutées

Toutes les commandes partent de la racine du worktree. Chaque test ouvre et ferme uniquement ses propres navigateurs et contextes. `MAIL_BUILDER_EVIDENCE` est dirigé vers ce dossier pour les parcours exportant des preuves.

```sh
# Baselines et traces rouges
MAIL_BUILDER_ENGINE=firefox node --test --test-reporter=tap --test-name-pattern='parcours complet|IME' tests/browser.test.cjs tests/editor-input-preservation-browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node --test --test-reporter=tap tests/article-text-footer-links-browser.test.cjs tests/browser.test.cjs
MAIL_BUILDER_ENGINE=firefox node --test --test-reporter=tap --test-name-pattern=IME tests/editor-input-preservation-browser.test.cjs
node --test --test-reporter=tap --test-name-pattern='modèle enregistré' tests/creation-browser.test.cjs
node --test --test-reporter=tap --test-name-pattern='refus initial' tests/restore-after-refusal-browser.test.cjs

# Vérifications ciblées finales
node --test --test-reporter=tap tests/creation-browser.test.cjs
node --test --test-reporter=tap tests/restore-after-refusal-browser.test.cjs tests/export-names-browser.test.cjs
node --test --test-reporter=tap tests/restore-after-refusal-browser.test.cjs
node --test --test-reporter=tap tests/editor-input-preservation-browser.test.cjs
MAIL_BUILDER_ENGINE=firefox node --test --test-reporter=tap tests/editor-input-preservation-browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node --test --test-reporter=tap tests/editor-input-preservation-browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node --test --test-reporter=tap tests/article-text-footer-links-browser.test.cjs
MAIL_BUILDER_ENGINE=firefox node --test --test-reporter=tap --test-name-pattern='parcours complet' tests/browser.test.cjs
MAIL_BUILDER_ENGINE=webkit node --test --test-reporter=tap --test-name-pattern='parcours complet' tests/browser.test.cjs
node --test --test-reporter=tap --test-name-pattern='parcours complet' tests/browser.test.cjs
```

Les variantes d’investigation #139 sont conservées, y compris l’hypothèse rejetée de pixels RGBA stricts. Pas de suite complète, matrice globale ou CI lancée par ce lot. Le fil principal reconstruit les distributions et conduit la campagne intégrée ; les résultats ci-dessus sont des preuves ciblées, pas un GO production.
