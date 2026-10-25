# Une observation ciblée, proposée après revue

Cette préparation n’autorise et n’exécute aucun lancement. Root prépare séparément le workflow manuel, les permissions, le checkout et la collecte `always`. Aucun workflow n’est fourni/appliqué par ce paquet.

1. Checkout sujet **à la racine `GITHUB_WORKSPACE`** au SHA `0b7adc7f18355e740f144b379f7930bf4c8c23de`. Le paquet de sonde peut être obtenu dans un sous-dossier indépendant. Ne pas déplacer le sujet dans `subject/` : cela changerait l’URL file par rapport à la CI rouge.
2. Vérifier les quatre SHA d’`INPUTS.json` avant l’overlay. Copier seulement les trois fichiers suivants aux chemins `tests/` homologues : `runtime/tests/export-names-browser.test.cjs`, `runtime/tests/browser-support.cjs`, `runtime/tests/destinations-probe.cjs`. Vérifier leurs SHA de `MANIFEST.json`, puis revérifier le portable et `tests/export-diagnostics.cjs` inchangés. Garder l’URL file effective et les reçus avant/après dans les artefacts.
3. Environnement proposé identique sur les points contrôlables : Ubuntu 26 x64, Node 24.18.0, Playwright 1.64.1 et son Chromium. Enregistrer ImageVersion, OS/arch, versions, source SHA et SHA overlay ; ne pas assimiler image/charge/ensemble des tests/observateur à l’environnement précédent. L’installation reste gérée par root, sans installer depuis cette préparation.
4. Une seule invocation du test Chromium ; pas de répétition, pas de WebKit, pas de suite globale. Limite du job distincte des attentes fonctionnelles d’origine. Dossier final de collecte inexistant, parent `RUNNER_TEMP` existant. Exemple proposé depuis la racine du sujet :

```sh
test ! -e "$RUNNER_TEMP/dest145-once"
test ! -e "$RUNNER_TEMP/dest145-once.tap.log"
DEST145_OUTPUT_DIR="$RUNNER_TEMP/dest145-once" MAIL_BUILDER_ENGINE=chromium \
  node --test --test-reporter=tap \
  --test-name-pattern '^noms des fichiers exportés, trois types d’export \(Chromium\)$' \
  tests/export-names-browser.test.cjs \
  > "$RUNNER_TEMP/dest145-once.tap.log" 2>&1
```

Le shell du workflow doit préserver le code de sortie sans empêcher la collecte finale. Ne pas placer les preuves dans un répertoire qu’un checkout ultérieur nettoiera. Le filtre a été vérifié en VM : un seul test parmi les quatre noms enregistrés. Neuf contextes et 27 exports sont attendus uniquement si toute la progression réussit ; un échec arrête naturellement le parcours. Aucun test natif n’a vérifié ce paquet à ce stade.

5. Conserver le TAP brut, `destinations.json` s’il existe, versions, hashes, résultat et code de sortie, même si le test échoue. Décrire séparément verdict du test, validité de l’installation/collecte et perte/transport inconnu. Une absence d’événement ne devient pas une preuve d’absence lorsque le transport ou l’installation est incomplet.

## Lecture discriminante

| Observation nouvelle | Ce qu’elle permet de distinguer |
| --- | --- |
| Confirmation `.click()` rejetée | Erreur d’action avant son ACK ; primaire et phase précisent la différence avec l’occurrence actuelle. |
| Entrées trusted reçues par un document enfant identifié, sans activation parent et avec dialogue persistant dans le diagnostic original | Livraison DOM enfant effectivement observée ; comparer URL/identités/gestes au cas Linux historique. Ne pas inférer widget/OOPIF/cause Chromium. |
| Entrées reçues par le bouton parent, puis submit/close, mais téléchargement absent | L’investigation se déplace vers la suite d’export, plutôt que l’absence d’activation de confirmation. |
| Navigation, changement de document ou d’identité de cible autour du clic | Fait compatible avec une interaction de navigation/rendu ; l’ordre de réception interframes ne prouve pas son ordre causal. |
| Retour du clic sans entrée observable pertinente | Observation non concluante : vérifier installations, pertes, epochs et transport. Aucun destinataire n’est inventé. |
| Test vert | Non-reproduction sous cette observation, pas preuve de correction ni clôture de #145. Aucun rejeu automatique. |

Le relevé de géométrie précède le clic uniquement parce qu’il enrichit le `look` existant. Les listeners et le binding ajoutent du coût et des messages ; cette campagne n’est ni byte-identique à R1 ni un témoin sans observateur. Elle ne propose aucun correctif applicatif/pilote.
