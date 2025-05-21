import React, { useState, useEffect } from 'react';
  import './Dashboard.css';
  import { Link } from 'react-router-dom';
  import translate from '../i18n';
  import StudyPlanner from './StudyPlanner';
  import Settings from './Settings';
  import AdminPanel from './AdminPanel';
  import ApiError from './ApiError';

  // Assuming fetchWithAuth and isAdmin (optional) are passed as props from App.jsx
  function Dashboard({ isAdmin, fetchWithAuth }) {
    const [userProgressModules, setUserProgressModules] = useState([]);
    // const [favoriteModules, setFavoriteModules] = useState([]); // Favorites not part of this task
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // const [reminders, setReminders] = useState({}); // Reminders not part of this task
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('lastAccessedAt_desc'); // Default sort

    useEffect(() => {
      const fetchUserProgress = async () => {
        if (!fetchWithAuth) {
          setError("Authentication service not available.");
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const response = await fetchWithAuth('/api/user/progress');
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user progress' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          const progressData = await response.json();
          setUserProgressModules(progressData || []);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchUserProgress();
    }, [fetchWithAuth]); // Re-fetch if fetchWithAuth changes (e.g. on login/logout)

    const handleSearchChange = (event) => {
      setSearchTerm(event.target.value.toLowerCase());
    };

    const handleSortChange = (event) => {
      setSortOption(event.target.value);
    };

    const processedModules = userProgressModules
      .map(progressEntry => ({
        ...progressEntry.moduleDetails, // Spread module details (nom, _id, etc.)
        progress: progressEntry.progress,
        score: progressEntry.score,
        completed: progressEntry.completed,
        lastAccessedAt: progressEntry.lastAccessedAt,
        // Use moduleDetails._id as the key for Link, assuming it's the module's actual ID
        moduleId: progressEntry.moduleDetails?._id || progressEntry.moduleId 
      }))
      .filter(module => module.nom && module.nom.toLowerCase().includes(searchTerm))
      .sort((a, b) => {
        if (sortOption === 'nom_asc') return a.nom.localeCompare(b.nom);
        if (sortOption === 'nom_desc') return b.nom.localeCompare(a.nom);
        if (sortOption === 'progress_asc') return (a.progress || 0) - (b.progress || 0);
        if (sortOption === 'progress_desc') return (b.progress || 0) - (a.progress || 0);
        if (sortOption === 'lastAccessedAt_asc') return new Date(a.lastAccessedAt) - new Date(b.lastAccessedAt);
        if (sortOption === 'lastAccessedAt_desc') return new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt);
        return 0;
      });


    if (loading) {
      return <p>{translate('dashboard.loading') || 'Loading dashboard data...'}</p>;
    }

    if (error) {
      return <ApiError message={error} />;
    }
    
    // If isAdmin is true, render AdminPanel, otherwise render user dashboard
    // This assumes AdminPanel will have its own data fetching or receives all it needs.
    // For this task, we focus on the user progress dashboard.
    if (isAdmin) {
        return <AdminPanel fetchWithAuth={fetchWithAuth} />;
    }

    return (
      <div className="dashboard">
        <h2>{translate('dashboard.title') || 'My Dashboard'}</h2>

        <div className="dashboard-controls">
          <input
            type="text"
            placeholder={translate('dashboard.searchModules') || 'Search modules...'}
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label={translate('dashboard.searchModules') || 'Search modules'}
          />
          <select value={sortOption} onChange={handleSortChange} aria-label={translate('dashboard.sortModules') || 'Sort modules'}>
            <option value="lastAccessedAt_desc">{translate('dashboard.sortByLastAccessedDesc') || 'Last Accessed (Newest)'}</option>
            <option value="lastAccessedAt_asc">{translate('dashboard.sortByLastAccessedAsc') || 'Last Accessed (Oldest)'}</option>
            <option value="nom_asc">{translate('dashboard.sortByNomAsc') || 'Name (A-Z)'}</option>
            <option value="nom_desc">{translate('dashboard.sortByNomDesc') || 'Name (Z-A)'}</option>
            <option value="progress_desc">{translate('dashboard.sortByProgressDesc') || 'Progress (High-Low)'}</option>
            <option value="progress_asc">{translate('dashboard.sortByProgressAsc') || 'Progress (Low-High)'}</option>
          </select>
        </div>

        <h3>{translate('dashboard.myModulesProgress') || 'My Modules Progress'}</h3>
        {processedModules.length === 0 && !loading && (
            <p>{translate('dashboard.noModulesStarted') || 'You have not started any modules yet, or no modules match your search.'}</p>
        )}
        <ul className="module-progress-list">
          {processedModules.map((module) => (
            <li key={module.moduleId} className={`module-progress-item ${module.completed ? 'completed' : ''}`}>
              <Link to={`/module/${module.moduleId}`}>
                <h4>{module.nom}</h4>
              </Link>
              <div className="progress-bar-container" role="progressbar" 
                   aria-valuenow={module.progress || 0} 
                   aria-valuemin="0" 
                   aria-valuemax="100" 
                   aria-label={`${translate('dashboard.progressFor', { moduleName: module.nom }) || `Progress for ${module.nom}`}`}>
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${module.progress || 0}%` }}
                >
                  {module.progress || 0}%
                </div>
              </div>
              <p>{translate('dashboard.status') || 'Status'}: {module.completed ? (translate('dashboard.completed') || 'Completed') : (translate('dashboard.inProgress') || 'In Progress')}
                {module.score !== null && ` - ${translate('dashboard.score') || 'Score'}: ${module.score}%`}
              </p>
              {module.lastAccessedAt && (
                <p className="last-accessed">
                  {translate('dashboard.lastAccessed') || 'Last accessed'}: {new Date(module.lastAccessedAt).toLocaleDateString()}
                </p>
              )}
            </li>
          ))}
        </ul>
        
        {/* StudyPlanner and Settings components can be added here if needed */}
        {/* <StudyPlanner /> */}
        {/* <Settings /> */}
      </div>
    );
  }

  export default Dashboard;
