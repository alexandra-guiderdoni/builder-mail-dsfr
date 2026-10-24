# Utiliser l’atelier de courriels

Ouvrir `app/distribution/portable.html` dans Firefox ou un navigateur compatible. Conserver une copie du fichier et exporter la bibliothèque avant de changer de poste, de profil ou d’emplacement. La [recette](RECETTE-APPLICATION.md) indique les environnements effectivement éprouvés.

## Composer

1. L’accueil « Mes newsletters » présente les éditions déjà conservées. Ouvrir une entrée, ou choisir un point de départ puis « Créer une composition ». Plusieurs compositions peuvent coexister.
2. Modifier le nom dans la bibliothèque et l’objet du courriel. L’objet est conservé dans le fichier de travail ; le reporter dans la messagerie lors de la reprise. Si l’objet reste vide, le nom de la composition devient le titre du HTML exporté et apparaît dans son onglet ; aucun objet de messagerie n’est rempli automatiquement.
3. Sélectionner un bloc dans la liste, puis modifier ses textes, liens et alternatives. Les liens doivent être des URL HTTPS complètes ; les pieds de page acceptent aussi une adresse `mailto:` avec un objet facultatif.
4. Dans « Ajouter un composant », rechercher une famille ou une variante puis l’ajouter. Les boutons du bloc permettent de le déplacer, de le dupliquer ou de le retirer au clavier.
5. Contrôler l’aperçu et l’indication « Bibliothèque sauvegardée dans ce navigateur ».

Le catalogue conserve les structures et les styles du modèle de courriel épinglé. Les variantes encadrent la présentation ; aucun HTML libre n’est interprété. Le texte ressemblant à une balise reste du texte. Le lien source facultatif d’un bloc est conservé après duplication et dans les sorties HTML et texte.

La liste des blocs, le catalogue ouvert, les champs de texte et l’aperçu s’allongent dans la page. Utiliser le défilement normal de la page pour atteindre la fin du courriel. Depuis les champs, « Revenir au bloc sélectionné » rouvre sa liste et replace le focus sur le bloc, même lorsqu’un champ doit encore être corrigé. La zone technique d’import JSON reste compacte avec son défilement interne ; le dialogue de bibliothèque et la page SNUM gardent leur fonctionnement.

Pour personnaliser « Consulter la source », sélectionner le bloc, renseigner « Lien source facultatif du bloc », puis **« Intitulé du lien source »**, par exemple « Lire le dossier complet ». Un intitulé vide garde le texte par défaut. Sans URL, le lien est absent du courriel et l’intitulé reste disponible pour la prochaine saisie d’URL. Les liens déjà intégrés aux composants possèdent leurs propres champs de texte et d’adresse.

Pour les liens intégrés aux composants, le champ **« Intitulé du lien (obligatoire) »** doit contenir du texte. Une saisie vide est signalée et ne remplace pas la valeur enregistrée. Si un ancien fichier contient déjà des intitulés vides, son aperçu affiche les liens à renseigner sans les activer. La copie et le téléchargement HTML sélectionnent le premier champ à corriger. Corriger les champs progressivement ; l’export JSON de sauvegarde reste possible. Dans SNUM, le message indique le bloc et le champ : exporter le JSON puis l’importer dans le builder pour le corriger.

Dans cette copie prototype, **« Article avec vignette et lien »** peut devenir
**« Article sans image »** avec le bouton « Retirer l’image ». Le titre porte
directement son lien ; les autres textes restent éditables dans ce même bloc.
Charger une nouvelle image rétablit la présentation avec vignette.

Le composant **« Gestion des abonnements »** accepte deux liens supplémentaires
avec « Ajouter un lien ». Les actions sont regroupées sur une ligne lorsque
l’espace le permet et reviennent à la ligne sur petit écran. Les adresses et
intitulés se règlent séparément ; retirer le dernier lien supplémentaire rétablit
le rendu initial. Un intitulé vide bloque la copie et le téléchargement HTML.

Ces variantes restent locales à ce prototype. Conserver son fichier portable
avec les compositions concernées : une ancienne version peut refuser ces
nouveaux cas à l’import.

## Gérer Mes newsletters

Chaque entrée de l’accueil est une composition indépendante, par exemple « Lettre du service — octobre ». Son titre ouvre l’éditeur ; « Retour à Mes newsletters » revient à la liste après vérification de la sauvegarde. « Reprendre » ouvre la composition active. Un rechargement du programme revient à l’accueil en conservant la bibliothèque.

Les actions d’une entrée visent cette entrée, même si une autre composition est active :

- « Renommer » change son nom de travail ; son objet reste conservé.
- « Dupliquer » crée une copie indépendante avec ses blocs et images.
- « Exporter » télécharge cette composition JSON avec ses images.
- « Supprimer » demande confirmation ; annuler laisse la composition intacte. Si la dernière entrée est retirée, une nouvelle composition avec les six blocs de départ est créée pour poursuivre.

