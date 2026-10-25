# Lot portabilité

Ce journal décrit la première candidate. La reprise de #141 après rejet du gate intégré, avec modification ultérieure de `preview.js`, est décrite dans [SERIALISATION.md](SERIALISATION.md). Les mentions « preview.js inchangé » ci-dessous concernent uniquement la première phase.

Périmètre : #132, #133, #134, #135, #141, #143, #144 et #147. Travail dans le checkout partagé isolé, sans commit ni publication. Sources : corps des tickets dans le snapshot validé du checkout principal, contrat de mission et tests à la base `395c08d`.

Méthode : skill TDD, aux frontières déjà autorisées (contrôles UI, état importé/exporté, IndexedDB, presse-papiers, messages du cadre et serveur privé). Les premiers rejeux conservent les défauts initiaux ; les contrôles négatifs restent actifs. Aucun profil personnel ni application de messagerie n’a été utilisé.

## Causes et corrections

| Issue | Cause observée | Intervention et limite |
| --- | --- | --- |
| #132 | `limitQuota` appelait CDP sur tous les moteurs, avant d’exercer les alertes. | Quota physique Chromium conservé ; erreur `QuotaExceededError` injectée à `IDBObjectStore.put` hors Chromium. Maintien après annulation, secours et extinction après écriture réussie exercés. |
| #133 | L’arbre d’accessibilité CDP était demandé sur Firefox/WebKit. | Arbre natif Chromium conservé ; noms accessibles calculés par le snapshot ARIA Playwright ailleurs. Unicité, portée et texte visible conservés. Aucun essai de lecteur d’écran annoncé. |
| #134 | Firefox accepte `window` mais rejette le `WindowProxy` du cadre opaque dans le constructeur `MessageEvent`. | Événement synthétique avec la vraie référence `source` posée après construction ; rejet source/origine/jeton/largeur/hauteur et avant chargement conservé. Un vrai `postMessage` du cadre fournit aussi un contrôle positif indépendant. |
| #135 | Le service worker Firefox joignait encore le serveur après `context.setOffline(true)`. | Témoin servi et enregistré, fermeture réelle du serveur privé, contrôle `fetch` externe rejeté ; navigation paramétrée disponible, ressources manquantes/étrangères refusées. Aucun cache applicatif rempli artificiellement pour produire le succès. Le cache étranger est un contrôle négatif volontaire. |
| #141 | Timeout dans `composition()` avant la course. Document chargé avec un ancien jeton, alors que `iframe.src` porte le nouveau ; 7999 pixels de contenu pour 569 pixels de cadre. Deux navigations blob lourdes successives peuvent perdre la dernière navigation dans ce WebKit. | Correctif des parcours UI : `Library.open` évite de redessiner un éditeur déjà visible ; `UI.preview` ne charge pas de document dans l’éditeur masqué. À l’ouverture depuis l’accueil, le cadre est montré puis rendu une seule fois. Import et changement de composition vérifiés depuis les deux vues. `Preview.show` et sa révocation restent strictement inchangés. |
| #143 | `writeText` posait le témoin natif, mais `read` consultait uniquement les éléments enregistrés par `write`. | `writeText`, `readText` et `read` partagent le témoin. Les écritures restent natives ; enregistrement seulement après leur réussite. Le contrôle frontière prouve qu’une écriture rejetée ne remplace pas le témoin. |
| #144 | Rejet natif précisément sur `readText`, malgré le focus et l’activation utilisateur. | Relecture interceptée explicitement identifiée. Le refus natif reste documenté, sans simulation d’une réussite native. Copie applicative et exports reprennent uniquement avec la nouvelle URL. |
| #147 | Quatre parcours UI étaient ignorés par moteur à cause d’une précondition quota CDP commune. | Parcours injectés sur les trois moteurs, test physique distinct conservé Chromium. Un seul skip quota physique subsiste par moteur non Chromium. La fixture de 680000 caractères était tronquée à 524288 par WebKit ; elle contient maintenant 510000 caractères, toujours au-dessus du quota de 400000 octets. |

## Preuves initiales et diagnostics

- `rouge-firefox-cdp-pwa.log` : 6 échecs initiaux (2 alertes, 2 noms accessibles, 2 PWA), 5 succès.
- `rouge-firefox-message-url.log` : 2 exceptions de construction `MessageEvent` et témoin texte absent.
- `rouge-webkit-url-preview.log` : pile du timeout initial et appels de presse-papiers rejetés.
- `rouge-clipboard-boundary.log` : défaut isolé `writeText` puis `read`.
- `diagnostic-firefox-message-source.log` : source locale acceptée, cadre opaque refusé par le constructeur.
- `diagnostic-webkit-native-clipboard.log` : navigateur natif sans interception ; focus et activation actifs, écriture texte réussie, lectures refusées, requêtes de permission non prises en charge.
- `diagnostic-webkit-frame.log` et `vert-webkit-portabilite.log` : état complet au timeout de hauteur, ancien jeton dans le document malgré le nouvel attribut src.
- `diagnostic-webkit-subject.log` : 680000 caractères demandés, 524288 dans le champ et le modèle avant export.
- `avant-firefox-secours-skips.log` : quatre skips historiques, avant séparation du quota physique et des parcours fonctionnels.

