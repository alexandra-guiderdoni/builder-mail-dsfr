# Rouge natif confirmé : le clic de confirmation atteint preview

Le [run 40219553464](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40219553464) s’arrête au **deuxième parcours, sixième contexte**, sur `Eté` (quatre unités UTF-16). Un parcours complet est vert, puis le défaut persiste après le timeout download original de 30 s. **43 exports tentés, 42 téléchargements, un suspect, un rouge persistant, aucun ACK transitoire.** Aucun autre job n’a été lancé.

## Provenance vérifiée

Source applicative **f3aa8324dbcd255bddafeeb2eec559e698f6065c**, harnais **4249c2f2ec091526e1413bc70b39917c5e6e845e**. Les SHA des deux modules de diagnostic, du helper original et du portable correspondent au reçu préparatoire. Les sept fichiers téléchargés ont été hachés et relus. Node **v24.18.0**, Playwright **1.64.1**, Chromium **156.0.8078.4**, Ubuntu **26.04/x86_64**.

Les métadonnées d’image ne concordent pas entièrement : `host-145.json` relève l’environnement `ImageVersion=20261023.163.3`, tandis que la section « Set up job » annonce `20261012.163.1`. La récupération directe des logs du job 121247937675 confirme cette seconde valeur. Les deux pièces sont conservées ; aucune explication par image n’est déduite de cette divergence.

Commandes exécutées, en lecture seule : `collect.py` consulte le run puis télécharge logs/artefacts une fois terminé ; `analyse.py` vérifie les empreintes et les invariants. Le verdict vérifié est dans `verified-summary.json`, les lignes comparables dans `comparison-timeline.json`. Les sources, tests/helpers et workflow suivis du worktree restent intacts.

## Enchaînement observé

Les temps Node ci-dessous sont relatifs à l’entrée dans confirmChecks. Ils ne sont pas obtenus en sommant des origines virtuelles.

| Observation | Temps ou état |
|---|---|
| Dernière navigation blob de preview reçue côté Node | environ −34 ms ; ce n’est pas une preuve de fin de chargement |
| Titre du dialogue focalisé, dialogue ouvert | bouton UID1, rectangle x653/y1303/228×40, hors viewport |
| À +72 ms | preview reçoit pointerdown et mousedown **trusted**, cible `TD` |
| À +73 ms | preview reçoit window-focus, pointerup, mouseup et click **trusted**, cible `TD` |
| Retour de confirmChecks | +74 ms, sans événement de confirmation dans le document principal |
| Snapshot suivant | dialogue toujours ouvert, focus preview, bouton UID1 à x653/y837/228×40 |
| Après environ 30 004 ms depuis le début d’attente download | même dialogue ouvert, aucun click #check-confirm ni submit, TimeoutError download primaire conservé |

L’URL des six événements de frame est **exactement** celle de `previewSrc` dans les snapshots. Ce n’est donc plus seulement une déduction à partir du focus final : le geste down/up/click est effectivement observé dans l’aperçu. `isTrusted` est la valeur fournie par Chromium lors d’une entrée Playwright/CDP ; cela ne constitue pas une preuve d’interaction matérielle ni de GUI humaine.

La capture PNG après timeout montre le dialogue et son backdrop toujours visibles, le bouton de confirmation dans le viewport et l’aperçu derrière. Les logs ne montrent pas de remplacement du bouton : UID1 reste connecté. Le passage y1303→837 se produit aussi sur les deux comparateurs verts relus (même nom au premier parcours, et contexte précédent du parcours rouge). Le scroll seul n’est donc pas une condition suffisante du défaut.

Les noms longs de 300 emojis et le neuvième contexte **ne sont pas nécessaires à cette occurrence**. L’influence éventuelle des contextes précédents reste non minimisée.

## Ce qui reste inconnu

La cause interne de la mauvaise destination d’input — routage de surface/iframe, état du hit-test après scroll/paint/navigation, ou autre interaction Chromium/Playwright — n’est pas démontrée. Aucune attribution définitive au navigateur n’est faite.

Les payloads iframe de ce run ne contiennent pas clientX/Y : on ne peut pas affirmer que le TD a reçu exactement le point (767,857), centre du bouton observé dans les verts. Le document principal ne reçoit aucun down/up de confirmation ; ses dernières positions de souris conservées restent (800,809). Ne pas substituer ces positions au point effectif du clic de frame.

Les timeOrigin sont virtuels avec setFixedTime. Le document principal est raccordé à Node par l’intervalle de son snapshot ; les événements iframe sont situés par leur réception Node. Leurs compteurs performance.now ne sont pas soustraits aux compteurs d’un autre document. L’absence d’un frameStoppedLoading blob dans le canal CDP principal ne prouve pas que cette frame isolée n’a pas chargé.

## Une contre-épreuve proposée, pas appliquée

**Hypothèse falsifiable :** l’iframe preview participe à tort au routage du pointeur pendant l’ouverture du dialogue. Si on l’exclut de ce routage, sans changer positions, noms, helper, clics, clavier ou attentes, la séquence down/up/click ne doit plus atteindre son TD et doit atteindre #check-confirm suivi du submit.

Comparer sur **le même job Ubuntu26/x64**, avec le même snapshot f3 et le même observateur, deux copies applicatives. Une seule différence comportementale dans la seconde :

```css
body:has(#check-dialog[open]) #preview { pointer-events: none; }
```

Cette règle est une **condition expérimentale** : aucune source produit n’a été changée ici. Le comparateur devra être généré par le builder canonique dans une copie jetable, avec preuve que seul ce CSS applicatif et les dérivés attendus (dont hash CSP) diffèrent. Les sorties de rendu mail et le helper de confirmation doivent rester identiques. Le CSS ne doit pas être injecté par un appel supplémentaire juste avant le geste, ce qui changerait aussi son timing.

Avant la comparaison, enrichir **identiquement les deux bras** avec les seules métadonnées manquantes : clientX/Y et screenX/Y des événements iframe ; dans le snapshot déjà existant, état `:modal`, scrollTop du dialogue, computed pointer-events de preview et cible elementFromPoint au centre du bouton. Aucun nouvel await avant activation, aucun événement fabriqué, aucune attente de peinture ou retry.

Proposition bornée : au plus **10 parcours par bras**, arrêt au premier rouge de chaque bras, sans relance automatique. Un contrôle sans rouge rend l’expérience non concluante ; un comparateur qui reproduit le même clic TD réfute l’intervention proposée. Un contrôle rouge et dix comparateurs verts soutiendraient l’hypothèse, sans suffire seuls à promettre un correctif universel : il faudra ensuite minimiser le seam et préparer un test de régression avant toute publication.

Conserver le verdict de persistance après la promesse download originale. Exiger aussi, pour tout mail téléchargé dans ce scénario à avertissements, une confirmation DOM observée : aucun téléchargement antérieur à la confirmation ne doit transformer un contournement du dialogue en succès. Les deux autres exports gardent leur contrat d’origine.

Cette contre-épreuve distingue la destination du clic sans adopter un contournement clavier/test-only, augmenter un timeout ou réessayer une action utilisateur perdue. La cause précise et le choix final produit/helper restent ouverts.
