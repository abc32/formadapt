import React from 'react';
  import './ApiError.css';
  import translate from '../i18n';

  function ApiError({ message, id }) { // Added id prop for potential aria-describedby
    return (
      <div className="api-error" role="alert" id={id}>
        {/* The h3 might be redundant if the message itself is clear enough, 
            or could be an h2 if this is a major section of error.
            For now, keeping it as h3 but ensuring the main message is what's important. */}
        <h3>{translate('apiError.title')}</h3>
        <p>{message || translate('apiError.defaultMessage')}</p>
      </div>
    );
  }

  export default ApiError;
