# Liens : correction et renouvellement des preuves

**Les 13 liens intégrés au catalogue exigent un intitulé avant copie ou téléchargement HTML. Les 97 tests passent sans échec ni saut.** Les anciens JSON restent récupérables ; leur aperçu signale les liens à compléter sans les activer. L’objectif reste 100 % des critères RGAA applicables. Aucun taux officiel ni conformité globale n’est déclaré.

La [publication HTTPS vérifiée](publication.json) sert huit fichiers identiques aux distributions locales. Un profil Chromium neuf y exerce l’import ancien, l’aperçu neutralisé, l’erreur et le focus, la correction, le téléchargement HTML puis la restauration de la composition hors connexion. Cette recette publique ne qualifie ni le lecteur d’écran ni le parc Windows.

Les [106 critères](MATRICE-106.md), les [258 tests](MATRICE-258.md) et la [matrice structurée](matrice-rgaa.json) rassemblent **490 observations par instance** : 365 de formulaires, 80 de contraste renouvelées et [45 liées aux intitulés](observations.json). Les 1 220 observations AY11 de critères restent distinctes des observations de test. Aucun conforme ni non applicable nouveau n’est confirmé. Les critères 6.2, 9.1 et 10.1 restent à retester ; les 103 autres restent non qualifiés globalement.

## Défaut et correction

