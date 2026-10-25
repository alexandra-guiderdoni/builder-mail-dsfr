# Revue indépendante du builder de courriels DSFR

Date : 22 octobre 2026. Dépôt : https://github.com/alexandra-guiderdoni/builder-mail-dsfr . Branche : `prototype/portabilite-courriel`. Révision figée : `c329339aee8e6ba36288197ab22000772bb248ae`, datée du 21 octobre 2026 à 22 h 58 min 47 s, heure de Paris.

Revue avec un sous-agent **gpt-6-astra**, demandée explicitement par Alexandra, puis consolidation avec une seconde lecture et des vérifications exécutables du fil principal. Le verdict antérieur du dépôt n’a pas été pris pour une validation indépendante. Aucun fichier du dépôt n’a été modifié ; aucun commit, push ou PR n’a été réalisé.

## Verdict

L’architecture est adaptée à une tranche de faisabilité : modèle de composition séparé du HTML, rendu partagé, import/export autonome, stockage local et distributions générées. Elle mérite d’être conservée. Une refonte de framework ou l’ajout d’un backend ne sont pas justifiés par les constats.

Le parcours « ce que je modifie est ce que j’exporte » n’est cependant pas fiable dans tous les cas. Une URL refusée à la saisie peut être remplacée silencieusement par l’ancienne dans le courriel diffusé. Des résultats asynchrones peuvent remplacer une édition plus récente ou injecter une image sélectionnée pour un autre document. Le focus est également repositionné sur un autre bloc après une opération.

**Bilan : 12 constats de correction ou de maintenabilité — 1 P1, 9 P2, 2 P3 — et une proposition P1 de qualification Outlook/Mélissa, distincte des défauts confirmés. Aucun P0 démontré.** Le prototype reste une base d’expérimentation ; l’usage métier exige les corrections prioritaires et la qualification réelle des deux messageries.

## Méthode, preuves et limites

La revue porte sur tous les fichiers suivis du dépôt : sources, générateur, références, distributions, spécification et recette. Les références ci-dessous sont épinglées au commit examiné ; elles restent stables si la branche évolue.

| Vérification | Résultat de cette revue | Limite |
| --- | --- | --- |
| `python3 scripts/build.py --check` | `DISTRIBUTIONS_OK` | Contrôle la correspondance source/distribution, pas les fonctionnalités. |
| `node --check` | Réussite sur les cinq scripts sources et le module SNUM | Vérifie la syntaxe, pas le comportement. |
| Empreintes du reçu et provenance | 18 empreintes du reçu et 3 ressources de référence correspondent | Confirme les octets ; ne valide pas les anciennes observations de recette. |
| Tests des gestionnaires et du rendu | Huit probes du fil principal et une probe indépendante Astra exécutées avec succès | JavaScript réel dans une VM Node, adaptateurs DOM, stockage, FileReader et Image contrôlés. Aucun navigateur ni IndexedDB réel. |
| Générateur sous locale ASCII | Échec reproduit avec `UnicodeDecodeError` | Python 3.12.14, environnement POSIX ; pas un essai Windows. |
| État GitHub | Aucun workflow de branche, statut publié ou check-run retourné pour la révision | Le statut agrégé `pending` avec zéro statut n’est pas une CI en échec. |
| État de la copie locale | `git status --porcelain` vide avant et après les vérifications | Les livrables de revue ont été écrits en dehors du dépôt. |

Node utilisé : 24.19.0. Aucun moteur de navigateur local n’était disponible. La tentative de téléchargement Chromium par Playwright a échoué avec des archives vides ou invalides. Les essais navigateur n’ont donc pas été exécutés. Aucune mesure visuelle de reflow, lecture VoiceOver, copie réelle vers une messagerie, installation PWA ou recette Outlook/Mélissa n’est revendiquée.

Les scénarios de reproduction manuelle des issues sont proposés pour la recette future. Les preuves réalisées sont identifiées séparément. Une simulation d’ordonnancement révèle un défaut du code ; elle ne mesure pas sa fréquence en conditions métier.

