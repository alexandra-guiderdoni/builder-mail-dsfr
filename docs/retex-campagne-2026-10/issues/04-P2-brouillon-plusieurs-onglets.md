# [P2] Protéger le brouillon contre l’écrasement par un autre onglet

## Contexte et qualification

Branche : `prototype/portabilite-courriel`
Commit examiné : `c329339aee8e6ba36288197ab22000772bb248ae`
Priorité proposée : **P2**
Preuve : **politique d’écrasement confirmée ; scénario simulé T04_TWO_TABS_LAST_WRITER, sans IndexedDB réel**

Revue indépendante avec un sous-agent Astra, consolidée avec les vérifications du fil principal. Les simulations citées exécutent le JavaScript réel dans une VM Node avec adaptateurs contrôlés ; elles ne constituent pas une recette navigateur ou messagerie.

## Problème

Toutes les fenêtres d’une même origine écrivent leur document entier dans la clé `current`. Aucun contrôle de version ni signal de modification externe ne protège le brouillon. Une édition dans un onglet ancien peut effacer une modification réalisée dans un autre onglet.

## Reproduction

1. Ouvrir la variante web dans deux onglets de la même origine et du même profil.
2. Dans A, enregistrer un titre puis laisser B charger ce brouillon.
3. Dans A, modifier le titre et attendre la sauvegarde.
4. Dans B, modifier seulement le pied de page puis attendre la sauvegarde.
5. Recharger et inspecter le titre conservé.

**Résultat actuel :** Le document entier de B remplace celui de A, y compris l’ancien titre que B n’a pas modifié.

**Résultat attendu :** Une modification externe est détectée avant de remplacer une version plus récente ; aucune fusion implicite destructrice.

## Correction recommandée

Pour ce prototype à un brouillon, prévoir un verrou d’édition ou un numéro de version vérifié atomiquement dans la transaction IndexedDB. Une notification inter-onglets peut informer l’utilisateur, mais ne remplace pas la protection atomique. Préserver un export de récupération en cas de conflit.

## Critères d’acceptation

- [ ] Une fenêtre ancienne ne remplace pas silencieusement un brouillon plus récent.
- [ ] Le conflit est expliqué et permet de récupérer les deux contenus.
- [ ] La protection fonctionne même si deux sauvegardes sont très proches.
- [ ] La politique est documentée pour plusieurs chemins hébergés sous la même origine, qui partagent actuellement le nom de base.

## Tests à ajouter

Test navigateur à deux pages avec IndexedDB réel et éditions disjointes ; test de concurrence des transactions. Les adaptateurs de la revue prouvent la politique applicative mais pas le comportement du navigateur.

## Références précises

- [prototype/source/draft-store.js, lignes 8 à 8](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/draft-store.js#L8-L8)
- [prototype/source/draft-store.js, lignes 16 à 26](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/draft-store.js#L16-L26)
- [prototype/source/editor.js, lignes 18 à 26](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/blob/c329339aee8e6ba36288197ab22000772bb248ae/prototype/source/editor.js#L18-L26)

## Périmètre

Correction ciblée du prototype. Le catalogue complet et la bibliothèque multi-modèles sont hors périmètre.
