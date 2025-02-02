import React, { useState, useEffect } from 'react';
  import './Settings.css';
  import translate from '../i18n';

  function Settings() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('primaryColor') || '#4caf50');
    const [secondaryColor, setSecondaryColor] = useState(localStorage.getItem('secondaryColor') || '#2196f3');

    useEffect(() => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('primaryColor', primaryColor);
      localStorage.setItem('secondaryColor', secondaryColor);
      document.body.classList.toggle('dark-mode', theme === 'dark');
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    }, [theme, primaryColor, secondaryColor]);

    const handleThemeChange = (event) => {
      setTheme(event.target.value);
    };

    const handlePrimaryColorChange = (event) => {
      setPrimaryColor(event.target.value);
    };

    const handleSecondaryColorChange = (event) => {
      setSecondaryColor(event.target.value);
    };

    return (
      <div className="settings">
        <h2>{translate('settings.title')}</h2>

        <div>
          <label htmlFor="theme-select">{translate('settings.theme')}</label>
          <select id="theme-select" value={theme} onChange={handleThemeChange}>
            <option value="light">{translate('settings.light')}</option>
            <option value="dark">{translate('settings.dark')}</option>
          </select>
        </div>

        <div>
          <label htmlFor="primary-color">{translate('settings.primaryColor')}</label>
          <input type="color" id="primary-color" value={primaryColor} onChange={handlePrimaryColorChange} />
        </div>

        <div>
          <label htmlFor="secondary-color">{translate('settings.secondaryColor')}</label>
          <input type="color" id="secondary-color" value={secondaryColor} onChange={handleSecondaryColorChange} />
        </div>
      </div>
    );
  }

  export default Settings;