Le cache web conserve le programme, tandis que la bibliothèque conserve les compositions. **Changer d’édition ne nécessite aucun nettoyage du cache.** Pour transporter ou sauvegarder les newsletters, utiliser l’export de bibliothèque dans « Fichiers et récupération », disponible depuis l’accueil et l’éditeur. La bibliothèque reste propre au navigateur et à son origine ; elle n’est pas synchronisée entre postes.

## Images et identité du service

Charger les logos et visuels depuis des fichiers locaux PNG, JPEG, GIF ou WebP. Ils sont incorporés dans le fichier de travail et le HTML. Attendre la fin du chargement avant un export. Renseigner une alternative pour une image porteuse d’information ; une image décorative peut avoir une alternative vide.

Certains en-têtes comportent deux images, pour les modes clair et sombre : personnaliser les deux emplacements. Les valeurs de démonstration et liens `exemple.invalid` doivent être remplacés avant tout usage réel.

« Identités de service » enregistre les en-têtes et pieds de page de la composition active, avec leurs images et textes. « Appliquer » remplace les en-têtes et pieds de la composition choisie et conserve son contenu central. Chaque application est une copie : modifier une composition ne met pas à jour les autres.

## Modèles et bibliothèque

« Mes modèles » enregistre une copie réutilisable de la composition. Créer depuis un modèle ajoute une nouvelle composition indépendante. Retirer un modèle ou une identité laisse intactes les compositions déjà créées depuis cet élément.

La sauvegarde est automatique dans le navigateur. « Sauvegarder maintenant » permet de réessayer après une erreur temporaire. La bibliothèque contient compositions, modèles et identités ; elle n’est pas synchronisée entre postes, navigateurs ou origines.

Dans « Fichiers et récupération » :

- « Exporter la composition active » produit un fichier de travail JSON avec ses images.
- « Exporter la bibliothèque » transporte l’ensemble, modèles et identités compris.
- Importer un fichier ajoute ses éléments aux éléments existants, avec de nouveaux identifiants. Un fichier du prototype est converti en composition de l’atelier.

Le HTML téléchargé est une sortie pour la messagerie ; conserver aussi le JSON pour reprendre l’édition. L’import ne reconstruit pas une composition à partir d’un HTML arbitraire.

## Importer du JSON générique

Dans « Importer du JSON », coller une composition ou une bibliothèque, puis choisir « Ajouter à la bibliothèque ». Le téléchargement d’un exemple fournit une composition valide sans modifier le travail courant. Le même format est accepté par l’import de fichier.

Le [format générique](FORMAT-JSON.md) décrit les blocs et leurs champs ; son schéma et ses exemples servent à préparer du contenu depuis un autre outil. Un paquet métier brut n’est pas une composition et doit être converti auparavant.

## Collecte SNUM dans sa page dédiée

Ouvrir [snum.html](../app/distribution/snum.html) par double-clic, coller le paquet JSON V519 ou le bloc complet de Collecte, puis « Convertir et afficher l’aperçu ». La page fonctionne dès sa première ouverture hors connexion. Elle présente des rubriques, des titres d’articles avec leur source et date, puis les faits, enseignements, intérêt SNUM et mots-clés dans des blocs distincts.

« Exporter la composition JSON » fournit le fichier à importer dans le builder pour poursuivre l’édition. La page propose aussi le téléchargement du HTML et la copie du courriel. Modifier la collecte désactive ces sorties jusqu’à une nouvelle conversion réussie ; l’aperçu précédent reste visible avec un avertissement.

Les remarques de collecte restent dans le paquet source, hors du courriel. Conserver ce paquet si elles doivent être reprises : cette page ne sauvegarde pas automatiquement la saisie. Le rendu est un assemblage des composants génériques de l’atelier, distinct du gabarit historique de newsletter.

## Récupérer le courriel

« Copier le courriel » écrit le HTML et une version texte dans le presse-papiers, si le navigateur l’autorise. Coller dans un nouveau message, reporter l’objet, vérifier les liens, les images et les variantes. Si la copie est refusée, « Télécharger le HTML » fournit le fichier autonome pour la reprise selon les possibilités du poste.

Dans Gmail ou Mélissa, utiliser la rédaction enrichie du nouveau message. Cliquer dans le corps puis coller avec `⌘V` sur Mac ou `Ctrl+V` sur Windows. La copie sans mise en forme retire les tableaux, couleurs et images. Il faut copier depuis le bouton du builder, sans coller le code source HTML comme du texte. Ajouter le pied de page dans la composition avant la copie.

