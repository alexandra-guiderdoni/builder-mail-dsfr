# Revue indépendante #150 — qualification portable unique

**Qualification bornée validée : recette locale exécutée rapportée, installation locale constatée et reproduction native positive documentée.** Le paquet portable a enregistré un clic complet dans l’enfant au cycle confirm dans cette exécution. Cela ne qualifie ni un taux de reproduction, ni d’autres machines, ni une cause interne, ni un correctif produit. Aucun second essai n’a été lancé par le relecteur.

## Provenance et niveau de preuve

Le manifeste de qualification `0daaeedc63af2ce58bd7205a18eb9fedd1924492c3b884a17ce9b8f3333684a0` et ses six pièces concordent en taille et SHA. Le manifeste de préparation reste `83f25a37bd9a49fc8ec466834e6616b5263260dd21869d6733c190dbfaac8e8c` ; ses19 pièces sont intactes. Les champs false/false de préparation sont une photographie historique antérieure à l’installation et au run ; les conserver ne contredit pas le reçu ultérieur distinct.

attempt.json et execution.json portent la même commande, le même début, maxInvocations1 et retries0. Le reçu final indique exit0, du 25 octobre 2026 à21:49:57.421676 UTC jusqu’à21:49:59.871983 UTC. Stdout et stderr archivés sont vides. Le résultat est `result-once/result.json`, SHA `6fd9b6f7021fe9fb492d89b6c2c0156c6b4ffc51f4bde392cf73b9924d575380`.

Les stdout des installations et du npm test post-installation n’ont pas été archivés. Les sorties outils root rapportent npm ci local avec cache .npm-cache, deux paquets et exit0 ; installation Chromium locale avec exit0 ; tests purs21/21. Ce sont des attestations root, pas des logs manifestés vérifiés par cette revue. En lecture seule, Playwright et playwright-core1.64.1 sont effectivement présents sous node_modules, ainsi que les dossiers locaux chromium-1248, chromium_headless_shell-1248 et ffmpeg-1013 sous .browsers. Ces constats confortent la recette exécutée ; ils ne reconstituent pas rétroactivement un historique intégral d’installation. Aucun rerun n’a été fait pour fabriquer un reçu.

## Résultat natif confronté au contrat inchangé

Le relecteur a uniquement réévalué les fonctions pures assertGeometry et verdict sur le résultat existant : les deux géométries passent et le finding calculé égale exactement le finding brut true.

| Cycle | Avant / sous modale / après | Observation |
|---|---|---|
| Cancel | 1 / 1 / 2 | Pas d’augmentation du compteur enfant pendant ce cycle modal |
| Confirm | 3 / 4 / 5 | Clic complet enfant enregistré au fond |

La trace comporte33 séquences consécutives, dropped0, une confirmation. Les cinq clicks enfant trusted uniques sont child-1:5, :10, :15, :20 et :25. Leur nombre égale le compteur parent5 et le dernier ACK enfant5. Au cycle confirm, le compteur immédiat4 est confirmé par l’ACK4 avant fermeture, puis le contrôle positif final conduit à5.

Les séquences23–27 portent pointerdown, mousedown, pointerup, mouseup et click, tous trusted, dans l’enfant sur BUTTON/target630/532. Le click est child-1:20. Chaque message est reçu avec parentModalAtReceipt open=true/modal=true. La translation par le rectangle735/458 donne le point brut1365/990 prévu. Le scénario conserve ses contrôles positifs et la réconciliation R3.

Les états préalables indiquent viewport1600×1000, scroll577, iframe735/458/640/571, dialogue modal, focus H2/title, EFPdialog et pointer-events:none. Errors est vide, cleanupError null, aucune primaryError. Le runner inchangé tente la fermeture du seul Browser qu’il crée dans finally ; le reçu termine sans erreur de fermeture enregistrée. Cela ne constitue pas un audit externe de tous les processus de la machine.

Métadonnées réellement enregistrées : platform=darwin, arch=arm64, osRelease=25.5.0, node=v24.18.0, playwright=1.64.1 ; browserVersion=156.0.8078.4. Aucun numéro commercial macOS n’est inféré de osRelease. Le champ environment contient les cinq clés autorisées ; aucun hostname, username ou dump d’environnement n’y apparaît.

## Conclusion permise

Le résultat montre que cette recette portable, dans l’environnement observé, peut reproduire le phénomène automatisé sans le builder complet. Exit0 signale ici un protocole terminé **avec finding positif**, pas absence de défaut. L’installation et le run fonctionnels sur cette machine ne constituent pas une garantie de portabilité inter-Mac ou inter-OS.

Les états modaux enfant sont ceux de la réception parent, pas une preuve synchronisée de l’état au dispatch. Les lectures sont intrusives, les ACK ajoutent des échanges et les coordonnées sont synthétiques. isTrusted ne qualifie pas une souris physique ; blob:null ne prouve ni OOPIF ni widget séparé. La réconciliation des clics ne certifie pas l’intégralité de toutes les autres familles d’événements et un éventuel finding false ailleurs n’exclurait pas un appui partiel.

Aucun finding bloquant sur cette interprétation. Aucune attribution de faute à Chromium ou Playwright, aucune clôture #150 ni autorisation de publication amont ne découle de cette revue. Aucune installation, exécution navigateur, modèle, CLI native ou CI supplémentaire ; aucun fichier du candidat modifié. Seul ce rapport extérieur a été écrit.
