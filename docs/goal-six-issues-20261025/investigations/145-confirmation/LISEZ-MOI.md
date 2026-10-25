# Confirmation de téléchargement — sélection des preuves

L’issue #145 reste ouverte. Cette sélection distingue trois observations :

- La CI de `main` `f3aa832` (run 40216251444) échoue après retour de l’action de confirmation, sans téléchargement.
- Le [rejeu réduit 40219553464](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40219553464) capture un événement de souris natif (`isTrusted`) reçu dans l’iframe d’aperçu au lieu de la confirmation. Le bouton conserve son identité ; le modal reste ouvert jusqu’au timeout de téléchargement. [Analyse](github-40219553464/RESULTAT.md).
- Le [comparatif CSS 40221156125](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40221156125) réussit 30/30 dans chaque bras : **non-reproduction, aucune preuve de correction**. [Analyse et limites](github-40221156125/RESULTAT.md).

Le delta du comparateur se limite à `body:has(#check-dialog[open]) #preview { pointer-events: none; }` et les trois dérivés du build. Ni scripts, CSP, helpers, nom de fixture ni timeout fonctionnel ne changent. Cette règle et ses trois dérivés constituent la mitigation produit soumise à publication, après la paire discriminante suivante et la revue indépendante.

La nouvelle instrumentation du premier comparatif peut influencer le timing ; cet effet n’est pas démontré. La paire suivante réemploie les scripts R1 exactement identiques au rouge précédent : [run 40221895564](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40221895564). Le témoin échoue au troisième parcours (deux verts, un rouge persistant, cinq événements souris reçus dans l’iframe, 63 téléchargements sur 64 exports) ; le comparateur réussit 30/30 et 810 téléchargements. [Validation et périmètre](github-40221895564/FIX-VALIDATION.md), [SHA](github-40221895564/FIX-RECEIPT.json), [GO indépendant](REVUE-INDEPENDANTE.md). Cette paire soutient la mitigation du clic de confirmation ; elle ne prouve ni le défaut interne Chromium ni toutes les causes historiques. Aucune nouvelle paire n’a été lancée.

## Conservation

Les analyses, résumés et reçus sélectionnés sont versionnés ici. Les rapports originaux sont conservés sans réécriture : leurs chemins de payload et scripts désignent leur dossier de collecte complet, **pas des fichiers tous inclus dans cette sélection**. Les deux dossiers complets sont archivés hors du checkout dans `/Users/alex/Claude-worktrees/builder-goal-six-raw-20261025-v1/145-collected-runs/`. `ARCHIVE-SHA256.json` donne l’inventaire et les SHA confrontés après copie, ainsi que les fichiers sélectionnés. Les reçus d’origine conservent leur provenance et leurs empreintes.

Les workflows de diagnostic sont manuels, sans déploiement, sur `diag/issue-145-confirmation-causal`. Ils ne doivent pas être fusionnés dans `main`. Les artefacts GitHub ont une rétention de sept jours ; l’archive locale conserve les preuves au-delà de cette rétention. Aucun navigateur personnel n’est utilisé.

## Contre-signal distinct

Le [fond modal reste non qualifié](fond-modal/INVESTIGATION.md) : deux rouges et deux verts d’un test expérimental sont conservés, sans attribution à une régression CSS ni à un défaut d’instrumentation. La publication ciblée de #145 n’en promet pas la résolution. Aucun test permanent n’est retiré ou affaibli. La suite existante passe 397/397 localement, les contrats ciblés 36/36 et le rejeu indépendant 10/10 ; la CI du commit publié doit encore être vérifiée.

Pour le dernier run, les bruts natifs et les 613 fichiers de validation se trouvent dans `/Users/alex/Claude-worktrees/builder-goal-six-raw-20261025-v1/40221895564/`. Les deux manifestes et leurs SHA sont référencés par `github-40221895564/FIX-RECEIPT.json`. Les rapports d’auteur gardent leur statut daté antérieur à la revue ; le GO ultérieur figure dans `REVUE-INDEPENDANTE.md`.
