# Revue indépendante du code — #158, #159, #160

Date UTC : 2026-10-27T21:29:31.001699+00:00. Base : `11f445fcea8c5527ead2d53fbd5fb00d116603b4`.
Candidat : `/Users/alex/Claude-worktrees/builder-ux-159-160-20261027` (diff non commité).

## Verdict borné

**Aucun finding P0/P1/P2 concret relevé dans le code examiné.** Le diff est cohérent avec les trois contrats. Cette conclusion est une revue statique indépendante, sans nouveau test exécuté et sans qualification de la restitution VoiceOver. Elle ne vaut pas validation de clôture : la suite complète et la comparaison native étaient encore à terminer au moment de la revue.

## Vérifications de code et de contrat

| Périmètre | Preuve lue | Conclusion |
| --- | --- | --- |
| #158, refus durs | `images.js:25-30` et `view.js:113-115` | La description courte, visible et liée au champ, conserve formats, 10 Mio, 8192 px, 16 777 216 px et 1 Mio GIF animé. L’aide complète garde sa formulation et le calcul de largeur cible antérieur. Aucun traitement, encodeur ou limite d’import n’est modifié. |
| #158, détail et focus | `view.js:86-103`, `view.js:113-115` | `details/summary` est nommé pour chaque contrôle ; les libellés et les contenus sont échappés. L’ouverture est capturée par champ et restaurée seulement pour le même bloc. Le summary possède un identifiant stable, permettant au mécanisme de focus existant de le retrouver. Le changement de bloc ne transporte pas l’état du précédent. |
| #159, sélection native | `view.js:151-165` | La reconstruction d’options, le `size`, la préservation de la sélection précédente et l’événement `change` ne sont pas changés. Aucun nouveau composant n’est choisi automatiquement par le code ajouté. |
| #159, destination | `view.js:71-77` et `library-actions.js:94-100` | L’indication lit la même destination DOM `aria-pressed=true` que l’insertion existante ; elle ne prend pas `A.selected` après son remplacement par l’identifiant du nouveau bloc. La fin de composition est indiquée si aucune destination DOM n’est trouvée. Les rafraîchissements du bloc et du catalogue remettent l’aide à jour. |
| #160, cohérence | `files.js:45-60`, `view.js:130-140` | Synthèse et détail dérivent de la même mesure, du même niveau et du même arrondi. Le passage pending retire les octets anciens dans les deux descriptions, puis le calcul différé reste assuré par le mécanisme existant. Le bouton est lié au texte visible, et le détail conserve les octets, conseils et réserves. |
| #160, invariants de copie | `files.js:73-89`, `app/snum/shell.html:6` | Le contrôle, les confirmations, l’écriture HTML/texte et l’annonce de succès n’ont pas changé. SNUM conserve sa liaison à `mail-weight` et ne possède pas l’élément optionnel `mail-weight-summary` ; la branche ajoutée ne lui impose pas la nouvelle présentation. |
| Sécurité de rendu | Diff des quatre sources | Aucun nouveau HTML non échappé issu des données, URL externe ou gestionnaire injecté. L’indication catalogue utilise `textContent`. Aucun changement du modèle ou de la persistance. |

## Tests et preuves relus

- Les nouvelles gardes catalogue vérifient les trois largeurs, les sélections conservées/disparues, zéro résultat sans ajout, une insertion réelle au milieu avec ordre/focus/notice et l’ajout en fin sans destination active.
- Les gardes image vérifient la synthèse visible et associée, l’accès clavier au détail complet, les deux logos distincts, la conservation du focus et de l’ouverture au rafraîchissement, et le changement de bloc.
- Les assertions numériques de l’ancien test image sont déplacées vers la combinaison court + détail complet, sans retrait de la garantie sur les valeurs ni sur la largeur propre au composant.
- Les gardes poids vérifient niveaux, octets, gravité, réserve, indisponibilité, liaison à la synthèse et invalidation immédiate. Le filtre de performance distingue l’invalidation pending des mesures : les assertions sur les rendus lourds, les 25 événements de frappe et le recalcul au clic sont conservées. Le remplacement de l’attente « ancien poids encore affiché » par « aucun ancien poids avant clic » est cohérent avec le contrat fixé.
- `output-invariants.json` rapporte une égalité des HTML copié/exporté, texte, poids et aides image complètes, sur la fixture de 138 487 octets, niveau alert. J’ai lu ce reçu ; je n’ai pas rejoué le calcul.
- Les journaux ciblés gardent des échecs de frappe WebKit (1 événement au lieu de 25). Les contre-épreuves isolées passent sur référence et candidat. Cela ne prouve pas une cause environnementale ; aucun classement définitif ni affaiblissement du test n’est justifié par ces seules données.

## Réserves pour la clôture, distinctes de findings de code

1. La comparaison native avant/après à contenu et environnement identiques reste obligatoire pour justifier le bénéfice d’usage. La réduction de caractères ne suffit pas. Vérifier l’accès au détail et le retour au choix des images, la compréhension source/destination via les annonces, puis la copie réelle confirmée et son annonce de succès.
2. La suite complète est encore en cours à la lecture des journaux. Son résultat ne doit pas être supposé. Toute nouvelle occurrence du défaut de frappe doit rester visible et qualifiée ; une passe isolée ne l’efface pas.
3. Les nouveaux tests à moteur paramétrable ne prouvent pas à eux seuls une recette native Firefox, ni une restitution VoiceOver sous Firefox. Rapporter exactement les moteurs effectivement exécutés et les états non exercés.

Aucun navigateur, test, serveur, autre agent, réglage système, source, test ou état Git n’a été lancé/modifié par cette revue. Seul ce rapport est écrit.

## Empreintes des fichiers examinés

- `app/source/images.js` : `7ba950ac15e06e772cad37b4070f4b98f1894e11ca5dee5197a25365ec9c0b7e`
- `app/source/files.js` : `a5d1ff6a9ba3b854291e54300fa753ceb122683c2b6458e09058308ef1683a32`
- `app/source/view.js` : `03816b862133453e95149024f1331e1360f5d752ebb6841892450cac8e396358`
- `app/source/shell.html` : `8f7db570a0e11f720c8e8a148d2622f7ae9690ec9e412451b1e7313250c63b02`
- `tests/image-import-browser.test.cjs` : `aa624d84283ea8d06ceef81e325478a7dd8271a8f41dbd9346200914561ecfa9`
- `tests/mail-weight-browser.test.cjs` : `deb8ca1287bce48b8628817ba9aaffec706ddcce194d7d9f68f5645a9a08c553`
- `tests/image-help-details-browser.test.cjs` : `d0bcbb7765e05435a54284b50343cf0d11541262dbb10767e30f9dfe8f083d13`
- `tests/catalogue-insertion-help-browser.test.cjs` : `c73d53456b7c5996e630ef03cd880891a3ff1bdd09d0b7d43e7c1f0954b8a4fc`
- `tests/weight-summary-browser.test.cjs` : `eae6ecc021ad946846e71369b154dc221541e4b416163e19470771bd77faa614`
