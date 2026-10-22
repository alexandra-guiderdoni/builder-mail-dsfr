# Formulaires : contraintes, erreurs et retour du focus

**Qualification RGAA toujours incomplète.** Ce complément vérifie une correction ciblée : le nom de composition et les 13 champs URL du catalogue annoncent désormais leur caractère obligatoire, visuellement et avec `aria-required="true"`. Trois tests nouveaux passent après un échec discriminant avant correction ; la suite complète compte **88 réussites, aucun échec ni saut**. Le contrat, les règles de validation, les rôles des conteneurs et la source facultative sont conservés.

## Preuves et matrices

Les [106 critères](MATRICE-106.md), les [258 tests](MATRICE-258.md) et la [matrice structurée](matrice-rgaa.json) conservent l’objectif de 100 %. Aucun critère n’est nouvellement déclaré conforme ou non applicable. Les deux corrections antérieures, titres et présentation, restent à qualifier. Le taux officiel demeure absent.

La matrice ajoute **365 observations par instance**, avec attendu, observation, méthode, preuve et qualification humaine requise. Elle distingue les observations individuelles des sondes couvrant un critère entier. Les 1 220 observations de la [tranche précédente](../presentation-20261022/RAPPORT.md) restent historiques ; leur ancienne collecte complète n’est pas présentée comme réexécutée ici.

Le [reçu partageable](recu-20261022.json) conserve les empreintes des sources et preuves locales. Les journaux, captures, états DOM et arbres natifs restent sous `evidence/formulaires-20261022/`. La présence d’un reçu ne suffit pas : les trois reçus de formulaires portent aussi `completed`, et le journal terminal conserve le résultat des tests.

## Parcours réellement exercés

| Périmètre | Vérification observable | Limite |
|---|---|---|
| 52 composants, 178 champs du catalogue | Ensemble exact des contrôles rendus comparé aux champs attendus ; étiquettes visibles associées, avec les deux contrôles de source de chaque bloc | Pertinence éditoriale et lisibilité visuelle complète à qualifier |
| Nom et 13 URL obligatoires | Mention préalable et propriété `required` de l’arbre natif Chromium | Aucune annonce vocale écoutée |
| Chaque URL du catalogue | Vide, HTTP et identifiant dans l’URL refusés ; erreur associée ; document valide inchangé ; correction HTTPS acceptée | Cas synthétiques ; aucune destination distante visitée |
| Nom, objet, source facultative | Nom vide ou blanc refusé puis corrigé ; objet vide accepté ; source erronée refusée puis corrigée ou vidée ; aide de l’intitulé conservée | Les champs hors formulaire ne sont pas découverts par le scénario générique AY11 |
| Renommage | Nom vide et blanc refusés avec focus sur le champ ; correction enregistrée ; dialogue refermé ; retour au bouton de la bonne composition | Focus DOM et AX observé, sans restitution vocale |
| Annulation | Bouton puis Échap : données inchangées, retour au bouton ; erreur effacée à la réouverture | Profil isolé |
| Sauvegarde | Document corrigé retrouvé après rechargement | Ne prouve pas un redémarrage complet du poste |

Les onze états de l’application et du convertisseur SNUM ont été recapturés : aucune violation axe détectée ni erreur JavaScript. Les résultats incomplets `color-contrast` et `frame-tested` restent visibles dans le reçu. Leurs causes et leur qualification ne sont pas effacées par ce résultat. Les 1 248 cas de présentation et copie des 52 composants ont été réexécutés dans la suite complète ; ils ne remplacent pas les essais de messagerie.

Le parcours complet Firefox natif 156.0 a aussi été rejoué : compositions, modèle, identité, conversion SNUM et import, image, téléchargements, copie, refus d’import, redémarrage du portable et de la variante web hors connexion. Il termine sans erreur JavaScript avec le verdict `PARCOURS_FIREFOX_OBSERVE`. Il ne qualifie ni la restitution vocale, ni Windows, ni les clients mail ou une installation.

