# Six issues restantes — mission du 25 octobre 2026

## Objectif

Prendre en charge #13, #52, #130, #142, #145 et #149 avec ShipGuard : produire des conclusions vérifiables, corriger les défauts démontrés et clôturer seulement les points dont les critères sont satisfaits. Base du builder : `79c999cc00e8a317e71aa6f91c3bb357b5537741`.

## Contraintes

- Delta strict : préserver les comportements non concernés, travaux concurrents, profils et sessions. Aucun nettoyage global de navigateur.
- #13/#52 : aucun poste cible Windows/Outlook/Mélissa disponible, confirmé par l’utilisateur. Essais clients **NOT_EXECUTED**, issues ouvertes ; aucun envoi de courriel.
- #130/#142/#145 : distinguer archives, reproduction native, contrôle injecté et non-reproduction bornée. Aucun correctif spéculatif ni hausse arbitraire de délai.
- #149 : intégrer la correction dans la source locale maintenue de l’adaptateur ; sources tierces et caches générés en lecture seule. Toute activation passe par le mécanisme natif et ses approbations.
- Le mandat de publication sur `main` concerne le builder. Il ne vaut pas autorisation de publier le dépôt parent du harnais.
- Le skill de contribution newsletter reste inchangé, conformément au report demandé.

## Preuves de réussite

Pour chaque issue : observations, commande reproductible, résultat, limites et verdict indépendant Astra lorsqu’un correctif ou une clôture est proposé. Pour un correctif : défaut rouge avant, contrôle pertinent vert après, absence de régression dans le périmètre. Pour une publication : diff explicite, SHA local/distant et arbre propre. Les essais hors environnement cible ne valent pas qualification Outlook/Mélissa ; un rejeu vert ne prouve pas la cause d’un incident historique.

## État confirmé

Le backlog précédent a laissé exactement ces six issues ouvertes. #142 dispose désormais d’une reproduction native et d’un comparateur ne changeant que `preview.js` ; revue indépendante en cours. #130 attend un rejeu forensic GitHub Ubuntu 26 x64, sans déploiement. #145 reste sans cause attribuable. #149 est développé dans un worktree séparé du harnais, sans activation implicite.
