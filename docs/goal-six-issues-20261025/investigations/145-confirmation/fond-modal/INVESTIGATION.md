# Fond modal : clic supplémentaire non attribué

**INCONNU — suivi distinct de la capture du clic de confirmation #145.** Le test expérimental local observe un message de clic supplémentaire provenant de l’iframe d’aperçu. Sa cause reste indéterminée ; aucune régression introduite par la règle CSS ni simple erreur d’instrumentation n’est démontrée.

Trois sources exactes et quatre résultats sont conservés :

| Source | Résultat |
|---|---|
| Compteur dans le document iframe | Test rouge parmi 12 autres cas verts ; expected/actual absent du premier rapport. Un rejeu détaillé est vert. |
| Compteur dans la page parente | Rouge au second cycle, après deux clics volontaires dans l’aperçu : `actual 3`, `expected 2` à l’assertion du clic de fond. |
| Journal événementiel supplémentaire | Une exécution diagnostique verte ; elle n’explique aucun des deux rouges. |

Le scénario ouvre la confirmation, tente un clic à droite de la modale sur le fond recouvrant l’aperçu, annule au clavier, clique dans l’aperçu après fermeture, puis recommence pour confirmer au clavier. Le message est accepté uniquement si `event.source` correspond à la fenêtre de l’aperçu. Une livraison tardive peut déplacer l’attribution temporelle ; les occurrences rouges n’ont pas de journal par événement suffisant pour trancher entre vrai clic de fond, doublon ou effet de navigation/instrumentation. Les horloges de documents différents ne sont pas comparées comme une horloge unique.

Cette expérimentation n’a pas de témoin sans CSS : elle ne prouve ni régression de la règle ni son innocuité pour tout scénario. La paire Linux de #145 soutient uniquement la mitigation du clic destiné au bouton de confirmation. Elle ne garantit pas une étanchéité universelle du fond modal.

Le test expérimental est archivé hors de la suite permanente avec vérification d’égalité avant retrait de son original non suivi. Aucun rouge n’est reclassé en vert ; aucune assertion, attente, confirmation ou limite de la suite existante n’est affaiblie. `EXPERIMENTAL-TEST-ARCHIVE.json` relie les trois sources aux quatre journaux. `SHA256.json` confronte les copies aux bruts conservés hors du checkout.

## Investigation suivante

Conserver les échecs, enregistrer dans un essai distinct et borné l’identité du document, le numéro de chaque événement/message, ses coordonnées, son caractère `isTrusted` et les phases de l’action. Attribuer l’événement supplémentaire avant toute correction. Comparer au témoin sans CSS si une régression est invoquée. Préserver l’absence de téléchargement avant consentement, la navigation clavier et le retour du focus. Un seul rejeu vert ne résout pas ce suivi.