## Ce que signifiaient les six échecs AY11

La lecture du collecteur explique les scénarios antérieurs sans établir un défaut produit : sa découverte trouve le formulaire de renommage même lorsque le dialogue est masqué. Dans cinq états, la soumission vise donc un contrôle non interactif. Dans le dialogue ouvert sur un nom valide, la première soumission enregistre ce nom et ferme le dialogue ; la suivante ne peut plus l’atteindre.

Le scénario nommé `submit_empty` ne vide pas les champs. La valeur générique appelée invalide, `valeur-invalide`, est un nom accepté par ce produit. Le statut d’échec ne prouve donc ni un sélecteur absent ni une validation défectueuse.

Une nouvelle collecte prépare explicitement un nom vide : **58 commandes réussies, dont les 57 variantes AY11 disponibles**, profil `rgaa-106`, axe, formulaires et sondes temporelles. Le scénario est collecté : premier rejet du vide, puis correction valide et fermeture. Ce ne sont pas deux soumissions invalides. Les transitions indépendantes ci-dessus couvrent aussi les champs hors formulaire, en conservant AY11 en lecture seule.

## Qualification normative et contre-revue

Le défaut factuel d’information préalable est corrigé. Son rattachement certain à 11.10.1 pour les contrôles hors `<form>` reste à instruire : le [glossaire officiel](https://accessibilite.numerique.gouv.fr/methode/glossaire/#formulaire) définit le formulaire par sa sémantique. Le [critère 11.10](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#11.10) prévoit aussi un cas particulier pour l’indication obligatoire dans un formulaire à un seul champ ; il ne dispense pas automatiquement des contrôles d’erreur. Aucun rôle n’a été changé pour modifier artificiellement l’applicabilité.

La correction suit l’objectif d’instructions prévisibles décrit par le [W3C pour 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html). Elle est conservée comme candidat corrigé techniquement, sans créer une non-conformité RGAA confirmée ni une conformité globale. Astra a approuvé la correction minimale et demandé deux renforcements des tests, intégrés : ensemble exact des champs rendus et enregistrement effectif du nom corrigé.

La contre-revue finale d’Astra donne **GO local et GO PDV** : delta, journaux, 365 observations, pointeurs de preuves, matrices et empreintes recalculés en lecture seule, sans nouvelle exécution navigateur. Les 283 observations d’étiquettes, 14 d’obligation, 46 d’erreurs et 22 de transitions restent à qualifier ; aucune conformité n’est déduite de cet avis technique.

Personne n’est actuellement disponible pour la qualification manuelle et les essais écoutés ; aucun poste Windows n’est disponible. Ces moyens restent nécessaires pour terminer, ainsi que la qualification éditoriale et visuelle par instance, les contrastes indéterminés, la base navigateurs/lecteurs d’écran et les clients de messagerie. Les issues #2 et #13 restent ouvertes. Aucun envoi de message ni installation n’a été effectué dans cette tranche.

## Reproduire

Depuis la racine, avec les dépendances déjà présentes :

```sh
npm run check
MAIL_BUILDER_EVIDENCE=evidence/formulaires-reproduction node --test tests/form-interactions-browser.test.cjs
MAIL_BUILDER_EVIDENCE=evidence/suite-reproduction npm test
BUILDER_AUDIT_OUTPUT=evidence/audit-reproduction node scripts/audit_browser.cjs
node scripts/recipe_firefox.mjs
```

Pour la collecte ciblée AY11, démarrer `scripts/audit_server.cjs`, puis lancer `scripts/audit_ay11.py` avec le Python AY11 déjà présent, un répertoire neuf, le même `BUILDER_AUDIT_PORT` et `BUILDER_AUDIT_SCENES=dialog-invalid`. Ne pas modifier le produit pendant la collecte. Les noms de scénario restent ceux de l’outil ; examiner ses étapes réelles avant d’interpréter son résultat.
