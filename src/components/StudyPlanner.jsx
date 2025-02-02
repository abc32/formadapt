import React, { useState, useEffect } from 'react';
  import './StudyPlanner.css';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function StudyPlanner() {
    const [reminders, setReminders] = useState({});
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [modules, setModules] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchReminders = async () => {
        try {
          const response = await fetch('/api/reminders', {
            headers: { 'Authorization': localStorage.getItem('token') },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch reminders');
          }
          const data = await response.json();
          setReminders(data);
        } catch (err) {
          setError(err.message);
        }
      };
      fetchReminders();

      fetch('/api/modules')
        .then(res => res.json())
        .then(data => setModules(data));
    }, []);

    const handleModuleChange = (event) => {
      setSelectedModule(event.target.value);
    };

    const handleDateChange = (event) => {
      setSelectedDate(event.target.value);
    };

    const handleAddReminder = async () => {
      if (selectedModule && selectedDate) {
        try {
          const response = await fetch('/api/reminders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': localStorage.getItem('token'),
            },
            body: JSON.stringify({ [selectedModule]: selectedDate }),
          });
          if (!response.ok) {
            throw new Error('Failed to add reminder');
          }
          const data = await response.json();
          setReminders(data);
          setSelectedModule('');
          setSelectedDate('');
        } catch (err) {
          setError(err.message);
        }
      }
    };

    const handleRemoveReminder = async (moduleId) => {
      try {
        const response = await fetch(`/api/reminders/${moduleId}`, {
          method: 'DELETE',
          headers: { 'Authorization': localStorage.getItem('token') },
        });
        if (!response.ok) {
          throw new Error('Failed to remove reminder');
        }
        const newReminders = { ...reminders };
        delete newReminders[moduleId];
        setReminders(newReminders);
      } catch (err) {
        setError(err.message);
      }
    };

    return (
      <div className="study-planner">
        <h2>{translate('studyPlanner.title')}</h2>

        <div>
          <label htmlFor="module-select">{translate('studyPlanner.selectModule')}</label>
          <select id="module-select" value={selectedModule} onChange={handleModuleChange}>
            <option value="">{translate('studyPlanner.selectOption')}</option>
            {modules.map(module => (
              <option key={module.id} value={module.id}>{module.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date-select">{translate('studyPlanner.selectDate')}</label>
          <input type="date" id="date-select" value={selectedDate} onChange={handleDateChange} />
        </div>

        <button onClick={handleAddReminder}>{translate('studyPlanner.addReminder')}</button>

        <h3>{translate('studyPlanner.reminders')}</h3>
        <ul>
          {Object.entries(reminders).map(([moduleId, date]) => (
            <li key={moduleId}>
              {modules.find(module => module.id === parseInt(moduleId))?.nom} - {date}
              <button onClick={() => handleRemoveReminder(moduleId)}>{translate('studyPlanner.removeReminder')}</button>
            </li>
          ))}
        </ul>
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default StudyPlanner;
