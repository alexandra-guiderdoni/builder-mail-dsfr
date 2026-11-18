# État de livraison au 18 novembre 2026

La dernière version applicative publiée est `eed1667` (14 novembre). Les tests et le déploiement sur GitHub Pages ont réussi pour cette révision. [Exécution GitHub Actions](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/43634651056)

## Livraisons de novembre

- **Revue de presse SNUM.** Le modèle présente les articles en format court dans onze rubriques, selon un ordre fixe. Le pied Marianne referme le cadre et porte la mention de diffusion et le lien « Nous contacter ». L’aperçu s’adapte à la hauteur du courriel. [Guide d’utilisation](UTILISATION.md)
- **Prise en main.** L’accueil de première visite permet de créer une newsletter depuis un exemple, de la sauvegarder et de retrouver l’aide à l’installation. Le guide illustré décrit le parcours jusqu’à la copie du courriel. [Guide de prise en main](PRISE-EN-MAIN.md)
- **Accessibilité.** Les cinq écarts relevés lors du préaudit du 6 novembre ont été corrigés. Les contrôles humains encore nécessaires sont consignés dans le [rapport de préaudit](accessibilite/preaudit-20261106/RAPPORT.md).

## Feuille de route

Quatre tickets sont ouverts au 18 novembre.

| Chantier | Prochaine étape | Suite |
| --- | --- | --- |
| Accueil de première visite | [#206](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/206) est en attente. Le parcours testable [#205](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/205) est livré. Alex doit relire le [protocole](protocole-test-206.md) et recruter 3 à 5 utilisateurs. | [#207](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/207) prévoit de finaliser l’accueil après le test et le traitement des blocages critiques. |
| Messageries | [#13](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/13) est reporté. La réception du courriel et des images dans Outlook et Mélissa doit être vérifiée sur le poste cible par un opérateur habilité. | [#52](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/issues/52), également reporté, dépend de #13 pour qualifier le rendu dans Outlook classique sous Windows. |

L’accès et l’installation depuis le parc, les essais avec le lecteur d’écran retenu sur Windows et la qualification RGAA complète restent à vérifier.

## Archives de diagnostic

Les huit branches de diagnostic sont conservées sous les tags Git `archive/diag/*`. Chaque tag reprend le dernier commit de la branche correspondante. Le correctif d’isolation des aperçus de `fix/modal-isolation-study` figure sur `main` depuis `9598f54`. Les neuf branches distantes ont été supprimées le 18 novembre.

## Bilan historique du 1er novembre

- [CI 40842375729](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/actions/runs/40842375729) réussie sur `cbe93e3` : **606 tests, 606 réussites, zéro échec et zéro test ignoré**, Node.js **24.22.1**. Le journal brut a été relu le 1er novembre. Ce résultat n’est pas une nouvelle exécution locale de la suite.
- La [livraison précédente 2829a9b](https://github.com/alexandra-guiderdoni/builder-mail-dsfr/commit/2829a9beb0a892f334af37e462f715ec196395ae) avait 602 tests réussis ; ses huit fichiers publics avaient été comparés octet pour octet aux distributions. Cette comparaison ne vaut pas vérification des huit fichiers du correctif `cbe93e3`.
- Le correctif `cbe93e3` empêche qu’un résultat de chargement d’image distante recrée un brouillon après annulation. Quatre tests de régression ont été ajoutés ; les 33 tests ciblés, dont Chromium et WebKit, ainsi que le build et les contrôles de distributions ont passé avant le commit. La nouvelle contre-revue Claude demandée pour ce SHA n’a pas été transmise dans cette session.

### Fonctionnalités et investigations de cette campagne

- **#191 : poids du courriel.** Mesure du HTML préparé pour la copie ou le téléchargement, répartition par catégorie et conseils préservant les logos. Le poids du HTML réellement reçu reste inconnu ; aucun seuil local n’a été relevé pour masquer une alerte.
- **#192 : images HTTPS.** Les 24 champs image proposent une adresse HTTPS directe en complément de l’import local. Le repli local reste conservé. Les références distantes utilisent un format v2 explicite ; les fichiers entièrement locaux restent v1. Les hébergeurs reçoivent des requêtes ; disponibilité hors connexion, archivage, poids distant et réception ne sont pas garantis.
- **#193 : récupération des anciennes URL abrégées.** Secours brut et correction explicite avant restauration, sans normalisation silencieuse ni écriture au démarrage.
- **#190 : propriété des navigateurs de recette.** Garde documentaire installé dans le skill VoiceOver partagé Claude/Codex, hors du dépôt builder. Les essais contrôlés ne garantissent pas le nettoyage après interruption brutale.
- **#179 : zoom Firefox.** 200 % observé dans l’interface native, témoin négatif et retour à 100 %. La recette native complète de reflow n’est pas revendiquée ; le reçu de #179 conserve le résultat non concluant de l’ancien oracle. #196 corrige l’oracle (fenêtre et écran contractés par le facteur, comme mesuré nativement) et l’éprouve sur ces mesures enregistrées ; l’exécution native complète de la recette reste à faire.
- **#188 : annonces VoiceOver.** Cas natifs ciblés exercés ; la répétition strictement identique de l’erreur globale reste **non confirmée**, sans preuve de son absence ni conclusion de conformité générale.
- **#173 : clic après modale.** Investigation clôturée avec cause historique **inconnue et bornée** ; diagnostic enrichi sans modifier le geste ni affaiblir le test. La CI verte n’explique pas cet échec ancien.

Le [bilan détaillé des cinq tickets](qualification/backlog-cinq-20261028/ETAT.md) et son [reçu natif](qualification/backlog-cinq-20261028/NATIF.json) précisent les environnements et les limites. La session native y chargeait `404b817` : ne pas la présenter comme une recette native complète du dernier SHA.

## Documents de référence

- [Spécification](../SPECIFICATION.md) et [cadrage / décision complémentaire #192](cadrage-source.md#décision-complémentaire-du-28-octobre-2026--192).
- [Utilisation](UTILISATION.md), [format JSON v1/v2](FORMAT-JSON.md), [maintenance](MAINTENANCE.md).
- [Historique des livraisons](../CHANGELOG.md), [suivi applicatif](SUIVI-APPLICATION.md), [corrections historiques](SUIVI-CORRECTIONS.md), [recettes historiques](RECETTE-APPLICATION.md).
