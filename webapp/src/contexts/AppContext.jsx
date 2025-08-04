import React, { useState, useCallback, useEffect } from 'react';
import { AppContext } from './AppContextDefinition';

export const AppProvider = ({ children }) => {
    // Application state
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
    const [currentScreen, setCurrentScreen] = useState('upload'); // 'upload', 'privacy', 'analyzing', 'dashboard'

    // Data state
    const [historyData, setHistoryData] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });

    // Filter state
    const [filters, setFilters] = useState({
        dateRange: { start: dateRange.start, end: dateRange.end },
        songs: [],
        artists: [],
        hours: [],
        daysOfWeek: [],
        months: [],
        years: [],
        durationRange: { min: null, max: null },
        genres: [],
        releaseYearRange: { min: null, max: null },
        includeMissingReleaseYear: true,
    });

    // Sync filters with dateRange when it changes
    useEffect(() => {
        if (dateRange.start && dateRange.end) {
            setFilters((prev) => ({
                ...prev,
                dateRange: { start: dateRange.start, end: dateRange.end },
            }));
        }
    }, [dateRange]);

    // Helper functions for filters
    const updateFilter = useCallback((filterType, value) => {
        setFilters((prev) => ({
            ...prev,
            [filterType]: value,
        }));
    }, []);

    const addToFilter = useCallback((filterType, value) => {
        setFilters((prev) => ({
            ...prev,
            [filterType]: Array.isArray(prev[filterType])
                ? [...prev[filterType], value]
                : prev[filterType],
        }));
    }, []);

    const removeFromFilter = useCallback((filterType, value) => {
        setFilters((prev) => ({
            ...prev,
            [filterType]: Array.isArray(prev[filterType])
                ? prev[filterType].filter((item) => item !== value)
                : prev[filterType],
        }));
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters({
            dateRange: { start: dateRange.start, end: dateRange.end },
            songs: [],
            artists: [],
            hours: [],
            daysOfWeek: [],
            months: [],
            years: [],
            durationRange: { min: null, max: null },
            genres: [],
            releaseYearRange: { min: null, max: null },
            includeMissingReleaseYear: true,
        });
    }, [dateRange]);

    const clearDateRangeFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            dateRange: { start: dateRange.start, end: dateRange.end },
        }));
    }, [dateRange]);

    const clearHoursFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            hours: [],
        }));
    }, []);

    const clearWeeksFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            daysOfWeek: [],
        }));
    }, []);

    const clearMonthsFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            months: [],
        }));
    }, []);

    const clearYearsFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            years: [],
        }));
    }, []);

    const clearArtistsFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            artists: [],
        }));
    }, []);

    const clearSongsFilters = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            songs: [],
        }));
    }, []);

    const hasActiveFilters = useCallback(
        (considerDateRange = false) => {
            return (
                filters.songs.length > 0 ||
                filters.artists.length > 0 ||
                filters.hours.length > 0 ||
                filters.daysOfWeek.length > 0 ||
                filters.months.length > 0 ||
                filters.years.length > 0 ||
                filters.genres.length > 0 ||
                (considerDateRange &&
                    (filters.dateRange.start !== dateRange.start ||
                        filters.dateRange.end !== dateRange.end)) ||
                filters.durationRange.min !== null ||
                filters.durationRange.max !== null ||
                filters.releaseYearRange.min !== null ||
                filters.releaseYearRange.max !== null
            );
        },
        [filters, dateRange]
    );

    const value = {
        // State
        isAnalysisComplete,
        setIsAnalysisComplete,
        currentScreen,
        setCurrentScreen,
        historyData,
        setHistoryData,
        dateRange,
        setDateRange,
        filters,
        setFilters,

        // Filter helpers
        updateFilter,
        addToFilter,
        removeFromFilter,
        clearAllFilters,
        clearDateRangeFilters,
        clearHoursFilters,
        clearWeeksFilters,
        clearMonthsFilters,
        clearYearsFilters,
        clearArtistsFilters,
        clearSongsFilters,
        hasActiveFilters,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
