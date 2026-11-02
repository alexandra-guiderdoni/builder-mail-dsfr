# Trois modes de contribution

Charger la section du mode choisi après la découverte. L’inventaire des familles
est dans `references/layout-families.md` ; les contraintes de champs sont dans
`references/builder.md`.
Les modes organisent le niveau d’intervention, pas des styles graphiques.

## A — comprendre

1. Lire la question et inspecter le composant ou la famille utile dans le catalogue.
2. Relier la possibilité à son identifiant, ses champs et son rendu natif.
3. Expliquer en quelques phrases, avec un exemple disponible et sa limite.

**Fin** : distinguer ce qui est `DÉTECTÉ` de ce qui est `NON VÉRIFIÉ` ; aucune
composition, aucun fichier ni état de bibliothèque créé. Une question sur un
bouton n’exige pas l’audit des 52 composants. Une question sur la couverture
complète exige la sortie `audit`, les variantes facultatives et leurs limites.

## B — accompagner

1. Établir le public, le message principal, l’action attendue et les contraintes
   déjà données : images, densité, ton, fidélité au modèle, un article par bloc.
   Déduire les choix courants du contenu ; demander seulement une décision
   manquante qui change matériellement la composition.
2. Lire les familles utiles et comparer les variantes pertinentes. Choisir la
   structure la plus simple qui garde le contenu et ses relations.
3. Rendre le plan dans la conversation :

   | Section | Contenu fourni | Composant et variante | Champs à remplir | Pourquoi ce choix | Contrôle attendu |
   |---|---|---|---|---|---|
   | Exemple : action finale | Destination fournie | `mail-40` | URL et intitulé | Action prioritaire | Lien et lisibilité mobile |

   Expliciter l’arbitrage principal : pourquoi cet assemblage convient mieux
   que le départ natif pertinent. Relier cette raison aux contraintes fournies,
   même si le plan est résumé dans une réponse courte.

4. Guider la saisie avec les libellés fraîchement observés. Sans interface
   observée, donner les clés de champs détectées et marquer le chemin UI
   `NON VÉRIFIÉ`, sans inventer un bouton ni une route.
5. Appliquer la boucle sectionnelle ci-dessous aux états fournis par l’utilisateur.

**Fin** : chaque contenu est représenté ou son écart est explicite ; le plan
reste dans la conversation et l’utilisateur effectue la saisie. Aucune mutation
de fichier ou du builder en mode B. Une structure disponible mais non observée
au navigateur reste une proposition, pas une mise en page validée.

## C — fabriquer

1. Reprendre le contenu, le plan et la cible explicitement demandée. Pour une
   création, choisir un nouveau dossier privé ; pour une modification,
   conserver l’export original. L’instruction d’agir couvre les corrections
   nécessaires dans ce périmètre, sans confirmation répétée par bloc.
2. Charger `references/builder.md`. Pour une démo ou une édition dans le navigateur,
   suivre `references/ui-workflow.md` avec les commandes observées. Pour une
   fabrication par fichier, créer les blocs par `Model.createBlock`, partir d’un
   squelette `seed` si utile, ou reprendre la recette éditoriale validée.
   Réutiliser un modèle ou une identité de service déjà enregistrés si demandé.
   L’identité native remplace les en-têtes et pieds de page : vérifier ce
   périmètre avant de l’appliquer à une composition existante.
3. Remplir les champs réels, les URL, les médias et leurs alternatives. Garder
   l’objet, l’ordre, les relations et les mentions. Identifier les champs encore
   à fournir ; ne pas confondre valeurs de démonstration et contenu demandé.
   Pour réagencer le brouillon désigné, utiliser les commandes natives de
   déplacement, duplication ou retrait de bloc dans le périmètre demandé.
4. Contrôler la boucle ci-dessous. Pour la voie fichier, valider, rendre et
   importer par l’entrée native si l’ouverture de l’interface est autorisée.
   L’import ajoute une copie ; conserver la bibliothèque existante. Si elle
   contient du travail, exporter sa sauvegarde avant l’opération.
5. Exporter le JSON et le HTML par la voie autorisée ; comparer les valeurs hors identifiants copiés
   et le HTML au rendu natif. Tester une édition représentative par famille
   utilisée, puis retrouver cette édition dans les exports.
6. Si un modèle est demandé, utiliser l’enregistrement natif, recharger,
   vérifier sa présence et exporter la bibliothèque qui le contient.
7. Pour la copie ou la reprise dans une messagerie, charger
   `references/copy-and-reception.md`, contrôler la commande native puis
   qualifier séparément copie, collage et réception. Garder le brouillon.

**Fin** : fournir les fichiers et les contrôles effectivement exécutés. Sans
accès UI, livrer les fichiers avec `IMPORT NON VÉRIFIÉ`. Après un import ou une
sauvegarde d’état ambigu, inspecter l’état courant avant toute nouvelle tentative.
L’envoi, la publication, la suppression d’une composition existante et les
modifications du builder ne découlent pas de cette fabrication.

## Boucle sectionnelle et contrôle commun

Pour chaque section couverte : **cadrer → observer → comparer → corriger → figer**.
Une preuve fraîche identifie le contenu et son état, avec capture ou DOM rendu.
En B, l’utilisateur corrige ; en C, l’agent corrige dans le mandat courant.
Limiter à trois cycles sans progrès ; au-delà, consigner le blocage et la
décision nécessaire. Une bibliothèque ou une cible ambiguë bloque sa mutation.

| Statut | Condition | Suite |
|---|---|---|
| `VALIDÉE` | Attendus observables satisfaits | Figer et poursuivre les sections couvertes |
| `À CORRIGER` | Écart précis et corrigeable avec les blocs disponibles | Correction ciblée puis observation fraîche |
| `NON VÉRIFIÉ` | Preuve absente ou insuffisante | Nommer le contrôle manquant |
| `PRÉREQUIS TECHNIQUE` | Aucune composition disponible ne couvre le besoin | Transmettre le manque et les alternatives, sans code |
| `BLOCAGE` | État final ambigu ou trois cycles sans progrès | Arrêt de l’action dépendante ; conserver les preuves |

Reçu court : **section · composant · attendu · preuve · écart · statut · suite**.
Un état satisfaisant n’appelle pas une nouvelle confirmation avant de poursuivre
les autres sections déjà demandées. La boucle ne produit aucun apprentissage
persistant ni modification du skill sans instruction explicite.

Contrôler selon les familles utilisées :

- **Contenu** : comptes, ordre, titres, sources, dates, mentions et destinations ;
  texte de démonstration retiré et aucun résumé inventé.
- **Structure** : titre principal et niveaux rendus, paragraphes, listes et cartes ;
  nombre d’éléments compatible avec la cardinalité des blocs.
- **Médias** : fichier disponible, décodage lors de l’import, alternative adaptée,
  variantes d’identité conservées et recadrage inspecté.
- **Lecture** : alignements, densité, contraste visible et absence de débordement
  à grande et petite largeur ; liens et boutons lisibles, empilement observé.
- **Édition** : modification par l’interface, persistance et exports natifs qui
  conservent les champs et les variantes utilisés.

L’audit du catalogue prouve une couverture documentaire ; les tests de rendu,
l’import UI et la réception mail sont des preuves distinctes. Nommer la largeur
et le moteur observés. L’aperçu seul ne démontre ni réception réelle ni conformité
RGAA ; une validation esthétique reste celle de l’utilisateur.
