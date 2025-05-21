# FormAdapt - Plateforme de Formation Accessible

## Description

FormAdapt est une **Progressive Web App (PWA)** de formation en ligne, conçue pour être **légère, rapide** et spécifiquement adaptée aux **personnes non et malvoyantes**. Elle vise à offrir un environnement d'apprentissage accessible et intuitif pour maîtriser des logiciels courants (Word, Excel, etc.) en s'appuyant sur des lecteurs d'écran, une navigation clavier optimisée et des options de personnalisation.

## Objectifs Principaux

*   **Accessibilité Complète (WCAG 2.1) :** Fournir une interface utilisateur et des contenus conformes aux standards d'accessibilité WCAG 2.1.
*   **Apprentissage Adapté :** Proposer des modules de formation avec contenus textuels et audio synchronisés.
*   **Suivi Personnalisé :** Permettre un suivi de progression détaillé, la reprise des modules et des évaluations par quiz.
*   **Autonomie :** Offrir la consultation des modules et des ressources hors-ligne grâce aux fonctionnalités PWA.

## Fonctionnalités

### Générales
*   Modules de formation structurés par thèmes et leçons.
    *   Contenus disponibles en format texte et audio (synchronisation prévue).
    *   Fonction de recherche dans les modules et accès par index (prévu).
*   Système de compte utilisateur sécurisé (inscription, connexion, réinitialisation de mot de passe) avec authentification JWT.
*   Support multilingue :
    *   Sélection de la langue de l'interface (implémenté).
    *   Sous-titrage pour les contenus audio/vidéos (prévu).
    *   Traduction automatique des contenus (prévu).
*   Mode hors-ligne pour la consultation des modules téléchargés (fonctionnalité PWA de base implémentée, téléchargement spécifique de modules prévu).

### Espace Utilisateur
*   Tableau de bord utilisateur : vue d'ensemble de la progression et des cours.
*   Suivi de Progression :
    *   Indicateur de progression en pourcentage et barre visuelle.
    *   Historique des modules terminés.
    *   Possibilité de reprendre un module là où l'utilisateur s'est arrêté (partiellement implémenté).
*   Gestion des favoris pour les modules (prévu).
*   Prise de notes personnelles par module (implémenté, amélioration par leçon prévue).
*   Paramètres utilisateur (prévu).

### Évaluations
*   Quiz interactifs à la fin de chaque module (disponibles en texte, audio prévu).
*   Affichage des résultats en temps réel et récapitulatif de performance.

### Accessibilité et Interface
*   Compatibilité complète avec les lecteurs d'écran (objectif continu).
*   Interface navigable entièrement au clavier (objectif continu).
*   Interface simple, épurée et intuitive.
*   Options d'ajustement de l'affichage pour les malvoyants (taille du texte, contraste) (prévu).
*   Thèmes sombre et clair (prévu).

### Administration (Admin Panel)
*   Gestion des modules (CRUD - partiellement implémenté).
*   Gestion des utilisateurs et de leurs droits d'accès (partiellement implémenté).
*   Visualisation des statistiques de la plateforme (partiellement implémenté).

### Notifications et Planification (Prévu)
*   Notifications push personnalisées (rappels de modules, quiz, mises à jour).
*   Notifications par email.
*   Planificateur d’études avec rappels.

## Technologies Utilisées

*   **Frontend :** React, Vite, React Router
*   **Backend :** Node.js
*   **Base de Données :** LibSQL (SQLite)
*   **Authentification :** JSON Web Tokens (JWT)
*   **Internationalisation (i18n) :** Implémentation personnalisée (via `src/i18n.js`)
*   **PWA :** Service Worker pour fonctionnalités hors-ligne de base.

## Contraintes du Projet

*   Respect des normes d'accessibilité WCAG 2.1.
*   Utilisation de JWT pour la gestion de l'authentification.
*   Application conçue pour être légère, rapide et optimisée pour mobile/tablette.

## Prérequis

*   Node.js (version 16.x ou supérieure recommandée)
*   npm (généralement inclus avec Node.js)

## Installation et Lancement

1.  **Cloner le dépôt :**
    ```bash
    git clone <url-du-depot>
    cd FormAdapt # ou le nom de votre dossier
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```

3.  **Lancer le serveur backend :**
    (Le backend tourne sur `http://127.0.0.1:3001` par défaut)
    ```bash
    npm run backend
    ```
    Le fichier de base de données `formadapt.db` sera créé dans le dossier `/data/` lors du premier lancement.

4.  **Lancer le serveur de développement frontend :**
    (Dans un autre terminal)
    ```bash
    npm run dev
    ```
    L'application sera généralement accessible sur `http://localhost:5173`.

## Structure du Projet (Aperçu)

*   `/backend`: Logique du serveur Node.js.
*   `/public`: Assets statiques, `manifest.json`, fichiers de traduction.
*   `/src`: Code source du frontend React.
    *   `/src/components`: Composants React.
    *   `/src/utils`: Fonctions utilitaires (ex: `api.js`).
    *   `/src/App.jsx`: Composant principal.
    *   `/src/main.jsx`: Point d'entrée du frontend.
*   `/data`: Contient le fichier de base de données SQLite.
*   `service-worker.js`: Service worker de base pour la PWA.
*   `README.md`: Ce fichier.
