# Cas d’acceptation : création d’une composition

Chaque point de départ donne une composition dont le nom et l’objet sont explicites, modifiables immédiatement, sans objet daté hérité par erreur. Les cas sont exécutés par `tests/creation-browser.test.cjs` (Chromium et WebKit) et `tests/creation-model.test.cjs`. Toutes les données sont synthétiques.

## Règles communes

- Le nom proposé reprend le libellé du point de départ. S’il existe déjà dans la bibliothèque, il est numéroté : « X (2) », « X (3) ». Aucune composition ne s’appelle « Nouvelle composition ».
- Après la création, l’éditeur s’ouvre avec le curseur dans le champ « Nom dans la bibliothèque », texte sélectionné : la première frappe remplace le nom proposé.
- Un message de statut invite à vérifier le nom et l’objet.
- Un objet qui contient une date (année, mois en lettres, jj/mm, jj.mm.aa, aaaa-mm-jj) n’est jamais repris d’un modèle ou d’une copie : il est remplacé par le nom de la nouvelle composition, et le message de statut cite l’ancien objet. Un objet sans date est conservé tel quel, sans message particulier. La source (modèle ou composition copiée) n’est pas modifiée.

## Information de service

- Étant donné l’accueil, quand je choisis « Information de service » puis « Créer une composition », alors le nom et l’objet valent « Information de service ».
- Quand je tape tout de suite, alors le nom devient ma saisie et l’objet reste « Information de service ».
- Quand je recrée la même composition sans avoir renommé la précédente, alors la nouvelle s’appelle « Information de service (2) », objet compris.

## Lettre d’information

- Mêmes trois cas, avec le libellé « Lettre d’information ».

## Invitation

- Mêmes trois cas, avec le libellé « Invitation ».

## Modèle enregistré

- Étant donné un modèle « Modèle daté » dont l’objet contient une date, quand je clique sur « Créer depuis ce modèle », alors la composition s’appelle « Modèle daté · composition », son objet vaut ce nom, et le message cite l’ancien objet daté.
- Étant donné un modèle « Modèle neutre » dont l’objet ne contient pas de date, alors l’objet est conservé et le message est « Composition créée depuis le modèle. ».
- Dans les deux cas le champ du nom a le focus, texte sélectionné, et le modèle n’est pas modifié.

## Copie d’une composition

- Étant donné une composition « Édition A » à objet daté, quand je la copie depuis l’accueil, alors la copie s’appelle « Édition A · copie », son objet vaut ce nom et le message cite l’ancien objet ; une deuxième copie s’appelle « Édition A · copie (2) ».
- Étant donné un objet sans date, alors la copie le conserve sans message particulier.
- La composition source n’est pas modifiée.

## Hors périmètre

La première ouverture de l’application (« Mon premier courriel »), l’import JSON et l’import SNUM gardent leur nom et leur objet propres.
