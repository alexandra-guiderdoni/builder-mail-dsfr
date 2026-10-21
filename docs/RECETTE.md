# Recette du prototype de faisabilité

**Résultat : faisabilité observée sur macOS 26.5.2, Firefox natif 156.0 et Chromium 156.0.8078.4.** Le prototype exerce trois familles de blocs et un seul brouillon. Le produit complet et les messageries métier restent à réaliser ou à qualifier.

## Périmètre

Le prototype éprouve le document de composition et son transport entre fichier portable, variante web et fichiers exportés. Les profils de recette sont isolés des profils utilisateur. Aucune boîte de messagerie n’a été ouverte et aucun message n’a été envoyé.

Le [reçu synthétique](recette-observee.json) conserve les versions, résultats et empreintes des sources et distributions éprouvées. Les captures, téléchargements, scénarios ponctuels et résultats bruts restent localement sous `evidence/`, exclus de Git. Cette fiche est une source primaire de recette ; elle ne revendique aucun reçu de génération PDD.

## Observations exécutées

| Parcours | Observation | Preuve locale |
| --- | --- | --- |
| Génération | Les livraisons correspondent exactement aux sources ; syntaxe JavaScript vérifiée. | `python3 scripts/build.py --check` → `DISTRIBUTIONS_OK` ; `node --check` sur chaque script. |
| Fichier portable | Ouverture dans des profils neufs, édition du titre, image PNG locale, sauvegarde et rechargement. | Reçus Firefox et Chromium ; captures du fichier portable. Aucune requête distante observée pour ce fichier. |
| Blocs | Duplication et retrait observés dans Firefox. | Nombre de blocs contrôlé après chaque action. |
| Conservation | Firefox retrouve le brouillon après fermeture/réouverture d’onglet, puis redémarrage complet du navigateur. | `evidence/verified/firefox-receipt.json`. |
| Transport | Fichiers réellement téléchargés, relus puis réimportés ; images présentes ; restauration dans un profil Chromium neuf et sous l’origine web. | Téléchargements Firefox et Chromium, reçus associés. |
| Copie enrichie | Firefox annonce la réussite après un clic utilisateur ; Chromium permet la relecture réelle de `text/html` et `text/plain`, avec image incorporée. | Reçus finaux ; permissions presse-papiers accordées au contexte Chromium de recette. |
| Import invalide | Format inconnu et URL `javascript:` refusés, titre courant conservé. | Recette Firefox par les contrôles de l’interface et import réel d’un fichier invalide. |
| Contenu échappé | Une chaîne ressemblant à un script reste du texte dans le HTML téléchargé. | Inspection du fichier exporté : absence de balise script, présence de son texte échappé. |
| SNUM | Paquet réel de recette importé ; article dupliqué avec son lien source. | Nombre de blocs et liens du HTML réellement téléchargé vérifiés dans Firefox. |
| SNUM en texte | Source de l’article et du duplicata présentes dans la copie texte et HTML. | Relecture du presse-papiers Chromium après activation du bouton au clavier. |
| Clavier | Flèche droite : onglet guidé activé et focus déplacé. Copie SNUM activée par Entrée. | Reçu Chromium final. Ce contrôle ne couvre pas toute l’accessibilité. |
| Web hors connexion | Préparation du cache, arrêt réel du serveur, refus de connexion TCP, puis rechargement réussi dans les deux moteurs. | Reçus finaux et captures web hors connexion. Firefox réussit aussi après redémarrage complet. |
| Provenance | Les trois copies de référence correspondent aux sources et aux empreintes déclarées. | Vérification SHA-256 contre `prototype/reference/provenance.json`. Aucun changement de ces sources. |

Reçus finaux : `evidence/verified/firefox-receipt.json` et `evidence/verified-keyboard/chromium-receipt.json`. Les deux parcours se terminent par `PARCOURS_PROTOTYPE_OBSERVE`, sans erreur JavaScript enregistrée.

## Erreurs et corrections

- Première connexion Firefox : expression `await` incorrecte dans le scénario BiDi, corrigée dans l’enveloppe d’évaluation. Échec conservé dans `evidence/firefox-attempt-1.json` ; aucun changement applicatif nécessaire.
- Relecture du modèle : validation des URL étendue à tout lien renseigné, indépendamment du nom du bloc. Le fichier avec lien `javascript:` est ensuite refusé par le navigateur sans remplacer le brouillon.
- Revue indépendante du code : la duplication d’un article SNUM perdait son lien HTML, car le rendu dépendait du préfixe de son identifiant ; sa version texte omettait aussi l’URL. Le rendu utilise maintenant le lien porté par les données. Les deux régressions sont éprouvées dans les sorties réelles.
- Contrôle Chromium de la copie SNUM à la souris : attente expirée ; une autre tentative a perdu sa page. Le diagnostic de clic n’a enregistré aucune activation du bouton. L’activation par Entrée a produit le clic, la copie et les deux formats attendus. Le scénario final utilise ce parcours clavier ; les échecs restent dans `evidence/verified/` et `evidence/verified-chromium/`. Cette observation ne qualifie pas tous les parcours de souris.

