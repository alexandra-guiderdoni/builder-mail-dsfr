# Contrat UX fixé avant le prototype de poids

Base : `11f445fcea8c5527ead2d53fbd5fb00d116603b4`. Périmètre confirmé par l’utilisatrice : #158, #159 et #160 ; #58 reste clôturée et hors de ce goal.

## #159 : source et destination avant ajout

Le contrôle natif et sa sélection restent identiques : la mesure de référence Chromium donne une sélection automatique du résultat unique à 575 px (`size=1`) et aucune à partir de 576 px (`size=2`). Un résultat unique ne vaut donc pas une sélection universelle. La variante montre un texte court, visible et associé au bouton : composant retenu (ou besoin de choisir), destination nommée avec rang du bloc, ou fin de composition sans destination active. Cette destination est celle du bouton DOM `aria-pressed=true`, comme l’action existante, jamais une nouvelle sélection applicative.

Le filtre, l’aperçu, les groupes, la temporisation de compte, les données et l’insertion restent identiques. Les cas zéro/un/plusieurs résultats, conservation/disparition de sélection, insertion au milieu/en fin et changement de largeur sont vérifiés avant toute conclusion vocale ou humaine.

## #160 : description courte et détail de poids

La description immédiatement liée au bouton est également visible. Elle conserve le poids en Kio, les images comprises et, selon l’état, la gravité et le risque de troncature dans Gmail avec réserve de garantie. Le détail complet actuel (octets, seuils, conseils, réserves) reste accessible dans un élément details/summary nommé, au clavier et au lecteur. La confirmation et ses accès aux blocs, les seuils et l’annonce de succès ne changent pas.

| État | Synthèse liée et visible | Détail |
| --- | --- | --- |
| ok | Poids en Kio, images comprises | Texte complet actuel, dont octets |
| notice | Même poids, Attention, risque Gmail, réserve | Texte complet actuel et repère |
| alert | Même poids, Alerte, risque Gmail, réserve | Texte complet actuel et conseils |
| pending | Calcul en cours, sans ancien nombre | Même état pending sans octets périmés |
| unavailable | Refus empêchant le calcul, sans ancien nombre | Même motif et état indisponible |

Une seule fonction d’affichage alimente les deux textes depuis la même mesure ; aucune nouvelle mesure ni valeur de risque parallèle. Dès qu’une mutation valide du modèle rend la mesure ancienne, synthèse et détail deviennent pending. Le recalcul reste différé comme aujourd’hui, sans rendu lourd à chaque frappe ; au clic, le poids est recalculé par la copie existante. Un brouillon invalide hors modèle ne change ni les garde-fous ni les données de sortie.

Les tests imposant toute la description dans `mail-weight` évolueront vers la liaison à la synthèse visible et l’accès au détail, avec vérifications équivalentes des valeurs et du risque. Les assertions de performance continueront à compter les mesures et les rendus lourds, en distinguant explicitement l’invalidation légère pending d’un recalcul. Cela est fixé avant le prototype. Le convertisseur SNUM conserve sa liaison directe au détail et son comportement lorsqu’il ne possède pas de synthèse.

## Rejet et limites

Rejeter une variante qui perd une contrainte, change la sélection, un seuil, une sortie ou un blocage ; qui annonce un ancien poids comme courant ; ou dont le détail n’est pas accessible au clavier. Comparer les parcours natifs à contenu et environnement constants, y compris annulation et vraie copie HTML/texte. Une réduction de caractères ou une capture native seule ne prouve pas la compréhension humaine. Conserver l’existant si le bénéfice n’est pas étayé.

## #158 : aide image courte et détail conservé

Contrat fixé avant le prototype image : l’aide visible et immédiatement associée au champ conserve PNG/JPEG/GIF/WebP, 10 Mio, 8192 pixels par côté, 16 777 216 pixels au total et 1 Mio pour un GIF animé. Le texte complet actuel reste intact dans un details/summary nommé pour ce champ (article, logo clair ou sombre), après le contrôle de fichier. La largeur cible propre au composant, les conversions, la transparence, la compression et le seuil de 300 Kio restent dans ce détail ; les avertissements après traitement restent au moment existant.

La consultation est facultative, au clavier et au lecteur. Lors du rafraîchissement du même bloc, son ouverture et le focus du summary sont conservés. Passer à un autre bloc referme ses détails, afin de ne pas transporter l’état d’un autre champ ; aucune donnée de préférence n’est persistée. Les tests vérifieront la synthèse visible liée, le détail complet exact, les valeurs numériques et les deux logos distincts ; aucun seuil ou traitement d’image n’est modifié.

## Autorisation native du goal

La case AppleScript de VoiceOver est observée décochée avant cette campagne. L’utilisatrice autorise ensuite explicitement son activation et son maintien activé après les tests. Elle est cochée et vérifiée dans l’interface. Aucun autre accès n’est demandé ou ajouté.

## Corrections supplémentaires explicitement demandées

L’utilisatrice demande pendant la campagne une méta-description et un nom accessible pour `project-input`. La région ouverte possède déjà un libellé et un nom natif corrects dans la référence inspectée. Le champ reçoit néanmoins un nom ARIA explicite identique au libellé visible, contrôlé ensemble pour prévenir la divergence ; la méta-description décrit la composition et l’export sans promettre une réception messagerie qualifiée. L’import, les données et les types acceptés ne changent pas. La suite lancée avant cette demande est conservée comme interrompue : elle comportait aussi une attente clavier devenue obsolète du fait du nouveau détail de poids ; cette attente est adaptée pour vérifier le détail intermédiaire puis le lien d’évitement, sans retirer leur accès.

L’utilisatrice signale aussi les deux titres de dialogues et le bouton `library-confirm` vides au repos dans WAVE. Ils reçoivent un contenu initial pertinent ; les noms contextualisés continuent à être fixés avant `showModal()`. Ces éléments de dialogues fermés ne doivent pas être confondus avec des titres/boutons exposés vides, ni avec les régions live volontairement vides. Aucun changement des actions ou des confirmations n’est introduit.
