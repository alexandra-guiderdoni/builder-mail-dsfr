# #149 — nettoyage borné aux ressources de la mission

Le défaut historique concerne la fermeture d’anciennes sessions d’automatisation par une commande globale. Aucune preuve ne montre un pilotage du navigateur personnel. Le ShipGuard installé reste inchangé : le présent dossier contient une proposition de patch, pas une installation.

- `sg-visual-run-owned-session.patch` et `sg-visual-run-owned-session.proposed.md` : nom unique créé pour le run, chaque commande vise explicitement cette session, fermeture de cette seule ressource ; absence de session allouée = aucune fermeture.
- `patch-manifest.json` : version et empreintes de la source installée et de la proposition. L’adaptateur conserve normalement la source amont à l’identique ; une modification globale exigerait son propre périmètre.
- `probe-owned-sessions.cjs` : session témoin réelle indépendante, scénarios succès, erreur et interruption SIGINT. Le registre d’allocation et le finally ne ferment que les noms possédés.
- `owned-sessions-result.json` : trois scénarios valides, codes 0/1/130 attendus, témoin vivant et lisible après chaque nettoyage ; `globalCleanupExecuted:false`.

Deux essais préparatoires de la sonde ont révélé des erreurs de fixture (titre/charset, puis worker sans handle actif). Ils ne constituent pas des validations. La seule ressource possédée restée ouverte lors du second essai a été fermée par son nom exact ; le scénario final et son registre prévoient cette récupération. Aucune commande globale n’a été utilisée.

Limites : le cycle natif complet du skill ne s’est pas exécuté avec ce patch ; le test porte sur la règle de possession au niveau CLI. #149 reste ouvert tant que la correction n’est pas intégrée et qualifiée dans la source propriétaire de ShipGuard. Pas de modification du cache, du générateur partagé, des configurations ou des sessions préexistantes.
