# Historique des livraisons

## 22 octobre 2026 — Atelier autonome et corrections

- Application portable et webapp issues du même socle : 52 composants, accueil « Mes newsletters », bibliothèque locale, modèles, identités et images incorporées.
- Échange JSON générique documenté ; conversion Collecte SNUM dans une page autonome, avec conservation du contrat v1.
- Corrections des courses de sauvegarde, restauration, import et images ; validation des données et erreurs explicites ; cache limité au périmètre et mises à jour reproductibles.
- Copie adaptée aux messageries qui retirent les styles de tête ou figent les largeurs, avec conservation des filets décoratifs et du contenu.
- Suite de 64 tests réussis sans saut, génération reproductible, recettes natives Mac et essais de messages reçus depuis Gmail et Mélissa.
- Publication GitHub Pages préparée depuis `main`, limitée aux fichiers statiques de l’atelier, au convertisseur SNUM et au portable.

Les critères techniques de 25 issues sont satisfaits. #2 reste ouverte pour les recettes de lecteur d’écran ; #13 pour la qualification complète du transport. Windows/Outlook, les images bloquées, l’installation sur le parc et l’origine HTTPS approuvée restent à vérifier. La correction de largeur possède des tests locaux ; sa fidélité reçue demeure en qualification.