## Échelle de priorité

- **P0** : urgence critique, par exemple exécution de code ou destruction généralisée démontrée. Aucun constat de ce niveau.
- **P1** : à traiter avant un usage métier annoncé ; risque de diffuser un contenu erroné, ou qualification indispensable du résultat métier.
- **P2** : défaut fonctionnel, accessibilité, intégrité ou maintenabilité à corriger de façon planifiée.
- **P3** : amélioration de robustesse, portabilité de maintenance ou efficacité, sans blocage utilisateur démontré.

Un niveau A ou AA de WCAG ne détermine pas la priorité d’une issue. Les priorités proposées tiennent compte du contexte prototype et des preuves disponibles.

## Architecture et qualité du code

| Élément | Appréciation et conséquences |
| --- | --- |
| `model.js` | Schéma versionné et identifiants de blocs ; validation utile des types et des URL. La validation de document éditable et celle de document diffusable sont confondues : le rejet de chaque frappe URL crée F01, alors que des libellés vides passent en F03. |
| `render-mail.js` | Rendu centralisé, HTML échappé et sortie texte distincte. Les tableaux de présentation, styles inline, titres et alternatives fournissent une bonne base. L’export HTML n’est pas un message MIME ; sa fidélité mail reste à qualifier. |
| `editor.js` | Interface courte, avec contrôles natifs et événements délégués. Les transitions synchrones et asynchrones partagent un état mutable sans politique unique d’invalidation. La variable `revision` protège le chargement initial, mais pas toutes les autres lectures. |
| `draft-store.js` | Base dédiée et transactions IndexedDB ; la résolution sur `tx.oncomplete` est un bon choix pour annoncer une écriture terminée. Un seul document entier remplace une clé fixe ; aucune protection contre une seconde fenêtre. |
| `sw.js` | Installation atomique des ressources de départ via `cache.addAll` et pas de brouillon dans CacheStorage. Le nettoyage et la recherche de cache sont trop larges pour plusieurs déploiements de même origine. |
| `build.py` | Générateur sans dépendance Python externe et distributions effectivement cohérentes. Encodage et fins de ligne implicites limitent la reproductibilité entre environnements. |
| Module SNUM | Référence copiée avec provenance et empreinte ; seule sa fonction `parse` est utilisée. Le rendu historique non utilisé reste une petite dette, pas un motif de refonte. |

Les espaces de noms `window.MailDocument`, `window.MailRender` et `window.SnumMail` créent un couplage global. Pour ce prototype, il est modeste et n’impose pas de migration vers un bundler ou une architecture plus complexe. Une politique explicite des transitions de document et des validations suffit à traiter les principaux défauts.

## Constats confirmés et corrections

Les descriptions suivantes synthétisent les issues intégralement rédigées dans `issues-proposees-builder-mail-dsfr.md`. Ce fichier contient pour chacune les étapes, le résultat actuel, la correction, les critères d’acceptation et les tests attendus.

