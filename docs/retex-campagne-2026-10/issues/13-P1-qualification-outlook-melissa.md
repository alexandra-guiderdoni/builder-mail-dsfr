# [P1] Qualifier le transport réel du courriel et des images dans Outlook et Mélissa

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P1**
Preuve : **risque non vérifié sur les messageries cibles ; issue de qualification, pas défaut confirmé**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Le rendu exporte des images en URL `data:` et la copie fournit `text/html` et `text/plain`. Leur présence dans les fichiers et le presse-papiers ne démontre pas leur conservation après collage, retouche, envoi et réception. La documentation expose déjà cette limite ; aucune panne Outlook ou Mélissa n’a été reproduite par la revue.

## Reproduction

1. Relever les versions de Windows, Firefox, Outlook classique/nouveau et le navigateur/moteur effectivement utilisés pour Mélissa.
2. Préparer un courriel synthétique avec Marianne, image PNG, image JPEG, paragraphes et action HTTPS.
3. Tester séparément copie/collage et insertion du HTML selon le parcours réellement supporté.
4. Avec un opérateur autorisé, retoucher, envoyer et relire le message reçu ; comparer images disponibles/bloquées, liens, textes et alternatives.
5. Conserver un reçu de recette expurgé et, lorsque possible, les parties MIME du message de test.

**Résultat actuel :** Compatibilité de ces parcours non qualifiée ; le dépôt ne prétend pas qu’elle l’est.

**Résultat attendu :** Une matrice de versions et de parcours indique précisément ce qui fonctionne et les limites restantes.

## Correction recommandée

Commencer par la recette réelle. Si le transport des images échoue, choisir ensuite une stratégie compatible avec le parc, par exemple une sortie MIME avec images CID si le parcours d’insertion la supporte. Ne pas imposer un backend, un hébergement d’images ni une refonte avant la preuve. La publication Microsoft sur les images inline décrit des identifiants CID, sans certifier le collage de ce prototype : https://devblogs.microsoft.com/microsoft365dev/changes-to-inline-images-in-outlook/ . Les données primaires Can I email distinguent les versions : https://github.com/hteumeuleu/caniemail/blob/main/_features/image-base64.md .

## Critères d’acceptation

- [ ] Les versions testées et les parcours exacts sont consignés, sans verdict « Outlook compatible » générique.
- [ ] Les images et alternatives restent correctes après collage, retouche et réception, ou une limite précise est documentée.
- [ ] Les liens et l’ordre de lecture restent cohérents ; tester au clavier et avec le lecteur d’écran retenu.
- [ ] PNG et JPEG sont testés séparément, ainsi que les images bloquées.
- [ ] La copie de texte reste exploitable et le HTML autonome hors navigateur ne devient pas une preuve de compatibilité mail.
- [ ] Tout défaut observé fait l’objet d’une correction ciblée accompagnée de sa preuve.

## Tests à ajouter

Recette opérateur sur les postes cibles. Aucun accès à une boîte ni envoi automatique n’est autorisé par cette issue seule ; organiser les essais avec les personnes habilitées.

## Références précises

- [prototype/source/render-mail.js, lignes 12 à 22](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/render-mail.js#L12-L22)
- [prototype/source/editor.js, lignes 93 à 98](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L93-L98)
- [docs/RECETTE.md, lignes 64 à 83](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/docs/RECETTE.md#L64-L83)

## Périmètre

Précondition à une utilisation métier annoncée, pas à la conservation du prototype. Aucun envoi ni manipulation de messagerie n’a été réalisé pendant la revue.
