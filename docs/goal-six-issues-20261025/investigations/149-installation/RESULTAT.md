# Installation locale R3 — premier tour natif non qualifiant

La version dormante **2.18.0+codex.local-20261025-lease-probe-2** est installée après l’autorisation utilisateur transmise par root. L’empreinte de référence reste `b558aa8fc1e6f5d01a42befe08a3c07c3d84b18e9d971ffebd006c3a5069bf18`. La revue indépendante R3 confirme les 68 tests et le delta produit de deux lignes. **Un tour natif a été exécuté : PLUGIN_DATA absent du shell et ticket non injecté. Qualification bloquée ; confiance des nouveaux hooks non observée. Le second tour n’a pas été lancé.**

## Actions et contrôles réalisés

Prévol : 210 empreintes du candidat et empreinte de la revue indépendante vérifiées ; paquet de 165 fichiers et ancien cache de 160 fichiers conformes ; ancienne version active confirmée par `codex plugin list --marketplace personal --json`. La simulation d’activation est passée avant mutation.

`packaging/activate.py --apply` a créé la source possédée neuve `/Users/alex/plugins/shipguard-codex-2.18.0-lease-probe-20261025-2` et remplacé seulement la chaîne du chemin source de ShipGuard dans le marketplace personnel. Les autres entrées et bytes ont été préservés. Une sauvegarde exclusive se trouve dans `../package/activation-receipts/activate-0fbbfdbd4c530963.marketplace-before.json`.

`codex plugin add shipguard-codex@personal --json` a retourné la version attendue et le chemin installé exact : `/Users/alex/.codex/plugins/cache/personal/shipguard-codex/2.18.0+codex.local-20261025-lease-probe-2`. La protection canonique de push du clone ShipGuard a été réappliquée avec `--protect-marketplace-push` ; le script n’a pas lancé de build. La vérification du cache installé confirme **165 fichiers, leurs modes et toutes leurs empreintes**, gate False. Aucun cache ou amont n’a été édité manuellement.

Le marketplace est passé de `9f6cba476e5b03b1913641febbfa1fc720e50d95c3208e01f11b14d2517d44f7` à `f4514a905530dc34333b4b6a5060c9ab503fbb27541d79ea168002887a2d2edc`. Les empreintes de `~/.codex/config.toml`, du chemin `~/.codex/hooks.state` lorsqu’il existe et de `~/.claude/settings.json` sont inchangées. Le plugin personnel tiers retourné par le CLI est inchangé. Le contrat adapter_root n’a pas été édité. Aucune action sur l’autre Mac ; aucune affirmation de parité nouvelle.

## Premier tour natif autorisé, résultats séparés

Le retour d’installation n’atteste pas la confiance UI ni l’exécution des hooks. Root a été prévenu avant tout tour et a ensuite autorisé explicitement le premier tour seul en configuration normale. Astra a effectué exactement les deux commandes du runbook ; aucun état de confiance n’a été signé ou modifié directement. Une demande UI reste à la main de l’utilisateur.

Invocation : `codex exec --model gpt-6-astra --ephemeral --json --cd /Users/alex/Claude-worktrees/shipguard-session-ownership-20261025 -`. Le flag ephemeral évite la persistance de la conversation native ; il ne désactive ni la configuration utilisateur, ni les règles, ni l’approbation, ni le sandbox, ni la confiance des hooks. Aucun flag de contournement n’est utilisé. Le contrôleur ne conserve que les métadonnées moteur et les sorties des deux commandes attendues ; aucun prompt ou transcript complet n’est archivé.

- Thread moteur : `01a1746c-eda1-7d00-8a47-de4bc24d8c2f`. La première commande retourne le même CODEX_THREAD_ID et `PLUGIN_DATA_present:false`, code 0. Cela prouve la concordance shell/thread de ce tour seulement, pas la concordance avec session_id ou turn_id d’un hook.
- Nonce : `510036fcecc73fc672b8c5c8dcab9b6d`. Le begin transmis reste sans ticket ; il retourne code 2, argparse signale `--ticket` manquant. Le refus par gate False n’est pas atteint. Aucune réécriture updatedInput ni exécution de PreToolUse n’est démontrée.
- Aucun événement hook/Stop ou état de confiance n’est observable dans les pièces retenues. Un item.error initial est présent dans le flux, mais son message a été omis par le filtre du collecteur avec les messages du modèle. Cette limite interdit d’attribuer précisément l’absence de ticket à un refus de confiance. Aucun historique n’a été relu pour combler cette lacune et aucun tour supplémentaire n’a été lancé.
- Le processus Codex termine avec code 0 : ce code ne signifie pas que la qualification a réussi. Le résultat utile demeure le refus argparse, PLUGIN_DATA absent et les preuves de hooks manquantes.

Après ce tour, la vérification retrouve les **165 fichiers et modes exacts** du cache. Codex config.toml, le chemin hooks.state observé, Claude settings.json et le marketplace sont inchangés par rapport à l’installation. Aucune variable PLUGIN_DATA n’a été injectée et aucun patch n’a été tenté. Les détails sont dans `turn1-invocation.json`, `turn1-events.jsonl`, `turn1-summary.json` et `after-turn1-package.json`.

Le gate reste fermé. Le budget consommé est **1 tour sur 2 maximum**. Le second tour n’est pas lancé : son interruption doit être orchestrée concrètement par le contrôle natif de l’utilisateur ; aucun signal PID ne s’y substituera. La confiance UI n’est pas déduite de l’installation. La propagation de PLUGIN_DATA, les identités hook et la réécriture restent à résoudre avant toute affirmation de qualification. Aucun navigateur ni troisième tour automatique n’est autorisé.

## Retour disponible, non exécuté

La procédure exacte est conservée dans `../INSTALLATION-DORMANTE.md` : simulation `packaging/activate.py --rollback`, puis `--rollback --apply` si retour décidé dans le périmètre autorisé ; réinstallation CLI de la source précédente, protection de push, vérification complète de l’ancien cache. Toute dérive du marketplace arrête cette procédure. Aucun répertoire ni cache n’est supprimé. Le retour n’a pas été exécuté.

Le reçu d’installation est `installation-receipt.json`, SHA-256 `422974511776dbe04ca205ec106ca39b6b15e3ada908497ba03c6a15515e1143`. Les reçus distinguent prévol, mutation de source, installation CLI, protection, comparaison de configuration et vérification du cache. Ils ne contiennent ni clé, ni prompt, ni transcript complet.

**État : installé localement, gate navigateur fermé, premier tour non qualifiant, confiance UI inconnue, second tour non lancé ; #149 reste ouverte.**