| ID | Priorité | Constat et preuve | Références exactes | Correction recommandée |
| --- | --- | --- | --- | --- |
| F01 | P1 | Une URL invalide reste dans le champ ; le modèle garde l’ancienne et la copie/export la diffuse en effaçant l’erreur. Probe T01. | [editor.js 57–62](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L57-L62), [93–102](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L93-L102) | État de saisie explicite, erreur associée au champ et refus de diffusion tant que l’état est invalide. |
| F02 | P2 | Après déplacement/duplication/retrait, le focus est envoyé au premier bouton actif de la liste entière, pas au bloc manipulé. Démontré par le chemin de code ; recette clavier réelle à compléter. | [editor.js 69–80](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L69-L80) | Restaurer le focus par identité stable du bloc et action ; prévoir voisin logique et liste vide. |
| F03 | P2 | Un libellé d’action vide est accepté et produit `<a href="…"></a>`. Un sujet vide produit aussi un h1 vide. Probe T02. | [model.js 19–28](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L19-L28), [render-mail.js 13–19](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/render-mail.js#L13-L19) | Exiger les libellés significatifs avant diffusion et gérer explicitement les titres facultatifs. |
| F04 | P2 | Deux fenêtres écrivent le document entier dans `current`. L’onglet ancien peut effacer une modification d’un autre champ faite dans le premier. Probe T04 avec stockage partagé simulé. | [draft-store.js 8–26](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/draft-store.js#L8-L26) | Version atomique ou verrou d’édition, détection de conflit et récupération des deux contenus. |
| F05 | P2 | La restauration explicite remplace les éditions intervenues pendant la lecture ; interface et stockage peuvent diverger. Probe T05 avec lecture retardée. | [editor.js 92](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L92), comparer [108](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L108) | Vérifier la révision ou un jeton de transition avant d’appliquer la lecture. |
| F06 | P2 | Une image chargée pour un ancien document est appliquée et sauvegardée dans le document neuf si l’identifiant du bloc est réutilisé. Probe indépendante Astra. | [editor.js 41](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L41), [64–67](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L64-L67) | Jeton de génération du document et numéro de requête d’image par bloc ; ignorer les résultats obsolètes. |
| F07 | P2 | L’URL d’un paragraphe importé SNUM est diffusée, mais le formulaire ne permet pas de la consulter ou corriger comme champ. Confirmé par le mapping et le rendu. | [model.js 51–54](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L51-L54), [editor.js 35–37](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L35-L37) | Champ facultatif de lien source pour les paragraphes ; modification et suppression dans toutes les sorties. |
| F08 | P2 | Le faux PNG `data:image/png;base64,AAAA` passe l’import de composition et peut remplacer le brouillon. Probe T03. | [model.js 9–10](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L9-L10), [editor.js 81–84](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L81-L84) | Valider/décoder les images du candidat avant remplacement atomique ; borner les ressources. |
| F09 | P2 conditionnel | L’activation supprime le cache d’un autre déploiement de même origine portant le même préfixe. Probe T06 ; panne de navigateur hors connexion non rejouée. | [sw.js 2–12](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/sw.js#L2-L12) | Namespace par scope/déploiement et recherche dans le cache propre. Peut être différé en P3 pour une origine isolée unique. |
| F10 | P2 | Recettes décrites, mais scripts de comportement et preuves brutes non livrés ; aucune suite métier rejouable dans le dépôt. | [RECETTE.md 9–29](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/docs/RECETTE.md#L9-L29), [58–64](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/docs/RECETTE.md#L58-L64), [.gitignore](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/.gitignore#L1-L3) | Versionner les invariants et quelques parcours navigateur, avec CI proportionnée. |
| F11 | P3 | 30 paragraphes portent chacun une image de démonstration inutilisée : 235 533 octets sérialisés contre 11 673 en vidant ces champs. Probe T08. | [model.js 32–35](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L32-L35), [51–54](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L51-L54) | Ne pas transporter des ressources inutilisées ; préserver l’import des fichiers version 1. |
| F12 | P3 | L’encodage dépend de la locale ; la génération échoue sous locale ASCII contrôlée. Les fins de ligne sont aussi implicites. | [build.py 24–25](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L24-L25), [95–101](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/scripts/build.py#L95-L101) | UTF-8 explicite, fins de ligne canoniques et contrôle des octets. |

### Reproductions déterminantes

**F01 :** fixer un lien à `https://example.org/old`, le remplacer par `https://`, puis copier. Dans la probe, le HTML copié et le JSON exporté contiennent encore l’ancienne URL ; l’erreur est masquée. Le fait qu’un message ait d’abord averti ne suffit pas : la tentative de sortie ne doit pas faire disparaître l’état invalide.

**F02 :** avec les trois blocs initiaux, activer « Monter le bloc 3 ». Le code de restauration du focus cherche le premier bouton actif dans `#blocks`, qui est « Descendre le bloc 1 ». Une seconde activation peut ainsi agir sur un autre bloc. L’effet de cette cible sur VoiceOver reste à vérifier sur navigateur réel.

**F04 :** B charge la version de A ; A change ensuite le titre ; B change seulement le pied de page. Le document entier de B remplace celui de A et remet l’ancien titre. Le problème se situe dans la politique applicative, pas dans la garantie transactionnelle d’IndexedDB.

**F05 :** une lecture de brouillon est maintenue en attente ; l’utilisateur tape « Nouveau » ; la lecture se résout avec « Ancien ». Le gestionnaire restaure « Ancien » à l’écran tandis que la sauvegarde peut déjà contenir « Nouveau ».

**F06 :** la probe Astra retient le décodage de l’image, remplace le document par l’exemple, puis résout le décodage. L’image ancienne est appliquée au nouveau bloc `image-1` et sauvegardée. Le décodage y est simulé ; la preuve porte sur la transition d’état, pas sur la validité du fichier image.

## Sécurité

Les protections observées sont cohérentes avec un éditeur local : échappement HTML des chaînes, URL actives limitées à HTTPS sans identifiants, images limitées aux formes data PNG/JPEG, aperçu isolé par `sandbox=""`, CSP restrictive et empreinte du script principal. Aucune dépendance distante n’est chargée à l’exécution par les distributions examinées. Les données importées ne sont pas insérées comme du balisage arbitraire.

La probe T07 a vérifié l’échappement d’une chaîne `<script>` et d’un faux `<img onerror>`, ainsi que le rejet de quatre URL : javascript, HTTP, avec identifiants et avec espace brut. Elle ne constitue pas un test de toutes les classes de XSS. Aucun chemin d’exécution de contenu importé n’a été démontré.

F08 est un défaut d’intégrité d’import, pas une preuve d’exécution de code. L’absence de taille maximale, de nombre maximal de blocs et de limites de dimensions expose à des traitements coûteux, mais aucun déni de service, seuil dangereux ou blocage du navigateur n’a été mesuré. Les changements de quotas, les erreurs de stockage et les permissions doivent rester des scénarios de robustesse à qualifier.

## Accessibilité RGAA et WCAG

L’éditeur et le courriel généré sont deux surfaces à évaluer séparément. Les numéros suivants désignent les contrôles concernés, pas un taux de conformité.

| Surface | Constat ou contrôle | Référence utile | Statut |
| --- | --- | --- | --- |
| Éditeur | Focus déplacé vers un autre bloc après une action | RGAA 12.8.2 ; WCAG 2.4.3 | F02 confirmé dans le code ; recette réelle à terminer. |
| Éditeur | Erreur URL globale, sans identification du bloc, effacée par une sortie | RGAA 11.10.6 ; WCAG 3.3.1 | F01 confirmé ; revoir l’association au champ. |
| Courriel généré | Action vide et titre vide acceptés | RGAA 6.2.1 et 9.1.2 ; WCAG 2.4.4 et 2.4.6 | F03 confirmé pour ces entrées. |
| Éditeur | Labels associés, titre de cadre, lien d’évitement, contrôles natifs, onglets et régions status/alert présents | Contrôles de structure à poursuivre | Bons points de code, sans garantie de restitution lecteur d’écran. |
| Éditeur et courriel | Redistribution à 320 px, zoom, espacement, contraste des états | RGAA 10.11, 10.4, 10.12 et couleurs ; WCAG 1.4.10, 1.4.4, 1.4.12 | Non mesuré. Ne pas déclarer un échec à partir de la seule feuille CSS. |
| Images | Une nouvelle image conserve l’alternative existante, dont le texte de démonstration | RGAA 1.3.1 ; WCAG 1.1.1 | Comportement observable dans le code ; pertinence à juger sur le contenu réel. |

Les attributs `alt` présents ne prouvent pas que les alternatives sont pertinentes. Inversement, `alt=""` est un choix légitime pour une image décorative : la correction ne doit pas imposer une alternative non vide à toute image. L’éditeur gagnerait à rendre le choix décorative/informative explicite et à demander une relecture de l’alternative après remplacement de l’image.

Les multiples liens « Consulter la source » ne sont pas automatiquement non conformes : leur contexte doit être évalué. Aucune non-conformité n’est déduite de la seule répétition du libellé. Le HTML complet porte `lang="fr"`, tandis que la copie du corps ne transporte pas l’élément html ; la langue après collage doit être inspectée dans le message réel.

## Fonctionnalités et persistance

La tranche décrite réalise trois familles de blocs, un brouillon, les imports structurés, les images locales, la copie et deux exports. Les opérations de duplication et réordonnancement reposent sur des identifiants ; le lien SNUM est conservé dans les sorties. La perte du lien SNUM en duplication évoquée dans la recette précédente ne se reproduit pas par le chemin actuel du rendu : celui-ci utilise `block.url`.

La sauvegarde capture un instantané du document et attend la fin de transaction. Le chargement initial vérifie qu’aucune édition n’a commencé avant d’appliquer le document stocké. Ces choix sont à conserver, puis à étendre aux transitions recensées en F05/F06. F04 exige en plus une politique entre fenêtres.

La conservation sous `file://` dépend du navigateur et du chemin du fichier ; le reçu du dépôt rapporte des essais macOS, que cette revue n’a pas rejoués. La restauration après déplacement du fichier, la fermeture pendant une écriture, un refus de quota, un profil effacé et une mise à jour avec brouillon ouvert restent des risques à qualifier. L’export de travail autonome est un mécanisme de sauvegarde utile et explicitement présenté comme tel.

Le catalogue complet, la bibliothèque de plusieurs modèles, plusieurs identités de service et la fidélité au gabarit SNUM historique sont explicitement différés. **Ils ne sont pas comptés comme des bugs du prototype.** La publication et l’envoi de mail restent des actions distinctes de cette revue.

## Outlook et Mélissa

Le rendu possède les éléments de base d’un courriel HTML : tableaux de présentation, styles inline, largeur nominale de 600 px et sortie texte. Les images sont embarquées en URL `data:`. Le prototype ne fabrique ni message MIME ni pièces jointes inline CID.

La compatibilité Outlook n’est pas uniforme entre versions. Les données primaires Can I email distinguent notamment des versions Windows anciennes sans support et un support partiel d’Outlook 2019. Cela interdit d’affirmer que « tous les Outlook rejettent les PNG/JPEG base64 ». Ces données de rendu ne prouvent pas non plus ce que fait le collage depuis Firefox sur le poste métier. Microsoft documente les représentations CID des images inline, sans certifier le parcours du prototype.

Mélissa doit être qualifiée sur sa variante réelle ; la revue n’a ni ouvert une session ni inféré son comportement d’une URL de connexion. Les retouches du composeur, le transfert des images, la conservation des alternatives et les styles doivent être vérifiés après réception.

**Q01 est une issue P1 de qualification, pas un bug Outlook démontré.** Sa recette exige : versions exactes ; copie et insertion HTML séparées ; PNG et JPEG ; retouche ; envoi autorisé ; lecture avec images disponibles/bloquées ; clavier et lecteur d’écran ; conservation d’un reçu expurgé. Une stratégie CID ou une autre sortie ne doit être choisie qu’après observation du besoin réel.

## Risques non vérifiés à conserver dans la recette

| Risque | Références de code | Vérification nécessaire |
| --- | --- | --- |
| Consommation mémoire et lenteur sur gros fichiers/images | `model.js` 17–29 ; `editor.js` 12–26 et 47–54 | Mesurer tailles, dimensions, nombre de blocs et latence ; fixer des bornes explicites. |
| Redistribution/zoom et restitution complète aux lecteurs d’écran | `style.css` 14–36 ; `shell.html` 10–33 | Navigateur réel, 320 px, zoom et styles personnalisés ; VoiceOver puis environnement Windows cible. |
| Fermeture pendant sauvegarde, quota, effacement du profil | `draft-store.js` 5–26 ; `editor.js` 18–26 | Scénarios de stockage réel avec profil isolé et restauration par export. |
| Mise à jour PWA et brouillon ouvert | `sw.js` 2–12 ; `editor.js` 109 | Versions successives, onglets ouverts, bascule réseau, cohérence code/données. |
| Alternative devenue fausse après remplacement d’image | `editor.js` 64–67 ; `render-mail.js` 12 | Recette éditoriale et choix explicite informative/décorative. |
| Transport des images, styles et langue dans les messageries | `render-mail.js` 12–28 ; `editor.js` 95–98 | Q01, après collage, retouche, envoi et réception. |

## Plan d’action et issues préparées

1. **F01** : rétablir la cohérence entre saisie et diffusion.
2. **F02/F03** : sécuriser les parcours clavier et la présence des libellés utiles.
3. **F05/F06/F08** : rendre les opérations asynchrones et les imports atomiques, avec refus des résultats obsolètes.
4. **F04/F07/F09** : protéger le brouillon entre fenêtres, rendre les sources éditables et isoler les caches si plusieurs déploiements cohabitent.
5. **F10** : accompagner chaque correction d’un test, puis consolider la suite minimale.
6. **Q01** : qualifier les messageries avant l’usage métier ; corriger seulement les différences réellement observées.
7. **F11/F12** : réduire le volume inutile et stabiliser la génération entre environnements.

Les treize issues sont prêtes dans le fichier compagnon. Chacune comprend un titre priorisé, le commit, le statut de preuve, une reproduction, le résultat attendu, la correction proposée, les critères d’acceptation et les tests, avec liens de fichiers/lignes.

À la demande ultérieure de création des issues, une tentative a été effectuée pour F01. GitHub a répondu **403 — Resource not accessible by integration**. **Aucune issue n’a été créée.** La connexion disponible expose des installations pour Alexmacapple et bacoco ; elle n’expose pas d’installation pour le propriétaire `alexandra-guiderdoni`. Aucun autre accès CLI GitHub n’était disponible localement. La revue n’a pas tenté de modifier les autorisations ou de contourner cette restriction par un navigateur sans accord.

## Rejouer les vérifications

L’archive de preuves comprend les scripts, résultats JSON, commandes de contrôle et un README. Elle ne contient pas de copie du dépôt et ne modifie aucune source du projet. Après récupération du commit dans un nouveau dossier de test, les probes s’exécutent avec Node sans dépendance externe.

Les assertions des probes attestent volontairement les défauts présents au commit audité. Après correction, elles doivent être adaptées en tests du comportement attendu ; leur échec sur une version corrigée n’est pas une régression.

## Sources primaires et références

- Sources épinglées du dépôt : https://github.com/alexandra-guiderdoni/builder-mail-dsfr/tree/c329339aee8e6ba36288197ab22000772bb248ae
- RGAA 4.1.2, critères et tests : https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/
- W3C, ordre du focus : https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html
- W3C, identification des erreurs : https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- W3C, intitulé et contexte des liens : https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
- W3C, redistribution : https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- W3C, contenu non textuel : https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html
- Can I email, résultats primaires sur les images base64 : https://github.com/hteumeuleu/caniemail/blob/main/_features/image-base64.md
- Microsoft 365 Developer Blog, images inline et CID : https://devblogs.microsoft.com/microsoft365dev/changes-to-inline-images-in-outlook/

Les références externes ont servi à cadrer les critères et les risques de compatibilité. Les défauts applicatifs sont fondés sur le code du commit et les preuves identifiées, pas sur une comparaison abstraite avec un autre produit.
