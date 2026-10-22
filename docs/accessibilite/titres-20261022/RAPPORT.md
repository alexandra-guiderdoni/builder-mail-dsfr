# Accessibilité — titres des courriels

**Objectif maintenu : 100 % de conformité aux critères RGAA applicables. Non atteint ; aucun taux publié.** Cette tranche corrige les titres et renouvelle les preuves sur les distributions modifiées. Qualifications humaines absentes ; défaut transversal d’attributs de présentation confirmé.

Le [dossier précédent](../RAPPORT.md) conserve les observations antérieures et les deux corrections d’interface. Ses résultats ne valident pas cette version. Amonts, AY11 et kit sont restés en lecture seule ; aucun envoi ni installation nouvelle. Aucun opérateur de lecteur d’écran ni poste Windows n’est disponible, selon les réponses de l’utilisateur.

## Périmètre et registre

Treize pages : accueil web, portable HTTP, SNUM, neuf familles couvrant exactement les 52 composants et une composition SNUM complète. Sept états interactifs complémentaires couvrent éditeur, sections ouvertes, erreurs, dialogue, dialogue invalide, SNUM invalide et conversion. Onze états d’interface ont aussi une capture indépendante en fichier local.

- [106 critères](MATRICE-106.md) et [258 tests](MATRICE-258.md) : attentes et liens officiels.
- [Matrice détaillée](matrice-rgaa.json) : observations par critère, page ou état, provenance et qualifications restantes. Elles ne prouvent pas les tests individuels ; l’applicabilité demeure à établir par instance.
- [Reçu partageable](recu-20261022.json) : empreintes des sources et distributions, résultats, échecs de collecte, contrôles indépendants et limites. Le SHA parent précède cette tranche ; les empreintes identifient son contenu exact.

Aucune conformité ou non-applicabilité n’est attribuée automatiquement. Une cible absente d’une sonde ne justifie pas un statut non applicable. Les preuves brutes restent sous `evidence/accessibilite-titres-20261022/`, ignoré par Git ; leur inventaire est empreinté dans le reçu. Une contre-vérification détaillée sur un autre poste exige ces fichiers ou une nouvelle collecte.

## Correction des titres

Le compilateur identifie **32 champs de titre dans 24 composants**. Le rendu produit des titres natifs selon le contexte : principal, rubrique, partie puis titres locaux. Les titres locaux restent frères ; un parent absent ou vide ne crée pas de saut ni de contexte périmé. Auteurs, dates, montants et accroches ne sont pas arbitrairement transformés en titres.

L’adaptation est dérivée des gabarits épinglés. Modèles canoniques, 178 champs, provenance, CSS et empreinte du contrat restent identiques. Aucun changement du JSON v1 ni migration des bibliothèques. L’adaptation concerne builder, SNUM, aperçu, téléchargement HTML et copie HTML.

| Vérification | Observation et limite |
|---|---|
| Régressions discriminantes | Trois échecs et une réussite avant correction ; quatre réussites après. Hiérarchie SNUM, parents absents, réordonnancement, titres vides, frères, lien dans le titre, échappement et aller-retour v1 exercés. |
| Fidélité visuelle | **54 captures PNG identiques octet par octet** : neuf familles, largeurs 1024/600/390 px, clair/sombre, référence canonique contre adaptation dans le même Chromium. Cela ne prouve aucun client mail. |
| Sorties réelles | Téléchargement par la commande d’export et relecture du presse-papiers Chromium. Neuf titres, textes et niveaux identiques entre aperçu, export, copie et arbre AX ; lien du titre conservé après retrait des styles de tête. Aucune annonce vocale écoutée. |
| Suite complète | **78 réussites, 0 échec, 0 saut**. `npm run check` compare les distributions et le prototype aux sources. |
| Firefox natif | Compositions, modèles, identités, SNUM converti puis JSON téléchargé/importé, image locale, duplication, copie, refus d’import invalide, redémarrage avec bibliothèque conservée et relance web hors connexion. La saisie utilise des événements injectés ; aucune qualification vocale ou messagerie. |
| Mise en page des exports | **60 observations** : dix courriels, largeurs 320/640 px, état normal, espacements et taille de texte CSS à 200 %. Aucun débordement ni candidat de texte rogné. Ce n’est pas un zoom réel du navigateur. |