La distribution antérieure produit 13 ancres sans texte quand on vide les intitulés de 12 composants ; le composant 43 possède deux liens. La reproduction réouvre la distribution du commit antérieur dans un profil isolé, observe DOM et arbre natif, puis vérifie le blocage sur la version corrigée. Le [test RGAA 6.2.1](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#6.2.1) concerne la présence d’un intitulé. Ce défaut technique candidat ne qualifie pas tout le critère ni la pertinence relevant de 6.1.

La compilation dérive les associations destination/intitulé des seuls nœuds texte canoniques. Elle refuse les associations absentes, ambiguës, répétées ou placées seulement dans un attribut ou un commentaire, ainsi que les mécanismes d’activation incompatibles avec la neutralisation d’aperçu. **Douze mutations négatives sont refusées.** Les 178 champs, les gabarits canoniques et l’empreinte du catalogue sont conservés. Les 52 sorties HTML valides sont identiques par empreinte à la distribution antérieure.

L’éditeur expose la contrainte obligatoire et associe l’erreur au champ. Une saisie vide ou blanche conserve la valeur enregistrée. Pour un ancien fichier déjà incomplet, la garde de diffusion sélectionne le premier bloc à réparer et donne le focus au champ. Le message précise le rang du bloc, le composant et le champ. Annuler efface l’erreur de saisie sans permettre une diffusion encore invalide.

L’aperçu affiche « Intitulé du lien à renseigner » et retire seulement la destination canonique concernée avant substitution des données. Les 13 repères sont observés dans le DOM, sans activation ni focus obtenu ; le cadre garde son `sandbox`. Son arbre natif expose au moins un repère et aucun lien dans cette fixture : aucune annonce vocale des 13 repères n’est revendiquée. Après correction, les 13 URL et intitulés sont rétablis. Deux liens de même destination vérifient que seul le lien invalide est neutralisé. Ce repère n’est jamais sauvegardé ni utilisé comme valeur de remplacement dans le courriel diffusé.

Import par fichier ou texte, rechargement, export JSON et correction progressive restent possibles. Modèles, identités et duplications ne contournent pas la garde finale. La copie valide les intitulés avant de solliciter le presse-papiers. SNUM partage la garde et indique comment récupérer le JSON pour réparation dans le builder ; son contrôle négatif injecte une sortie altérée à la frontière du convertisseur, sans prétendre reproduire une collecte normale.

## Vérifications et portée

| Contrôle | Résultat | Limite |
|---|---|---|
| Suite applicative | 97 réussites, zéro échec, annulation ou saut ; 1 248 cas de rendu et copie des 52 composants | Profils et contenus de recette |
| Firefox natif sur Mac | Composition, modèles, identité, SNUM, imports, téléchargements, copie, redémarrage et web hors connexion observés | Aucun Windows, lecteur d’écran ni client mail |
| Référence navigateur | 11 états, zéro violation axe et zéro erreur JavaScript ; traces clavier et protocoles de mise en page conservés | Contournement CSP pour l’injection locale d’axe déclaré ; simulation de zoom distincte du zoom réel |
| AY11 | 20 scènes, 57 variantes, 1 160 commandes terminées sans erreur | Statuts de collecte conservés ; commande réussie ne signifie pas test RGAA validé |
| Contrastes ciblés | 80 observations, cinq défauts injectés détectés, zéro erreur | Limites du [protocole](../contrastes-20261022/RAPPORT.md), menus natifs et occultations partielles compris |
| Intitulés | 45 observations des saisies, gardes, récupération, aperçu isolé et correction | Présence de texte après retrait des espaces ; pertinence et restitution vocale à qualifier |
| Construction | Distributions reproductibles, Ruff et diff sans erreur | Ne prouve pas les clients mail |

Les 20 scènes AY11 couvrent les 13 pages et sept états dynamiques avec le profil `rgaa-106`, axe, interactions de formulaires et sondes temporelles. L’inventaire contient 1 140 sondes exécutées et 20 entrées indisponibles : la famille `candidate-static` ne propose aucun critère dans cette version. Toutes les familles et variantes disponibles sont inventoriées. `partially_collected`, `not_collected` et absence de candidat ne deviennent ni réussite ni non-applicabilité. Les nouveaux états des intitulés sont exercés par les tests d’interaction et d’arbre natif ; ils ne constituent pas 57 collectes AY11 supplémentaires. Le [reçu](recu-20261023.json) conserve les statuts et les empreintes des sources, scripts et artefacts locaux.

## Erreurs conservées et contre-revue

Le test rouge constate notamment l’absence de garde de sortie. Astra a reproduit une dérivation acceptant à tort un attribut comme intitulé ; les mutants d’attribut et de commentaire sont ensuite rejetés. Les erreurs de recette restent archivées : panneau de fichiers fermé, lecture directe interdite d’un cadre sandboxé, assimilation de `tabIndex` à une possibilité réelle de focus et comparaison sans retrait des espaces canoniques. Le test final cible le cadre par Playwright et sa session CDP, exerce réellement le focus et conserve son isolation. L’extraction historique a aussi dépassé le tampon Node initial ; il est désormais borné à 8 Mio.

Une collecte AY11 intermédiaire a été arrêtée lors du dernier changement produit ; elle reste partielle et est remplacée par la campagne finale sur les sources figées. Astra donne **GO technique local et GO PDV**, après lecture des deltas et exécution indépendante des six tests purs sans saut. Aucune nouvelle infrastructure n’est ajoutée. Ce verdict ne constitue ni conformité RGAA ni qualification humaine.

## Reproduire et terminer

Un [candidat distinct restant à corriger](candidats-restants.json) concerne le test 8.6.1 : un objet vide ou blanc est accepté mais produit un titre de page vide dans le HTML téléchargé. Les deux cas ont été exécutés par l’interface, avec téléchargement puis ouverture du fichier ; les données sont conservées. La balise `title` existe : ce constat concerne la pertinence de son contenu, sans conclure automatiquement à une absence de balise en 8.5. Le repli sur le nom obligatoire de composition est approuvé comme correctif minimal à vérifier dans la tranche suivante. Il ne remplace pas la qualification éditoriale du titre.

Depuis la racine, avec les dépendances déjà présentes :

```sh
npm run build
npm run check
MAIL_BUILDER_EVIDENCE=evidence/recette-liens-neuve npm test
BUILDER_AUDIT_OUTPUT=evidence/audit-liens-neuf node scripts/audit_browser.cjs
node scripts/recipe_firefox.mjs
```

Le serveur `scripts/audit_server.cjs` et les collectes `scripts/audit_ay11.py` utilisent le même `BUILDER_AUDIT_OUTPUT`, le même `BUILDER_AUDIT_PORT` et `BUILDER_AUDIT_ALL_PAGES=1`. AY11 et les références officielles restent en lecture seule. Aucun envoi de message ni installation n’a été réalisé.

Les qualifications humaines restent indispensables : contenus et alternatives, pertinence des intitulés et structures, perception visuelle, zoom réel, ordre du focus et annonces réellement écoutées. Le premier [inventaire d’applicabilité](inventaire-applicabilite.json) décrit 11 DOM d’états, 10 exports et sept sources. Il ne qualifie ni les 52 rendus individuels ni tous les contenus des cadres. L’examen exhaustif par capacité et contenu reste à terminer : médias, CAPTCHA, documents et tableaux ne deviennent pas non applicables parce qu’une sonde ne trouve pas de cible. Les URL peuvent pointer vers des contenus externes et les images importables peuvent être animées.

Personne n’est disponible pour les qualifications humaines et aucun poste Windows n’est disponible. Les issues #2 et #13 restent ouvertes. Pour terminer, il faudra un opérateur pour les essais de lecteur d’écran et les contrôles visuels, puis le poste cible Windows/Firefox/Outlook, les autorisations d’accès et la recette d’installation sur le parc. L’arbre natif ne remplace aucune annonce vocale. L’objectif reste ouvert jusqu’à qualification de tous les tests applicables.
