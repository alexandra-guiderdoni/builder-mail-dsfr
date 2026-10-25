# #150 — attribution indépendante du minimal natif

**Attribution bornée validée : l’application complète n’est pas nécessaire à ce phénomène dans la fixture synthétique et avec le chemin d’entrée automatisé observés.** Le minimal livre un clic à l’enfant au cycle confirm alors que le parent vient de mesurer une modale native active, un hit-test DOM sur le dialogue et pointer-events:none sur l’iframe. Cela ne détermine pas le mécanisme interne Chromium/CDP et ne prouve pas un effet avec une souris physique.

Revue du 25 octobre 2026, en lecture seule, avec réévaluation pure du contrat R3 sur le JSON existant. Aucun navigateur, modèle, CLI native ou CI relancé. Les seize empreintes du paquet R3 demeurent conformes au manifeste `99a78e843acab890b6ef999d4289849e3a8740147ecc41aec36ef0b4a8529e74`.

## Résultat minimal vérifié

Source brute : `/Users/alex/Claude-worktrees/builder-150-minimal-native-20261025/result.json`, SHA-256 `5f3398f1bed942ce600f5a764da5d955369b1e397e0fb0106680a4323f314491`.

Les deux états passent à nouveau `assertGeometry` ; `verdict(cycles,trace)` restitue exactement le finding conservé. Le cycle cancel vaut before1/modal1/after2 ; confirm vaut before3/modal4/after5. Les quatre contrôles positifs ciblent `control` aux coordonnées enfant528/41, hors modale à la réception parent. La géométrie de chaque cycle reste exactement prescrite, sans correction automatique de position.

La trace comporte33 lignes consécutives et zéro dépassement déclaré. Les cinq clicks enfant trusted ont les IDs distincts child-1:5, :10, :15, :20 et :25. Le compteur final ACK enfant5 égale le compteur parent5 et les cinq lignes click ; le défaut de réconciliation R2 ne subsiste pas ici. Aucun primaryError, errors vide, cleanupError null, une confirmation ; version observée156.0.8078.4.

Au premier fond, les événements pointerdown/mousedown/pointerup/mouseup/click ciblent le dialogue parent à1365/990 ; le compteur enfant ne varie pas. Au second, les cinq événements child-1:16 à :20 ciblent le bouton enfant `target` à630/532. La conversion par le rectangle735/458 donne précisément le point brut1365/990. Le click child-1:20 est la ligne27 ; le parent est open=true et modal=true à sa réception. Le compteur immédiat est déjà4, confirmé par l’ACK4 avant la fermeture. Ce n’est donc ni la duplication d’un click positif au même emplacement, ni un simple écart non réconcilié de compteur.

Avant cette entrée, l’état indique EFP=DIALOG/dialog, pointer-events:none, inert=false, :modal=true, focus H2/title. Ces mesures précèdent l’entrée ; elles ne sont pas un enregistrement atomique de l’état interne du compositeur lors du dispatch. L’état modal attaché aux événements enfant est celui de la réception parent.

Le process0 a été rapporté par root ; le dossier reçu contient uniquement result.json, sans reçu séparé du code de sortie. Le JSON démontre ici un protocole arrivé au finding positif sans erreur enregistrée. En tout état de cause, **process0 ne signifie pas absence de phénomène**.

## Confrontation à R4 applicatif

Les huit pièces du manifeste natif R4 ont été vérifiées. Les vues JSON A/B correspondent aux lignes TRACE150 des TAP après décodage et réencodage exacts. A est rouge2/1 au cycle cancel :26 lignes, EFPdialog avant entrée, réception1→2 sous modale. B est vert sur les deux cycles :51 lignes, seuls les trois clics volontaires incrémentent0→1→2→3 hors modale. Les deux traces déclarent zéro dépassement, mais leur complétude de transport reste inconnue, conformément au protocole sans ACK R4.

Les deux captures B sont identiques octet par octet,158054 octets chacune, SHA `b7680efcd8485bc38d2982a0bbcb96132e2bd73f9ea645d249835ba7959b270e`. Leur lecture visuelle est attestée par root ; elle n’a pas été refaite dans cette revue. La comparaison A/B conserve sa limite : la capture ajoute plusieurs échanges, attentes et effets de préparation. Un A rouge et un B vert ne distinguent pas leurs contributions ni la variabilité entre exécutions ; aucun ACK du routage n’en découle.

## Portée de l’attribution

Le minimal indépendant utilise seulement HTML local, enfant Blob opaque, dialogue natif, CSS et instrumentation. Il ne charge ni code métier, ni export, ni helper applicatif. Sa séquence positive montre qu’un phénomène compatible avec la livraison observée dans l’application peut apparaître sans cette application complète. Ce résultat n’établit pas l’identité de toutes les causes des rouges anciens, ni une faute interne précise du moteur ou de Playwright.

Le DOM et la géométrie sont synthétiques ; les lectures EFP/style sont intrusives, les ACK ajoutent des échanges et les clics positifs passent par l’actionnabilité locator. isTrusted établit ici la provenance native des événements déclenchés par l’automatisation, pas une interaction humaine physique. Les IDs sont des labels locaux ; blob:null ne prouve pas OOPIF. Aucun correctif applicatif ni clôture n’est validé.

Un futur candidat de séquencement du pilote reste à lire et à éprouver séparément. Cette attribution n’en constitue pas une prévalidation ni une autorisation d’exécution. Le reçu JSON voisin rassemble les contrôles indépendants et les empreintes ; les preuves sources sont intactes.
