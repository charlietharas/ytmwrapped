import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { clearDataframeCache } from '../utils/indexedDB';
import { PreferencesContext } from './PreferencesContextDefinition';

export const PreferencesProvider = ({ children }) => {
    const [showPrivacyDisclaimer, setShowPrivacyDisclaimer] = useLocalStorage(
        'showPrivacyDisclaimer',
        true
    );
    const [cacheProcessedCSV, setCacheProcessedCSV] = useLocalStorage(
        'cacheProcessedCSV',
        true
    );
    const [cacheApiData, setCacheApiData] = useLocalStorage(
        'cacheApiData',
        true
    );
    const [googleApiKey, setGoogleApiKey, removeGoogleApiKey] = useLocalStorage(
        'googleApiKey',
        ''
    );
    const [cachedCSV, setCachedCSV, removeCachedCSV] = useLocalStorage(
        'cachedCSV',
        null
    );
    const [cachedSongData, setCachedSongData, removeCachedSongData] =
        useLocalStorage('cachedSongData', {});

    const clearAllData = async () => {
        removeGoogleApiKey();
        removeCachedCSV();
        removeCachedSongData();
        setShowPrivacyDisclaimer(true);
        setCacheProcessedCSV(true);
        setCacheApiData(true);

        // Clear IndexedDB cache
        await clearDataframeCache();
    };

    const value = {
        showPrivacyDisclaimer,
        setShowPrivacyDisclaimer,
        cacheProcessedCSV,
        setCacheProcessedCSV,
        cacheApiData,
        setCacheApiData,
        googleApiKey,
        setGoogleApiKey,
        removeGoogleApiKey,
        cachedCSV,
        setCachedCSV,
        removeCachedCSV,
        cachedSongData,
        setCachedSongData,
        removeCachedSongData,
        clearAllData,
    };

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
};
