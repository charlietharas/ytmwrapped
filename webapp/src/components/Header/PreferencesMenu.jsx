import React from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useApp } from '../../contexts/AppContext';
import { clearDataframeCache } from '../../utils/indexedDB';

const PreferencesMenu = ({ onClose }) => {
  const {
    showPrivacyDisclaimer,
    setShowPrivacyDisclaimer,
    cacheProcessedCSV,
    setCacheProcessedCSV,
    cacheApiData,
    setCacheApiData,
    removeGoogleApiKey,
    removeCachedCSV,
    removeCachedSongData,
    clearAllData,
    cachedCSV,
    cachedSongData,
    googleApiKey
  } = usePreferences();

  const { setCurrentScreen } = useApp();

  const handleToggleCacheCSV = async () => {
    if (cacheProcessedCSV && cachedCSV) {
      if (window.confirm('This will delete your cached processed data. Continue?')) {
        removeCachedCSV();
        await clearDataframeCache();
        setCacheProcessedCSV(false);
      }
    } else {
      setCacheProcessedCSV(!cacheProcessedCSV);
    }
  };

  const handleToggleCacheApi = () => {
    if (cacheApiData && Object.keys(cachedSongData).length > 0) {
      if (window.confirm('This will delete your cached API data. Continue?')) {
        removeCachedSongData();
        setCacheApiData(false);
      }
    } else {
      setCacheApiData(!cacheApiData);
    }
  };

  const handleReset = async () => {
    if (window.confirm('This will delete all data and reset the application. Continue?')) {
      await clearAllData();
      setCurrentScreen('upload');
      window.location.reload();
    }
  };

  return (
    <div className="preferences-menu">
      <div className="preferences-section">
        <h3>Options</h3>
        <label className="preferences-option">
          <input
            type="checkbox"
            checked={showPrivacyDisclaimer}
            onChange={(e) => setShowPrivacyDisclaimer(e.target.checked)}
          />
          <span>Show privacy disclaimer</span>
        </label>
        <label className="preferences-option">
          <input
            type="checkbox"
            checked={cacheProcessedCSV}
            onChange={handleToggleCacheCSV}
          />
          <span>Cache processed data</span>
        </label>
        <label className="preferences-option">
          <input
            type="checkbox"
            checked={cacheApiData}
            onChange={handleToggleCacheApi}
          />
          <span>Cache API data</span>
        </label>
      </div>
      
      <div className="preferences-section">
        <h3>Clear Data</h3>
        <button 
          className="preferences-button-danger"
          onClick={() => {
            if (googleApiKey && window.confirm('Delete your Google API key?')) {
              removeGoogleApiKey();
            }
          }}
          disabled={!googleApiKey}
        >
          Delete Google API key
        </button>
        <button 
          className="preferences-button-danger"
          disabled={true}
        >
          Delete durations data (TODO)
        </button>
        <button 
          className="preferences-button-danger"
          disabled={true}
        >
          Delete MusicBrainz data (TODO)
        </button>
        <button 
          className="preferences-button-danger"
          onClick={handleReset}
        >
          Reset everything
        </button>
      </div>
      
      <div className="preferences-section">
        <h3>Export</h3>
        <button 
          className="preferences-button"
          disabled={!cachedCSV}
          onClick={async () => {
            try {
              const { loadDataframeCSV } = await import('../../utils/indexedDB');
              const csvData = await loadDataframeCSV();
              if (csvData) {
                const blob = new Blob([csvData], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ytmwrapped_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } else {
                alert('No cached data to export');
              }
            } catch (error) {
              console.error('Export error:', error);
              alert('Failed to export CSV');
            }
          }}
        >
          Export processed CSV
        </button>
        <button 
          className="preferences-button"
          disabled={true}
        >
          Export report as PDF (TODO)
        </button>
      </div>
    </div>
  );
};

export default PreferencesMenu;