# Contrastes : mesures complémentaires des indéterminés

**Les cibles indéterminées disposent de mesures complémentaires, sans conformité RGAA globale.** Ce complément couvre l’union des 18 occurrences signalées par axe dans la tranche précédente : texte des sélecteurs DSFR, chevrons SVG, textes des dialogues et sélecteur derrière un dialogue modal. Aucun fichier du produit n’a changé. Les [106 critères](../formulaires-20261022/MATRICE-106.md), les [258 tests](../formulaires-20261022/MATRICE-258.md) et la [matrice structurée](../formulaires-20261022/matrice-rgaa.json) conservent leurs qualifications : aucun nouveau conforme ou non applicable, taux officiel absent.

## Couverture et résultats

La capture de référence a été renouvelée sur les onze états de l’application et de SNUM : aucune violation axe ni erreur JavaScript, mais **17 contrastes incomplets** conservés. Le relevé précédent en comptait 18 ; seul le titre du dialogue de suppression n’est plus indéterminé dans la nouvelle capture. Ce changement du résultat d’axe n’est pas traité comme une correction du produit. Les mesures couvrent les 18 cibles historiques, dont ce titre.

L’injection locale d’axe utilise le contournement de CSP déclaré par le collecteur de référence. Les mesures ciblées ci-dessous conservent la CSP ; le résultat axe ne prouve pas cette politique de sécurité.

Le collecteur [versionné](../../../scripts/audit_contrasts.cjs) exerce **80 observations** sur le portable réel, dans des profils Chromium neufs, thème clair et largeurs 320 et 1280 px. Il conserve la CSP. Les [observations par instance](observations.json) complètent les 365 observations de formulaires : la matrice contient désormais **445 observations**, toujours à qualifier.

| Cibles | Observations | Mesure obtenue | Portée |
|---|---:|---|---|
| 11 occurrences de sélecteurs accessibles, au repos, au survol et avec focus clavier | 66 | Texte : 9,80369:1 ; chevron : 15,59708:1 | Au-dessus des seuils mesurés de 4,5:1 et 3:1 |
| Descriptions des dialogues | 6 | Texte : 11,37454:1 | Au-dessus du seuil mesuré de 4,5:1 |
| Titre de suppression, 32 px gras | 2 | Texte : 18,09621:1 | Au-dessus du seuil mesuré de 3:1 |
| Sélecteur de départ derrière les trois états de dialogue | 6 | Arbre natif : `activeModalDialog` ; tentative de focus sans effet | Inactivité observée dans cet état ; contraste évalué séparément à l’accueil |

