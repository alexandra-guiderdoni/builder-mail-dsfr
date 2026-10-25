# H3b — Une lecture synchrone du layout ne supprime pas le blocage

Six essais terminés : **A original 1 vert / 2 blocages**, **D avec lecture du layout 1 vert / 2 blocages**. Les deux échecs D restent dans les decode originales, après l’exécution de la lecture synchrone. Cette instruction seule est donc insuffisante ; aucun correctif n’est appliqué.

## Variable unique

A est identique octet pour octet au témoin parallèle H1, SHA256 `65be6e8e4d4637843d944b87c7230d7f7d2b65500ba108ca37efe4a5448bca5b`. Il ne reçoit ni garde `readyState=complete` supplémentaire, ni lecture géométrique, ni scroll. D, SHA256 `7b3691cff1da333d2729f68f057335bc2ea28ef0f3c66059c948873c4ea2bc5e`, ajoute seulement :

```js
document.body.getBoundingClientRect();
```

L’instruction se trouve immédiatement avant le `Promise.all` des 24 decode. Les jalons, la liste statique des images, les lectures de dimensions naturelles, les appels natifs, la gestion des rejets, les fontes et les assertions sont identiques. `A-to-D.diff` consigne ce seul delta.

## Résultats observés

| Essai | Variante | Résultat | Decode résolues avant arrêt |
|---:|---|---|---|
| 1 | A | Vert, code 0 | 24 portable et 24 web ; fontes terminées |
| 2 | D | Vert, code 0 | 24 portable et 24 web ; fontes terminées |
| 3 | A | Borne 15 s, code 143 | Indice 0 ; 1–23 en attente |
| 4 | D | Borne 15 s, code 143 | Indice 0 ; 1–23 en attente |
| 5 | A | Borne 15 s, code 143 | Indices 0–1 ; 2–23 en attente |
| 6 | D | Borne 15 s, code 143 | Indice 0 ; 1–23 en attente |

Les rouges concernent la composition portable initiale. Les 24 appels decode sont effectivement lancés après l’instruction de D ; leurs événements de début prouvent qu’elle a retourné. Les images sont complètes, connectées et avec dimensions naturelles positives à l’appel. Aucun rejet n’est enregistré et les fontes ne sont pas atteintes. Le témoin A est discriminant dans cette série.

## Arrêt et portée

Chaque essai emploie un conteneur neuf, même snapshot de 344 fichiers, Node officiel 24.18.0, image Linux Playwright et restrictions habituelles. La borne hôte de 15 secondes commence après préparation. Aucun inspecteur, seconde promesse ou commande de secours n’est lancé. Tous les conteneurs sont supprimés et les 344 empreintes source restent inchangées.

La règle initiale prévoyait un arrêt après deux rouges D, ou 20 essais/300 secondes. La racine a ensuite demandé de ne pas poursuivre au-delà de l’essai possédé courant dès le premier contre-exemple suffisant. D6 était déjà en cours et a atteint sa borne ; la règle automatique a arrêté la campagne sans septième lancement.

La lecture du layout est insuffisante, comme le passage séquentiel H1. H3 avec scroll reste non concluante faute de témoin A rouge dans cette autre série. La cause interne des promesses pendantes demeure inconnue ; aucune innocence du produit ni explication unique du navigateur n’est déduite. Aucun patch suivi ni gate global supplémentaire.

## Preuves

`variants.json`, `A-to-D.diff`, `analysis.json`, les journaux et reçus de `trial-01-A/` à `trial-06-D/`, et `campaign-receipt.json` conservent les copies, SHA, étapes, codes et suppression. Commande exécutée : `python3 docs/prise-en-charge-backlog-20261025/parcours/linux/run-preview-h3b-bounded.py`.