La copie ajoute des bornes de largeur pour les clients qui retirent les styles de tête ou figent les tableaux en pixels. Les groupes de contenu à deux colonnes utilisent alors des largeurs égales et gardent leur gouttière ; les filets décoratifs gardent leur épaisseur. L’export HTML et l’aperçu conservent les proportions du gabarit et ses modes clair/sombre, avec une adaptation accessible dérivée. Les logos masqués peuvent être éliminés par le presse-papiers de Chromium en mode clair. Contrôler le message reçu dans le client réellement utilisé.

Les images sont incorporées ; leur présence dans le fichier ne démontre pas leur conservation par Outlook ou Mélissa. La [recette opérateur](RECETTE-APPLICATION.md#recette-sur-le-poste-métier) vérifie le message reçu. Aucune connexion à une messagerie ni aucun envoi n’est automatisé.

## Erreurs et récupération

Un champ invalide est signalé et sa nouvelle valeur n’est pas enregistrée. Corriger ce champ ou utiliser « Annuler les champs invalides » avant de changer de composition ou d’exporter. Un import refusé conserve les compositions existantes.

Si la sauvegarde échoue, le travail reste en mémoire : exporter la composition ou la bibliothèque avant de fermer. Si une autre fenêtre a enregistré des changements, voir « Plusieurs fenêtres » ci-dessous.

Si un retour à l’accueil est refusé, les champs restent affichés et les exports de secours restent accessibles sous l’éditeur. Corriger le champ signalé, attendre la lecture en cours ou réessayer la sauvegarde ; ne pas effacer les données du navigateur pour changer de newsletter.

Si le navigateur avertit lors d’une fermeture pendant la sauvegarde, annuler le départ et attendre l’indication de sauvegarde réussie avant de fermer à nouveau.

« Restaurer l’état précédent » relit la sauvegarde précédant la dernière écriture réussie ; ce n’est pas un historique illimité ni une annulation de chaque frappe. Exporter d’abord le travail à conserver. « Exporter les données enregistrées brutes » produit une copie de secours pour le diagnostic ; ce format brut n’est pas un fichier de composition importable.

Une version ou un catalogue inconnu n’est pas réinterprété : conserver le fichier d’origine et demander une migration. Si la bibliothèque stockée ne peut pas être relue, l’atelier préserve le stockage existant ; le travail temporaire doit être exporté jusqu’à une récupération réussie.

## Plusieurs fenêtres

Une seule fenêtre de l’atelier enregistre à la fois dans la bibliothèque de ce navigateur. Quand une autre fenêtre a enregistré entre-temps, ou a repris la main, cette fenêtre passe en lecture seule : un bandeau l’indique, la saisie est désactivée et rien n’y est plus enregistré. Le bandeau propose deux actions :

- « Exporter la bibliothèque en mémoire » : le fichier contient le travail de cette fenêtre, y compris ses modifications non enregistrées ;
- « Reprendre la main » : l’atelier relit la bibliothèque enregistrée, la conserve telle quelle et y ajoute en copies les compositions, modèles et identités modifiés dans cette fenêtre, suffixés de l’heure, par exemple « Lettre d’octobre · copie à 14 h 32 ». Rien n’est fusionné ni remplacé : comparer les deux versions, puis supprimer celle qui ne sert plus. Une suppression faite dans cette fenêtre n’est pas reportée. L’autre fenêtre passe à son tour en lecture seule ; selon le navigateur, elle peut ne le découvrir qu’à sa prochaine modification.

Si l’enregistrement échoue pendant la reprise, rien n’est écrit : la fenêtre reste en lecture seule et son travail doit être exporté.

Après une mise à jour appliquée dans une autre fenêtre, ou si la bibliothèque a été enregistrée par une autre version de l’atelier, la fenêtre reste en lecture seule sans proposer la reprise : exporter la bibliothèque en mémoire, puis choisir « Recharger cette page ». Le rechargement est refusé tant qu’un travail non enregistré n’a pas été exporté. Après le rechargement, importer le fichier exporté pour retrouver ce travail en copies.

## Variante web et mises à jour

La variante web doit être ouverte depuis une origine HTTPS autorisée. Attendre « ressources disponibles hors connexion ». Le bouton d’installation n’apparaît que si le navigateur propose cette possibilité ; l’absence du bouton ne doit pas être interprétée comme une installation réussie.

Avant de quitter le réseau, éprouver la réouverture avec les contenus et images nécessaires. Le cache du programme et la bibliothèque de travail ont des fonctions distinctes. Effacer les données du navigateur peut retirer les deux.

Quand « Appliquer la mise à jour » apparaît, l’atelier exige une sauvegarde réussie avant son rechargement. Exporter auparavant la bibliothèque, surtout avant un changement de version. Le parcours humain d’installation et les règles du parc restent à qualifier.