Les ratios complets figurent dans les preuves ; leur comparaison au seuil utilise les valeurs non arrondies. Les seuils des textes et des composants sont distingués selon les [critères RGAA 3.2 et 3.3](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#3.2). Le chevron est stylé par le produit ; aucune exception générale d’apparence entièrement native n’est revendiquée.

## Méthode vérifiée

Les couleurs nominales viennent des styles calculés et du SVG effectivement utilisé, puis le rapport est calculé par luminance sRGB. Les pixels anticrénelés ne deviennent pas les couleurs nominales du texte ou du chevron, conformément aux explications du [W3C sur les contrastes non textuels](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). La capture confirme une peinture compatible dans la zone du chevron et un fond peint ; la réserve CSS sépare les zones de texte et d’image par 8 px.

Pour les textes des dialogues, le collecteur relève les centres des rectangles de caractères, leurs cibles de hit-test et la présence de peinture compatible dans chaque boîte. Les textes mesurés sont simples, sans descendant, avec les styles effectivement inspectés. Le fond opaque appartient au dialogue ; le backdrop derrière lui n’est pas artificiellement composé avec ce fond. Le collecteur refuse les effets de composition, fonds intermédiaires translucides et images inattendues qu’il ne sait pas traiter.

La restitution native confirme que le sélecteur sous le dialogue est ignoré dans cet état ; sa tentative de focus échoue. Cela ne vaut ni annonce vocale écoutée ni exemption générale du sélecteur. L’applicabilité reste à qualifier par test et par état.

## Contrôles négatifs et erreurs conservées

Cinq défauts sont injectés dans les seuls profils de recette : texte de la couleur du fond, réserve droite insuffisante, chevron de la couleur du fond, masque opaque interceptant le pointeur et même masque avec `pointer-events:none`. **Les cinq sont rejetés** par les mesures finales.

Astra a signalé que le hit-test pouvait traverser le dernier masque. Le témoin a d’abord reproduit le faux positif : 40 observations, cinq négatifs, masque non détecté et assertion échouée. Après ajout de la garde de peinture dans les boîtes de caractères, le même masque présente toujours zéro centre obstrué, mais aucune peinture de texte ; il est rejeté. La collecte complète termine ensuite avec 80 observations, cinq négatifs détectés et aucune erreur. Le rouge et le vert restent sous `evidence/contrastes-20261022/`.

Deux premières tentatives du collecteur restent aussi archivées : variable non transmise au contexte navigateur, puis exigence trop stricte d’un pixel exactement égal à la couleur nominale du chevron. La seconde a révélé que ses traits étaient entièrement anticrénelés à cette taille ; la garde distingue désormais peinture et couleur nominale. Ces erreurs d’outillage ne sont pas transformées en défauts du builder.

La contre-revue d’Astra donne **GO local pour ces preuves ciblées**, après lecture, recomptage, comparaison rouge/vert et recalcul des empreintes, sans nouveau navigateur indépendant. Le [reçu partageable](recu-20261022.json) conserve les empreintes des sources et artefacts locaux ; les JSON axe `incomplete` restent inchangés.

## Limites et qualifications restantes

Ces mesures ne détectent pas toute occultation. Quelques pixels compatibles dans chaque boîte ne prouvent pas la lisibilité du caractère entier ; une occultation partielle ou une peinture de couleur compatible peut subsister. Pour les sélecteurs, la bordure inférieure partage la couleur du texte : le nombre de pixels de cette couleur ne prouve pas, seul, la peinture du libellé. Les captures, la géométrie et les styles ont des rôles complémentaires. Un pseudo-élément vide peut être peint ; l’inspection des styles présents ne constitue pas une garantie générale du collecteur.

Les menus natifs de sélection ouverts, les autres moteurs et postes, le zoom réel, tous les indicateurs relevant de 3.3, tous les textes et images de l’application et des 52 composants restent hors de cette mesure ciblée. Aucune conformité globale de 3.2 ou 3.3 n’est affirmée. Les contrastes autres que ces cibles et les vérifications éditoriales, visuelles et vocales restent à qualifier. Personne n’est actuellement disponible pour ces qualifications humaines ; aucun poste Windows n’est disponible. Les issues #2 et #13 restent ouvertes.

## Reproduire

Depuis la racine, avec Playwright et son navigateur déjà présents :

```sh
BUILDER_AUDIT_OUTPUT=evidence/contrastes-reproduction/baseline node scripts/audit_browser.cjs
BUILDER_CONTRAST_BASELINE=evidence/contrastes-reproduction/baseline BUILDER_CONTRAST_OUTPUT=evidence/contrastes-reproduction/mesures node scripts/audit_contrasts.cjs
```

Utiliser un répertoire neuf et conserver les sources pendant l’exécution : le collecteur vérifie leurs empreintes avant et après. Aucune installation ni messagerie n’est appelée. La suite applicative de 88 tests a été exécutée dans la [tranche précédente](../formulaires-20261022/RAPPORT.md), sur les mêmes octets du produit ; elle n’est pas répétée pour cet ajout de mesure. Le contrôle syntaxique du collecteur et `npm run check` passent ; le parcours ciblé ci-dessus exerce directement les 80 observations et cinq contrôles négatifs.
