import React, { useState, useEffect } from 'react';
  import './Dashboard.css';
  import { Link } from 'react-router-dom';
  import translate from '../i18n';
  import StudyPlanner from './StudyPlanner';
  import Settings from './Settings';
  import AdminPanel from './AdminPanel';
  import ApiError from './ApiError';

  function Dashboard() {
    const [userModules, setUserModules] = useState([]);
    const [favoriteModules, setFavoriteModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reminders, setReminders] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('nom');

    useEffect(() => {
      const fetchData = async () => {
        try {
          const [allModules, userModulesData, favModules, remindersData] = await Promise.all([
            fetch(`/api/modules?sort=${sortOption}`, {
              headers: { 'Authorization': localStorage.getItem('token') },
            }).then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            }),
            fetch('/api/user/modules', {
              headers: { 'Authorization': localStorage.getItem('token') },
            }).then(res => {
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
            Promise.resolve(JSON.parse(localStorage.getItem('reminders')) || {}),
          ]);
          setUserModules(allModules);
          setFavoriteModules(favModules);
          setReminders(remindersData);
          setLoading(false);
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      };
      fetchData();
    }, [sortOption]);

    const handleSearchChange = (event) => {
      setSearchTerm(event.target.value);
    };

    const handleSortChange = (event) => {
      setSortOption(event.target.value);
    };

    let displayedModules = [...userModules];

    if (searchTerm) {
      displayedModules = displayedModules.filter(module =>
        module.nom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const filteredFavorites = displayedModules.filter(module => favoriteModules.includes(module.id));

    if (loading) {
      return <p>Chargement des données...</p>;
    }

    if (error) {
      return <ApiError message={error} />;
    }

    return (
      <div className="dashboard">
        {/* ... (code précédent) */}

        <input
          type="text"
          placeholder={translate('dashboard.searchModules')}
          value={searchTerm}
          onChange={handleSearchChange}
          aria-label={translate('dashboard.searchModules')}
        />

        <select value={sortOption} onChange={handleSortChange} aria-label={translate('dashboard.sortModules')}>
          <option value="nom">{translate('dashboard.sortByNom')}</option>
          <option value="progress">{translate('dashboard.sortByProgress')}</option>
        </select>

        <h3>{translate('dashboard.progress')}</h3>
        <ul>
          {displayedModules.map((module) => (
            <li key={module.id}>
              <Link to={`/module/${module.id}`}>{module.nom}</Link> - {module.progress}%
            </li>
          ))}
        </ul>

        {/* ... (code précédent) */}
      </div>
    );
  }

  export default Dashboard;
