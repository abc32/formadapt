import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n'; // Ensure useI18n is imported
import StudyPlanner from './StudyPlanner';
import Settings from './Settings';
import AdminPanel from './AdminPanel';
import ApiError from './ApiError';
import { fetchWithAuth } from '../utils/api'; // Import fetchWithAuth

function Dashboard() {
  const { translate } = useI18n(); // Correctly get translate function
  const [userModules, setUserModules] = useState([]);
  const [favoriteModules, setFavoriteModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reminders, setReminders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('nom');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [allModulesRes, userModulesRes, favModulesRes] = await Promise.all([
          fetchWithAuth(`/api/modules?sort=${sortOption}`),
          fetchWithAuth('/api/user/modules'), 
          // Assuming /api/favorites is a protected route, if not, use regular fetch
          // For now, let's assume it's protected for consistency
          fetchWithAuth('/api/favorites') 
        ]);

        if (!allModulesRes.ok) throw new Error(`Failed to fetch all modules: ${allModulesRes.statusText}`);
        if (!userModulesRes.ok) throw new Error(`Failed to fetch user modules: ${userModulesRes.statusText}`);
        if (!favModulesRes.ok) throw new Error(`Failed to fetch favorites: ${favModulesRes.statusText}`);

        const allModules = await allModulesRes.json();
        // userModulesData is not directly used for setUserModules, allModules is used.
        // This might be an area for review based on actual data needs.
        // const userModulesData = await userModulesRes.json(); 
        await userModulesRes.json(); // Still need to consume the JSON body
        
        const favModules = await favModulesRes.json();
        
        const remindersData = JSON.parse(localStorage.getItem('reminders')) || {};
        
        setUserModules(allModules);
        setFavoriteModules(favModules); // Assuming favModules is an array of module IDs or objects
        setReminders(remindersData);
        
      } catch (err) {
        console.error("Dashboard fetchData error:", err);
        // If fetchWithAuth throws 'Unauthorized', it has already redirected.
        // Only set error if it's not an 'Unauthorized' error or if we want to display a specific message.
        if (err.message !== 'Unauthorized') {
            setError(err.message);
        }
      } finally {
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

  // Assuming favoriteModules is an array of IDs. Adjust if it's an array of objects.
  const filteredFavorites = displayedModules.filter(module => 
    favoriteModules.some(fav => fav === module.id || (typeof fav === 'object' && fav.id === module.id))
  );


  if (loading) {
    return <p>{translate('dashboard.loading') || 'Loading data...'}</p>;
  }

  if (error) {
    return <ApiError message={error} />;
  }

  return (
    <div className="dashboard">
      <h1>{translate('dashboard.title') || 'Dashboard'}</h1>
      {/* Example: Display user email if available from a context or props */}
      {/* <p>{translate('dashboard.email')} {currentUser ? currentUser.email : 'N/A'}</p> */}

      <input
        type="text"
        placeholder={translate('dashboard.searchModules') || "Search modules..."}
        value={searchTerm}
        onChange={handleSearchChange}
        aria-label={translate('dashboard.searchModules') || "Search modules"}
      />

      <select value={sortOption} onChange={handleSortChange} aria-label={translate('dashboard.sortModules') || "Sort modules by"}>
        <option value="nom">{translate('dashboard.sortByNom') || "Sort by Name"}</option>
        <option value="progress">{translate('dashboard.sortByProgress') || "Sort by Progress"}</option>
      </select>

      <h3>{translate('dashboard.progress') || "Progress in modules"}</h3>
      {displayedModules.length > 0 ? (
        <ul>
          {displayedModules.map((module) => (
            <li key={module.id}>
              <Link to={`/module/${module.id}`}>{module.nom}</Link> - {module.progress || 0}%
            </li>
          ))}
        </ul>
      ) : (
        <p>{translate('dashboard.noModules') || "No modules to display."}</p>
      )}
      

      <h3>{translate('dashboard.favorites') || "Favorite modules"}</h3>
      {filteredFavorites.length > 0 ? (
      <ul>
        {filteredFavorites.map((module) => (
          <li key={module.id}>
            <Link to={`/module/${module.id}`}>{module.nom}</Link>
          </li>
        ))}
      </ul>
      ) : (
        <p>{translate('dashboard.noFavorites') || "No favorite modules yet."}</p>
      )}

      {/* Placeholder for other dashboard sections if they exist */}
      {/* <StudyPlanner reminders={reminders} setReminders={setReminders} /> */}
      {/* <Settings /> */}
      {/* For Admin users, a link to AdminPanel could be here or in Navbar */}
      {/* {userRole === 'admin' && <Link to="/admin">Admin Panel</Link>} */}
    </div>
  );
}

export default Dashboard;
