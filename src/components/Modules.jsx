import React, { useEffect, useState } from 'react';
  import { Link } from 'react-router-dom';
  import Search from './Search.jsx';
  import translate from '../i18n';
  import ApiError from './ApiError';

  // Assuming fetchWithAuth is passed as a prop from App.jsx
  function Modules({ fetchWithAuth }) {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [modulesPerPage] = useState(10);
    const [filteredModules, setFilteredModules] = useState([]);
    const [favoriteModules, setFavoriteModules] = useState([]);

    useEffect(() => {
      const fetchModulesData = async () => {
        // It's good practice to ensure fetchWithAuth is available if the component relies on it
        if (typeof fetchWithAuth !== 'function') {
          setError("Authentication service is not available. Cannot load all module data.");
          // Attempt to load public modules as a fallback
          try {
            const publicModulesRes = await fetch('/api/modules').then(res => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status} (public modules)`);
              return res.json();
            });
            setModules(publicModulesRes);
            setFilteredModules(publicModulesRes);
          } catch (publicErr) {
            setError(prev => prev ? `${prev}\n${publicErr.message}` : publicErr.message);
          } finally {
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        try {
          // Fetch all modules (public, but using fetchWithAuth for consistency)
          const modulesPromise = fetchWithAuth('/api/modules')
            .then(res => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for /api/modules`);
              return res.json();
            });

          // Fetch user's favorite modules (protected)
          // This endpoint is not defined in backend, so expect it to fail or return 404
          const favoritesPromise = fetchWithAuth('/api/favorites')
            .then(res => {
              if (!res.ok) {
                if (res.status === 404) {
                  console.warn('/api/favorites endpoint not found, treating as empty list.');
                  return []; // Gracefully handle 404 for favorites
                }
                // For other errors, it might throw, or you can return default like []
                console.error(`Failed to fetch favorites: ${res.status}`);
                // Optionally set a specific part of the error state for favorites
                // setError(prev => prev ? `${prev}\nCould not load favorites.` : 'Could not load favorites.');
                return []; // Default to empty favorites on error
              }
              return res.json();
            })
            .catch(favError => { // Catch if fetchWithAuth itself throws (e.g. network error before HTTP status)
              console.error("Could not fetch favorites (network or other error):", favError.message);
              // setError(prev => prev ? `${prev}\n${favError.message}` : favError.message);
              return []; // Default to empty favorites
            });
          
          const [modulesRes, favoritesRes] = await Promise.all([modulesPromise, favoritesPromise]);
          
          setModules(modulesRes || []); // Ensure modulesRes is an array
          setFilteredModules(modulesRes || []);
          setFavoriteModules(favoritesRes || []); // Ensure favoritesRes is an array
          
        } catch (err) {
          // This will catch errors from modulesPromise if not caught locally, or other unforeseen errors
          setError(prev => prev ? `${prev}\n${err.message}` : err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchModulesData();
    }, [fetchWithAuth]); // Add fetchWithAuth to dependency array

    const indexOfLastModule = currentPage * modulesPerPage;
    const indexOfFirstModule = indexOfLastModule - modulesPerPage;
    const currentModules = filteredModules.slice(indexOfFirstModule, indexOfLastModule);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleSearch = (results) => {
      setFilteredModules(results);
      setCurrentPage(1);
    };

    const handleToggleFavorite = async (moduleId) => {
      if (typeof fetchWithAuth !== 'function') {
        setError("Action not available: Authentication service missing.");
        return;
      }
      try {
        // This endpoint is not defined in the backend, so this will fail.
        const response = await fetchWithAuth(`/api/favorites/${moduleId}`, {
          method: 'POST', 
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Favorite toggle for module ${moduleId} failed: Endpoint /api/favorites/${moduleId} not found.`);
            setError(prev => prev ? `${prev}\nFavorite feature unavailable (endpoint not found).` : 'Favorite feature unavailable (endpoint not found).');
            return; 
          }
          // Attempt to get error message from response body
          const errorData = await response.json().catch(() => ({ message: `Failed to toggle favorite: ${response.status}` }));
          throw new Error(errorData.message);
        }
        
        // Optimistic update as the endpoint doesn't exist to return the true state
        setFavoriteModules(prevFavorites => {
          const newFavorites = prevFavorites.includes(moduleId)
            ? prevFavorites.filter(id => id !== moduleId)
            : [...prevFavorites, moduleId];
          // console.log('Updated favorites (optimistic):', newFavorites);
          return newFavorites;
        });
        // console.log(`Toggled favorite for module ${moduleId}. (Frontend optimistic update)`);

      } catch (err) {
        // console.error("Error in handleToggleFavorite:", err);
        setError(prev => prev ? `${prev}\n${err.message}` : err.message);
      }
    };

    if (loading) {
      return <p>Chargement des modules...</p>;
    }

    if (error) {
      return <ApiError message={error} />;
    }

    return (
      <div>
        <h2>{translate('modules.title')}</h2>

        <Search onSearch={handleSearch} />

        <ul>
          {currentModules.map((module) => (
            <li key={module.id}>
              <Link to={`/module/${module.id}`}>{module.nom}</Link>
              <button onClick={() => handleToggleFavorite(module.id)}>
                {favoriteModules.includes(module.id) ? translate('modules.removeFavorite') : translate('modules.addFavorite')}
              </button>
            </li>
          ))}
        </ul>

        <div>
          {Array.from({ length: Math.ceil(filteredModules.length / modulesPerPage) }).map((_, index) => (
            <button key={index + 1} onClick={() => paginate(index + 1)}>
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  export default Modules;
