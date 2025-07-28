import React from 'react';

const LoadingIndicator = ({ message, subMessage }) => {
  return (
    <div className="loading-indicator">
      <div className="loading-spinner"></div>
      <p>{message}</p>
      {subMessage && <p>{subMessage}</p>}
    </div>
  );
};

export default LoadingIndicator;