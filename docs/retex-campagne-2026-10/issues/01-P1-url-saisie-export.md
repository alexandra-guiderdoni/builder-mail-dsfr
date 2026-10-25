# [P1] Empêcher la copie et l’export d’une ancienne URL après une saisie invalide

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P1**
Preuve : **confirmé par lecture et simulation T01_INVALID_URL_OLD_EXPORTED**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Le gestionnaire `input` laisse la valeur saisie dans le champ, mais ne remplace `doc` que si la validation réussit. Une URL incomplète ou interdite conserve donc l’ancienne URL dans le modèle. Les sorties restent actives ; leur gestionnaire efface l’erreur avant de diffuser l’ancienne valeur. L’interface et le courriel produit divergent.

## Reproduction

1. Charger l’exemple et fixer le lien de l’action à `https://example.org/old`.
2. Remplacer la valeur du champ par `https://` ou effacer complètement le champ.
3. Activer « Copier le mail » puis exporter le fichier de travail et le HTML.
4. Inspecter le lien dans les sorties.

**Résultat actuel :** Le lien exporté et copié reste `https://example.org/old`. L’erreur de saisie est effacée par l’action de sortie.

**Résultat attendu :** Aucune diffusion d’une valeur différente de la saisie sans indication explicite ; le champ en erreur doit rester identifiable.

## Correction recommandée

Distinguer l’état d’édition et l’état validé. Conserver les saisies intermédiaires, associer l’erreur au bloc et au champ, puis bloquer la diffusion tant qu’une saisie active est invalide. Un éventuel aperçu de la dernière version valide doit être identifié comme tel. La sauvegarde de travail doit préserver les saisies ou annoncer clairement sa limite ; ne pas introduire un rejet de chaque frappe qui rendrait les URL impossibles à composer.

## Critères d’acceptation

- [ ] La copie et l’export HTML sont bloqués ou refusés explicitement tant qu’un lien saisi est invalide.
- [ ] Une tentative de sortie n’efface pas l’erreur non résolue.
- [ ] La saisie progressive, le collage, l’effacement et la correction complète fonctionnent.
- [ ] L’erreur identifie le bloc et le champ, avec association accessible ; vérifier RGAA 11.10.6 et WCAG 3.3.1.
- [ ] Après correction, interface, modèle, sauvegarde, texte copié et HTML utilisent la même URL.

## Tests à ajouter

Test de régression du gestionnaire et test navigateur du parcours complet. Couvrir une URL partiellement tapée, vide, HTTP, javascript, puis corrigée ; contrôler les deux formats du presse-papiers et l’export.

## Références précises

- [prototype/source/editor.js, lignes 57 à 62](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L57-L62)
- [prototype/source/editor.js, lignes 93 à 102](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L93-L102)
- [prototype/source/model.js, lignes 12 à 15](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/model.js#L12-L15)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
