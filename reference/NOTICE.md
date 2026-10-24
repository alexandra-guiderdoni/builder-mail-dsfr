# Références de l’atelier

## Modèle de courriel DSFR

Source : [GouvernementFR/dsfr-mail](https://github.com/GouvernementFR/dsfr-mail), référence épinglée `8b7b35f35526674f7f4a0225fea8107c2156163b`. Les cinq fichiers de `dsfr-mail/` sont des copies intégrales ; leurs empreintes SHA-256 figurent dans [provenance.json](provenance.json).

Le [README amont épinglé](https://github.com/GouvernementFR/dsfr-mail/blob/8b7b35f35526674f7f4a0225fea8107c2156163b/README.md#licence-et-droit-dutilisation) renvoie à la licence MIT et aux conditions d’utilisation du DSFR. Ces conditions et les droits sur l’identité de l’État restent applicables ; cette application ne les remplace pas. Les mentions de compatibilité de l’amont ne constituent pas une recette de cette application.

Le catalogue canonique conserve les 52 tables de premier niveau du corps, leurs éléments, styles et attributs de présentation, ainsi que le CSS officiel. La compilation rend éditables les textes, liens et images. Les espaces textuels sont normalisés ; le nom de service et les coordonnées de démonstration sont neutralisés ; les liens de démonstration non HTTPS deviennent des URL réservées `exemple.invalid` ; les images deviennent des données incorporées.

Le rendu utilise une adaptation dérivée : titres natifs contextualisés, attributs de présentation transférés vers CSS et dix groupes de colonnes en cellules natives, sans flottants. `scripts/mail_layout.py` vérifie les groupes qualifiés et arrête la compilation sur une dérive non reconnue. Cette adaptation ne change ni le contrat canonique ni son empreinte ; les fichiers v1 restent compatibles. Le [dossier courant](../docs/accessibilite/presentation-20261022/RAPPORT.md) décrit les variations visuelles, preuves et qualifications restantes.

Le lien source ajouté après certains blocs est aussi une adaptation de l’atelier. Les modèles prêts à personnaliser sont des assemblages locaux de ces sections. Aucun code du DSFR web n’est ajouté aux courriels. Le contrôle DOM compare le catalogue canonique à la référence ; les contrôles du rendu dérivé sont distincts. La conservation dans les messageries a sa recette propre.

La préparation du presse-papiers dans `app/source/render.js` ajoute des bornes de largeur inline. Les six groupes de contenu utilisent des colonnes égales avec leur gouttière, contrairement aux proportions conservées dans l’export et l’aperçu. Les groupes de logos et les filets décoratifs gardent leur traitement distinct. Les styles Office sont manipulés par chaînes brutes. Les valeurs éditoriales, liens, images et alternatives sont conservés avant écriture ; Chromium peut éliminer les variantes de logo masquées pendant sa normalisation. Les 52 composants sont testés sans CSS de tête à neuf largeurs, puis avec contenus longs ; les lectures réelles brute et filtrée sont contrôlées séparément. Les fichiers officiels épinglés restent inchangés par cette préparation.

## Interface web du builder

Le sous-ensemble [DSFR web 1.15.4](https://github.com/GouvernementFR/dsfr/tree/v1.15.4) est conservé dans `dsfr-web/` : modules CSS `core`, `form`, `input`, `select`, `button`, trois fontes Marianne WOFF2 et icônes référencées. [Sa provenance](dsfr-web/provenance.json) inventorie chaque fichier avec son SHA-256. Les copies CSS et binaires sont intégrales ; `LICENSE.txt` et `CGU.txt` reproduisent les textes officiels.

`scripts/dsfr_assets.py` contrôle ces empreintes à chaque génération. Il incorpore les URL locales en données, remplace les déclarations de fontes par les trois faces Marianne 400/500/700 et omet les références aux cartes de sources. Aucun JavaScript DSFR ni CDN n’est ajouté. Cette incorporation permet la première ouverture hors connexion du fichier unique ; la politique de sécurité autorise les fontes incorporées seulement pour le builder.

Ces ressources concernent l’interface : conteneur commun, grille, typographie, champs et boutons. Les panneaux métier, sections natives `details` et dialogue natif restent locaux ; leur présence ne démontre pas une conformité DSFR/RGAA complète. Le CSS web n’entre pas dans l’aperçu ni dans le HTML des courriels. La page SNUM conserve séparément son ancien socle visuel dans `app/snum/base.css`.

## Import SNUM et prototype

Le module `prototype/reference/snum-packet.js` est utilisé dans `app/distribution/snum.html` pour analyser les paquets. Sa provenance est conservée à deux niveaux dans [la provenance du prototype](../prototype/reference/provenance.json) : `sha256` est l’empreinte amont historique du fichier SNUM tel que copié à l’origine ; `adapted_sha256` est celle de la copie locale actuelle, adaptée pour contrôler le jour de semaine depuis la correction #24. L’écart entre les deux est donc voulu et documenté ; le projet SNUM extérieur reste intact. `npm run check` recalcule l’empreinte de la copie adaptée (`scripts/check_provenance.py`) : toute évolution volontaire du module met à jour `adapted_sha256` et `adaptation` dans le même changement. Le builder générique ne contient pas ce parseur. L’adaptateur local `app/snum/adapter.js` organise les rubriques et les articles en blocs du contrat générique ; son rendu utilise le moteur commun de l’application.

Les fichiers du prototype et son historique restent conservés. Leur qualification ne se substitue pas à celle de l’application.

## Fichiers volumineux et ressources

<!-- PDG-LARGE-FILE-JUSTIFICATION: le gabarit amont de 3250 lignes est conservé intégralement et vérifié par empreinte pour rendre la provenance et les comparaisons observables. Les HTML de distribution incorporent volontairement toutes les ressources ; ils sont générés depuis les sources modulaires, jamais maintenus manuellement. -->

<!-- PDG-BINARY-ASSET-JUSTIFICATION: les quatre PNG de référence, les icônes locales et les trois fontes Marianne officielles sont nécessaires à la reproduction sans réseau. Les copies dans les distributions proviennent du générateur. -->

La bibliothèque JSON de qualification est aussi générée : elle contient chaque section une seule fois, répartie entre neuf compositions de recette. Le schéma JSON est volumineux parce qu’il décrit les champs des 52 composants sans accepter de propriétés supplémentaires ; il est généré par `scripts/interchange.py`, avec un petit exemple importable. Les sources de `app/source/`, `app/snum/` et les compilateurs restent séparées par responsabilité. Le catalogue éditorial contient seulement les noms et familles des sections de la copie épinglée.
