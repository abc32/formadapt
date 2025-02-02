import React from 'react';
  import './Error.css';
  import translate from '../i18n';
  import { useI18n } from '../i18n';

  function Error({ message }) {
    const { retryLoadTranslations, loading } = useI18n();

    return (
      <div className="error">
        <h3>{translate('error.title')}</h3>
        <p>{message}</p>
        {message.includes('Failed to load translations') && (
          <button className="retry-button" onClick={retryLoadTranslations} disabled={loading}>
            {loading ? 'Chargement...' : 'Réessayer'}
          </button>
        )}
      </div>
    );
  }

  export default Error;
