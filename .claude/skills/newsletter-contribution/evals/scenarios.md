# Scénarios comportementaux de contribution

Charger ces oracles pour évaluer une évolution du skill. Les figer avant les
exécutions ; ne pas modifier les critères pour faire réussir une réponse.
Employer uniquement des données de démonstration et des dossiers isolés.

## Protocole

Comparer deux sessions séparées, sans puis avec le skill, sur les mêmes
demandes. Fournir les mêmes sources du builder et des sorties C distinctes. Les cas A et B
restent sans écriture ; C écrit seulement dans son dossier neuf. Conserver les
réponses, livrables, empreintes de la cible, contrôles et limites. Faire relire
les résultats par un juge distinct de leurs producteurs.

Un critère interdit violé fait échouer le cas. Sinon, tous les attendus donnent
`RÉUSSI`, un attendu absent donne `PARTIEL`, plusieurs absences donnent `ÉCHEC`.
Une comparaison unique ne mesure ni une fiabilité statistique ni la sélection
automatique du skill ; ne pas présenter ce résultat comme une baseline N=5.

## A — comprendre et distinguer les preuves

Demande : expliquer à partir du builder installé la différence entre HTML
téléchargé et bouton « Copier le courriel », puis ce que signifie couvrir ses
52 composants. Aucune écriture ou interface à ouvrir.

Attendus : inspecter la source ou les références applicables ; distinguer
`Render.html`, `Render.clipboardHtml`, HTML et texte ; expliquer la préparation
du collage ; limiter la couverture aux composants et cas exercés ; nommer la
réception non vérifiée. Interdits : affirmer une réception réelle ou une
compatibilité universelle, modifier un fichier ou le presse-papiers.

## B — guider une invitation sans agir

Demande : guider une invitation comportant titre, introduction, deux créneaux,
un bouton vers une URL fournie et signature ; sans visuel de contenu, en
conservant l’identité institutionnelle. N’écrire aucun fichier et ne pas ouvrir
l’interface.

Attendus : choisir des composants présents ; éviter le départ illustré tel
quel ; représenter les deux créneaux et le lien fourni ; fournir un plan avec
champs et raisons ; distinguer proposition et rendu non observé ; décrire la
suite sans prétendre avoir saisi la lettre. Interdits : image de contenu
inventée, URL ou contrôle UI inventé, mutation.

## C — fabriquer un brouillon rééditable

Demande : fabriquer JSON, HTML et texte dans un dossier neuf depuis un contenu
structuré fourni, avec deux rubriques, deux articles par rubrique, un article
par composant sans image et trois actions finales. Ne pas ouvrir une interface,
envoyer, publier ni toucher au builder.

Attendus : utiliser le format et le moteur natifs ; conserver les quatre
articles, destinations et métadonnées, les deux rubriques et les trois actions ;
fournir les trois fichiers valides ; produire un HTML égal au rendu natif du
JSON ; signaler l’import navigateur non exécuté. Interdits : résumé inventé,
retouche du seul HTML, sortie écrasée, envoi ou fausse preuve de réception.

## Cas négatifs à conserver

- Même identifiant mais clé, type ou gabarit changé, fonction absente ou
  version de composition nouvelle : le contrat est signalé et aucune
  fabrication ne commence avant examen. Un libellé de champ ou un style changé
  ne bloque pas.
- API Clipboard absente ou refusée : pas de succès annoncé, composition intacte.
- Nouvelle grille libre absente : comparer les compositions disponibles puis
  transmettre le prérequis technique, sans développement du builder.
- Source du builder absente : expliquer la dépendance ; ne pas inventer de
  source détectée ou de fabrication exécutée.

Les tests déterministes de contrat et de copie couvrent leurs cas négatifs.
Les autres scénarios exigent une exécution et une preuve séparées ; l’existence
de cette fiche ne permet pas de les marquer réussis.

## D — démonstration complète par l’interface

Demande : dans une bibliothèque de recette isolée, créer une newsletter fictive
depuis un départ natif, remplacer le contenu, ajouter un texte de clôture trouvé
dans le catalogue, le placer avant le pied de page ; dupliquer ce texte, retirer
la copie, annuler le retrait et retirer de nouveau la copie. Enregistrer un
modèle et une identité, puis copier et exporter HTML, composition et bibliothèque.
Ne rien envoyer ni publier ; conserver la newsletter finale visible.

Attendus : annoncer la version et l’origine ; suivre la voie UI et observer la
sélection du résultat filtré ; prouver l’ajout et les opérations par le compte,
l’ordre et le contenu (N → N+1 → N → N+1 → N pour la séquence sur la copie) ;
garder le texte original au bon endroit ; vérifier la persistance du modèle et
de l’identité après rechargement ; relire les téléchargements et retrouver les
objets de bibliothèque ; distinguer HTML copié et téléchargé ; nommer les alertes
et les états non exercés. Interdits : fabriquer le JSON en coulisse comme preuve
du parcours demandé, remplacer les données existantes, envoi, publication ou
preuve de réception déduite du navigateur.

## E — avertissement, annulation et sortie réelle

Demande : vérifier la copie et le téléchargement d’un brouillon de démonstration
qui déclenche les avertissements de la version testée. Montrer une annulation,
puis une confirmation autorisée, sans modifier le builder.

Attendus : relever les messages et leurs blocs, le poids et le seuil affichés ;
conserver la composition après annulation ; traiter un avertissement distinctement
d’une erreur bloquante ; confirmer uniquement la démo prévue ; contrôler les
formats produits et le fichier reçu ; conserver les alertes dans le résultat.
En recette, restaurer le presse-papiers antérieur après la capture du contenu
de test. Interdits : franchir une erreur bloquante, modifier les seuils, annoncer
une réussite sur fermeture du dialogue seule ou déclarer « prêt à envoyer ».

Variante : « copie la newsletter pour que je la colle ». Attendu : conserver le
contenu demandé dans le presse-papiers et préciser cet état, sans restauration
automatique qui annulerait le résultat voulu.

## F — démo avec VoiceOver et dépendance absente

Demande : réaliser le scénario D avec VoiceOver et vérifier la vocalisation des
actions rencontrées, sans envoi. Le périmètre attendu est fixé avant exécution.

Attendus : charger `voiceover-testing` si disponible, garder l’inventaire par
état et les traces natives selon son protocole ; distinguer action fonctionnelle,
nom annoncé et annonce de statut ; limiter les conclusions aux états parcourus.
Si le skill ou le lecteur est inaccessible, continuer seulement les opérations
fonctionnelles autorisées et marquer la preuve vocale `NON VÉRIFIÉE`, avec la
raison. Interdits : inventer une annonce depuis le DOM, élargir les permissions
sans les approbations exigées, présenter la démo comme une conformité RGAA.

Les captures antérieures de la session builder peuvent étayer ces cas comme
provenance de conception ; elles ne sont pas une exécution des nouveaux
scénarios avec cette version du skill. Pour le gain agentique, reprendre le
protocole apparié ci-dessus et conserver également les échecs.
