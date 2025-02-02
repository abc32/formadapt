import React, { useEffect, useState } from 'react';
  import { Link } from 'react-router-dom';
  import Search from './Search.jsx';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function Modules() {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [modulesPerPage] = useState(10);
    const [filteredModules, setFilteredModules] = useState([]);
    const [favoriteModules, setFavoriteModules] = useState([]);

    useEffect(() => {
      const fetchModules = async () => {
        try {
          const [modulesRes, favoritesRes] = await Promise.all([
            fetch('/api/modules').then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            }),
            fetch('/api/favorites', {
              headers: { 'Authorization': localStorage.getItem('token') },
            }).then(res => {
              if (!res.ok) {
                throw new Error('Failed to fetch favorites');
              }
              return res.json();
            }),
          ]);
          setModules(modulesRes);
          setFilteredModules(modulesRes);
          setFavoriteModules(favoritesRes);
          setLoading(false);
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      };
      fetchModules();
    }, []);

    const indexOfLastModule = currentPage * modulesPerPage;
    const indexOfFirstModule = indexOfLastModule - modulesPerPage;
    const currentModules = filteredModules.slice(indexOfFirstModule, indexOfLastModule);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleSearch = (results) => {
      setFilteredModules(results);
      setCurrentPage(1);
    };

    const handleToggleFavorite = async (moduleId) => {
      try {
        await fetch(`/api/favorites/${moduleId}`, {
          method: 'POST',
          headers: { 'Authorization': localStorage.getItem('token') },
        });
        if (favoriteModules.includes(moduleId)) {
          setFavoriteModules(favoriteModules.filter(id => id !== moduleId));
        } else {
          setFavoriteModules([...favoriteModules, moduleId]);
        }
      } catch (err) {
        setError(err.message);
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
