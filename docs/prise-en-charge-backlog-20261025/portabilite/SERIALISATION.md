# #141 : navigation d’aperçu sérialisée

Ce delta est postérieur au snapshot natif `audit-20261025-115922108-395c08d1`. Le snapshot antérieur reste une preuve de l’ancienne candidate ; il ne qualifie pas ce nouveau code. Les corrections de `library.js` et `view.js` évitaient les rendus redondants d’ouverture, mais ne suffisaient pas à couvrir une modification pendant le premier chargement.

## Cause et rouge

La preuve du lot parcours, dans `../parcours/integration/DIAGNOSTIC.md`, montre sous Chromium CPU×6 que le second `src` est assigné avant le premier `load`. Après trente secondes, le document réel garde le premier blob et l’ancien titre. Neutraliser seulement la révocation ne répare pas cette navigation perdue. Aucune attente initiale n’est ajoutée au scénario de frappe.

Le nouveau scénario navigateur produit quarante demandes successives à l’interface `Preview.show`. Avant correction, `serialization-red-webkit.log` échoue : **40 blobs au lieu d’une seule navigation initiale**. Le scénario observe `URL.createObjectURL` et `URL.revokeObjectURL` en déléguant chaque appel à l’API native, puis contrôle le document réellement chargé. Il n’inspecte aucune file interne du produit.

## Correction retenue

`app/source/preview.js` garde une navigation active et, au maximum, le dernier HTML demandé en attente. `show` conserve son retour et invalide immédiatement le jeton et l’autorisation de mesure. Pendant une navigation, la nouvelle demande remplace l’attente précédente ; aucune URL blob supplémentaire n’est créée. Le `src` reste celui de la navigation effectivement engagée.

Au `load`, le dernier rendu en attente est lancé, s’il existe. L’URL précédente est révoquée à ce moment ; elle a terminé son chargement. Sans demande restante, les mesures du jeton courant deviennent admissibles. La progression dépend du chargement, pas de la réception d’une mesure. Aucune temporisation, boucle de sondage, modification d’iframe, liste historique de blobs ou changement des gardes source/origine/jeton n’est ajouté.

La rétention est bornée à une URL de navigation et un dernier HTML en attente ; un rendu invalide est refusé avant de remplacer cette attente. Si le navigateur n’émet jamais de `load`, le code n’invente pas un succès et ne crée pas de nouvelles URL : cette version n’ajoute pas de mécanisme de relance.

## Vérifications

```sh
npm run build

MAIL_BUILDER_ENGINE=webkit node --test --test-reporter=tap \
  --test-name-pattern='rafale de rendus' tests/preview-size-browser.test.cjs

PREVIEW_CPU_RATE=6 \
MAIL_BUILDER_EVIDENCE=docs/prise-en-charge-backlog-20261025/portabilite/serialization-cpu6 \
node --test --test-reporter=tap --test-name-pattern='rafraîchissement complet' \
  docs/prise-en-charge-backlog-20261025/parcours/integration/typing-probe.test.cjs

MAIL_BUILDER_ENGINE=MOTEUR node --test --test-reporter=tap \
  tests/preview-size-browser.test.cjs tests/preview-contract.test.cjs
```

- `serialization-build.log` : distributions reconstruites.
- `serialization-cpu6.log` : **1/1**, sans attente du premier aperçu ; `serialization-cpu6/typing-success.json` montre deux navigations réelles, le dernier titre attendu et l’égalité entre `iframe.src` et le document chargé.
- `serialization-chromium-preview.log`, `serialization-firefox-preview.log`, `serialization-webkit-preview.log` : **8/8 par moteur, aucun skip**. Les contrôles existants de hauteur, sécurité, messages forgés et mesure prématurée restent actifs.
- `serialization-MOTEUR-boundary-final.log` : rejeu du scénario de rafale après renforcement du témoin de mesure native et ajout d’un rendu invalide. Quarante demandes ne produisent que deux blobs ; les deux anciennes URL sont révoquées via l’API native ; seule l’URL courante reste vivante. Le dernier document est chargé, y compris lorsque les vrais messages de mesure sont arrêtés à la frontière navigateur.

Ce dernier scénario compte uniquement les événements natifs (`isTrusted`) pour prouver que les mesures ont effectivement été interceptées. L’événement synthétique utilisé pour vérifier le rejet prématuré ne peut pas satisfaire ce témoin.

Fichiers supplémentaires de cette tranche : `app/source/preview.js`, scénario ajouté dans `tests/preview-size-browser.test.cjs`, distributions app générées et preuves ci-dessus. `preview-contract.test.cjs` est exécuté mais reste inchangé. Les tests d’intégration de frappe, de restauration et d’intitulés appartiennent au lot parcours ; aucune matrice globale n’a été lancée par ce lot.

Limites : moteurs Playwright automatisés, pas Safari natif ni recette de messagerie. La campagne intégrée et la revue finale restent à la racine ; le nouvel état ne réutilise pas le verdict de l’ancien audit natif.
