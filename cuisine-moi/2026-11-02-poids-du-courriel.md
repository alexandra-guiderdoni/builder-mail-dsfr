Poids du courriel et aide à la copie : notes cuisine-moi
=======================================================

Date : 2026-11-02 | Objectif : décider quoi faire des textes « Comprendre le poids du courriel et les repères » et de l’aide à la copie Chromium, jugés anxiogènes, incompréhensibles et trop techniques par Alex.

Cadre : brainstorm demandé par Alex, sans réalisation.

## Résumé / décisions clés

- **Q1, poids : seulement quand utile.** Rien n’est affiché sous 90 Kio. Au-delà, un seul message clair invite à alléger. Le détail technique passe dans l’aide, et le dialogue de vérification garde l’alerte.
- **Q2, aide à la copie : conseil court.** Une phrase après la copie, « Avant d’envoyer, faites-vous un envoi de test et vérifiez les liens et les images », remplace l’aide permanente. Le détail sur Chromium et le pré-en-tête rejoint l’aide.

## Prochaine étape proposée

Spécifier la tranche « poids et copie en langage courant » dans `docs/tickets/` : messages, emplacement de l’aide, critères d’acceptation. Elle doit garder les seuils et les calculs et réécrire les quatre fichiers de tests du poids. Rien n’est réalisé avant validation par Alex.

## État vérifié dans les sources (`main` à `2393227`)

- **Connu, utilité réelle.** Le poids sert à prévenir une troncature : au-delà de 90 Kio (« Attention ») puis de 102 Kio (« Alerte »), Gmail peut n’afficher qu’une partie du message (`render.js`, `WEIGHT_NOTICE` et `WEIGHT_ALERT`). Ces niveaux alimentent aussi le dialogue de vérification avant copie ou téléchargement (`checks.js`).
- **Connu, trois couches d’affichage dans l’aperçu.**
  - Une ligne toujours visible, « Poids du courriel à copier : … Kio, images comprises » (`weightSummary`).
  - Un détail repliable, « Comprendre le poids du courriel et les repères » : octets, pourcentages, occurrences d’images, Base64, limites de Gmail (`weightText`).
  - Une aide permanente sur la copie avec Chromium (`#clipboard-help`).
- **Connu.** Sous les seuils, le niveau est « ok » : la ligne visible n’affiche alors aucun avertissement, mais le détail reste disponible.
- **Connu, coût d’un changement.** Quatre fichiers de tests portent sur le poids : `mail-weight.test.cjs`, `mail-weight-browser.test.cjs`, `weight-breakdown-browser.test.cjs`, `weight-summary-browser.test.cjs`. Le conseil (`weightAdvice`) et le risque (`weightRisk`) sont aussi repris dans le message de succès de la copie.
- **Inconnu connu.** On ignore à quelle fréquence de vraies newsletters dépassent 90 Kio. L’exemple montré par Alex fait 78,8 Kio, sous le seuil.
- **Inconnu connu.** L’avertissement Chromium (pré-en-tête et variantes d’images supprimés à la copie) décrit une limite réelle, observée en recette, mais son effet concret pour l’utilisateur n’est pas expliqué.

## Journal questions-réponses

### Q1 - Affichage du poids
- Question : que fait-on de l’information de poids, utile contre la troncature Gmail mais affichée en permanence et en termes techniques ?
- Options présentées :
  - Seulement quand utile.
  - Tout enlever de l’aperçu, en ne gardant que le dialogue de vérification.
  - Garder en plus simple, avec une jauge permanente.
- Recommandation : seulement quand utile.
- Capture : Alex retient « Seulement quand utile ».
  - Sous 90 Kio, l’aperçu n’affiche ni ligne de poids ni détail.
  - Au-delà, un seul message en langage courant : « Votre courriel est lourd : Gmail risque de le couper. Allégez les images ou le texte. » Il est modulé selon ce qui domine (images ou texte), en reprenant le conseil existant (`weightAdvice`) sans chiffres techniques.
  - Le détail technique (octets, répartition, Base64, limite de Gmail) quitte l’aperçu pour l’aide.
  - Le dialogue de vérification avant copie ou téléchargement garde l’alerte de poids.
- Drapeaux :
  - Libellé exact des messages « Attention » (90 Kio) et « Alerte » (102 Kio), ou un seul message -> conception.
  - Le message de succès de la copie reprend aujourd’hui le risque et le conseil ; à simplifier de la même façon -> conception.
  - Les quatre fichiers de tests du poids sont à réécrire sur le nouveau comportement, en gardant les seuils et les calculs -> réalisation.

### Q2 - Aide permanente sur la copie
- Question : que fait-on de l’aide sur la copie avec Chromium, réelle mais technique ?
- Options présentées :
  - Un conseil court, affiché après la copie.
  - L’enlever.
  - La garder, reformulée sans jargon.
- Recommandation : conseil court.
- Capture : Alex retient « Conseil court ».
  - L’aide permanente sous l’aperçu disparaît.
  - Après une copie réussie, le message dit : « Avant d’envoyer, faites-vous un envoi de test et vérifiez les liens et les images. »
  - Le détail (Chromium, pré-en-tête, variantes de logos masquées) rejoint l’aide, avec le détail du poids.
- Drapeaux :
  - Emplacement et forme de « l’aide » qui reçoit ces détails : guide `UTILISATION.md`, section repliable ou page d’aide, à articuler avec l’aide repliable prévue au brainstorm de première utilisation -> conception.
  - Annonce vocale du message de copie, déjà réduite par `c4ceada`, à garder concise -> conception.

## Drapeaux ouverts

- Fréquence des dépassements de 90 Kio sur de vraies newsletters -> Alex.
