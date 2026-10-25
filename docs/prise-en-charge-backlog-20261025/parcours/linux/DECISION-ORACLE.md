# Décision de préparation du test d’aperçu (#141)

## Portée

Le changement envisagé concerne uniquement la préparation générique de composition() dans le harnais de test, après reproduction et localisation du blocage Linux. Aucun code de l’application ou de ses distributions n’est visé. Il ne prétend pas corriger la cause interne des promesses natives de décodage.

## Preuves qui motivent la décision

Le fichier intact bloque sans inspecteur ni commande de secours. La composition seule suffit. Les jalons des promesses originales montrent que certains decode() restent pendants avant fonts.ready, sur un document complet avec dimensions naturelles connues et sans nouvelle navigation. La version séquentielle bloque aussi ; forcer une lecture de layout ne suffit pas. Le défilement a donné une série non discriminante. Les résultats négatifs restent conservés, sans hypothèse transformée en cause.

## Contrat retenu pour la préparation géométrique

Le helper doit atteindre le document final demandé (URL et titre exacts), complet, avec l’inventaire attendu de 24 images pour le catalogue ou zéro pour le pré-en-tête seul. Toutes les images comptent, y compris les quatre alternatives CSS masquées. Elles doivent être complètes et avoir des dimensions naturelles positives. La fin de document.fonts.ready reste requise. Les attentes sont bornées à dix secondes et échouent ; aucun dépassement n’est converti en réussite.

Les assertions de hauteur, réduction, URL, titre, messages prématurés et forgés, CSP, source/origine/jeton restent inchangées. Les deux appels decode() sans catch du test d’image tardive et ses contrôles d’agrandissement/réduction restent inchangés. Les recettes de peinture et de copie/export conservent leur propre couverture.

Il s’agit d’une adaptation explicite de l’oracle : disponibilité des ressources nécessaires à la géométrie, et non équivalence à l’API decode(). L’ancien helper attendait le règlement des promesses mais ignorait chaque rejet ; il ne certifiait déjà ni un décodage réussi de tous les pixels ni leur peinture. Le nouveau contrôle ne revendique aucune de ces deux preuves.

## Acceptation et preuves

Contre-épreuves natives : image cassée, inventaire incomplet, image dont la réponse est retenue, document périmé et police réelle dont la réponse HTTP est retenue. Les mêmes fonctions que le helper courant doivent être exercées. Après libération des ressources valides, un contrôle positif doit réussir. Les journaux doivent distinguer les faibles limites des probes négatives de la limite normale de dix secondes.

Une revue indépendante doit contrôler le delta et les contre-épreuves. Ensuite seulement : ciblés des trois moteurs et boucle Linux sans inspecteur ni évaluation de secours ; campagne Linux complète sur l’état intégré. Une non-reproduction instrumentée ou le seul changement d’oracle ne vaut pas gate vert. La cause interne du blocage decode() reste inconnue, même si le nouvel oracle satisfait le contrat géométrique.

Acceptation finale : cinq contre-épreuves natives passent sur les trois moteurs ; ciblés 13/13 par moteur sur Mac et cinq reprises 65/65 sous Chromium Linux sans diagnostic ; gates complets finaux 397/397 Mac et 397/397 Linux arm64, code 0, zéro skip. Les 76 empreintes de la candidate restent inchangées. Revue indépendante : audit-final/REVUE-ORACLE-RESSOURCES.md ; preuves courantes dans oracle-resources/ et final-oracle-integrated/. Cette acceptation qualifie l’oracle géométrique et les gates annoncés, pas la cause interne des promesses decode ni une compatibilité de messagerie.
