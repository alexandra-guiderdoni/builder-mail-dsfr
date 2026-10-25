# #150 — Clic complet et appui partiel derrière une modale

**Investigation ouverte, aucun correctif validé.** Ces pièces montrent que le compteur de clics seul ne suffit pas à qualifier l’exclusion des entrées vers l’iframe. Elles ne prouvent pas la cause interne Chromium ou Playwright.

## Deux observations natives conservées

| Pièce | Annuler : avant / sous modale / après | Confirmer : avant / sous modale / après | Observation décisive |
|---|---|---|---|
| [R3](result-r3.json), geste `mouse.click` | 1 / 1 / 2 | 3 / 4 / 5 | Clic enfant complet enregistré aux lignes 23–27 |
| [R5](result-r5.json), `move`, `down`, `up` attendus séparément | 1 / 1 / 2 | 3 / 3 / 4 | Appui enfant aux lignes 23–24, relâchement parent aux lignes 25–26 |

Dans R5, `finding.routingObserved=false` est le résultat exact du prédicat historique : le compteur enfant n’augmente pas sous la modale. Pourtant, `pointerdown` et `mousedown` sont enregistrés dans l’enfant sur `BUTTON#target` à 630/532 ; `pointerup` et `mouseup` sont enregistrés sur le dialogue parent à 1365/990. Aucun clic enfant complet de fond n’est enregistré. À l’annulation, la séquence complète est enregistrée sur le dialogue parent, lignes 7–11.

Les coordonnées enfant sont compatibles avec la translation du point parent par le rectangle de l’iframe. Il manque un identifiant transversal pour certifier une identité physique commune des événements. Pour l’enfant, la modalité est celle du parent **à réception du message**, pas une preuve de son état à l’instant du dispatch enfant. `isTrusted` ne prouve pas une souris humaine.

Les contrôles positifs avant/après fermeture restent présents. Les clics enfant sont réconciliés avec le compteur parent et le dernier ACK enfant : cinq pour R3, quatre pour R5. Aucun dépassement déclaré, aucune erreur primaire ou de fermeture. Les ACK comptent les clics ; ils ne certifient pas la complétude de toutes les autres familles d’événements.

## Sources et périmètre

Les deux résultats et les scripts sont des copies exactes des pièces exécutées le 25 octobre 2026 sur macOS, Playwright 1.64.1 et Chromium 156.0.8078.4. Les fixtures HTML et le contrat sont identiques entre R3 et R5 ; seul le geste de fond change dans les runners. Les noms des runners ont été adaptés pour les conserver côte à côte, sans changer leur contenu. Les SHA sont dans [SHA256.json](SHA256.json).

<!-- PDG-LARGE-FILE-JUSTIFICATION: result-r3.json et result-r5.json dépassent 200 lignes car ce sont des traces natives intégrales, conservées à l’octet pour permettre une vérification indépendante ; les découper altérerait leurs empreintes. -->

Cette page minimale synthétique utilise un document enfant `blob:null`, une modale native, `pointer-events: none`, un instantané DOM intrusif et des échanges ACK. Elle n’utilise pas le builder complet. Elle reproduit un symptôme automatisé ; elle ne prouve ni processus séparé pour l’iframe ni comportement humain physique. Les observations sont des runs distincts, sans comparaison randomisée concomitante. Le mouvement public et `mouse.click` diffèrent aussi par DragManager, leurs transactions et leur instrumentation : aucune causalité unique d’ordonnancement n’est établie.

Les [revues R3](revue-minimal-r3.md) et [R5](revue-native-r5.md) sont conservées intégralement. Elles référencent aussi des pièces locales plus larges, absentes de ce sous-ensemble publié. Les traces app de ces revues ne sont pas incluses ici et ne doivent pas être déduites des seuls fichiers minimaux.

## Vérification sans navigateur

Depuis ce dossier :

```sh
node --test reconcile.test.cjs
node -e 'const fs=require("node:fs"),a=require("node:assert/strict"),{verdict}=require("./contract.cjs");for(const n of ["r3","r5"]){const r=JSON.parse(fs.readFileSync(`result-${n}.json`));a.deepEqual(verdict(r.cycles,r.trace),r.finding);console.log(n,r.finding)}'
```

Les scripts `run-r3.cjs` et `run-r5.cjs` ne s’exécutent pas à l’import. Leur invocation explicite exige `--run-once` et un dossier de sortie inexistant ; elle lance un nouveau navigateur. Leur chemin Playwright absolu historique est conservé comme preuve. **Aucun nouveau run depuis ce dossier publié n’a été effectué** : son URL file diffère de celle des observations originales. Le dépôt n’ajoute aucun lancement à la CI et ne modifie aucun test produit.

La séquence publique R5 ne peut pas être promue comme remédiation malgré son compteur stable. [Suivi de l’investigation](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/150#issuecomment-6403648212).
