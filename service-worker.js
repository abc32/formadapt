const CACHE_NAME = 'formadapt-cache-v1';
  const urlsToCache = [
    '/',
    '/index.html',
    '/src/main.jsx',
    '/src/App.jsx',
    '/src/index.css',
    '/src/components/Home.jsx',
    '/src/components/Home.css',
    '/src/components/Module.jsx',
    '/src/components/Module.css',
    '/src/components/Navbar.jsx',
    '/src/components/Navbar.css',
    '/src/components/Quiz.jsx',
    '/src/components/Dashboard.jsx',
    '/src/components/Dashboard.css',
    '/src/components/Notifications.jsx',
    '/src/components/Notifications.css',
    '/src/components/Error.jsx',
    '/src/components/Error.css',
    '/src/components/AdminPanel.jsx',
    '/src/components/AdminPanel.css',
    '/src/components/ResetPassword.jsx',
    '/src/components/ResetPassword.css',
    '/src/components/UpdatePassword.jsx',
    '/src/components/UpdatePassword.css',
    '/src/components/VideoPlayer.jsx',
    '/src/components/VideoPlayer.css',
    '/src/components/Settings.jsx',
    '/src/components/Settings.css',
    '/src/components/LanguageSelector.jsx',
    '/src/components/Search.jsx',
    '/src/components/StudyPlanner.jsx',
    '/src/components/StudyPlanner.css',
    '/src/components/Modules.jsx',
    '/src/i18n.js',
    '/locales/fr.json',
    '/locales/en.json',
    '/audio/presentation.mp3',
    '/videos/module.mp4',
    '/documents/module.pdf',
    '/icon-192x192.png',
    '/icon-512x512.png',
    // ... autres fichiers statiques
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      })
    );
  });

  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response; // Retourner la réponse du cache si elle existe
        }

        // Si la requête n'est pas dans le cache, essayer de la récupérer depuis le réseau
        return fetch(event.request).then((networkResponse) => {
          // Si la requête est réussie, mettre en cache la réponse
          if (networkResponse.ok) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        }).catch(() => {
          // En cas d'erreur réseau, retourner une réponse d'erreur
          return new Response('Erreur réseau', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
    );
  });
