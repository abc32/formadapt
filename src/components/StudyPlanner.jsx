import React, { useState, useEffect } from 'react';
import './StudyPlanner.css';
import { useI18n } from '../i18n'; // Import useI18n
import ApiError from './ApiError';
import { fetchWithAuth } from '../utils/api'; // Import fetchWithAuth

function StudyPlanner() {
  const { translate } = useI18n(); // Correctly get translate function
  const [reminders, setReminders] = useState({});
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [modules, setModules] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Assuming /api/reminders and /api/modules are protected
        const [remindersRes, modulesRes] = await Promise.all([
          fetchWithAuth('/api/reminders'),
          fetchWithAuth('/api/modules') 
        ]);

        if (!remindersRes.ok) {
          // It's okay if reminders are not found (e.g., 404 for new user), don't throw error for that
          if (remindersRes.status !== 404) {
            const errorData = await remindersRes.json().catch(() => ({}));
            console.warn(`Failed to fetch reminders: ${errorData.message || remindersRes.statusText}`);
          }
          setReminders({}); // Set to empty if not found or error
        } else {
          const remindersData = await remindersRes.json();
          setReminders(remindersData);
        }

        if (!modulesRes.ok) {
          const errorData = await modulesRes.json().catch(() => ({}));
          throw new Error(`Failed to fetch modules: ${errorData.message || modulesRes.statusText}`);
        }
        const modulesData = await modulesRes.json();
        setModules(modulesData);

      } catch (err) {
        console.error("StudyPlanner fetchInitialData error:", err);
        if (err.message !== 'Unauthorized') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleModuleChange = (event) => {
    setSelectedModule(event.target.value);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const handleAddReminder = async () => {
    if (selectedModule && selectedDate) {
      setError(null);
      try {
        // Assuming /api/reminders (POST) is protected
        const response = await fetchWithAuth('/api/reminders', {
          method: 'POST',
          body: JSON.stringify({ moduleId: selectedModule, date: selectedDate }), // Ensure body matches backend
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to add reminder: ${errorData.message || response.statusText}`);
        }
        const data = await response.json(); // Assuming backend returns updated reminders or new reminder
        setReminders(data); // Or update based on what backend returns
        setSelectedModule('');
        setSelectedDate('');
      } catch (err) {
        console.error("StudyPlanner handleAddReminder error:", err);
        if (err.message !== 'Unauthorized') {
          setError(err.message);
        }
      }
    } else {
        setError(translate('studyPlanner.errorSelectModuleDate') || "Please select a module and a date.");
    }
  };

  const handleRemoveReminder = async (moduleId) => {
    setError(null);
    try {
      // Assuming /api/reminders/:moduleId (DELETE) is protected
      const response = await fetchWithAuth(`/api/reminders/${moduleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to remove reminder: ${errorData.message || response.statusText}`);
      }
      // Assuming backend confirms deletion, update state locally
      const newReminders = { ...reminders };
      delete newReminders[moduleId];
      setReminders(newReminders);
    } catch (err) {
      console.error("StudyPlanner handleRemoveReminder error:", err);
      if (err.message !== 'Unauthorized') {
        setError(err.message);
      }
    }
  };
  
  if (loading) {
    return <p>{translate('studyPlanner.loading') || "Loading study planner..."}</p>;
  }

  return (
    <div className="study-planner">
      <h2>{translate('studyPlanner.title') || "Study Planner"}</h2>

      {error && <ApiError message={error} />}

      <div>
        <label htmlFor="module-select">{translate('studyPlanner.selectModule') || "Select Module:"}</label>
        <select id="module-select" value={selectedModule} onChange={handleModuleChange}>
          <option value="">{translate('studyPlanner.selectOption') || "-- Select a Module --"}</option>
          {modules.map(module => (
            <option key={module.id} value={module.id}>{module.nom}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date-select">{translate('studyPlanner.selectDate') || "Select Date:"}</label>
        <input type="date" id="date-select" value={selectedDate} onChange={handleDateChange} />
      </div>

      <button onClick={handleAddReminder}>{translate('studyPlanner.addReminder') || "Add Reminder"}</button>

      <h3>{translate('studyPlanner.reminders') || "Current Reminders"}</h3>
      {Object.keys(reminders).length > 0 ? (
        <ul>
          {Object.entries(reminders).map(([moduleId, date]) => {
            const module = modules.find(m => m.id === parseInt(moduleId));
            return (
              <li key={moduleId}>
                {module ? module.nom : `Module ID: ${moduleId}`} - {new Date(date).toLocaleDateString()}
                <button onClick={() => handleRemoveReminder(moduleId)}>
                  {translate('studyPlanner.removeReminder') || "Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{translate('studyPlanner.noReminders') || "No reminders set yet."}</p>
      )}
    </div>
  );
}

export default StudyPlanner;
