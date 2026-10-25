# Revue indépendante du diagnostic #145

**Verdict : GO pour publier ce diagnostic partiel. Aucun défaut bloquant identifié dans le périmètre relu. La cause historique de #145 reste inconnue ; cette revue ne valide ni une correction du produit ni la clôture de l’issue.**

Revue Astra du 25 octobre 2026, après gel annoncé par l’auteur. Base du diff : `7c78822872b8e159fd884836828d5b7ce3f75544`. Le skill `code-review` a été appliqué sur ses axes conformité et intention ; les deux axes ont été examinés par ce seul relecteur, la mission interdisant explicitement toute sous-délégation. Aucune édition de code, activation, publication ou exécution de navigateur par le relecteur. Seul ce compte rendu est écrit.

## Sources figées et périmètre

| Source | SHA256 vérifié |
|---|---|
| `tests/export-names-browser.test.cjs` | `e61e34e08b9a825e0f8ddf590445ba2360ad690a9654e735966c840ef57dc108` |
| `tests/export-diagnostics.cjs` | `2114b56bd2525093037ccbfcf954687a354777b91dc02983788a88a6a9a93ec6` |

Lecture du diff courant, du helper complet, de `browser-support.cjs`, de [RESULTAT-DIAGNOSTIC-DURABLE.md](RESULTAT-DIAGNOSTIC-DURABLE.md), des commandes et des reçus dans [durable-diagnostic-proof](durable-diagnostic-proof). Les 19 empreintes du reçu, comprenant sources et pièces justificatives, correspondent aux fichiers présents. Aucune hypothèse causale issue d’un simple résultat vert n’est retenue.

## Conformité et comportement

- Le diff préserve cas, date fixe, sélecteurs, noms attendus et assertions. Une comparaison indépendante des lignes `assert.*` avec la base confirme leur identité. `browser-support.cjs`, donc `confirmChecks`, est inchangé. L’ordre fonctionnel demeure activation, confirmation, attente du téléchargement ; aucun retry ni délai fonctionnel augmenté.
- Le handler de rejet de `waitForEvent('download')` est attaché immédiatement. Il ne remplace pas la promesse originale passée à `confirmChecks` puis attendue. Une attente rejetée reste donc un échec ; elle ne devient pas un succès. L’échec d’activation est désormais enveloppé avec le diagnostic, en conservant nom, message, pile et `cause` de l’erreur primaire.
- Les phases encadrent les attentes d’activation et de confirmation. Le snapshot d’échec est une seule lecture navigateur. Son repli utilise un timer Node de 1000 ms, nettoyé dans `finally`, y compris en cas de réponse immédiate. La branche de lecture possède un handler de rejet, également applicable après la victoire du timer.
- Les trois listes sont chacune limitées à 100 entrées. L’instrumentation écoute les événements et lit l’état ; elle ne clique pas, ne confirme pas, n’altère pas les primitives navigateur et ne déclenche pas de téléchargement. Le script d’observation injecté par `addInitScript` est une instrumentation réelle : l’absence d’injection de panne ne signifie pas absence de script injecté.
- Aucune nouvelle lecture de `location`, d’URL applicative, de liens, de modèle de courriel ou de HTML n’a été trouvée. Les champs historiques `notice` et `error` sont conservés ; `pageerror.message` et l’erreur primaire sont des textes non expurgés. Ce constat ne constitue donc pas une garantie générale d’absence d’URL ou de données dans tout message d’erreur possible.

## Preuves examinées et contrôles indépendants

Les reçus de l’auteur, dont les empreintes ont été vérifiées, montrent les quatre parcours Chromium/WebKit réussis en 7,794 s, sans skip ni annulation. La copie jetable ne modifie que l’activation initiale : son rejet contrôlé produit un échec attendu en 0,491 s sous `--unhandled-rejections=strict --trace-warnings`. Le TAP expose `CONTROL145_ACTIVATION_REJECTED`, sa pile, le cas, le sélecteur et `lastPhase:before-click`. Aucun rejet non observé n’y est signalé. Cette contre-épreuve vérifie le diagnostic et la conservation du verdict rouge ; elle ne reproduit pas la défaillance historique.

Après le gel, le relecteur a exécuté uniquement les probes sans navigateur suivants, avec sortie en mémoire et sans réécrire les preuves de l’auteur :

1. Rejeu direct de `snapshot-deadline-probe.cjs` sous mode strict : **code 0**, fallback en **1003,737333 ms**, une lecture pour la page qui ne répond jamais, une lecture pour le snapshot immédiat, nom/message/pile/cause/détails conservés, **0 ressource Timeout avant et après**.
2. Contrôle indépendant via `node:vm` du véritable helper : 160 phases, 160 téléchargements et 160 événements DOM simulés. Résultat **code 0** ; chaque liste conserve exactement les 100 derniers éléments, indices 60 à 159 ; un seul snapshot ; pile et cause primaires identiques. Les seuls identifiants DOM lus sont `check-dialog`, `error`, `notice`. Un getter `window.location` levant une exception n’a pas été sollicité. Ce contrôle démontre ces propriétés sur la fixture ; il ne démontre pas une expurgation générale des messages.

Le relecteur n’a pas relancé les quatre tests navigateur ni leur copie de contre-épreuve : ces exécutions sont des preuves de l’auteur examinées, distinctes des contrôles indépendants ci-dessus.

## Limites à conserver lors de la publication

La borne de 100 porte sur le nombre d’entrées par liste, pas sur la taille en octets des messages. Le délai de 1000 ms borne l’attente diagnostique lorsque la boucle Node peut exécuter le timer ; il ne borne pas tout le test ou son teardown et n’annule pas un `evaluate` déjà envoyé. Les horodatages Node (`Date.now`) et navigateur (`performance.now`) ont des origines différentes. L’instrumentation peut légèrement modifier le timing.

Les preuves actuelles sont locales, sur macOS arm64. Elles ne remplacent ni le prochain échec CI instrumenté ni une preuve causale historique. Le focus final, le dialogue ouvert ou la réussite des quatre tests ne suffisent pas à attribuer une cause à #145. La publication peut présenter ce travail comme une amélioration du diagnostic ; elle doit conserver l’issue ouverte.
