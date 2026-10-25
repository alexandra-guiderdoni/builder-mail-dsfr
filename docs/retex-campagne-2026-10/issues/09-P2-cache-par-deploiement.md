# [P2] Isoler le cache hors connexion par déploiement et limiter les requêtes interceptées

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **suppression confirmée par simulation T06_SW_OTHER_DEPLOYMENT_DELETED ; impact conditionné à une même origine**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Le worker supprime tous les caches commençant par `builder-mail-prototype-`, quel que soit le chemin de déploiement. Deux variantes hébergées sous une même origine peuvent perdre leur cache réciproquement. Le gestionnaire fetch cherche aussi dans tous les caches via `caches.match` et intercepte tout GET de même origine.

## Reproduction

1. Préparer deux déploiements distincts sous `/a/` et `/b/` sur la même origine, avec des versions différentes.
2. Installer et activer le worker de A et conserver son cache.
3. Activer le worker de B.
4. Inspecter CacheStorage puis recharger A hors connexion.

**Résultat actuel :** La boucle d’activation de B supprime le cache de A si son nom diffère du cache courant. La suppression a été reproduite dans un inventaire de cache simulé ; la panne navigateur hors connexion reste à confirmer.

**Résultat attendu :** Chaque déploiement entretient et utilise uniquement ses propres ressources.

## Correction recommandée

Inclure une identité stable du déploiement ou du scope dans le namespace du cache. Nettoyer seulement les anciennes versions de ce namespace. Ouvrir explicitement le cache courant et limiter les interceptions à la stratégie voulue dans le scope ; tester les URL de démarrage retenues.

## Critères d’acceptation

- [ ] Activer B ne supprime pas le cache de A.
- [ ] Une mise à jour de A supprime seulement les anciennes versions de A au moment approprié.
- [ ] Les ressources d’autres applications de la même origine ne sont pas servies depuis un cache quelconque.
- [ ] Les deux déploiements conservent leur parcours hors connexion après activation de l’autre.

## Tests à ajouter

Test de la politique de noms et recette navigateur avec deux scopes, deux versions et réseau coupé. L’installation unique ne suffit pas à reproduire cette précondition.

## Références précises

- [prototype/source/sw.js, lignes 2 à 12](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/sw.js#L2-L12)
- [scripts/build.py, lignes 57 à 57](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L57-L57)

## Périmètre

Correction utile si plusieurs déploiements partagent une origine. Dans un hébergement unique isolé, ce point peut être différé en P3. Aucun backend de données à ajouter.
