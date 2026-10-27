# Recette UX #158, #159 et #160

Base comparée : `11f445fcea8c5527ead2d53fbd5fb00d116603b4`. Les empreintes exactes du candidat testé sont dans [FICHIERS-QUALIFIES.json](preuves/FICHIERS-QUALIFIES.json). Le [contrat](CONTRAT.md) fixe les comportements à préserver et les demandes supplémentaires.

## Résultat produit

- **#158** : les champs image annoncent une aide courte conservant tous les formats et plafonds d’entrée. Le traitement complet reste accessible dans un détail propre au champ, au clavier et avec VoiceOver. Son ouverture et son focus sont conservés lors du rafraîchissement du même bloc ; ils ne sont pas transférés à un autre bloc.
- **#159** : une aide visible, associée au bouton d’ajout, indique le composant effectivement choisi et la destination nommée avec son rang. Les différences natives de sélection entre liste mobile et liste multiligne, le refus sans sélection et l’ordre réel d’insertion restent inchangés.
- **#160** : la description du bouton de copie devient une synthèse visible. Le poids, les images comprises, la gravité, le risque Gmail et la réserve sont conservés ; le détail complet reste accessible. Une modification invalide immédiatement l’ancien poids sans calcul lourd à chaque frappe. Les seuils, la confirmation, la copie et son annonce finale ne changent pas. SNUM conserve sa description complète.
- **Demandes complémentaires** : méta-description de la page ; nom explicite de l’import JSON identique au libellé visible ; contenu initial pertinent pour les deux titres de dialogue et le bouton de confirmation de bibliothèque. Les intitulés précis restent fixés avant l’ouverture des dialogues. L’import possédait déjà un nom correct dans l’arbre natif de référence : une absence de nom actif n’a pas été reproduite.

## Comparaison native VoiceOver

MacOS 26.5.2, VoiceOver 10 français, Chrome for Testing 156.0.8078.4. Même bibliothèque synthétique de trois blocs, même image et même courriel de 138 487 octets, en alerte à 135,2 Kio. La seule instrumentation est l’initialisation identique des données ; aucune fonction produit ni sortie vocale n’est remplacée. Les phrases sont capturées depuis la sortie native de VoiceOver.

| Arrivée sur le contrôle | Référence | Candidat |
| --- | ---: | ---: |
| Image facultative, contexte inclus | 537 caractères | 228 |
| Logo clair | 512 | 203 |
| Logo sombre | 513 | 204 |
| Description du bouton Copier | 296 | 136 |

Tous les détails image et poids ont été ouverts, lus puis refermés avec les commandes natives. L’aide courte ajoute un arrêt de navigation facultatif pour obtenir les détails : la réduction de texte immédiat ne prouve ni une meilleure compréhension humaine ni une durée audio donnée.

Avant ajout, VoiceOver restitue « Composant choisi : “Texte de clôture”. Ajout après le bloc 2 “Article avec vignette et lien”. » L’ajout réel est au rang 3 sur 4, dans la référence comme le candidat. Sans sélection, le refus reste identique. Le retrait d’image est annoncé et le focus revient au champ image ; l’accès au bloc depuis la confirmation atteint le champ URL attendu.

L’annulation ne modifie ni le compteur de changement ni le contenu du presse-papiers. La vraie copie produit les mêmes données natives avant/après : HTML 138 509 octets et texte 583 octets, empreintes identiques. Les 22 octets supplémentaires par rapport au HTML API proviennent de la sérialisation native (méta charset et casse du doctype), documentée séparément. L’annonce finale de copie est strictement identique, avec l’alerte Gmail et les réserves.

Preuves : [mesures natives](preuves/NATIVE-RESULTATS.json), [copie comparée](preuves/native-copy-comparison.json), [sérialisation](preuves/native-pasteboard-serialization.json), [sorties invariantes](preuves/output-invariants.json). Les aides complètes de tous les champs image, le HTML exporté/copier et le texte restent identiques pour la composition témoin.

## Validation et échecs conservés

