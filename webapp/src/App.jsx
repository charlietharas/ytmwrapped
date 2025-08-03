import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AppProvider } from './contexts/AppContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { useApp } from './hooks/useApp';
import { usePreferences } from './hooks/usePreferences';
import Header from './components/Header/Header';
import PrivacyDisclaimer from './components/Screens/PrivacyDisclaimer';
import UploadScreen from './components/Screens/UploadScreen';
import Dashboard from './components/Screens/Dashboard';
import LoadingIndicator from './components/LoadingIndicator/LoadingIndicator';
import usePyodide from './hooks/usePyodide';
import { saveDataframeCSV, loadDataframeCSV, clearDataframeCache } from './utils/indexedDB';

function AppContent() {
  const { 
    currentScreen, 
    setCurrentScreen,
    setDateRange,
    setIsAnalysisComplete,
    filters,
    dateRange,
    setFilters
  } = useApp();
  
  const { 
    showPrivacyDisclaimer,
    cachedCSV,
    setCachedCSV,
    cacheProcessedCSV
  } = usePreferences();
  
  const { pyodide, isLoading: isPyodideLoading, error: pyodideError, runPythonFunction } = usePyodide();

  // Determine initial screen based on preferences
  useEffect(() => {
    if (showPrivacyDisclaimer) {
      setCurrentScreen('privacy');
    }
  }, [showPrivacyDisclaimer, setCurrentScreen]);

  // Store card-specific data separately
  const [keyStatisticsData, setKeyStatisticsData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [hoursData, setHoursData] = useState(null);

  // Common function to set up data after analysis
  const setupAnalysisData = useCallback((minDate, maxDate) => {
    const minTimestamp = new Date(minDate).getTime();
    const maxTimestamp = new Date(maxDate).getTime();
    
    // Set date ranges
    setDateRange({ start: minTimestamp, end: maxTimestamp });
    setFilters(prev => ({
      ...prev,
      dateRange: { start: minTimestamp, end: maxTimestamp }
    }));
    
    const filtersJson = JSON.stringify([]);
    
    const keyStats = runPythonFunction('get_key_statistics_card_data', filtersJson);
    const timeline = runPythonFunction('get_timeline_card_data', filtersJson);
    const hours = runPythonFunction('get_hour_card_data', filtersJson, Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    setKeyStatisticsData(keyStats);
    setTimelineData(timeline);
    setHoursData(hours);
    
    setIsAnalysisComplete(true);
  }, [runPythonFunction, setDateRange, setFilters, setKeyStatisticsData, setTimelineData, setHoursData, setIsAnalysisComplete]);

  // Update card data when filters change
  useEffect(() => {
    if (!pyodide || !dateRange.start || !dateRange.end || currentScreen !== 'dashboard') return;
    
    const updateCardsWithFilters = () => {
      try {
        const activeFilters = [];
        
        filters.songs.forEach(song => activeFilters.push({ type: 'song', value: song }));
        filters.artists.forEach(artist => activeFilters.push({ type: 'artist', value: artist }));
        filters.hours.forEach(hour => activeFilters.push({ type: 'hour', value: hour }));
        filters.daysOfWeek.forEach(day => activeFilters.push({ type: 'dayOfWeek', value: day }));
        filters.months.forEach(month => activeFilters.push({ type: 'month', value: month }));
        filters.years.forEach(year => activeFilters.push({ type: 'year', value: year }));
        filters.genres.forEach(genre => activeFilters.push({ type: 'genre', value: genre }));
        
        if (filters.durationRange.min !== null || filters.durationRange.max !== null) {
          activeFilters.push({ type: 'duration', value: filters.durationRange });
        }
        if (filters.releaseYearRange.min !== null || filters.releaseYearRange.max !== null) {
          activeFilters.push({ type: 'releaseYear', value: filters.releaseYearRange });
        }
        
        if (filters.dateRange.start !== dateRange.start || filters.dateRange.end !== dateRange.end) {
          activeFilters.push({ 
            type: 'dateRange', 
            value: { 
              start: new Date(filters.dateRange.start).toISOString(), 
              end: new Date(filters.dateRange.end).toISOString()
            }
          });
        }
        
        const filtersJson = JSON.stringify(activeFilters);
        
        const updatedKeyStats = runPythonFunction('get_key_statistics_card_data', filtersJson);
        const updatedTimeline = runPythonFunction('get_timeline_card_data', filtersJson);
        const updatedHours = runPythonFunction('get_hour_card_data', filtersJson, Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        setKeyStatisticsData(updatedKeyStats);
        setTimelineData(updatedTimeline);
        setHoursData(updatedHours);
      } catch (error) {
        console.error('Error updating card data with filters:', error);
      }
    };
    
    updateCardsWithFilters();
  }, [filters, pyodide, currentScreen, dateRange, runPythonFunction, setKeyStatisticsData, setTimelineData, setHoursData]);

  const handleFilesSelected = async (files, useCache = false) => {
    if (useCache && cachedCSV) {
      // Wait for Pyodide to be ready before loading from cache
      if (!pyodide) {
        alert('Python environment is still loading. Please wait a moment and try again.');
        return;
      }
      
      // Load from cache
      setCurrentScreen('analyzing');
            
      try {
        // First check if we have the dataframe CSV cached
        const cachedDataframeCSV = await loadDataframeCSV();
        if (cachedDataframeCSV) {
          // Load the dataframe into Python
          const loadResult = runPythonFunction('load_master_df_from_csv', cachedDataframeCSV);
          if (loadResult.error) {
            throw new Error(loadResult.error);
          }
        }
        
        // Get date range from Python after loading dataframe
        const dateRangeResult = runPythonFunction('get_date_range');
        if (dateRangeResult.error) {
          throw new Error(dateRangeResult.error);
        }
        
        setupAnalysisData(dateRangeResult.min_date, dateRangeResult.max_date);
        setCurrentScreen('dashboard');
      } catch (error) {
        console.error('Error loading from cache:', error);
        alert('Error loading cached data. Please upload files again.');
        setCurrentScreen('upload');
        clearDataframeCache();
        setCachedCSV(null);
      }
      return;
    }

    if (!files || files.length === 0) return;

    setCurrentScreen('analyzing');
    
    try {
      let historyData = [];
      
      // Check if CSV file
      if (files[0].name.endsWith('.csv')) {
        // TODO: Implement CSV import
        alert('CSV import not yet implemented');
        setCurrentScreen('upload');
                return;
      }

      // Process JSON files
      for (const file of files) {
        const content = await file.text();
        try {
          const data = JSON.parse(content);
          historyData.push(data);
        } catch (e) {
          alert(`Error parsing ${file.name}: ${e.message}`);
          setCurrentScreen('upload');
                    return;
        }
      }

      // Run initial analysis
      const initialResults = runPythonFunction('perform_initial_analysis', historyData);
      
      if (initialResults.error) {
        alert(`Analysis Error: ${initialResults.error}`);
        setCurrentScreen('upload');
                return;
      }

      // Get date range from the loaded dataframe
      const dateRangeResult = runPythonFunction('get_date_range');
      if (dateRangeResult.error) {
        alert(`Date Range Error: ${dateRangeResult.error}`);
        setCurrentScreen('upload');
                return;
      }
      
      const { min_date, max_date } = dateRangeResult;
      
      // Use common setup function
      setupAnalysisData(min_date, max_date);
      
      // Cache if enabled - cache the processed CSV from key statistics
      if (cacheProcessedCSV) {
        const filtersJson = JSON.stringify([]);
        const keyStatsForCache = runPythonFunction('get_key_statistics_card_data', filtersJson);
        setCachedCSV(keyStatsForCache);
        
        // Also cache the master dataframe as CSV
        const csvExport = runPythonFunction('export_master_df_to_csv');
        if (csvExport.csv) {
          await saveDataframeCSV(csvExport.csv);
        }
      }
      
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Error during analysis: ${error.message}`);
      setCurrentScreen('upload');
      setCachedCSV(null);
    }
  };

  // Show loading only if Pyodide isn't ready when trying to upload
  const shouldShowLoading = isPyodideLoading && currentScreen === 'upload';

  if (pyodideError) {
    return (
      <div className="app">
        <Header />
        <main id="main-content">
          <div className="error-container">
            <h2>Failed to load Python environment</h2>
            <p>{pyodideError}</p>
            <p>Please refresh the page to try again.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main id="main-content">
        {shouldShowLoading ? (
          <LoadingIndicator 
            message="Loading Python environment and packages..."
            subMessage="This may take a moment."
          />
        ) : (
          <>
            {currentScreen === 'privacy' && <PrivacyDisclaimer />}
            {currentScreen === 'upload' && <UploadScreen onFilesSelected={handleFilesSelected} />}
            {currentScreen === 'analyzing' && (
              <LoadingIndicator 
                message="Analyzing your history..."
                subMessage="This may take a few moments for large history files."
              />
            )}
            {currentScreen === 'dashboard' && (
              <Dashboard 
                keyStatisticsData={keyStatisticsData} 
                timelineData={timelineData}
                hoursData={hoursData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <PreferencesProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </PreferencesProvider>
  );
}

export default App
