# Défilement de la page de composition — issue #28

La liste des blocs, le catalogue natif, les champs de contenu et l’aperçu s’allongent désormais dans la page. Le document principal garde son défilement normal. Le JSON d’import reste compact par décision utilisateur ; le dialogue de bibliothèque et la page SNUM gardent leur fonctionnement.

## Décision et fonctionnement

L’utilisateur a explicitement autorisé un unique script de mesure dans l’aperçu. `sandbox="allow-scripts"` conserve l’origine opaque, sans `allow-same-origin`. Les CSP du parent et du Blob n’autorisent ce script que par son empreinte SHA-256. Le réseau reste interdit dans l’aperçu. Les exports, la copie et SNUM ne reçoivent aucun script de mesure.

`preview-measure.js` mesure le corps réel après chargement, changement de taille, police ou image. Il compte aussi l’espace vertical pris par une barre horizontale native éventuelle ; cela ne démontre pas sa suppression dans tous les contenus. Le parent reçoit seulement un message de dimensions et vérifie source, origine, jeton courant, largeur et hauteur entière. Il conserve la hauteur précédente pendant une nouvelle navigation. Aucun accès au DOM de l’application n’est donné au courriel.

Les champs sont mesurés après création, import, saisie, changement de largeur ou réapparition. Le catalogue conserve ses options natives, son filtre et sa sélection ; sa taille suit les résultats. Depuis les champs, « Revenir au bloc sélectionné » rouvre la liste et y replace le focus, y compris avec un champ invalide.

## Résultats locaux du 23 octobre 2026

- **119 tests réussis sur 119**, aucun échec, saut ou annulation ; génération contrôlée par `npm run check`.
- Chromium : 52 composants assemblés, largeurs 1280, 1024, 390 et 320 px dans le portable et la webapp locale ; dernier élément réel visible, croissance et réduction, modèle conservé.
- Firefox natif 156.0 : huit états mesurés sur les deux distributions, à 1280, 1024 et 390 px à 100 %, puis au zoom navigateur réel de 200 % préconfiguré dans deux profils isolés. Le réglage 200 % donne un DPR de 2 et une largeur utile de 683 px ; aucun zoom CSS n’est utilisé.
- Dans ces huit états Firefox, l’aperçu n’a pas de débordement vertical et son dernier élément est contenu ; liste, catalogue et champ de 35 lignes montrent tout leur contenu. Après 52 commandes Flèche bas, la dernière option du catalogue est sélectionnée et visible ; les sélections intermédiaires ne sont pas journalisées. Le JSON conserve sa hauteur compacte et son défilement interne.
- Chromium : frappe continue dans un titre et un texte de 35 lignes, sur les deux distributions ; même champ, curseur et position de lecture conservés, sans effondrement de l’aperçu. Le curseur est placé dans la partie visible avant la mesure.
- Chromium : une image synthétique chargée tardivement dans le même aperçu le fait grandir puis rétrécir, sans mutation du modèle. Ce scénario force un changement intrinsèque dans le cadre de recette ; il ne qualifie pas un collage en messagerie.
- Les tests couvrent aussi le retour au premier et au dernier bloc, le champ invalide, la réapparition à largeur identique, le filtrage sans résultat, les messages forgés, l’accès au parent refusé, le script étranger refusé et une tentative réseau bloquée avec compteur serveur témoin.

Les régressions existantes de focus, duplication, déplacement, retrait, récupération, bibliothèque, presse-papiers, cache et espacement augmenté passent dans la suite complète. Les sources du moteur, du modèle et du stockage restent identiques à la base, ainsi que les octets de SNUM. Le [reçu local partageable](recette-defilement.json) contient les empreintes, versions, dimensions et limites. La publication HTTPS possède un reçu distinct lorsqu’elle est vérifiée.

## Rejouer

Depuis la racine du dépôt, avec les navigateurs de développement déjà disponibles :

```sh
npm run check
MAIL_BUILDER_EVIDENCE=evidence/recette-defilement npm test
node scripts/recipe_page_flow_firefox.mjs
```

Le dernier script lance uniquement ses profils Firefox isolés, mesure les deux distributions et archive un reçu dans un nouveau dossier sous `evidence/`. Un chemin neuf peut être fourni en argument ; un dossier déjà rempli est refusé. `FIREFOX_BINARY` permet de désigner le binaire disponible. Il ne qualifie pas le sélecteur de fichiers système : `input.setFiles` amorce la recette JSON. Les captures et profils locaux ne sont pas publiés.

Pour la recette manuelle : ouvrir 52 blocs avec un pied de page, déplier le catalogue, éditer un champ de 35 lignes, puis parcourir la page jusqu’au dernier bloc et au pied de page. Réduire le texte et changer de composition : l’aperçu doit aussi diminuer. Vérifier à 1280, 1024 et 390 px, puis au zoom navigateur 200 %. La zone JSON doit rester compacte. Depuis le champ du premier puis du dernier bloc, activer le retour à la sélection et vérifier le focus.

## Échecs conservés et limites

Les journaux locaux restent dans `evidence/scrollbars-20261023/`. Les tests rouges reproduisent les trois contraintes de hauteur initiales. Le premier assemblage du script révélait une fermeture HTML prématurée ; l’échappement et le test du bundle réel corrigent ce cas. Firefox à 390 px révélait ensuite une gouttière native de 15 px non comptée ; la mesure corrigée passe. Les premiers collecteurs avaient aussi une attente de notification, un décompte de touches et une comparaison de retours à la ligne incorrects ; leurs échecs ne sont pas présentés comme des bugs produit.

Astra donne GO technique et GO PDV sur le diff, après lecture du code et vérification des huit empreintes Firefox, sans exécuter de navigateur concurrent. La revue ne remplace pas les essais. La campagne RGAA précédente reste historique et n’est pas réputée renouvelée par ces seuls tests.

Volumes exercés : 52 blocs, 52 options et 35 lignes de texte, avec les images du catalogue. Les limites maximales du moteur de mise en page et tous les chargements concurrents possibles ne sont pas qualifiés. Windows/Outlook, les annonces réellement écoutées avec un lecteur d’écran et la recette du parc restent ouverts dans #2 et #13. Aucun taux RGAA global n’est déduit de ce correctif.