Les contrôles ciblés Chromium, Firefox et WebKit passent : catalogue 12/12, images 15/15, poids 10/10, compléments accessibilité 9/9 ; campagne UX Firefox 18/18 et WebKit 18/18. `npm run check` passe avec Node 24.22.1 et Playwright 1.64.1, sans mise à jour de dépendances. Les journaux complets sont conservés compressés dans `preuves/`.

**Suite complète finale : 440/441 réussis, un échec, zéro annulé ou ignoré (491,8 s).** Le test `modal-background-browser.test.cjs` échoue sur le contrôle positif après fermeture de la première modale : zéro clic enfant reçu au lieu de un. Le geste sur fond modal et le parcours clavier modal passent auparavant. Cet échec demeure bloquant pour une livraison déclarée verte ; investigation séparée conservée, sans affaiblissement des attentes. Une contre-épreuve isolée passe pour chaque variante. Puis cinq paires référence/candidat, budget fixé avant exécution, reproduisent la même assertion sur la référence à la deuxième paire (génération 2), avec 4/5 réussites sur la référence et 5/5 sur le candidat. Le défaut existait donc avant le diff ; la cause et une éventuelle différence de fréquence restent inconnues. La sonde ajoute uniquement une capture après le clic manquant, sans modifier le geste ni les assertions. Le log de suite reste en échec ; ces contre-épreuves ne le remplacent pas.

Les premières campagnes ne sont pas effacées : attentes ajustées au nouveau contrat pending, dépendance Files retirée de State au profit de UI.summary, et étape clavier supplémentaire du détail de poids explicitement testée. Un échec WebKit de saisie (1 événement au lieu de 25) a été observé dans deux campagnes ciblées. La contre-épreuve isolée passe sur la référence et le candidat ; sa cause reste inconnue. Ce résultat ne permet pas d’affirmer une cause environnementale établie.

La première suite complète a été interrompue pour intégrer les demandes complémentaires : 191 réussis, un échec réel de l’ancienne attente clavier, 57 annulations dues à l’interruption. Le journal et le reçu d’interruption sont conservés. Aucun test n’est ignoré ; aucun échec n’est effacé par une relance présentée seule.

La [revue indépendante](preuves/REVIEW-INDEPENDANTE.md) ne trouve aucun défaut concret P0/P1/P2 sur les trois améliorations UX. Elle précède les ajouts simples de métadonnées, libellé import et contenus initiaux de dialogue, vérifiés ensuite par les tests dédiés ; elle ne vaut pas revue de ces ajouts ultérieurs.

## Ressources, confidentialité et portée

La fenêtre et le serveur de recette ont été fermés, seule la bibliothèque synthétique de l’origine de recette a été supprimée. Les fenêtres préexistantes et les autres serveurs sont préservés. VoiceOver et son contrôle AppleScript restent activés conformément à l’autorisation explicite. Le presse-papiers initial a été restauré avec vérification de chaque type et contenu ; sa sauvegarde privée a été supprimée. Le reçu de nettoyage en conserve le résultat.

Des repositionnements ont lu accidentellement une fenêtre de terminal ; une activation hors cible a été refusée. Les quelques lignes privées concernées sont remplacées dans le corpus versionné par des métadonnées de retrait et empreintes, consignées dans `corpus-redactions.json`. Les originaux privés restent locaux et ne sont pas publiés.

Cette recette qualifie ces comportements et cette sortie native, sans écoute humaine attestée. Elle ne démontre pas une conformité globale RGAA, une réception Outlook/Mélissa ni une qualification de tout le parc. Les issues #13 et #52 restent hors de cette livraison. La présence de contenus initiaux évite les éléments vides signalés ; aucun résultat d’extension WAVE sur le site publié n’est déduit d’un contrôle local du DOM.

Le scan des lignes de code ajoutées du diff staged ne relève aucun des patterns recherchés (844 lignes, aucun match), sans valoir audit sécurité global. Les sondes de diagnostic restent des pièces de preuve, hors suite et hors code livré.
