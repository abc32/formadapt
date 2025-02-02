import React from 'react';
  import { useI18n } from '../i18n';

  function LanguageSelector() {
    const { language, changeLanguage } = useI18n();

    const handleLanguageChange = (event) => {
      changeLanguage(event.target.value);
    };

    return (
      <select value={language} onChange={handleLanguageChange} aria-label="Sélecteur de langue">
        <option value="fr">Français</option>
        <option value="en">Anglais</option>
        {/* Ajouter d'autres langues ici */}
      </select>
    );
  }

  export default LanguageSelector;
