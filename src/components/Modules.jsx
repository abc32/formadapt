import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Search from './Search.jsx';
import { useI18n } from '../i18n'; // Import useI18n
import ApiError from './ApiError';
import { fetchWithAuth } from '../utils/api'; // Import fetchWithAuth

function Modules() {
  const { translate } = useI18n(); // Correctly get translate function
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modulesPerPage] = useState(10);
  const [filteredModules, setFilteredModules] = useState([]);
  const [favoriteModules, setFavoriteModules] = useState([]);

  useEffect(() => {
    const fetchModulesData = async () => {
      setLoading(true);
      setError(null);
      try {
        // All these routes are now protected and should use fetchWithAuth
        const [modulesRes, favoritesRes] = await Promise.all([
          fetchWithAuth('/api/modules'), 
          fetchWithAuth('/api/favorites')
        ]);

        if (!modulesRes.ok) {
          throw new Error(`Failed to fetch modules: ${modulesRes.statusText}`);
        }
        if (!favoritesRes.ok) {
          // It's possible a user has no favorites, which might not be an error.
          // Depending on API, 404 might be normal if no favorites.
          // For now, let's assume 200 OK with empty array if no favs.
          // If API returns error for "no favorites", this needs adjustment.
          console.warn(`Failed to fetch favorites or no favorites found: ${favoritesRes.statusText}`);
          // Set to empty array if favorites fetch fails or returns non-ok status
          // to prevent app crash, and allow modules to still display.
          setFavoriteModules([]); 
        }
        
        const modulesData = await modulesRes.json();
        let favoritesData = [];
        if (favoritesRes.ok) { // Only parse if response was ok
            favoritesData = await favoritesRes.json();
        }

        setModules(modulesData);
        setFilteredModules(modulesData);
        setFavoriteModules(favoritesData); // Ensure this is an array
        
      } catch (err) {
        console.error("Modules fetchModulesData error:", err);
        if (err.message !== 'Unauthorized') {
            setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchModulesData();
  }, []);

  const indexOfLastModule = currentPage * modulesPerPage;
  const indexOfFirstModule = indexOfLastModule - modulesPerPage;
  const currentModules = filteredModules.slice(indexOfFirstModule, indexOfLastModule);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSearch = (results) => {
    // Assuming results from Search component are already filtered modules
    setFilteredModules(results); 
    setCurrentPage(1);
  };

  const handleToggleFavorite = async (moduleId) => {
    try {
      // Assuming /api/favorites/:moduleId is the endpoint for POST to toggle
      // And it returns the new list of favorites or a success status
      const response = await fetchWithAuth(`/api/favorites/${moduleId}`, {
        method: 'POST', 
        // No body needed if it's a simple toggle endpoint
      });

      if (!response.ok) {
        // Try to get error message from backend if available
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) { /* ignore parsing error */ }
        throw new Error(errorData?.message || `Failed to toggle favorite: ${response.statusText}`);
      }

      // Update favoriteModules state based on the action
      // This is a common pattern, but ideally, the backend might return the updated list of favorites.
      // Or, refetch favorites. For simplicity, toggling locally.
      if (favoriteModules.includes(moduleId)) {
        setFavoriteModules(favoriteModules.filter(id => id !== moduleId));
      } else {
        setFavoriteModules([...favoriteModules, moduleId]);
      }
    } catch (err) {
      console.error("Modules handleToggleFavorite error:", err);
      if (err.message !== 'Unauthorized') {
          setError(err.message);
      }
    }
  };

  if (loading) {
    return <p>{translate('modules.loading') || 'Loading modules...'}</p>;
  }

  if (error) {
    return <ApiError message={error} />;
  }

  return (
    <div>
      <h2>{translate('modules.title') || "All Modules"}</h2>

      {/* Pass all modules to Search component for it to filter */}
      <Search allModules={modules} onSearch={handleSearch} /> 

      {currentModules.length > 0 ? (
        <ul>
          {currentModules.map((module) => (
            <li key={module.id}>
              <Link to={`/module/${module.id}`}>{module.nom}</Link>
              <button onClick={() => handleToggleFavorite(module.id)}>
                {favoriteModules.includes(module.id) 
                  ? translate('modules.removeFavorite') 
                  : translate('modules.addFavorite')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>{translate('modules.noModulesFound') || "No modules found."}</p>
      )}
      

      {filteredModules.length > modulesPerPage && (
        <div>
          {Array.from({ length: Math.ceil(filteredModules.length / modulesPerPage) }).map((_, index) => (
            <button key={index + 1} onClick={() => paginate(index + 1)}>
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Modules;
