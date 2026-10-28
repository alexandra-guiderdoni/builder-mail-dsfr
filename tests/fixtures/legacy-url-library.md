# Bibliothèque ancienne de régression #193

Données synthétiques créées et validées avec le vrai module model.js du SHA c4ceadabcabd52a9184481236b39ff87b18368de, et le catalogue épinglé inchangé. Deux compositions sans image, identifiants stables ; le bouton de la seconde contient une URL HTTPS abrégée acceptée par cet ancien modèle.

Fixture SHA-256 : `1d1d185fc9864b3c40e9c96121d34d69da3c64879550c0c43645c5c2009b1d3a`. Source du modèle ancien SHA-256 : `3ab23e20f48d35e0208942e722e0c5f17173e3a8e8cf75483ab3d61992e71367`.

Les tests insèrent ce snapshot dans un profil IndexedDB jetable, puis rechargent le candidat ; ils ne dépendent pas de la présence de cet ancien commit dans le checkout CI peu profond. La génération de la fixture (opération de maintenance) nécessite l’ancien modèle ; son utilisation dans les tests ne fait aucun appel Git.
