import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AppProvider, useApp } from './contexts/AppContext';
import { PreferencesProvider, usePreferences } from './contexts/PreferencesContext';
import Header from './components/Header/Header';
import PrivacyDisclaimer from './components/Screens/PrivacyDisclaimer';
import UploadScreen from './components/Screens/UploadScreen';
import Dashboard from './components/Screens/Dashboard';
import LoadingIndicator from './components/LoadingIndicator/LoadingIndicator';
import usePyodide from './hooks/usePyodide';
import { saveDataframeCSV, loadDataframeCSV, hasDataframeCache } from './utils/indexedDB';

function AppContent() {
  const { 
    currentScreen, 
    setCurrentScreen,
    setAnalysisData,
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Determine initial screen based on preferences
  useEffect(() => {
    if (showPrivacyDisclaimer) {
      setCurrentScreen('privacy');
    }
  }, []);

  // Store full dataset statistics separately
  const [fullDataStats, setFullDataStats] = useState(null);

  // Common function to set up data after analysis
  const setupAnalysisData = useCallback((results, minDate, maxDate) => {
    const minTimestamp = new Date(minDate).getTime();
    const maxTimestamp = new Date(maxDate).getTime();
    
    // Set date ranges
    setDateRange({ start: minTimestamp, end: maxTimestamp });
    setFilters(prev => ({
      ...prev,
      dateRange: { start: minTimestamp, end: maxTimestamp }
    }));
    
    // Store full dataset statistics
    setFullDataStats({
      total_videos: results.total_videos,
      unique_songs: results.unique_songs,
      total_artists: results.total_artists
    });
    
    // Set analysis data with proper filtered stats
    setAnalysisData({
      ...results,
      filtered_videos: results.total_videos,
      filtered_unique_songs: results.unique_songs,
      filtered_artists: results.total_artists
    });
    
    setIsAnalysisComplete(true);
  }, []);

  // Update filtered statistics when filters change
  useEffect(() => {
    if (!pyodide || !dateRange.start || !dateRange.end || currentScreen !== 'dashboard' || !fullDataStats) return;
    
    // Don't update if filters match the full range
    if (filters.dateRange.start === dateRange.start && filters.dateRange.end === dateRange.end) return;
    
    const updateAnalysisWithFilters = () => {
      try {
        // Keep the full data statistics but update filtered ones
        const startDate = new Date(filters.dateRange.start).toISOString();
        const endDate = new Date(filters.dateRange.end).toISOString();
        const filtersJson = JSON.stringify([]);
        
        const filteredResults = runPythonFunction('get_stats_for_period', startDate, endDate, filtersJson);
        
        // Merge full stats with filtered stats
        setAnalysisData(prev => ({
          ...filteredResults,
          total_videos: fullDataStats.total_videos,
          unique_songs: fullDataStats.unique_songs,
          total_artists: fullDataStats.total_artists,
          filtered_videos: filteredResults.total_videos,
          filtered_unique_songs: filteredResults.unique_songs,
          filtered_artists: filteredResults.total_artists
        }));
      } catch (error) {
        console.error('Error updating analysis:', error);
      }
    };
    
    updateAnalysisWithFilters();
  }, [filters.dateRange, pyodide, currentScreen, fullDataStats, dateRange]);

  const handleFilesSelected = async (files, useCache = false) => {
    if (useCache && cachedCSV) {
      // Wait for Pyodide to be ready before loading from cache
      if (!pyodide) {
        alert('Python environment is still loading. Please wait a moment and try again.');
        return;
      }
      
      // Load from cache
      setCurrentScreen('analyzing');
      setIsAnalyzing(true);
      
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
        
        // Extract date range from the songs_per_day data
        const dates = Object.keys(cachedCSV.songs_per_day || {}).sort();
        if (dates.length > 0) {
          setupAnalysisData(cachedCSV, dates[0], dates[dates.length - 1]);
          setCurrentScreen('dashboard');
        } else {
          throw new Error('No data found in cache');
        }
      } catch (error) {
        console.error('Error loading from cache:', error);
        alert('Error loading cached data. Please upload files again.');
        setCurrentScreen('upload');
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    if (!files || files.length === 0) return;

    setCurrentScreen('analyzing');
    setIsAnalyzing(true);

    try {
      let historyData = [];
      
      // Check if CSV file
      if (files[0].name.endsWith('.csv')) {
        // TODO: Implement CSV import
        alert('CSV import not yet implemented');
        setCurrentScreen('upload');
        setIsAnalyzing(false);
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
          setIsAnalyzing(false);
          return;
        }
      }

      // Run initial analysis
      const initialResults = runPythonFunction('perform_initial_analysis', historyData);
      
      if (initialResults.error) {
        alert(`Analysis Error: ${initialResults.error}`);
        setCurrentScreen('upload');
        setIsAnalyzing(false);
        return;
      }

      const { min_date, max_date } = initialResults;
      
      // Get full stats for the period
      const filtersJson = JSON.stringify([]);
      const results = runPythonFunction('get_stats_for_period', min_date, max_date, filtersJson);
      
      // Use common setup function
      setupAnalysisData(results, min_date, max_date);
      
      // Cache if enabled
      if (cacheProcessedCSV) {
        setCachedCSV(results);
        
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
    } finally {
      setIsAnalyzing(false);
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
            {currentScreen === 'dashboard' && <Dashboard />}
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
