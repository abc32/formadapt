import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import { useI18n } from '../i18n'; // Import useI18n
import ApiError from './ApiError';
import { fetchWithAuth } from '../utils/api'; // Import fetchWithAuth

function AdminPanel() {
  const { translate } = useI18n(); // Correctly get translate function
  const [modules, setModules] = useState(
    JSON.parse(localStorage.getItem('adminModules')) || []
  );
  const [newModule, setNewModule] = useState({ nom: '', contenu: '' });
  const [editModuleId, setEditModuleId] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ nom: '', email: '', password: '', role: 'user' }); // Added password field for new user
  const [editUserId, setEditUserId] = useState(null);
  const [statistics, setStatistics] = useState({
    activeUsers: 0,
    totalModules: 0,
    averageProgress: 0,
  });
  // Removed currentUserRole as admin access is verified by backend now
  const [error, setError] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    localStorage.setItem('adminModules', JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const response = await fetchWithAuth('/api/users');
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.statusText} (${response.status})`);
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error("AdminPanel fetchUsers error:", err);
        if (err.message !== 'Unauthorized') {
            setError(err.message);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchStatistics = async () => {
      setLoadingStats(true);
      setError(null);
      try {
        const response = await fetchWithAuth('/api/statistics');
        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.statusText} (${response.status})`);
        }
        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        console.error("AdminPanel fetchStatistics error:", err);
         if (err.message !== 'Unauthorized') {
            setError(err.message);
        }
      } finally {
        setLoadingStats(false);
      }
    };

    fetchUsers();
    fetchStatistics();
  }, []); // Fetch on component mount

  // Module management (local state, no API calls in this version)
  const handleModuleInputChange = (event) => {
    setNewModule({ ...newModule, [event.target.name]: event.target.value });
  };

  const handleAddModule = () => {
    if (newModule.nom && newModule.contenu) {
      const newId = Date.now(); // Simple ID generation for local state
      setModules([...modules, { id: newId, ...newModule }]);
      setNewModule({ nom: '', contenu: '' });
    }
  };

  const handleEditModule = (moduleId) => {
    setEditModuleId(moduleId);
    const moduleToEdit = modules.find(module => module.id === moduleId);
    if (moduleToEdit) setNewModule(moduleToEdit);
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


  // User Management
  const handleUserInputChange = (event) => {
    setNewUser({ ...newUser, [event.target.name]: event.target.value });
  };

  const handleAddUser = async () => {
    if (newUser.nom && newUser.email && newUser.password) { // Added password check
      setError(null);
      try {
        const response = await fetchWithAuth('/api/users', {
          method: 'POST',
          body: JSON.stringify(newUser), // fetchWithAuth sets Content-Type
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Failed to add user: ${response.statusText}` }));
          throw new Error(errorData.message || `Failed to add user: ${response.statusText}`);
        }
        const data = await response.json();
        setUsers([...users, data]);
        setNewUser({ nom: '', email: '', password: '', role: 'user' }); // Reset with password
      } catch (err) {
        console.error("AdminPanel handleAddUser error:", err);
        if (err.message !== 'Unauthorized') {
            setError(err.message);
        }
      }
    } else {
      setError(translate('adminPanel.errorMissingUserFields') || "Please fill in name, email, and password for the new user.");
    }
  };

  const handleEditUser = (userToEdit) => { // Pass the whole user object
    setEditUserId(userToEdit.id);
    // Do not prefill password for editing
    setNewUser({ nom: userToEdit.nom, email: userToEdit.email, role: userToEdit.role, password: '' });
  };

  const handleUpdateUser = async () => {
    // Password is not updated here. For password changes, a separate mechanism (like reset) should be used by admin or user.
    // Or, include password field if admin should be able to change it directly (requires careful consideration).
    // For now, updating nom, email, role.
    const userToUpdate = { nom: newUser.nom, email: newUser.email, role: newUser.role };

    if (userToUpdate.nom && userToUpdate.email && editUserId) {
      setError(null);
      try {
        const response = await fetchWithAuth(`/api/users/${editUserId}`, {
          method: 'PUT',
          body: JSON.stringify(userToUpdate),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Failed to update user: ${response.statusText}` }));
          throw new Error(errorData.message || `Failed to update user: ${response.statusText}`);
        }
        // const data = await response.json(); // Assuming backend returns updated user or success message
        const updatedUsers = users.map(user =>
          user.id === editUserId ? { ...user, ...userToUpdate } : user
        );
        setUsers(updatedUsers);
        setEditUserId(null);
        setNewUser({ nom: '', email: '', password: '', role: 'user' });
      } catch (err) {
        console.error("AdminPanel handleUpdateUser error:", err);
        if (err.message !== 'Unauthorized') {
            setError(err.message);
        }
      }
    } else {
       setError(translate('adminPanel.errorMissingUserFieldsEdit') || "Please fill in name and email for the user update.");
    }
  };

  const handleDeleteUser = async (userId) => {
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to delete user: ${response.statusText}` }));
        throw new Error(errorData.message || `Failed to delete user: ${response.statusText}`);
      }
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
    } catch (err) {
      console.error("AdminPanel handleDeleteUser error:", err);
      if (err.message !== 'Unauthorized') {
          setError(err.message);
      }
    }
  };

  return (
    <div className="admin-panel">
      <h2>{translate('adminPanel.title') || "Admin Panel"}</h2>

      {error && <ApiError message={error} />}

      {/* Module Management Section (Local State) */}
      <section>
        <h3>{translate('adminPanel.manageModulesLocal') || "Manage Modules (Local State)"}</h3>
        <div>
          <label htmlFor="module-name">{translate('adminPanel.moduleName') || "Name:"}</label>
          <input type="text" id="module-name" name="nom" value={newModule.nom} onChange={handleModuleInputChange} />
        </div>
        <div>
          <label htmlFor="module-content">{translate('adminPanel.moduleContent') || "Content:"}</label>
          <textarea id="module-content" name="contenu" value={newModule.contenu} onChange={handleModuleInputChange} />
        </div>
        <button onClick={editModuleId ? handleUpdateModule : handleAddModule}>
          {editModuleId ? (translate('adminPanel.updateModule') || "Update Module") : (translate('adminPanel.addModule') || "Add Module")}
        </button>
        <ul>
          {modules.map(module => (
            <li key={module.id}>
              {module.nom}
              <button onClick={() => handleEditModule(module)}>{translate('adminPanel.edit') || "Edit"}</button>
              <button onClick={() => handleDeleteModule(module.id)}>{translate('adminPanel.delete') || "Delete"}</button>
            </li>
          ))}
        </ul>
      </section>

      {/* User Management Section */}
      <section>
        <h3>{translate('adminPanel.manageUsers') || "Manage Users"}</h3>
        {loadingUsers && <p>{translate('adminPanel.loadingUsers') || "Loading users..."}</p>}
        <div>
          <label htmlFor="user-name">{translate('adminPanel.userName') || "Name:"}</label>
          <input type="text" id="user-name" name="nom" value={newUser.nom} onChange={handleUserInputChange} />
        </div>
        <div>
          <label htmlFor="user-email">{translate('adminPanel.userEmail') || "Email:"}</label>
          <input type="email" id="user-email" name="email" value={newUser.email} onChange={handleUserInputChange} />
        </div>
        {!editUserId && ( // Only show password field when adding a new user
          <div>
            <label htmlFor="user-password">{translate('adminPanel.userPassword') || "Password:"}</label>
            <input type="password" id="user-password" name="password" value={newUser.password} onChange={handleUserInputChange} />
          </div>
        )}
        <div>
          <label htmlFor="user-role">{translate('adminPanel.userRole') || "Role:"}</label>
          <select id="user-role" name="role" value={newUser.role} onChange={handleUserInputChange}>
            <option value="user">{translate('adminPanel.roleUser') || "User"}</option>
            <option value="admin">{translate('adminPanel.roleAdmin') || "Admin"}</option>
          </select>
        </div>
        <button onClick={editUserId ? handleUpdateUser : handleAddUser}>
          {editUserId ? (translate('adminPanel.updateUser') || "Update User") : (translate('adminPanel.addUser') || "Add User")}
        </button>
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.nom} - {user.email} - {user.role}
              <button onClick={() => handleEditUser(user)}>{translate('adminPanel.edit') || "Edit"}</button>
              <button onClick={() => handleDeleteUser(user.id)}>{translate('adminPanel.delete') || "Delete"}</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Statistics Section */}
      <section>
        <h3>{translate('adminPanel.statistics') || "Statistics"}</h3>
        {loadingStats && <p>{translate('adminPanel.loadingStats') || "Loading statistics..."}</p>}
        <p>{translate('adminPanel.activeUsers') || "Active Users (Realtime from JWT)"}: {statistics.activeUsers}</p>
        <p>{translate('adminPanel.totalModules') || "Total Modules"}: {statistics.totalModules}</p>
        <p>{translate('adminPanel.averageProgress') || "Average Progress"}: {statistics.averageProgress}%</p>
      </section>
    </div>
  );
}

export default AdminPanel;