Le constat historique `MAIL-TITRES-001`, rattaché au [test 9.1.3](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#9.1.3), passe à `A_RETESTER` sur P05/P13. Le balisage est corrigé et éprouvé ; pertinence éditoriale, hiérarchie des compositions réelles et restitution par les technologies d’assistance restent à qualifier. Le test 9.1.1 n’est pas déclaré validé.

## Collectes et limites instrumentales

La campagne principale consigne **819 appels sur treize pages**. Elle termine sans phase en échec ; validation `PARTIEL`, audit DSFR et capture automatique des rapports `IGNORÉ`. Une génération de rapport ou un code de commande nul ne constitue aucune conformité RGAA.

Les collectes complémentaires comprennent **20 captures et 1 140 appels de sondes**, avec `--profile rgaa-106`, axe, interactions de formulaires et sondes temporelles explicitement demandés. Dix-huit familles exécutables et **57 variantes CLI distinctes par état**, sans échec de commande dans le manifeste consolidé. Le champ `capture_profile=playwright_standard` désigne le moteur de capture ; il ne remplace pas le profil RGAA des sous-captures. Le catalogue recense 52 critères ; ces unités ne sont ni des tests RGAA ni des conformités. `candidate-static` reste indisponible : aucune valeur proposée pour son argument obligatoire.

Les résultats conservent **634 `collected_no_candidate`, 410 `partially_collected`, 11 `not_collected`, 5 `collected_no_target` et 80 sorties sans ce champ**. Les formulaires gardent six scénarios `failed_target_unresolved` et un `captured`. Les parcours indépendants apportent des preuves complémentaires sans réécrire ces statuts.

Deux appels incorrects du collecteur local ont été conservés : treize parcours statiques vides refusés, puis treize appels avec `--expect` sans parcours refusés. Après correction des arguments, P01 a été vérifiée séparément avant les douze autres pages. Journaux initiaux, collectes déjà réussies et manifestes de reprise restent distincts ; les résultats consolidés figurent dans le reçu.

Le consolidateur exige les noms uniques, la correspondance commande/inventaire/sortie, les critères et les options de chaque capture. Deux mutations du manifeste sur des copies isolées, doublon de commande et critère erroné, sont refusées avant toute génération. Preuve locale : `evidence/accessibilite-titres-20261022/negative-receipt/results.json`.

La capture officielle des rapports exigeait aussi des rapports DSFR désactivés. Un adaptateur local sélectionne les seuls rapports activés et réutilise son inspecteur sans modifier le kit : **quinze captures**, portail à 1440/390 px et treize rapports RGAA à 1440 px, sans erreur ni débordement extérieur. Cela prouve leur ouverture et leurs contrôles techniques, pas le contenu d’un audit humain. La phase automatique reste explicitement ignorée.

Les onze états indépendants n’ont ni erreur JavaScript ni violation axe relevée. Contrastes et cadres indéterminés sont conservés. L’injection indépendante d’axe utilise `bypassCSP:true` ; elle ne valide pas la CSP. Les collectes AY11 des courriels hors iframe complètent ce contrôle sans retirer le sandbox du produit.

Les traces clavier, focus, styles calculés, orientation, redistribution et temporalité restent des observations instrumentées. Les scénarios de formulaires échoués ou sans cible restent visibles dans le reçu. Le contraste des deux sélecteurs a été recalculé sur leurs couleurs CSS opaques ; il ne qualifie ni tous les contrastes ni la totalité de leur image de fond. Zoom réel, visibilité du focus, lecture et ordre pertinent demandent encore leur qualification.

## Défaut confirmé restant à corriger

`MAIL-PRESENTATION-002` : **critère 10.1 non conforme, test 10.1.2**, sur les dix exports HTML examinés comme pages web. L’inventaire indépendant relève **849 éléments contenant 2 991 attributs interdits**, après application des exceptions du référentiel pour les dimensions des images/objets et la taille des sélecteurs. Ce sont des occurrences d’un défaut transversal, pas autant d’issues.

Le [test officiel 10.1.2](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#10.1.2) ne prévoit pas d’exception générale de compatibilité mail. `role=presentation` sur un tableau ne l’exempte pas. Les tableaux ajoutés pour les liens sources et l’adaptation finale du presse-papiers sont également à traiter ; corriger seulement les gabarits serait insuffisant.

Une adaptation CSS dérivée doit préserver cascade, dimensions, alignements, espacements, modes clair/sombre et filets décoratifs. La référence et son contrat restent à conserver. L’absence de poste Windows interdit de promettre le résultat Outlook après transformation ; le courriel reçu reste un périmètre de qualification distinct.

## Contre-audit et travaux restants

Astra confirme en lecture seule la correction structurelle des titres et la conservation du contrat canonique : **GO local**, aucun GO RGAA global. Sa revue porte sur sources, tests, journaux et reçus ; elle n’est pas une nouvelle exécution navigateur ni une écoute de lecteur d’écran. Astra confirme aussi le rattachement et le défaut de présentation du test 10.1.2.

Restent à réaliser : correction des attributs de présentation avec non-régression mail, qualification de chaque test applicable par instance, contrastes et contrôles visuels manquants, essais de lecteur d’écran réellement écoutés, Windows/Firefox/Outlook, restrictions d’accès HTTPS et installation sur le parc. Les issues historiques #2 et #13 restent ouvertes. Une correction publiée ne clôt ni ces recettes ni l’objectif à 100 %.

## Reproduction de cette collecte

Depuis la racine du dépôt, avec les dépendances déjà présentes :

```sh
export BUILDER_AUDIT_OUTPUT=evidence/accessibilite-titres-20261022/courant
export BUILDER_AUDIT_PORT=4191
export BUILDER_AUDIT_ALL_PAGES=1
node scripts/audit_server.cjs
```

Dans un autre terminal, avec les mêmes variables, sans modifier le produit pendant les captures :

```sh
node scripts/audit_browser.cjs
PYTHONDONTWRITEBYTECODE=1 /Users/alex/Claude/git-hors-workflow/ay11-pre-audit/.venv/bin/python -B scripts/audit_ay11.py
npm run check
npm test
```

`BUILDER_AUDIT_SCENES` peut limiter une reprise à une liste d’identifiants séparés par des virgules. Archiver les anciens manifestes avant une reprise ciblée et vérifier la consolidation par scène et variante. Le reçu exige aussi Creator, Firefox, contrastes, sorties et comparaisons visuelles ; il n’est pas une commande autonome de certification.

```sh
PYTHONDONTWRITEBYTECODE=1 /Users/alex/Claude/git-hors-workflow/ay11-pre-audit/.venv/bin/python -B scripts/audit_reports.py "$BUILDER_AUDIT_OUTPUT/campagne"
BUILDER_AUDIT_DOCS=docs/accessibilite/titres-20261022 BUILDER_AUDIT_TESTS=78 python3 -B scripts/audit_receipt.py
```