Les fichiers préfixés `vert-` sont des tentatives intermédiaires, pas tous des succès. Leurs compteurs restent conservés. Deux corrections de test ont été nécessaires après la première adaptation : la session CDP doit rester ouverte pour conserver son quota ; l’acceptation du vrai `postMessage` se mesure pendant son traitement, avant la mesure suivante du navigateur.

Le candidat de révocation différée pour #141 a été retiré : il ne corrige pas les navigations rapprochées et risquait de conserver des blobs sans mesure valide. Une reproduction dans un iframe natif distinct, sans appel à `Preview.show` et sans révocation, retrouve le premier document après affectation de la seconde URL (`diagnostic-webkit-native-large.log`). La comparaison explicite `offline:false/true` conserve ce défaut dans les deux cas (`diagnostic-webkit-native-offline.log`). Le détour par `about:blank` échoue aussi. Les premiers essais de contrôle par `fetch(blob)` étaient impropres à cause de la CSP et de l’origine du portable ; leurs échecs ne sont pas des preuves de révocation. Le contrôle d’API natif suivant confirme la révocation immédiate, mais elle ne suffit pas à expliquer le défaut. Ni `Set retired`, ni assouplissement de la CSP, ni nouveau test imposant cette hypothèse ne restent dans le produit.

La racine a ensuite autorisé le transfert de `library.js`, puis `view.js`. Le nouveau test multi-vues échoue avant le correctif (`rouge-webkit-import-views.log`). Le premier correctif, limité à l’éditeur déjà visible, laisse encore échouer l’import depuis l’accueil : `diagnostic-webkit-import-home-label.log` nomme explicitement ce cas, avec l’ancien jeton toujours présent après dix secondes. Le complément de visibilité dans `UI.preview` corrige cette seconde branche. Les attentes restent de dix secondes et exigent désormais aussi l’URL du document demandé ; elles ne confondent plus un document précédent mesuré avec l’aperçu courant.

## Commandes de validation ciblée

Les journaux `final-MOTEUR-hors-preview.log` correspondent à la commande suivante, exécutée avec `MOTEUR=chromium`, `firefox`, puis `webkit` :

```sh
MAIL_BUILDER_ENGINE=MOTEUR \
MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/portabilite/evidence-MOTEUR \
MAIL_BUILDER_NOTES=docs/prise-en-charge-backlog-20261025/portabilite/notes-MOTEUR.jsonl \
node --test --test-reporter=tap \
  tests/error-persistence-browser.test.cjs tests/save-rescue-browser.test.cjs \
  tests/scope-buttons-browser.test.cjs tests/pwa-contract.test.cjs \
  tests/portability-clipboard-browser.test.cjs tests/url-input-browser.test.cjs
```

Le lot ne lance ni suite npm complète ni campagne globale. Les limites de quota physique Firefox/WebKit, les deux skips `event.target.error` hors lot et les parcours de collage dans les messageries restent distincts et non couverts par ces simulations.

Résultats hors aperçu, après corrections : Chromium **28 succès / 0 échec / 0 skip** ; Firefox **27 succès / 0 échec / 1 skip** ; WebKit **27 succès / 0 échec / 1 skip**. Le skip restant porte exclusivement sur le quota physique CDP. Ces tests WebKit automatisés ne qualifient pas Safari natif.

Validation du dernier état produit, après `npm run build` (`build-final.log`) :

```sh
MAIL_BUILDER_ENGINE=MOTEUR node --test --test-reporter=tap \
  tests/preview-size-browser.test.cjs tests/preview-contract.test.cjs
```

Journaux d’acceptation faisant foi : `acceptation-chromium-preview.log`, `acceptation-firefox-preview.log`, `acceptation-webkit-preview.log` : **7 succès chacun, aucun échec ni skip**. Ils couvrent l’import et la réouverture depuis les deux vues, les 52 blocs, la réduction, la frappe continue, l’image tardive, l’origine opaque, les messages invalides, la mesure prématurée rejetée puis acceptée après chargement, et le contrat CSP des distributions. Les compteurs hors aperçu précèdent le dernier correctif de navigation ; la campagne intégrée finale appartient à la racine.

Fichiers du lot : `tests/browser-support.cjs`, `tests/error-persistence-browser.test.cjs`, `tests/scope-buttons-browser.test.cjs`, `tests/preview-size-browser.test.cjs`, `tests/pwa-contract.test.cjs`, `tests/save-rescue-browser.test.cjs`, nouveaux `tests/portability-clipboard-browser.test.cjs` et `tests/portability-storage.cjs` ; après transfert explicite, `app/source/library.js` et `app/source/view.js`. Distributions app reconstruites avec les changements coordonnés des autres lots. `url-input-browser.test.cjs`, `preview-contract.test.cjs`, `app/source/preview.js`, le registre des attentes et le runner restent inchangés par ce lot. `git diff --check` et le contrôle des accents passent.

Limites résiduelles : les corrections de harnais ne prouvent pas un collage natif Firefox/WebKit, un quota physique hors Chromium ni une recette de messagerie. Le défaut natif de navigations blob lourdes rapprochées reste observable dans la reproduction isolée ; le correctif applicatif évite les rendus redondants des parcours import/ouverture testés, sans prétendre corriger WebKit lui-même ni qualifier toutes les navigations possibles.
