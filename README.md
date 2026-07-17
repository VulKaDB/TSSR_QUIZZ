#  TSSR QUIZZ

Application web de révision pour le titre **TSSR**, sous forme de quiz interactif couvrant l'ensemble des blocs de compétences (support utilisateur, Windows Server/AD, Linux, réseaux IPv4, virtualisation, scripting, sécurité, sauvegardes, déploiement de postes...).

## Fonctionnalités

- **276+ questions** réparties sur une douzaine de catégories (Linux, Windows Server & AD, Réseaux & IPv4, Ports & protocoles, Wi-Fi, Virtualisation & Cloud, Bash & PowerShell, Firewall/VPN & sécurité, Sauvegardes & restauration, Déploiement de postes, Binaire & logique, Support & méthodologie).
- **7 types de questions** pour varier les formats de révision : QCM, mise en situation, réponse libre, tuiles à relier, remise en ordre, calcul à plusieurs champs, et exercices IP à tirage aléatoire (adresse et masque différents à chaque tentative, avec calcul détaillé).
- **4 modes de révision** :
  - Révision libre (choix des catégories, ordre aléatoire)
  - Mode chrono (temps réglable par question)
  - Examen blanc (nombre de questions réglable, correction différée à la fin)
  - Révision par catégorie (depuis la page d'accueil)
- **Bilan de fin de série** : score, pourcentage, liste détaillée des questions ratées avec correction complète.
- **Suivi des erreurs** : les questions ratées sont mémorisées automatiquement et peuvent être retravaillées spécifiquement via le mode « Revoir mes erreurs », jusqu'à ce qu'elles soient réussies.
- **Suivi de progression par catégorie**, sauvegardé dans le navigateur.
- **Reprise de série** : si tu recharges la page (ou fermes l'onglet) en pleine série, chaque série en cours (Linux, Wi-Fi, etc.) reste reprise indépendamment, sans écraser les autres.
- **Mode sombre** avec préférence mémorisée.
- **Raccourcis clavier** : `Entrée` (valider/suivant), `←`/`→` (précédent/suivant), `1`-`4` (choix de réponse QCM).
- **Progressive Web App (PWA)** : installable sur mobile/desktop, utilisable hors-ligne une fois visitée en HTTPS.
- **Mémo intégré** : fiche de synthèse des notions clés par catégorie.

## Démarrage

Aucune installation ni serveur requis.

### En local

1. Récupère tous les fichiers du dépôt dans un même dossier.
2. Ouvre `index.html` directement dans un navigateur (double-clic).

L'application fonctionne entièrement en local, aucun appel réseau, aucune dépendance externe. Seule la fonctionnalité hors-ligne PWA nécessite d'être servie via HTTPS pour s'activer ; le reste du site fonctionne à l'identique sans elle.

### Sur un serveur web

Héberge l'ensemble des fichiers à la racine d'un serveur statique (Apache, Nginx...). Aucune configuration particulière n'est nécessaire — ce sont uniquement des fichiers statiques (HTML/CSS/JS).

## Structure du projet

```
.
├── index.html        # Page unique de l'application
├── style.css          # Styles (thème clair/sombre via variables CSS)
├── app.js             # Logique de l'application (rendu, validation, sessions, PWA...)
├── questions.js       # Banque de questions (générée par gen.py)
├── gen.py             # Script Python qui génère questions.js
├── manifest.json       # Manifeste PWA (nom, icônes, couleurs)
├── sw.js               # Service worker (cache hors-ligne)
├── icon-192.png         # Icône PWA 192×192
└── icon-512.png         # Icône PWA 512×512
```

## Gestion de la banque de questions

Le fichier `questions.js` n'est pas écrit à la main : il est généré par `gen.py`, qui définit chaque question via des fonctions utilitaires (`qcm`, `text`, `match`, `order`, `calc`, `iprandom`, `scenario`) puis exporte le tout au format JSON dans `questions.js`.

Pour ajouter ou modifier des questions :

```bash
# éditer gen.py, puis régénérer :
python3 gen.py
```

Le script inclut aussi une passe de rééquilibrage automatique (`DISTRACTOR_OVERRIDES`) qui évite qu'une bonne réponse ne soit repérable simplement parce qu'elle est plus longue ou plus détaillée que les distracteurs.

## Format d'une question

Chaque entrée de `questions.js` est un objet avec au minimum `cat` (catégorie), `type`, `q` (énoncé) et `exp` (explication). Selon le type :

| Type | Champs spécifiques | Description |
|---|---|---|
| `qcm` / `scenario` | `c` (4 choix), `a` (index de la bonne réponse) | Question à choix multiples |
| `text` | `reponse`, `accept` (alternatives optionnelles) | Réponse libre en texte |
| `match` | `pairs` (liste de `{l, r}`) | Tuiles à relier |
| `order` | `items` (liste dans l'ordre correct) | Remise en ordre |
| `calculation` | `fields` (liste de `{label, answer}`) | Calcul à plusieurs champs |
| `iprandom` | `ask` (champs demandés), `prefixes` (optionnel) | Exercice IP généré aléatoirement à chaque tentative |

## Stockage local

Aucune donnée n'est envoyée à un serveur. Tout est conservé dans le `localStorage` du navigateur :

- `tssr-progress` — questions déjà répondues par catégorie
- `tssr-mistakes` — questions actuellement en erreur
- `tssr-sessions` — séries en cours (reprise après rechargement)
- `tssr-dark` — préférence de thème

Changer de navigateur ou d'appareil repart donc de zéro.

## Stack technique

Vanilla JavaScript, CSS et HTML.
