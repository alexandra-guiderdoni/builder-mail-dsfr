# Kit opérateur — transport du courriel (#13) et risques Outlook (#52)

Ce kit prépare une recette autorisée sur les postes cibles. **Aucun collage dans une messagerie, envoi ou réception n’a été exécuté.** Les reçus clients sont `NOT_EXECUTED`. Seuls la génération native et les deux imports JSON dans Chromium Playwright local ont été vérifiés.

## Candidat et fichiers

Candidat non commité : base `395c08d1dfa4d0b8e41416da798bf0313a8bd379`, branche `fix/backlog-qualification-20261025`, version applicative `de68d7f3ea4e8fc9`. Le delta de sources est conservé dans `candidate-sources.patch` ; son périmètre exact et son empreinte figurent dans `manifest.json`. Ce delta concerne les entrées de génération, pas les tests ou rapports du chantier. La reconstruction des distributions a retourné `APPLICATION_DISTRIBUTIONS_OK` avant capture ; aucune source de génération n’a changé pendant celle-ci.

Le fichier figé `builder-candidat.html` porte le SHA256 :

```text
622a289ddbaa4fdacc0ff96ff85caba21e4ab85225c3e622dc0ecebf2d3c23f7
```

Vérification Windows PowerShell, depuis le dossier extrait :

```powershell
Get-FileHash -Algorithm SHA256 .\builder-candidat.html
$m = Get-Content .\manifest.json -Raw | ConvertFrom-Json
$m.files | ForEach-Object {
  $h = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.path).Hash.ToLower()
  if ($h -ne $_.sha256) { throw "Empreinte différente : $($_.path)" }
}
```

Le manifeste nomme chaque fichier et son empreinte. `SHA256SUMS` donne aussi les empreintes du manifeste et des fichiers ; il ne s’inclut pas lui-même. Un portable reconstruit ultérieurement est un autre candidat à qualifier.

| Fichier | Usage et portée |
| --- | --- |
| `recette-png.json`, `recette-jpeg.json` | Compositions importables créées par `Model.create`, validées par `Model.document` et `Imports.parse`, puis réellement importées par le champ de fichier. |
| `illustration-originale.png`, `illustration-originale.jpg` | Sources synthétiques Canvas de 480 × 240 pixels. Le PNG possède une marge transparente ; le JPEG, une marge blanche. |
| `recette-*.reference-export.html` | Résultat natif `Render.exportHtml`. Référence de comparaison, pas preuve de téléchargement UI ni de transport. |
| `recette-*.reference-copie.html` | Résultat natif `Render.clipboardHtml`. Référence technique, **pas contenu relu dans le presse-papiers**. |
| `recette-*.txt` | Résultat natif `Render.plain`. Référence du texte exploitable. |
| `recu-operateur.json` | Douze cas à remplir : trois clients, deux images, deux parcours distincts. Tous commencent `NOT_EXECUTED`. |
| `generation.log`, `manifest.json` | Identité du candidat, versions locales et preuve des deux imports. |
| `generer-kit.cjs` | Générateur de preuve, à exécuter seulement dans une destination neuve : les fichiers existants sont protégés contre l’écrasement. |

## Préparation par l’opérateur habilité

Utiliser seulement des comptes de recette autorisés et des données synthétiques. L’accord pour consulter ce kit n’autorise aucun accès à une boîte ni aucun envoi. L’opérateur habilité décide et réalise lui-même l’envoi au destinataire de recette prévu. Ne pas utiliser une adresse réelle dans les pièces conservées dans le dépôt ; conserver les preuves sensibles dans l’emplacement approuvé.

