# Reprise des six issues — état vérifié

**#142 est résolue et clôturée. Les cinq autres issues restent ouvertes.** Le travail ne vaut pas qualification Outlook/Mélissa et le goal n’est pas déclaré achevé.

| Issue | Résultat et limite |
| --- | --- |
| #13 / #52 | Aucun poste cible disponible, confirmé par l’utilisateur. Essais clients **NOT_EXECUTED** ; blocage consigné dans chaque issue. Aucun courriel envoyé. |
| #130 | Rejeu GitHub Ubuntu 26 x64 : original 3/3, instrumenté naturel 3/3 ; contrôle négatif rouge exact. Image runner différente de l’incident ; aucune cause spontanée démontrée. [Reçu et limites](investigations/130/REJEU-GITHUB.md). |
| #142 | Nouvelle reproduction native WebKit, document d’aperçu ancien malgré modèle et `src` actualisés ; comparateur limité à `preview.js` confirme le correctif déjà publié. [Revue Astra](review-142.md). Le locator initial perdu n’est pas réinventé. |
| #145 | Première campagne GitHub instrumentée : 3 échecs sur 5, sans confirmation/soumission observées. Deux autres lots 5/5 et stress CPU local 3/3 verts : intermittence, aucune cause établie. Diagnostic permanent du test préparé, sans correctif produit ni délai fonctionnel augmenté. [Revue Astra](investigations/timeouts/review-diagnostic-145.md). |
| #149 | Source locale Codex corrigée et activée ; sorties normales vérifiées, mais SIGINT natif encore rouge. Prototypes de supervision isolés seulement ; aucun nouveau hook actif. Issue maintenue ouverte. |

## Publication et vérification

Les preuves de #142 sont publiées sur `main` au SHA `7c78822872b8e159fd884836828d5b7ce3f75544`. La [CI 40213203335](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40213203335) vérifie **397/397**, zéro échec, annulation ou skip ; les jobs tests et Pages réussissent. [Reçu extrait du journal](ci-main-7c78822.json). Cette CI précède le complément de diagnostic de #145 ; elle ne prouve pas son exécution.

Les branches `diag/issue-130-forensic` et `diag/issue-145-forensic` sont diagnostiques, manuelles et sans déploiement. Elles ne doivent pas être fusionnées dans `main`. Les trois runs #145 sont [40213294190](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40213294190), [40213842402](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40213842402) et [40214029414](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40214029414). Leurs artefacts téléchargés accompagnent ce dossier ; la première erreur primaire n’était pas rendue par le TAP, malgré son placement dans `Error.cause`.

Le diagnostic durable de #145 enregistre des phases côté Node et des événements de confirmation bornés. À l’échec, un seul snapshot dispose d’une seconde pour répondre ; sinon le diagnostic signale son indisponibilité et conserve l’erreur primaire. Les quatre tests Chromium/WebKit passent. Les contre-épreuves vérifient un rejet d’activation, un renderer diagnostique muet, la visibilité de la stack et l’absence de timer résiduel. Cette instrumentation peut influencer le timing ; un vert ne devient pas une attribution causale. Les textes d’erreur ne sont pas garantis exempts d’URL : ils proviennent de fixtures synthétiques, pas de données client.

## Limites du correctif ShipGuard

Le dépôt parent conserve le commit **local, non poussé** `f010bf260`, source maintenue du générateur et du patch de propriété. Version Codex installée : `2.18.0+codex.local-20261025164729`. Les trois fichiers installés du skill correspondent aux SHA verrouillés. Les 18 fichiers concurrents du parent ont été préservés ; ce dépôt n’est pas déclaré propre. La portée de publication autorisée reste celle du builder.

Une recette native distincte montre qu’un SIGINT du runtime laisse le daemon du run actif ; son secours manuel est identifié comme tel. Le témoin reste utilisable. Tous les navigateurs et serveurs jetables de cette recette ont ensuite été fermés par leur propriétaire, sans fermeture globale. Claude natif et l’autre machine restent inchangés.

Les études isolées de supervision ne sont pas promues. Le [hook natif Interrupt](https://learn.chatgpt.com/docs/hooks#interrupt) constitue une piste pour recevoir l’annulation du tour ; son ciblage, son coût et sa confiance native doivent être qualifiés avant activation. Le paquet candidat est préparé hors du plugin actif. Aucune confiance native n’est contournée.

Le skill de contribution newsletter demeure inchangé. Les preuves brutes non sélectionnées restent archivées localement, avec leurs empreintes, plutôt que d’être ajoutées au code actif.
