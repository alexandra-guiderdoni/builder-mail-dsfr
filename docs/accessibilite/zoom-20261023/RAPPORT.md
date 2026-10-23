# Zoom natif Firefox : observations supplémentaires, qualification ouverte

**Aucune conformité RGAA prononcée. Aucun changement produit.** Ce complément de la [campagne courante](../css-20261023/RAPPORT.md) apporte un zoom natif graphique et un zoom texte, distincts de ses anciennes simulations de viewport. Les [106 critères](../css-20261023/MATRICE-106.md) et [258 tests](../css-20261023/MATRICE-258.md) conservent leurs décisions ouvertes. L’objectif reste 100 % des critères applicables effectivement démontrés.

## Affirmations et preuves

| Affirmation | Source | Verdict et portée |
|---|---|---|
| Firefox applique son zoom natif | Préférence native des profils isolés, DPR, viewport, tailles calculées ; [code Mozilla](https://github.com/mozilla-firefox/firefox/blob/main/browser/components/preferences/config/accessibility.mjs) | Confirmé dans Firefox 156.0 ; aucune transformation CSS ni émulation de viewport |
| Le réglage 200 % double tous les textes mesurés | [Reçu](recu.json), comparaisons par instance | Faux : certains titres atteignent environ 171 % ou 175 % |
| Ces titres peuvent atteindre le doublement | Complément portable à 240 %, deux modes de zoom | Confirmé sur les instances mesurées ; ce n’est pas une qualification de lisibilité |
| Le titre du dialogue est définitivement perdu après erreur | Molette native vers le haut et le bas, géométrie conservée | Non démontré : le titre et les commandes redeviennent visibles |
| Le critère 10.4 est conforme | [RGAA officiel](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#10.4), preuves et limites ci-dessous | Qualification encore ouverte |

## Échantillon et résultats

**245 observations de documents**, avec DOM, JSON et PNG :

- **213 observations initiales** : 71 scènes ou rendus à 100 %, en zoom graphique 200 % et en zoom texte 200 %. Chaque mode couvre huit scènes du portable, huit de la webapp locale, trois SNUM et les 52 exports individuels. Les aperçus sont inspectés dans leur vrai contexte iframe, avec origine opaque et `sandbox=""` conservés. Les compositions de 52 composants passent par l’import de fichier.
- **32 observations complémentaires du portable** : accueil, panneaux ouverts, dialogue en erreur et retour à l’éditeur, à 100 %, 133 %, 150 %, 170 %, 200 % et 240 % graphiques, puis 200 % et 240 % texte. Ce complément relève aussi les valeurs, sélections et media queries, avec 32 commandes Tab et seize actions de molette. Le sujet et la zone JSON synthétiques restent identiques après annulation du dialogue.
- **5 533 comparaisons de fragments textuels** avec pointeurs avant/après dans les [observations par instance](observations.json). Le texte est identifié par empreinte, sélecteur et rang d’occurrence. Parmi les 3 790 comparaisons initiales, 3 789 trouvent leur texte et aucune ne perd sa boîte. Le statut asynchrone d’un accueil web diffère : il reste explicitement non comparable. Aucune disparition de boîte parmi les 1 743 comparaisons du complément.
- **Aucun débordement horizontal du document** mesuré dans les 245 observations. Cette mesure ne contrôle pas tous les débordements ou masquages internes.

À 200 %, les règles typographiques DSFR changent au seuil `48em` : l’en-tête passe de 28 à 24 pixels CSS en zoom graphique, et les titres d’accueil et de dialogue de 32 à 28. Avec le DPR de 2, leurs tailles apparentes calculées sont 48 et 56, au lieu de 56 et 64 attendus pour un doublement. Le mode texte donne également 48 et 56 pixels, avec un DPR de 1. Les media queries du complément confirment le changement de seuil dans les deux modes ; la ressource DSFR épinglée reste intacte.

Les 24 occurrences de titre sous le doublement dans chacun des deux modes de la collecte initiale restent dans le reçu. À 240 %, les 249 fragments du portable comparés dans chaque mode dépassent tous le doublement, avec un minimum calculé d’environ 2,056. Ce résultat montre une possibilité d’agrandissement ; il n’étend pas la recette web ou SNUM à 240 %, et ne qualifie pas toutes les fonctionnalités. Le [document explicatif W3C](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) décrit ce cas des seuils responsive ; il est informatif et ne remplace pas les tests RGAA 10.4.1 et 10.4.2.

Dans les huit dialogues du complément, la molette ramène le titre dans le viewport, puis les deux commandes. Les traces de Tab gardent chaque étape : une étape intermédiaire n’a pas d’identifiant de focus. Elles ne sont pas présentées comme une validation intégrale du clavier. Les valeurs comparées entre profils diffèrent uniquement par l’identifiant de composition généré ; cette différence reste enregistrée, sans normaliser les captures.

## Méthode et reproductibilité

Le [reçu partageable](recu.json) identifie le commit produit, les sept sources recontrôlées, les profils, chaque cas et les empreintes de **748 fichiers locaux distincts**. Les 735 artefacts de capture restent sous `evidence/zoom-natif-20261023/`, ignorés par Git. Les 104 fichiers de rendu réutilisés ont été revérifiés par empreinte avant la collecte ; leur ancienne date de génération ne constitue pas une validation de la version actuelle. Les profils personnels ne sont jamais utilisés.

Les scripts locaux sont `qualifier-firefox.mjs`, `complement-firefox.mjs` et `consolider.mjs` dans ce dossier de preuves ; leurs empreintes figurent dans le reçu. Depuis la racine du dépôt, lancer les deux collecteurs, puis le consolidateur. Chaque collecteur refuse de remplacer un reçu existant : choisir un nouveau dossier pour une nouvelle campagne. Firefox est arrêté avant modification du seul `content-prefs.sqlite` de recette. La préférence native `browser.content.full-zoom` varie de 1 à 2,4, selon les paliers indiqués ; `browser.zoom.full` distingue les modes. La configuration du clavier est limitée au profil isolé.

Le DPR passe de 1 à 2 en zoom graphique, tandis que la largeur CSS passe de 1 366 à 683. En zoom texte, le DPR reste à 1 et la police du corps passe de 16 à 32 pixels. Dans Firefox, les dimensions extérieures sont aussi exprimées en coordonnées CSS affectées par ce zoom : le premier reçu exploratoire les comparait à tort comme une constante. Son indicateur négatif est conservé dans les preuves locales, avec les raccourcis clavier qui n’avaient pas déclenché le zoom. Les PNG sont en pixels CSS ; ils ne prouvent pas seuls l’agrandissement physique. Le facteur nominal 133 % est arrondi par Firefox à un DPR de 1,3333.

## Limites et suite

Une boîte de rendu ne prouve ni lisibilité, ni absence de découpe, de recouvrement ou de texte derrière une modale. La taille calculée multipliée par le DPR mesure une échelle, pas la perception des glyphes. La préparation des panneaux et la saisie utilisent des scripts ; seuls Tab et la molette du complément empruntent les actions natives BiDi. Les valeurs courantes ne sont relevées que dans le complément. La lisibilité, les opérations métier complètes aux différents paliers et le parcours clavier intégral restent à qualifier.

Aucun lecteur d’écran écouté, poste Windows, client mail, installation sur le parc ou nouvelle recette HTTPS n’est déduit de cette collecte. Les 110 tests applicatifs et les 1 160 commandes AY11 de la campagne précédente ne sont pas relancés pour cette seule addition documentaire sur les mêmes octets produit. AY11 n’est pas utilisé pour transformer des captures HTML en preuve de zoom natif.

Astra a donné **GO technique, documentaire et PDV pour publier ce complément personnel** après recalcul indépendant des 748 empreintes, 5 533 pointeurs et ratios, valeurs, déplacements du dialogue et 82 liens locaux. Cette contre-revue est en lecture seule, sans relance de navigateur. Une imprécision rédactionnelle sur les paliers a été corrigée. `npm run check` confirme séparément les deux distributions reproductibles ; aucun changement produit n’est présent dans le diff.

L’issue [#28](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/28), consacrée aux défilements internes, reste distincte : JSON compact confirmé ; changement d’isolation de l’aperçu en attente de décision. Aucun code de cette issue n’est livré par ce complément.