Créer un profil Firefox jetable, sans synchronisation de compte, et relever son identifiant de recette. `about:profiles` permet de créer et lancer un profil séparé ; vérifier que le profil personnel reste le profil par défaut. Fermer ensuite uniquement le profil créé pour cette recette. [Documentation Mozilla des profils](https://support.mozilla.org/en-US/kb/profile-manager-create-remove-switch-firefox-profiles).

Renseigner dans le reçu : date et heure, version/build Windows, échelle d’affichage, version complète Firefox et canal ESR le cas échéant, zoom Firefox, lecteur d’écran et version, version/build exact du client, thème et zoom du message. Distinguer **Outlook classique Windows**, **nouveau Outlook Windows** et **Mélissa dans le navigateur effectivement utilisé**. Pour Mélissa, relever la version affichée ou déclarer `UNKNOWN` si elle n’est pas exposée ; ne pas inventer sa version depuis son apparence.

Ouvrir `builder-candidat.html` dans ce profil. Utiliser « Reprendre la composition », puis « Fichiers et récupération » → « Importer une composition ou une bibliothèque JSON ». Importer d’abord `recette-png.json`, puis exécuter sa recette complète. Recommencer séparément avec `recette-jpeg.json`. Confirmer le nom, l’objet, les repères et la sauvegarde. Les liens `example.org` sont des destinations synthétiques : inspecter l’adresse ; leur page distante ou son éventuel code HTTP ne constitue pas le résultat du transport du lien.

## Parcours distincts pour chaque client et chaque format

**A — Copie enrichie UI.** Depuis le builder, activer « Copier le courriel » au clavier. Si une confirmation de contenu de démonstration apparaît, la lire et confirmer seulement cette composition synthétique. Relever l’annonce exacte, les permissions demandées ou le refus. Dans un nouveau brouillon HTML du client cible, coller avec le collage ordinaire. Relever toute option de collage choisie : conserver la mise en forme, fusionner ou texte seul ne sont pas un même parcours. Ne pas remplacer un échec de copie enrichie par une capture ou une insertion manuelle d’image.

**B — HTML téléchargé puis inséré selon le parcours disponible.** Activer « Télécharger le HTML » dans le builder et conserver le fichier réellement téléchargé. Relever son SHA256 ; comparer à `recette-*.reference-export.html` si les données n’ont pas été retouchées. Choisir et décrire exactement la voie proposée sur le poste : import HTML dans le corps si le client le permet, ou ouverture du HTML dans Firefox, sélection du contenu rendu, copie et collage dans un nouveau brouillon. Cette seconde voie est un **copier-coller depuis le HTML ouvert**, pas un import HTML natif. Une pièce jointe `.html` ne vaut pas insertion du corps. Si aucune voie n’existe, inscrire `BLOCKED` avec le motif ; ne pas déclarer le parcours réussi.

Réaliser A et B séparément dans Outlook classique, nouveau Outlook et Mélissa. Aucun bouton, menu ou capacité identique n’est présumé entre ces trois clients. Noter l’emplacement réellement utilisé et conserver les captures expurgées.

## Contrôles à chaque étape

Les étapes sont : builder, brouillon après collage/insertion, brouillon après retouche, message reçu. Une réussite à une étape ne vaut pas réussite à la suivante.

1. **Contenu et ordre.** Vérifier le titre « 01 », le texte « 02 », l’illustration/légende « 03 », le texte « 04 », le bouton « 05 », puis le lien final. Conserver les accents, `œ`, le symbole `€` et les tirets. Le pré-en-tête doit rester absent du corps visible ; noter séparément son comportement dans la liste des messages.
2. **Images.** Marianne et l’illustration sont présentes, nettes et sans déformation. L’illustration conserve le rapport 2:1 et sa disposition carré jaune/disque blanc/rectangle corail ; noter transparence ou fond modifié. Contrôler PNG et JPEG indépendamment et relever toute conversion, disparition ou pièce jointe inattendue.
3. **Retouche.** Dans le brouillon du client, remplacer uniquement `RECETTE_AVANT` par `RECETTE_APRÈS`. Vérifier que le texte environnant, l’image, la légende, les liens et leur ordre restent présents. Ne pas recréer les éléments perdus : ce serait masquer le défaut à qualifier.
4. **Liens, clavier, lecteur d’écran.** Parcourir au clavier les liens et commandes accessibles ; vérifier focus, intitulés et destinations exactes. Avec le lecteur d’écran retenu, relever titre, ordre de lecture et alternative « Illustration de recette PNG/JPEG : carré jaune, disque blanc et rectangle corail sur fond bleu. ». Noter si l’image est absente de l’arbre accessible ou si le client ne restitue pas l’alternative. Un contrôle visuel ne remplace pas ce contrôle.
5. **Images bloquées.** Relever d’abord le réglage initial et le comportement du message reçu, puis la différence après autorisation des images si cette commande existe. Dans Outlook classique, la politique de téléchargement automatique concerne les images externes ; ces images incorporées peuvent rester visibles. Cela doit être noté `NOT_APPLICABLE_EXTERNAL_BLOCK`, jamais comme preuve d’alternative correctement restituée. Si le client propose un vrai mode masquant aussi les images incorporées, le tester et décrire précisément le réglage. Sinon marquer ce sous-cas non exercé. [Portée du blocage des images dans Outlook classique](https://support.microsoft.com/en-us/outlook/block-or-unblock-automatic-picture-downloads-in-classic-outlook-email-messages).
6. **Risques #52.** Dans Outlook classique en particulier, comparer centrage du cadre, alignement et coupures des titres, espacements et largeur de la composition. Refaire à échelle Windows 100 % puis 150 % si le poste de recette le permet, en relevant les réglages effectifs ; tester thèmes clair/sombre et fenêtre large/étroite. Ne pas attribuer un défaut au DPI ou au moteur Word depuis son apparence seule. Conserver captures comparables, largeur/zoom/thème et symptôme précis.
7. **Texte seul.** Après « Copier le courriel » dans le builder, coller en texte seul dans un brouillon ou un éditeur de texte jetable, puis comparer le contenu à `recette-*.txt`. La copie native fournit les deux formats ; aucun bouton « Copier le texte » distinct n’est supposé. Noter explicitement le changement de format et ne pas utiliser ce résultat pour valider la voie HTML.
8. **Réception autorisée.** Uniquement lorsque l’opérateur est habilité à envoyer et recevoir cette recette : envoyer au destinataire de test convenu, puis refaire les contrôles sur le message reçu. La copie dans « Éléments envoyés » ne remplace pas une observation côté réception. Conserver les parties MIME/EML expurgées si la politique et le client l’autorisent ; relever `data:`, CID, pièce jointe, image distante ou absence. Si accessibles, examiner les styles et déclarations MSO survivants. Leur seule présence dans la référence native ne prouve pas leur conservation après transport.

## Renseigner le reçu et décider

Copier `recu-operateur.json` sous un nom de recette distinct avant de le compléter. Pour chaque cas, relever les versions et la voie exacte, les contrôles exécutés, résultat `PASS`, `FAIL`, `BLOCKED` ou `NOT_EXECUTED`, captures et empreintes des preuves. Garder `NOT_EXECUTED` pour toute réception non réalisée. Un sous-cas impossible peut être documenté séparément sans rendre vert le reste du parcours.

Un écart doit nommer : candidat/hash, client/build, parcours, format, étape, attendu, observé et preuve. Ne pas ajouter de correctif Word/DPI, stratégie CID, hébergement d’images ou adaptation client avant confirmation du défaut. Les issues #13 et #52 restent des qualifications ouvertes tant que leurs parcours réels n’ont pas de reçus exploitables.
