# FormAdapt

## Description

FormAdapt est une plateforme de formation en ligne conçue spécifiquement pour les personnes non et malvoyantes. Elle vise à offrir un environnement d'apprentissage accessible pour maîtriser des logiciels courants tels que Word, Excel, etc., en s'appuyant sur des lecteurs d'écran et une navigation adaptée.

## Objectifs Principaux

*   **Accessibilité Complète :** Fournir une interface utilisateur et des contenus conformes aux standards d'accessibilité (WCAG 2.1), utilisables avec des lecteurs d'écran et une navigation au clavier.
*   **Apprentissage Adapté :** Proposer des modules de formation combinant des contenus textuels et audio synchronisés pour une meilleure expérience pédagogique.
*   **Suivi Personnalisé :** Permettre aux utilisateurs de suivre leur progression, de reprendre les modules là où ils se sont arrêtés et de tester leurs connaissances via des quiz interactifs.
*   **Autonomie :** Offrir la possibilité de consulter les modules hors-ligne.

## Fonctionnalités Clés

*   Modules de formation structurés par thèmes et leçons.
*   Contenus disponibles en format texte et audio, avec synchronisation.
*   Quiz interactifs à la fin de chaque module.
*   Tableau de bord utilisateur pour visualiser la progression et les modules.
*   Système de compte utilisateur sécurisé (inscription, connexion, réinitialisation de mot de passe).
*   Interface d'administration pour la gestion des modules et des utilisateurs.
*   Notifications et rappels pour les apprenants.
*   Support multilingue et options de personnalisation de l'affichage (thèmes, taille du texte - *en cours de développement*).
*   Mode hors-ligne pour la consultation des modules.

## Technologies Utilisées

*   **Frontend :** React, Vite, React Router
*   **Backend :** Node.js
*   **Base de Données :** LibSQL (SQLite)
*   **Authentification :** JSON Web Tokens (JWT)
*   **Internationalisation (i18n) :** Implémentation personnalisée (via `src/i18n.js`)

## Prérequis

*   Node.js (version 16.x ou supérieure recommandée)
*   npm (généralement inclus avec Node.js)

## Installation et Lancement

1.  **Cloner le dépôt :**
    ```bash
    git clone <url-du-depot>
    cd <nom-du-dossier-du-projet>
    ```

2.  **Installer les dépendances :**
    (Assurez-vous d'être à la racine du projet où se trouve `package.json`)
    ```bash
    npm install
    ```

3.  **Lancer le serveur backend :**
    (Le backend tourne sur `http://127.0.0.1:3001` par défaut)
    ```bash
    npm run backend
    ```

4.  **Lancer le serveur de développement frontend :**
    (Dans un autre terminal, toujours à la racine du projet)
    ```bash
    npm run dev
    ```
    L'application sera généralement accessible sur `http://localhost:5173` (Vite) ou un port similaire.

## Structure du Projet (Aperçu)

*   `/backend`: Contient la logique du serveur Node.js.
*   `/public`: Assets statiques et fichiers de traduction (locales).
*   `/src`: Code source du frontend React.
    *   `/src/components`: Composants React réutilisables.
    *   `/src/utils`: Fonctions utilitaires (ex: pour les appels API).
    *   `/src/App.jsx`: Composant principal de l'application.
    *   `/src/main.jsx`: Point d'entrée du frontend.
*   `/data`: Contient le fichier de base de données SQLite (créé après le premier lancement du backend).
