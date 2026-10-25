# Reprise des six issues — preuves et portée de publication

État préparé depuis `main` au SHA `f3aa8324dbcd255bddafeeb2eec559e698f6065c`, avant la publication du correctif #145. **#142 est clôturée ; #145 dispose d’un GO Astra pour une mitigation ciblée. Les autres issues restent ouvertes et le goal n’est pas achevé.**

| Issue | Résultat et limite |
| --- | --- |
| #13 / #52 | Aucun poste cible disponible, confirmé par l’utilisateur. Essais Outlook/Mélissa **NOT_EXECUTED** ; blocage consigné dans chaque issue. Aucun courriel envoyé. |
| #130 | Rejeu GitHub Ubuntu 26 x64 : original 3/3, instrumenté naturel 3/3 ; contrôle négatif rouge exact. Mêmes métadonnées `Set up job`, mais désaccord avec la variable `ImageVersion` du rejeu ; aucune différence d’image ni cause spontanée démontrée. [Sources et correction](investigations/130/REJEU-GITHUB.md). |
| #142 | Reproduction native WebKit et comparateur limité à `preview.js` confirment le correctif déjà publié. [Revue Astra](review-142.md). Le locator historique perdu n’est pas réinventé. |
| #145 | Deux reproductions Linux avec clic natif reçu dans l’iframe à la place de la confirmation. Paire R1 exacte : témoin rouge au troisième parcours, comparateur CSS **30/30 et 810 téléchargements**. Quatre fichiers produit seulement ; helpers, confirmations et timeouts intacts. Validation locale **397/397**, 36 cas ciblés et rejeu indépendant **10/10**. [Preuves et limites](investigations/145-confirmation/LISEZ-MOI.md), [GO indépendant](investigations/145-confirmation/REVUE-INDEPENDANTE.md). La CI du commit publié reste à vérifier. |
| #149 | Source de propriété locale corrigée ; SIGINT natif encore non résolu. Paquet dormant R3 installé après accord utilisateur : **165 fichiers vérifiés**, gate navigateur fermé. Premier tour de métadonnées non qualifiant : `PLUGIN_DATA` absent et ticket non injecté. Confiance native inconnue ; **1/2 tour consommé**, aucun navigateur. [Reçu distinct](investigations/149-installation/RESULTAT.md). |

## Limite conservée : fond modal

Un nouveau scénario expérimental a observé un message de clic supplémentaire dans l’aperçu : deux rouges et deux verts, sans attribution causale suffisante. Aucun témoin sans CSS ne permet d’y établir une régression ; aucun défaut d’instrumentation n’est prouvé. Les trois sources exactes et les quatre journaux restent [conservés avec leurs SHA](investigations/145-confirmation/fond-modal/INVESTIGATION.md). Ce suivi **INCONNU** doit rester distinct de la mitigation du clic de confirmation. Aucun vert ne le clôture et aucune garantie universelle d’étanchéité du fond modal n’est revendiquée.

Le test expérimental non suivi a été copié et confronté à son archive avant retrait de son seul original de `tests/`. Aucun test permanent, helper, assertion existante ou délai fonctionnel n’est modifié. La suite publiée reste de 397 tests. La répartition effective des 36 cas ciblés est détaillée dans le reçu : 13 Chromium, 19 WebKit et 4 Firefox ; les noms de configuration ne deviennent pas artificiellement des preuves de 12 tests natifs par moteur.

## CI et publication

Les preuves de #142 sont publiées au SHA `7c78822872b8e159fd884836828d5b7ce3f75544` : [CI 40213203335](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40213203335), **397/397**, tests et Pages réussis. Le diagnostic suivant au SHA `f3aa8324dbcd255bddafeeb2eec559e698f6065c` échoue : [CI 40216251444](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40216251444), **396/397**, Pages ignoré. [Diagnostic et comptes extraits](ci-main-f3aa832.json). L’ancien vert ne valide pas ce commit ni la présente publication.

Le nouveau commit intégrant la mitigation doit être qualifié par sa propre CI ; le verdict final et son SHA doivent être consignés dans l’issue #145 après vérification. Les workflows manuels des branches `diag/issue-130-forensic`, `diag/issue-145-forensic` et `diag/issue-145-confirmation-causal` ne doivent pas être fusionnés dans `main` et ne déploient pas le produit.

Le premier comparatif CSS, 30/30 vert de chaque côté, reste explicitement une non-reproduction. La paire concluante suivante réemploie l’observateur R1 byte-identique au rouge précédent. Elle soutient la mitigation du mécanisme capturé, sans prouver le défaut interne Chromium ni attribuer toutes les anciennes occurrences à la même cause. Les preuves brutes sont archivées hors checkout avec leurs empreintes ; seules les pièces sélectionnées sont versionnées ici.

## Installation ShipGuard et limites

Le parent conserve le commit **local, non poussé** `f010bf260` de la source maintenue du générateur et du patch de propriété. La publication du builder ne vaut pas mandat de push du parent. Les travaux concurrents de ce dépôt ont été préservés ; il n’est pas déclaré propre.

R3 `2.18.0+codex.local-20261025-lease-probe-2` conserve les trois documents visual-run de propriété déjà adaptés et ajoute la couche dormante revue. Manifeste préparatoire : `b558aa8fc1e6f5d01a42befe08a3c07c3d84b18e9d971ffebd006c3a5069bf18`, **68 tests**. L’installation CLI, la confiance et l’exécution des hooks sont des preuves séparées. Le premier tour CLI éphémère ne prouve ni réécriture ni événements de hooks ; un message d’erreur moteur initial a été filtré, limite conservée sans lui inventer de cause. L’utilisateur ne voit aucune demande d’approbation. L’outil de pilotage refuse l’accès à l’application Codex pour des raisons de sécurité ; aucune autre voie UI n’a été utilisée.

Aucune variable de raccord n’est injectée, aucun état de confiance n’est édité et aucun navigateur n’est alloué par cette qualification. Le second tour reste en réserve. Le cache, la configuration Codex, les réglages Claude et le marketplace ont été contrôlés après le tour ; le contrat `adapter_root` n’a pas été modifié implicitement. L’autre Mac et Claude natif restent hors qualification. Le retour local est documenté et n’a pas été exécuté.

Le skill de contribution newsletter demeure inchangé.
