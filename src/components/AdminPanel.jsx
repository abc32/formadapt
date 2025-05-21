import React, { useState, useEffect } from 'react';
  import './AdminPanel.css';
  import translate from '../i18n';
  import ApiError from './ApiError';

  // Assuming fetchWithAuth is passed as a prop from App.jsx
  function AdminPanel({ fetchWithAuth }) {
    const [modules, setModules] = useState([]); // Will be fetched from API
    const [newModule, setNewModule] = useState({ 
      nom: '', 
      contenu: '', 
      document: '', 
      audio_fr: '', 
      audio_en: '', 
      audio_es: '', 
      subtitles_fr: '', 
      subtitles_en: '', 
      subtitles_es: '' 
    });
    const [editModuleId, setEditModuleId] = useState(null); // To store ID of module being edited
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ nom: '', email: '', role: 'user' });
    const [editUserId, setEditUserId] = useState(null);
    const [statistics, setStatistics] = useState({
      activeUsers: 0,
      totalModules: 0,
      averageProgress: 0,
    });
    const [currentUserRole, setCurrentUserRole] = useState(localStorage.getItem('userRole') || 'user'); // Use userRole from localStorage
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false); // For general loading state

    // Fetch initial data (Users, Statistics, and Modules)
    useEffect(() => {
      const fetchAdminData = async () => {
        if (currentUserRole !== 'admin' || typeof fetchWithAuth !== 'function') {
          if (currentUserRole === 'admin' && typeof fetchWithAuth !== 'function') {
            setError("Admin functions disabled: Authentication service not available.");
          }
          return;
        }
        setLoading(true);
        setError(null);

        try {
          const usersPromise = fetchWithAuth('/api/users').then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.message || 'Failed to fetch users')});
            return res.json();
          });
          const statisticsPromise = fetchWithAuth('/api/statistics').then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.message || 'Failed to fetch statistics')});
            return res.json();
          });
          // Fetch modules
          const modulesPromise = fetchWithAuth('/api/modules').then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.message || 'Failed to fetch modules')});
            return res.json();
          });

          const [usersData, statisticsData, modulesData] = await Promise.all([
            usersPromise, 
            statisticsPromise, 
            modulesPromise
          ]);
          
          setUsers(usersData || []);
          setStatistics(statisticsData || { activeUsers: 0, totalModules: 0, averageProgress: 0 });
          setModules(modulesData || []);

        } catch (err) {
          setError(err.message || "An error occurred while fetching admin data.");
        } finally {
          setLoading(false);
        }
      };

      fetchAdminData();
    }, [currentUserRole, fetchWithAuth]);

    const handleModuleInputChange = (event) => {
      // Ensure all defined fields in newModule are updated
      const { name, value } = event.target;
      setNewModule(prev => ({ ...prev, [name]: value }));
    };

    const resetModuleForm = () => {
      setNewModule({ 
        nom: '', contenu: '', document: '', audio_fr: '', audio_en: '', 
        audio_es: '', subtitles_fr: '', subtitles_en: '', subtitles_es: '' 
      });
      setEditModuleId(null);
    };

    const fetchModulesList = async () => {
      if (typeof fetchWithAuth !== 'function') return;
      setLoading(true);
      try {
        const response = await fetchWithAuth('/api/modules');
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.message || 'Failed to fetch modules');
        }
        const data = await response.json();
        setModules(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleSaveModule = async () => { // Handles both Create and Update
      if (!newModule.nom || !newModule.contenu) {
        setError("Module name (nom) and content (contenu) are required.");
        return;
      }
      if (typeof fetchWithAuth !== 'function') {
        setError("Action disabled: Authentication service not available.");
        return;
      }
      setLoading(true);
      setError(null);
      const method = editModuleId ? 'PUT' : 'POST';
      const url = editModuleId ? `/api/modules/${editModuleId}` : '/api/modules';

      try {
        const response = await fetchWithAuth(url, {
          method: method,
          body: JSON.stringify(newModule),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Failed to ${editModuleId ? 'update' : 'create'} module` }));
          throw new Error(errorData.message);
        }
        await fetchModulesList(); // Refresh list
        resetModuleForm();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleEditModule = (module) => {
      setEditModuleId(module._id); // Use _id from MongoDB
      setNewModule({ // Pre-fill form with all fields from the module
        nom: module.nom || '',
        contenu: module.contenu || '',
        document: module.document || '',
        audio_fr: module.audio_fr || '',
        audio_en: module.audio_en || '',
        audio_es: module.audio_es || '',
        subtitles_fr: module.subtitles_fr || '',
        subtitles_en: module.subtitles_en || '',
        subtitles_es: module.subtitles_es || '',
      });
    };
    
    const handleDeleteModule = async (moduleId) => {
      if (!window.confirm(translate('adminPanel.confirmDeleteModule') || "Are you sure you want to delete this module?")) {
        return;
      }
      if (typeof fetchWithAuth !== 'function') {
        setError("Action disabled: Authentication service not available.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth(`/api/modules/${moduleId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to delete module' }));
          throw new Error(errorData.message);
        }
        await fetchModulesList(); // Refresh list
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleUserInputChange = (event) => {
      setNewUser({ ...newUser, [event.target.name]: event.target.value });
    };

    const handleAddUser = async () => {
      if (newUser.nom && newUser.email && typeof fetchWithAuth === 'function') {
        try {
          const response = await fetchWithAuth('/api/users', {
            method: 'POST',
            body: JSON.stringify(newUser), // Content-Type is handled by fetchWithAuth
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to add user' }));
            throw new Error(errorData.message);
          }
          const data = await response.json();
          setUsers([...users, data]);
          setNewUser({ nom: '', email: '', role: 'user', password: '' }); // Clear password field too
        } catch (err) {
          setError(err.message);
        }
      } else if (typeof fetchWithAuth !== 'function') {
        setError("Action disabled: Authentication service not available.");
      }
    };

    const handleEditUser = async (userId) => {
      setEditUserId(userId);
      const userToEdit = users.find(user => user.id === userId);
      setNewUser(userToEdit);
    };

    const handleUpdateUser = async () => {
      if (newUser.nom && newUser.email && editUserId && typeof fetchWithAuth === 'function') {
        try {
          // Backend expects role, nom, email. Password is not updated here.
          const userToUpdate = { nom: newUser.nom, email: newUser.email, role: newUser.role };
          const response = await fetchWithAuth(`/api/users/${editUserId}`, {
            method: 'PUT',
            body: JSON.stringify(userToUpdate), // Send only updatable fields
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update user' }));
            throw new Error(errorData.message);
          }
          const updatedUserFromServer = await response.json(); // Get updated user from server
          setUsers(users.map(user => (user._id === editUserId ? updatedUserFromServer : user))); // Use _id for MongoDB
          setEditUserId(null);
          setNewUser({ nom: '', email: '', role: 'user', password: '' });
        } catch (err) {
          setError(err.message);
        }
      } else if (typeof fetchWithAuth !== 'function') {
        setError("Action disabled: Authentication service not available.");
      }
    };

    const handleDeleteUser = async (userId) => {
      if (typeof fetchWithAuth !== 'function') {
        setError("Action disabled: Authentication service not available.");
        return;
      }
      try {
        const response = await fetchWithAuth(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to delete user' }));
          throw new Error(errorData.message);
        }
        setUsers(users.filter(user => user._id !== userId)); // Use _id for MongoDB
      } catch (err) {
        setError(err.message);
      }
    };

    return (
      <div className="admin-panel">
        <h2>{translate('adminPanel.title')}</h2>

        {currentUserRole === 'admin' && (
          <>
            <fieldset className="admin-form-section">
              <legend>{editModuleId ? translate('adminPanel.editModule') : translate('adminPanel.addModule')}</legend>
              <div>
                <label htmlFor="module-nom">{translate('adminPanel.moduleName')}</label>
                <input type="text" id="module-nom" name="nom" value={newModule.nom} onChange={handleModuleInputChange} required aria-required="true" />
              </div>
              <div>
                <label htmlFor="module-contenu">{translate('adminPanel.moduleContent')}</label>
                <textarea id="module-contenu" name="contenu" value={newModule.contenu} onChange={handleModuleInputChange} required aria-required="true" />
              </div>
              <div>
                <label htmlFor="module-document">{translate('adminPanel.moduleDocumentUrl')}</label>
                <input type="text" id="module-document" name="document" value={newModule.document} onChange={handleModuleInputChange} />
              </div>
              {/* Audio Fields */}
              <div>
                <label htmlFor="module-audio_fr">{translate('adminPanel.audioFrUrl')}</label>
                <input type="text" id="module-audio_fr" name="audio_fr" value={newModule.audio_fr} onChange={handleModuleInputChange} />
              </div>
              <div>
                <label htmlFor="module-audio_en">{translate('adminPanel.audioEnUrl')}</label>
                <input type="text" id="module-audio_en" name="audio_en" value={newModule.audio_en} onChange={handleModuleInputChange} />
              </div>
              <div>
                <label htmlFor="module-audio_es">{translate('adminPanel.audioEsUrl')}</label>
                <input type="text" id="module-audio_es" name="audio_es" value={newModule.audio_es} onChange={handleModuleInputChange} />
              </div>
              {/* Subtitles Fields */}
              <div>
                <label htmlFor="module-subtitles_fr">{translate('adminPanel.subtitlesFrUrl')}</label>
                <input type="text" id="module-subtitles_fr" name="subtitles_fr" value={newModule.subtitles_fr} onChange={handleModuleInputChange} />
              </div>
              <div>
                <label htmlFor="module-subtitles_en">{translate('adminPanel.subtitlesEnUrl')}</label>
                <input type="text" id="module-subtitles_en" name="subtitles_en" value={newModule.subtitles_en} onChange={handleModuleInputChange} />
              </div>
              <div>
                <label htmlFor="module-subtitles_es">{translate('adminPanel.subtitlesEsUrl')}</label>
                <input type="text" id="module-subtitles_es" name="subtitles_es" value={newModule.subtitles_es} onChange={handleModuleInputChange} />
              </div>

              <button onClick={handleSaveModule}>
                {editModuleId ? translate('adminPanel.updateModule') : translate('adminPanel.createModule')}
              </button>
              {editModuleId && <button onClick={resetModuleForm} type="button">{translate('adminPanel.cancelEdit')}</button>}
            </fieldset>

            <section aria-labelledby="manage-modules-heading">
              <h3 id="manage-modules-heading">{translate('adminPanel.manageModules')}</h3>
              {loading && <p aria-busy="true">{translate('adminPanel.loadingModules') || 'Loading modules...'}</p>}
              <ul>
                {modules.map(module => (
                  <li key={module._id}> {/* Use _id from MongoDB */}
                    {module.nom}
                    <button onClick={() => handleEditModule(module)} aria-label={`${translate('adminPanel.edit') || 'Edit'} ${module.nom}`}>{translate('adminPanel.edit')}</button>
                    <button onClick={() => handleDeleteModule(module._id)} aria-label={`${translate('adminPanel.delete') || 'Delete'} ${module.nom}`}>{translate('adminPanel.delete')}</button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <fieldset className="admin-form-section">
          <legend>{translate('adminPanel.manageUsers')}</legend>
          <div>
            <label htmlFor="user-name">{translate('adminPanel.userName')}</label>
            <input type="text" id="user-name" name="nom" value={newUser.nom} onChange={handleUserInputChange} />
          </div>
          <div>
            <label htmlFor="user-email">{translate('adminPanel.userEmail')}</label>
            <input type="email" id="user-email" name="email" value={newUser.email} onChange={handleUserInputChange} />
          </div>
          <div>
            <label htmlFor="user-role">{translate('adminPanel.userRole')}</label>
            <select id="user-role" name="role" value={newUser.role} onChange={handleUserInputChange}>
              <option value="user">{translate('adminPanel.user') || 'User'}</option>
              <option value="admin">{translate('adminPanel.admin') || 'Admin'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="user-password">{translate('adminPanel.userPassword') || 'Password (for new user)'}:</label>
            <input type="password" id="user-password" name="password" value={newUser.password || ''} onChange={handleUserInputChange} />
          </div>
          <button onClick={editUserId ? handleUpdateUser : handleAddUser}>
            {editUserId ? translate('adminPanel.updateUser') : translate('adminPanel.addUser')}
          </button>
          {loading && <p aria-busy="true">{translate('adminPanel.loadingUsers') || 'Loading users...'}</p>}
          <ul>
            {users.map(user => (
              // Assuming user._id from MongoDB now
              <li key={user._id || user.id}> 
                {user.nom} - {user.email} - {user.role}
                <button onClick={() => handleEditUser(user._id || user.id)} aria-label={`${translate('adminPanel.edit') || 'Edit'} ${user.nom}`}>{translate('adminPanel.edit')}</button>
                <button onClick={() => handleDeleteUser(user._id || user.id)} aria-label={`${translate('adminPanel.delete') || 'Delete'} ${user.nom}`}>{translate('adminPanel.delete')}</button>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>{translate('adminPanel.manageUsers')}</h3>
        <div>
          <label htmlFor="user-name">{translate('adminPanel.userName')}</label>
          <input type="text" id="user-name" name="nom" value={newUser.nom} onChange={handleUserInputChange} />
        </div>
        <div>
          <label htmlFor="user-email">{translate('adminPanel.userEmail')}</label>
          <input type="email" id="user-email" name="email" value={newUser.email} onChange={handleUserInputChange} />
        </div>
        <div>
          <label htmlFor="user-role">{translate('adminPanel.userRole')}</label>
          <select id="user-role" name="role" value={newUser.role} onChange={handleUserInputChange}>
            <option value="user">{translate('adminPanel.user') || 'User'}</option>
            <option value="admin">{translate('adminPanel.admin') || 'Admin'}</option>
          </select>
        </div>
        <div>
          <label htmlFor="user-password">{translate('adminPanel.userPassword') || 'Password (for new user)'}:</label>
          <input type="password" id="user-password" name="password" value={newUser.password || ''} onChange={handleUserInputChange} />
        </div>
        <button onClick={editUserId ? handleUpdateUser : handleAddUser}>
          {editUserId ? translate('adminPanel.updateUser') : translate('adminPanel.addUser')}
        </button>
        <ul>
          {users.map(user => (
            // Assuming user._id from MongoDB now
            <li key={user._id || user.id}> 
              {user.nom} - {user.email} - {user.role}
              <button onClick={() => handleEditUser(user._id || user.id)}>{translate('adminPanel.edit')}</button>
              <button onClick={() => handleDeleteUser(user._id || user.id)}>{translate('adminPanel.delete')}</button>
            </li>
          ))}
        </ul>

        <h3>{translate('adminPanel.statistics')}</h3>
        <p>{translate('adminPanel.activeUsers')}: {statistics.activeUsers}</p>
        <p>{translate('adminPanel.totalModules')}: {statistics.totalModules}</p>
        <p>{translate('adminPanel.averageProgress')}: {statistics.averageProgress}%</p>
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default AdminPanel;
