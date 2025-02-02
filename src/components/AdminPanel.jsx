import React, { useState, useEffect } from 'react';
  import './AdminPanel.css';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function AdminPanel() {
    const [modules, setModules] = useState(
      JSON.parse(localStorage.getItem('adminModules')) || []
    );
    const [newModule, setNewModule] = useState({ nom: '', contenu: '' });
    const [editModuleId, setEditModuleId] = useState(null);
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ nom: '', email: '', role: 'user' });
    const [editUserId, setEditUserId] = useState(null);
    const [statistics, setStatistics] = useState({
      activeUsers: 0,
      totalModules: 0,
      averageProgress: 0,
    });
    const [currentUserRole, setCurrentUserRole] = useState(localStorage.getItem('role') || 'user');
    const [error, setError] = useState(null);

    useEffect(() => {
      localStorage.setItem('adminModules', JSON.stringify(modules));
    }, [modules]);

    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/users', {
            headers: { 'Authorization': localStorage.getItem('token') },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch users');
          }
          const data = await response.json();
          setUsers(data);
        } catch (err) {
          setError(err.message);
        }
      };
      const fetchStatistics = async () => {
        try {
          const response = await fetch('/api/statistics', {
            headers: { 'Authorization': localStorage.getItem('token') },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch statistics');
          }
          const data = await response.json();
          setStatistics(data);
        } catch (err) {
          setError(err.message);
        }
      };
      if (currentUserRole === 'admin') {
        fetchUsers();
        fetchStatistics();
      }
    }, [currentUserRole]);

    const handleModuleInputChange = (event) => {
      setNewModule({ ...newModule, [event.target.name]: event.target.value });
    };

    const handleAddModule = () => {
      if (newModule.nom && newModule.contenu) {
        const newId = Date.now();
        setModules([...modules, { id: newId, ...newModule }]);
        setNewModule({ nom: '', contenu: '' });
      }
    };

    const handleEditModule = (moduleId) => {
      setEditModuleId(moduleId);
      const moduleToEdit = modules.find(module => module.id === moduleId);
      setNewModule(moduleToEdit);
    };

    const handleUpdateModule = () => {
      if (newModule.nom && newModule.contenu && editModuleId) {
        const updatedModules = modules.map(module =>
          module.id === editModuleId ? { ...module, ...newModule } : module
        );
        setModules(updatedModules);
        setEditModuleId(null);
        setNewModule({ nom: '', contenu: '' });
      }
    };

    const handleDeleteModule = (moduleId) => {
      const updatedModules = modules.filter(module => module.id !== moduleId);
      setModules(updatedModules);
    };

    const handleUserInputChange = (event) => {
      setNewUser({ ...newUser, [event.target.name]: event.target.value });
    };

    const handleAddUser = async () => {
      if (newUser.nom && newUser.email) {
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': localStorage.getItem('token'),
            },
            body: JSON.stringify(newUser),
          });
          if (!response.ok) {
            throw new Error('Failed to add user');
          }
          const data = await response.json();
          setUsers([...users, data]);
          setNewUser({ nom: '', email: '', role: 'user' });
        } catch (err) {
          setError(err.message);
        }
      }
    };

    const handleEditUser = async (userId) => {
      setEditUserId(userId);
      const userToEdit = users.find(user => user.id === userId);
      setNewUser(userToEdit);
    };

    const handleUpdateUser = async () => {
      if (newUser.nom && newUser.email && editUserId) {
        try {
          const response = await fetch(`/api/users/${editUserId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': localStorage.getItem('token'),
            },
            body: JSON.stringify(newUser),
          });
          if (!response.ok) {
            throw new Error('Failed to update user');
          }
          const updatedUsers = users.map(user =>
            user.id === editUserId ? { ...user, ...newUser } : user
          );
          setUsers(updatedUsers);
          setEditUserId(null);
          setNewUser({ nom: '', email: '', role: 'user' });
        } catch (err) {
          setError(err.message);
        }
      }
    };

    const handleDeleteUser = async (userId) => {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': localStorage.getItem('token') },
        });
        if (!response.ok) {
          throw new Error('Failed to delete user');
        }
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
      } catch (err) {
        setError(err.message);
      }
    };

    return (
      <div className="admin-panel">
        <h2>{translate('adminPanel.title')}</h2>

        {currentUserRole === 'admin' && (
          <>
            <h3>{translate('adminPanel.addModule')}</h3>
            <div>
              <label htmlFor="module-name">{translate('adminPanel.moduleName')}</label>
              <input type="text" id="module-name" name="nom" value={newModule.nom} onChange={handleModuleInputChange} />
            </div>
            <div>
              <label htmlFor="module-content">{translate('adminPanel.moduleContent')}</label>
              <textarea id="module-content" name="contenu" value={newModule.contenu} onChange={handleModuleInputChange} />
            </div>
            <button onClick={editModuleId ? handleUpdateModule : handleAddModule}>
              {editModuleId ? translate('adminPanel.updateModule') : translate('adminPanel.addModule')}
            </button>

            <h3>{translate('adminPanel.manageModules')}</h3>
            <ul>
              {modules.map(module => (
                <li key={module.id}>
                  {module.nom}
                  <button onClick={() => handleEditModule(module.id)}>{translate('adminPanel.edit')}</button>
                  <button onClick={() => handleDeleteModule(module.id)}>{translate('adminPanel.delete')}</button>
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
            <option value="user">{translate('adminPanel.user')}</option>
            <option value="admin">{translate('adminPanel.admin')}</option>
          </select>
        </div>
        <button onClick={editUserId ? handleUpdateUser : handleAddUser}>
          {editUserId ? translate('adminPanel.updateUser') : translate('adminPanel.addUser')}
        </button>
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.nom} - {user.email} - {user.role}
              <button onClick={() => handleEditUser(user.id)}>{translate('adminPanel.edit')}</button>
              <button onClick={() => handleDeleteUser(user.id)}>{translate('adminPanel.delete')}</button>
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
