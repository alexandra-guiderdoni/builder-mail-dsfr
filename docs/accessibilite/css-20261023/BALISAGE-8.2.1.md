# Balisage 8.2.1 : diagnostics conservés et limites du parsing

**Aucun défaut produit supplémentaire établi. Qualification 8.2.1 toujours `A_RETESTER`, sans taux RGAA validé.** Ce complément examine 393 entrées de la version actuelle et rattache les diagnostics aux cinq conditions du [test officiel](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#8.2.1). Les styles Office, les attributs du catalogue, les données et les distributions restent intacts.

## Référence et interprétation

| Affirmation | Source | Verdict et conséquence |
|---|---|---|
| 8.2.1 exige toute absence d’erreur CSS du validateur | Test officiel et [glossaire « Règles d’écriture »](https://accessibilite.numerique.gouv.fr/methode/glossaire/#regles-decriture) | Non : les cinq conditions portent sur le balisage ; les diagnostics CSS seuls ne démontrent pas leur violation |
| Un attribut non autorisé démontre une erreur de délimiteur | Messages `xmlns:v` et `xmlns:o`, code observé, glossaire | Non établi : les diagnostics de vocabulaire ne signalent pas ici un guillemet, un chevron ou un espace incorrect |
| Un DOM validé prouve la syntaxe de sa source avant parsing | Six témoins invalides, examinés avant et après parsing Chromium | Faux dans quatre cas ; la source doit aussi être contrôlée |
| Les 245 diagnostics de doctype absent révèlent un nouveau défaut du builder | Sérialisation `document.documentElement.outerHTML` des captures natives | Non établi : le sérialiseur omet le doctype ; ce diagnostic est lié à la représentation contrôlée |

Les cinq conditions sont : écriture, imbrication, ouverture et fermeture, unicité des valeurs `id`, absence d’attributs dupliqués. Le glossaire précise les délimiteurs, guillemets, espaces et fermetures nécessaires, selon le doctype. Les huit familles héritées restent conservées et ouvertes comme diagnostics de validité générale ; elles ne bénéficient d’aucune dispense de compatibilité mail.

| Famille | Occurrences dans les 393 entrées dérivées | Portée du diagnostic pour les cinq conditions |
|---|---:|---|
| `xmlns:v` | 286 | Attribut non autorisé ; aucune violation de ces conditions établie par ce seul message |
| `xmlns:o` | 286 | Même portée |
| `supported-color-schemes` | 286 | Propriété CSS non standard ; aucune violation de balisage établie par ce seul message |
| `mso-margin-top-alt` | 286 | Même portée CSS |
| `mso-margin-bottom-alt` | 286 | Même portée CSS |
| `mso-padding-alt` | 286 | Même portée CSS |
| `mso-table-lspace` | 2 817 | Même portée CSS |
| `mso-table-rspace` | 2 817 | Même portée CSS |

« Non signalé » ne signifie pas « conforme ». Le [JSON par instance](balisage-8.2.1.json) conserve les cinq conditions pour chaque entrée, leurs limites, les indices des messages bruts et dérivés, ainsi que les preuves des témoins. Aucun diagnostic n’est transformé automatiquement en décision RGAA.

## Deux validations distinctes

L’échantillon comprend les 148 entrées de la campagne CSS et les 245 DOM du [zoom natif](../zoom-20261023/RAPPORT.md). **117 entrées sont des sources avant parsing** : trois distributions, 104 exports et aperçus individuels, dix compositions exportées. **276 entrées sont des DOM après parsing**, dont les 245 captures natives. Les empreintes des entrées et des sources de rendu ont été recontrôlées ; les doublons de contenu entre scènes restent des instances distinctes.

La validation brute, avec Nu HTML Checker 26.9.16, termine en code **1** : **7 595 erreurs, 584 informations et neuf familles d’erreurs**. La neuvième famille comporte les 245 doctypes absents des sérialisations natives. Les sources applicatives déclarent HTML5 ; la collecte native originale n’a pas relevé `document.doctype`. Ce défaut de collecte ne devient pas une non-conformité produit et les captures originales ne sont pas modifiées.

Une deuxième validation contrôle des copies dérivées : le seul doctype lu dans la source correspondante est ajouté avant chacun de ces 245 DOM, dont les octets restent identiques. Les autres 148 entrées sont inchangées. Pour les aperçus assemblés, le littéral vient du moteur `render.js` ; pour les exports, du fichier généré correspondant. **Ces copies ne sont pas des observations rétroactives du doctype runtime.** Le résultat reste en code **1** : **7 350 erreurs, 584 informations et huit familles**, sans autre disparition de famille ou d’occurrence. Les deux sorties complètes sont conservées localement.

## Témoins et angle mort observé

Six témoins négatifs couvrent les cinq conditions : espace manquant, guillemet manquant, imbrication interdite, fermeture obligatoire absente, `id` dupliqué et attribut dupliqué. Ils déclenchent tous des erreurs avant parsing. Deux témoins valides passent, dont une liste avec fermetures facultatives des `li` permises en HTML5.

Après parsing Chromium, le même validateur ne détecte plus quatre de ces défauts : espace, guillemet, fermeture obligatoire et attribut dupliqué. Les anomalies de l’imbrication choisie et de l’identifiant restent détectées. Les captures des témoins sérialisent le document entier avec son doctype réellement observé ; aucune requête n’est relevée pendant leur préparation. Ces résultats bornés ne démontrent pas la réparation de toutes les variantes d’erreur.

Le neuvième témoin, `li>vélo`, ne déclenche aucune erreur avant ni après parsing. Ce texte peut être licite ; savoir si une balise était voulue exige une revue de l’intention. Les témoins montrent ainsi les capacités ponctuelles et les limites du validateur, sans promettre une détection exhaustive.

## Preuves, matrice et suite

Les fichiers locaux sont sous `evidence/balisage-20261023/` : `recu.json` et `vnu.json` bruts ; `derivation/` pour la seconde validation ; `temoins-dom/` pour les témoins passés par Chromium. Les scripts sont `qualifier.py`, `valider-derivation.py`, `parser-temoins.cjs` et `consolider.py`. Ils refusent l’écrasement des reçus de collecte ; utiliser une nouvelle tentative pour une reprise. Le JSON partageable conserve leurs empreintes et celles de chaque preuve. Son volume correspond aux données générées exhaustives, sans nouvelle logique applicative.

Les matrices [106 critères](MATRICE-106.md), [258 tests](MATRICE-258.md) et [JSON canonique](matrice-rgaa.json) rattachent ce complément à 8.2 et le zoom à 10.4. Les 1 651 observations initiales, les décisions existantes et les états de qualification sont conservés. Les 393 entrées présentes ici recoupent cet échantillon ; leurs nombres ne doivent pas être additionnés comme des pages distinctes.

Astra donne **GO technique, documentaire et PDV pour la publication personnelle**. Sa contre-revue recalcule les 672 empreintes, vérifie exactement les 245 dérivations, les rattachements exhaustifs des deux sorties VNU, les neuf témoins et les 1 965 conditions. Elle confirme que seuls cinq champs de rattachement sont ajoutés à la matrice et que les 33 liens locaux examinés sont résolus. Aucun moteur n’est relancé par cette contre-revue en lecture seule ; ce GO ne qualifie aucun critère RGAA.

La revue des intentions ambiguës, des sources avant parsing et des états non exercés reste ouverte, de même que les qualifications humaines, vocales, Windows et messageries de la campagne générale. Aucun style Office n’est supprimé pour rendre le validateur vert. L’objectif de conformité à 100 % reste inchangé.
