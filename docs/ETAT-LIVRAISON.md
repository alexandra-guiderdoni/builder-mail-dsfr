# État de livraison au 1er novembre 2026

Ce bilan concerne le code livré au commit `cbe93e3207d9ef94fc6940a99a7d0aa486e331cb`. Il consolide les résultats vérifiés ; les reçus et rapports datés conservent leur SHA et leur périmètre d’origine.

## Livraison et validation

- Code commité et poussé sur `main` ; référence distante et arbre local propre vérifiés avant cette actualisation documentaire.
- [CI 40842375729](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40842375729) réussie sur ce SHA : **606 tests, 606 réussites, zéro échec et zéro test ignoré**, Node.js **24.22.1**. Le journal brut a été relu le 1er novembre. Ce résultat n’est pas une nouvelle exécution locale de la suite.
- La [livraison précédente 2829a9b](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/commit/2829a9beb0a892f334af37e462f715ec196395ae) avait 602 tests réussis ; ses huit fichiers publics avaient été comparés octet pour octet aux distributions. Cette comparaison ne vaut pas vérification des huit fichiers du correctif `cbe93e3`.
- Le dernier correctif empêche qu’un résultat de chargement d’image distante recrée un brouillon après annulation. Quatre tests de régression ont été ajoutés ; les 33 tests ciblés, dont Chromium et WebKit, ainsi que le build et les contrôles de distributions ont passé avant le commit. La nouvelle contre-revue Claude demandée pour ce SHA n’a pas été transmise dans cette session.

## Fonctionnalités et investigations livrées

- **#191 : poids du courriel.** Mesure du HTML préparé pour la copie ou le téléchargement, répartition par catégorie et conseils préservant les logos. Le poids du HTML réellement reçu reste inconnu ; aucun seuil local n’a été relevé pour masquer une alerte.
- **#192 : images HTTPS.** Les 24 champs image proposent une adresse HTTPS directe en complément de l’import local. Le repli local reste conservé. Les références distantes utilisent un format v2 explicite ; les fichiers entièrement locaux restent v1. Les hébergeurs reçoivent des requêtes ; disponibilité hors connexion, archivage, poids distant et réception ne sont pas garantis.
- **#193 : récupération des anciennes URL abrégées.** Secours brut et correction explicite avant restauration, sans normalisation silencieuse ni écriture au démarrage.
- **#190 : propriété des navigateurs de recette.** Garde documentaire installé dans le skill VoiceOver partagé Claude/Codex, hors du dépôt builder. Les essais contrôlés ne garantissent pas le nettoyage après interruption brutale.
- **#179 : zoom Firefox.** 200 % observé dans l’interface native, témoin négatif et retour à 100 %. La recette native complète de reflow n’est pas revendiquée ; l’oracle relatif conserve son résultat non concluant.
- **#188 : annonces VoiceOver.** Cas natifs ciblés exercés ; la répétition strictement identique de l’erreur globale reste **non confirmée**, sans preuve de son absence ni conclusion de conformité générale.
- **#173 : clic après modale.** Investigation clôturée avec cause historique **inconnue et bornée** ; diagnostic enrichi sans modifier le geste ni affaiblir le test. La CI verte n’explique pas cet échec ancien.

Le [bilan détaillé des cinq tickets](qualification/backlog-cinq-20261028/ETAT.md) et son [reçu natif](qualification/backlog-cinq-20261028/NATIF.json) précisent les environnements et les limites. La session native y chargeait `404b817` : ne pas la présenter comme une recette native complète du dernier SHA.

## Backlog GitHub et qualifications restantes

Deux issues seulement sont ouvertes au contrôle du 1er novembre, toutes deux marquées « reporté » :

- [#13 — transport et réception réels Outlook/Mélissa](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/13).
- [#52 — compatibilité Outlook classique Windows](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/52).

Leur qualification demande le poste cible et un opérateur habilité. Les réceptions historiques sur Mac ne prouvent pas le rendu de cette version ni celui des images distantes. Aucun envoi n’est exécuté par le builder.

L’absence d’autres tickets ouverts ne signifie pas que toutes les exigences sont démontrées : conformité RGAA exhaustive, lecteur d’écran retenu sur le parc, accès et installation depuis le parc restent à qualifier. Les rapports d’accessibilité datés et leurs matrices 106 critères / 258 tests ne sont pas réécrits comme des preuves de la version actuelle. Aucun GO global pour la chaîne de messagerie ne découle de ce bilan.

## Documents de référence

- [Spécification](../SPECIFICATION.md) et [cadrage / décision complémentaire #192](cadrage-source.md#décision-complémentaire-du-28-octobre-2026--192).
- [Utilisation](UTILISATION.md), [format JSON v1/v2](FORMAT-JSON.md), [maintenance](MAINTENANCE.md).
- [Historique des livraisons](../CHANGELOG.md), [suivi applicatif](SUIVI-APPLICATION.md), [corrections historiques](SUIVI-CORRECTIONS.md), [recettes historiques](RECETTE-APPLICATION.md).
