# Références de l’atelier

## Modèle de courriel DSFR

Source : [GouvernementFR/dsfr-mail](https://github.com/GouvernementFR/dsfr-mail), référence épinglée `8b7b35f35526674f7f4a0225fea8107c2156163b`. Les cinq fichiers de `dsfr-mail/` sont des copies intégrales ; leurs empreintes SHA-256 figurent dans [provenance.json](provenance.json).

Le [README amont épinglé](https://github.com/GouvernementFR/dsfr-mail/blob/8b7b35f35526674f7f4a0225fea8107c2156163b/README.md#licence-et-droit-dutilisation) renvoie à la licence MIT et aux conditions d’utilisation du DSFR. Ces conditions et les droits sur l’identité de l’État restent applicables ; cette application ne les remplace pas. Les mentions de compatibilité de l’amont ne constituent pas une recette de cette application.

La compilation conserve les 52 tables de premier niveau du corps, leurs éléments, styles et attributs de présentation, ainsi que le CSS officiel. Elle rend éditables les textes, liens et images. Les espaces textuels sont normalisés ; le nom de service et les coordonnées de démonstration sont neutralisés ; les liens de démonstration non HTTPS deviennent des URL réservées `exemple.invalid` ; les images deviennent des données incorporées.

Le lien source ajouté après certains blocs est une adaptation de l’atelier. Les modèles prêts à personnaliser sont des assemblages locaux de ces sections. Aucun code du DSFR web n’est ajouté aux courriels. Le contrôle DOM couvre les attributs de présentation ; la fidélité visuelle et la conservation dans les messageries ont leur recette propre.

La préparation du presse-papiers dans `app/source/render.js` est une adaptation locale supplémentaire : bornes de largeur inline, tableaux de présentation contraints et cellules de contenu sans largeur figée. Les cellules décoratives vides et colorées gardent leur épaisseur. Les valeurs éditoriales, liens, images et alternatives sont conservés avant écriture ; Chromium peut éliminer les variantes de logo masquées pendant sa normalisation. Les 52 composants sont testés sans CSS de tête à quatre largeurs. Le rendu HTML téléchargé et les fichiers officiels épinglés restent inchangés par cette préparation.

## Import SNUM et prototype

Le module `prototype/reference/snum-packet.js` est utilisé dans `app/distribution/snum.html` pour analyser les paquets. Sa source et sa provenance initiale sont conservées dans [la provenance du prototype](../prototype/reference/provenance.json). La copie locale contrôle aussi le jour de semaine depuis la correction #24 ; le projet SNUM extérieur reste intact. Le builder générique ne contient pas ce parseur. L’adaptateur local `app/snum/adapter.js` organise les rubriques et les articles en blocs du contrat générique ; son rendu utilise le moteur commun de l’application.

Les fichiers du prototype et son historique restent conservés. Leur qualification ne se substitue pas à celle de l’application.

## Fichiers volumineux et ressources

<!-- PDG-LARGE-FILE-JUSTIFICATION: le gabarit amont de 3250 lignes est conservé intégralement et vérifié par empreinte pour rendre la provenance et les comparaisons observables. Les HTML de distribution incorporent volontairement toutes les ressources ; ils sont générés depuis les sources modulaires, jamais maintenus manuellement. -->

<!-- PDG-BINARY-ASSET-JUSTIFICATION: les quatre PNG de référence et les icônes locales sont nécessaires à la reproduction sans réseau et au manifeste. Les copies dans les distributions proviennent du générateur. -->

La bibliothèque JSON de qualification est aussi générée : elle contient chaque section une seule fois, répartie entre neuf compositions de recette. Le schéma JSON est volumineux parce qu’il décrit les champs des 52 composants sans accepter de propriétés supplémentaires ; il est généré par `scripts/interchange.py`, avec un petit exemple importable. Les sources de `app/source/`, `app/snum/` et les compilateurs restent séparées par responsabilité. Le catalogue éditorial contient seulement les noms et familles des sections de la copie épinglée.
