import React from 'react';
  import './ApiError.css';
  import translate from '../i18n';

  function ApiError({ message }) {
    return (
      <div className="api-error">
        <h3>{translate('apiError.title')}</h3>
        <p>{message || translate('apiError.defaultMessage')}</p>
      </div>
    );
  }

  export default ApiError;
