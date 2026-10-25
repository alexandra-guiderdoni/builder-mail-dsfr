# #145 — résultat de l’étude locale CPU4

**Trois replays, trois réussites ; arrêt à la borne prévue.** Aucun échec primaire ni événement de panne n’a été capturé. Les hypothèses consignées avant l’essai dans `NOTE-AVANT-ESSAI.md` restent non départagées ; aucune variante supplémentaire n’a été lancée.

Commande effectivement exécutée depuis la racine du worktree `builder-six-restants-20261025` :

```sh
sh docs/goal-six-issues-20261025/investigations/timeouts/local-cpu-study/run-local.sh
```

Le script fixe `EXPORT_REPLAYS=3`, sélectionne uniquement le scénario « noms des fichiers exportés, trois types d’export (Chromium) » et conserve le TAP intégral dans `cpu4.log`. Résultat : **3 pass, 0 fail, 0 skip, 0 annulation**, code0, durée totale 17.569s ; cas individuels 6.045s, 5.712s, 5.638s. Début/fin UTC dans `started-at.txt` et `finished-at.txt`.

Environnement vérifié : macOS/Darwin25.5.0 arm64, Node24.18.0, Playwright1.64.1, Chromium156.0.8078.4 existant. La fixture enrichie est celle de `ce1768f2798454326ed1687c37aaf05aa34c8d0d`, appliquée aux sources historiques `eadd426befeb39a6e68a14342f9c1a66102ac81d`. CDP reçoit `Emulation.setCPUThrottlingRate` avec `rate:4` dans le callback `beforeNavigate` de chaque page du scénario ; son appel est attendu avant la navigation. C’est un stress CPU contrôlé, pas un délai de confirmation ou d’événement injecté.

`cpu-only.diff` montre l’unique delta du parcours enrichi : remplacement du callback de date par celui qui configure CPU4 puis fixe la même date. La restitution des sources historiques après retrait des seuls ajouts déclarés a été vérifiée ; toutes les assertions et attentes restent intactes, la distribution est byte-identique. Les empreintes après exécution sont inchangées (`source-proof.json`, `RECU-SHA256.json`). Copies de travail et helper isolés sous ce dossier et ignorés par Git ; aucune source main ni branche diagnostique modifiée, aucune installation.

La comparaison réutilise les témoins antérieurs sans les rejouer : `../export-historical-full.log` (**1/1**) et `../export-traced-local.log` (**5/5**), avec leurs sources et commandes rappelées dans la note préalable. Leur environnement et leur chronologie diffèrent : **aucun contrôle causal simultané** n’est revendiqué. La collecte ne publie la trace qu’en cas d’échec ; son absence ici ne renseigne pas les étapes internes d’un parcours réussi.

Cette non-reproduction locale sous CPU4 ne réfute pas les trois échecs CI du run40213294190 et n’établit aucune cause de l’incident originel. Aucune correction, publication, nouvelle CI ou clôture. La prochaine information utile reste l’erreur primaire d’un nouvel échec, pas une autre variante locale lancée sans résultat discriminant.
