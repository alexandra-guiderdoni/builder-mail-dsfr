# Historique des livraisons

## Non publié — Contrat de politesse des emplacements vocaux (#122)

- `#error` sépare deux familles : alertes persistantes (échec de sauvegarde, lecture seule) stockées dans l’état et restaurées depuis `A.State.restoreErrorFromState` ; erreurs ponctuelles (champs invalides, actions refusées) qui n’éteignent plus la persistante. `failing(false)` n’efface la mémoire persistante que lorsque plus aucune cause ne la soutient (ni `failed`, ni `readOnly`), pour que `restoreErrorFromState` sache rétablir l’alerte après une sauvegarde qui réussit pendant une lecture seule. Correction du secours disparu après « Annuler les champs invalides » (#86).
- `#notice` étend le jeton `since` aux écrivains différés restants : chargement d’image, copie du courriel, récupération, offre de ré-ouverture, reprise de la main, invite d’installation PWA, export de la copie brute du stockage et annonce de rechargement après activation d’une mise à jour PWA. L’import de projet (`project-input`) utilise un compteur de reads actifs : seul le premier import en cours pose la notice et capture le jeton, les suivants s’empilent sans toucher au `#notice` ni au ticket.
- Section « Annonces » ajoutée à `docs/MAINTENANCE.md` : trois emplacements, propriétaires, deux familles de `#error`, règle du jeton `since`, inventaire des écrivains protégés avec l’exemption motivée du formulaire modal de la bibliothèque, et sous-sections dédiées aux chaînages optionnels nécessaires (dette `pwa.js` et contrainte SNUM `files.js`) et à l’alerte persistante masquée temporairement par `attempt()` (hors scope du contrat).
- Exclusion motivée : volet #107 non reproduit en test (cadre d’audit sans scénario stable), retiré de #122.

## 25 octobre 2026 — Lien source dans le cadre du bloc (#71)

- Le lien « Consulter la source » n'est plus rendu dans une table enveloppe de 600 px distincte : il est injecté comme ligne additionnelle dans la table `wlkm-cl` (496 px) du bloc qui le porte, pour qu'il appartienne visuellement au même cadre éditorial que son article.
- L'intitulé personnalisable `sourceLabel` et son repli « Consulter la source » restent inchangés ; échappement HTML conservé.
- Sur la variante `articleTextTemplate` (SNUM, `mail-31` sans vignette), la bordure basse de séparation est déplacée de la cellule de contenu à la ligne du lien, afin que l'article et sa source forment un seul bloc avant la séparation avec le bloc suivant.
- Repli de compatibilité : si un bloc ne porte pas de cadre `wlkm-cl` (`mail-04`, `mail-07`, `mail-51`), l'ancienne table enveloppe est conservée.
- Tests dédiés : `tests/source-in-frame.test.cjs` (structure, placement dans le cadre, repli, échappement).

## 24 octobre 2026 — Convertisseur SNUM aligné sur le modèle éditorial (#46)

- Un seul bloc « Article sans image » (`mail-31`) par article, sous une partie `mail-17` numérotée par rubrique V519 présente ; titre lié à l’URL, métadonnées « Essentiel · source · date en toutes lettres », puis fait, « À retenir », « Pour le SNUM » et mots-clés dans le même bloc. Les sous-titres de niveau 4 disparaissent par choix de simplification ; le texte reste.
- Introduction alignée sur la convention du paquet : dates de période en toutes lettres, compte d’articles et d’essentiels au singulier ou au pluriel.
- Mention et signature, gestion des abonnements à trois actions et pied Marianne avec le lien vers les données personnelles conservé ; nom de service, signature et adresses fictifs à remplacer par l’identité locale.
- Paire synthétique publique `tests/fixtures/snum-46/` et test de conversion dédié ; dix assertions de forme réécrites. Fidélité visuelle au modèle et réception en messagerie (#13) non vérifiées.

## 23 octobre 2026 — Page de composition extensible (#28)

- Liste et catalogue natif entièrement dans le flux de la page ; champs de contenu ajustés au texte et aperçu ajusté à son document réel. Zone JSON compacte conservée.
- Retour au bloc sélectionné disponible depuis les champs, y compris avec une saisie invalide.
- Seul script de mesure isolé autorisé par décision utilisateur : origine opaque, CSP par empreinte, réseau bloqué ; exports, copie et SNUM préservés.
- 119 tests applicatifs réussis sans saut, recette Firefox portable et web à trois largeurs et au zoom natif de 200 %, frappe et image tardive vérifiées ; [preuves et limites](docs/RECETTE-DEFILEMENT.md).

## 22 octobre 2026 — Atelier autonome et corrections

- Application portable et webapp issues du même socle : 52 composants, accueil « Mes newsletters », bibliothèque locale, modèles, identités et images incorporées.
- Échange JSON générique documenté ; conversion Collecte SNUM dans une page autonome, avec conservation du contrat v1.
- Corrections des courses de sauvegarde, restauration, import et images ; validation des données et erreurs explicites ; cache limité au périmètre et mises à jour reproductibles.
- Copie adaptée aux messageries qui retirent les styles de tête ou figent les largeurs, avec conservation des filets décoratifs et du contenu.
- Focus après suppression du dernier bloc générique rétabli sur « Ajouter un composant », même si cette section est fermée ; régression reproduite puis corrigée.
- Intitulé du lien source personnalisable par bloc, conservé dans les modèles, identités, exports/imports et copie HTML/texte ; anciens fichiers acceptés, texte par défaut conservé si le champ est vide.
- Interface du builder sur les ressources DSFR web 1.15.4 incorporées : Marianne, conteneurs communs, grille à douze colonnes, champs et boutons. Repli et espacements vérifiés sur cinq largeurs ; CSS des courriels et apparence SNUM préservés.
- Mise à jour web corrigée après reproduction d’un ancien HTML repris du cache HTTP de dix minutes : précache rechargé depuis le réseau et version du cache liée aussi au code du worker, sans activation anticipée ni perte de bibliothèque.
- Suite courante de 70 tests réussis sans saut, génération reproductible, recettes natives Mac et essais de messages reçus depuis Gmail et Mélissa.
- Campagne AY11 : 228 variantes de sondes sur quatre états, complétées par dix observations DOM/arbre d’accessibilité du focus. Limites des collecteurs conservées ; aucune annonce de lecteur d’écran ni conformité RGAA déduite.
- Publication GitHub Pages réalisée depuis `main`, limitée aux fichiers statiques de l’atelier, au convertisseur SNUM et au portable ; huit fichiers servis identiques aux distributions, cache public et bibliothèque conservés au rechargement hors connexion.

Les 25 issues techniquement satisfaites ont été fermées sur GitHub. #2 reste ouverte pour les recettes de lecteur d’écran ; #13 pour la qualification complète du transport. Windows/Outlook, les images bloquées, l’installation sur le parc et l’autorisation de son accès à l’origine HTTPS restent à vérifier. La correction de largeur possède des tests locaux ; sa fidélité reçue demeure en qualification. L’activation de Pages et le choix de `main` par défaut ont été effectués dans la session Chrome du propriétaire.