## Reproduction locale

Les commandes de génération et de contrôle sont exécutables sans dépendance Python externe :

```sh
python3 scripts/build.py
python3 scripts/build.py --check
node --check prototype/source/model.js
node --check prototype/source/render-mail.js
node --check prototype/source/draft-store.js
node --check prototype/source/editor.js
node --check prototype/source/sw.js
node --check prototype/reference/snum-packet.js
python3 -m http.server 8765 --bind 127.0.0.1 --directory prototype/distribution/web
```

Ouvrir `prototype/distribution/portable.html` par double-clic, ou la variante web à `http://127.0.0.1:8765/`. Après préparation du cache, arrêter le serveur avec Ctrl+C puis recharger la variante web. L’application distribuée ne requiert ni Python ni Node.js.

Les scénarios ponctuels locaux utilisent Firefox via WebDriver BiDi et le Playwright déjà installé dans le workspace. Ils ne sont pas des dépendances de l’application et ne constituent pas une suite de tests livrée. Les parcours guidés du prototype permettent une reprise manuelle.

## Réserves de qualification

- Windows avec Firefox : non exercé depuis le Mac.
- Outlook installé et Mélissa : aucun accès, collage métier, retouche, envoi ou réception réalisés.
- Installation native sur le parc administratif : non exercée.
- Accessibilité : vérifications ciblées, sans audit complet RGAA.
- Durabilité du stockage : un parcours de sauvegarde/relecture ne prouve pas la conservation après effacement de profil ou dépassement de quota.
- HTTPS réel, changement de version avec brouillon ouvert, fermeture pendant sauvegarde et refus de permission : non exercés.
- SNUM : les articles sont aplatis en paragraphes ; regroupement par rubrique et fidélité au gabarit historique non réalisés. Les remarques de collecte restent dans le paquet source, hors composition et hors courriel.
- Catalogue complet, plusieurs brouillons, modèles et identités de service : hors prototype. Les images importées sont limitées à PNG et JPEG.

Les images incorporées sont présentes dans les fichiers et le presse-papiers observés. Leur conservation après collage et envoi par Outlook ou Mélissa reste inconnue. Le cache observé ne prouve pas l’installation native de la webapp.

## Parcours opérateur sur poste métier

1. Relever Windows, Firefox et la variante/version d’Outlook ; identifier le webmail et ses restrictions.
2. Ouvrir le fichier portable sans réseau, modifier texte et image, attendre la sauvegarde puis fermer et rouvrir.
3. Exporter le fichier de travail et le restaurer dans un autre profil ou poste, avec ses images.
4. Copier le mail, le coller dans un nouveau message, effectuer une retouche, puis faire réaliser l’envoi de recette par un opérateur autorisé.
5. Examiner le message reçu avec images disponibles puis bloquées ; comparer ordre de lecture, liens, styles et alternatives.
6. Répéter le transport avec Mélissa. Noter précisément les différences ; ne pas conclure pour un autre moteur non exercé.
7. Depuis une origine HTTPS autorisée, préparer la variante web, vérifier l’installation si permise puis la rouvrir réseau coupé.

## PDV pass

Cible : branche locale `prototype/portabilite-courriel`. Artefacts inspectés : diff indexé, sources du modèle, rendu, interface, stockage et worker, générateur, références, distributions et documents de recette.

Le rendu du lien dépend maintenant des données du bloc. Le modèle et le rendu restent séparés de l’édition et du stockage ; aucune couche supplémentaire ni worker de calcul n’est nécessaire à cette tranche. La duplication des distributions est produite par le générateur. Tous les fichiers sources et documentaires restent sous 200 lignes ; les deux HTML incorporés de 435 lignes portent leur justification.

Vérifications : revue indépendante des chemins critiques, relecture du diff, génération déterministe, syntaxe, empreintes, accents et parcours navigateur décrits ci-dessus. Aucun bloqueur structurel relevé pour le prototype ; mises à jour, catalogue complet et usages métier restent hors de ce verdict.

**GO pour conserver cette tranche de faisabilité.** Ce verdict ne qualifie pas le produit complet.

## Conclusion de faisabilité

Le document indépendant du DOM, le moteur partagé, IndexedDB et le fichier de travail avec images franchissent les parcours exercés dans les deux moteurs disponibles. Ces choix peuvent servir de base à la prochaine réalisation. Le prototype reste isolé : la qualification Windows et messagerie, le catalogue complet, la bibliothèque et la stratégie de mise à jour sont nécessaires avant de conclure sur le produit demandé.
