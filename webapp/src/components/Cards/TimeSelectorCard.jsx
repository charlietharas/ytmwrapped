import React, { useState, useMemo } from 'react';
import { useApp } from '../../hooks/useApp';

const TimeSelectorCard = () => {
    const { updateFilter, clearDateRangeFilters, dateRange } = useApp();

    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null);

    const [navigationLevel, setNavigationLevel] = useState('year'); // 'year', 'month', 'week'

    const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];

    // Calculate date range based on selection and update filters
    const updateDateRange = (year, month = null, week = null) => {
        let startDate, endDate;

        if (year && month && week) {
            // Calculate week range within the month
            const firstDayOfMonth = new Date(year, month - 1, 1);
            const lastDayOfMonth = new Date(year, month, 0);

            // Calculate start and end of the selected week
            const weekStart = new Date(year, month - 1, (week - 1) * 7 + 1);
            const weekEnd = new Date(year, month - 1, week * 7);

            // Clamp to month boundaries
            startDate =
                weekStart > firstDayOfMonth ? weekStart : firstDayOfMonth;
            endDate = weekEnd < lastDayOfMonth ? weekEnd : lastDayOfMonth;
        } else if (year && month) {
            // Month range
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else if (year) {
            // Year range
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
        }

        if (startDate && endDate) {
            updateFilter('dateRange', {
                start: startDate.getTime(),
                end: endDate.getTime(),
            });
        }
    };

    const handleYearSelect = (year) => {
        setSelectedYear(year);
        setSelectedMonth(null);
        setSelectedWeek(null);
        setNavigationLevel('month');
        updateDateRange(year);
    };

    const handleMonthSelect = (month) => {
        setSelectedMonth(month);
        setSelectedWeek(null);
        setNavigationLevel('week');
        updateDateRange(selectedYear, month);
    };

    const handleWeekSelect = (week) => {
        setSelectedWeek(week);
        updateDateRange(selectedYear, selectedMonth, week);
    };

    const handleBack = () => {
        if (navigationLevel === 'week') {
            setSelectedMonth(null);
            setSelectedWeek(null);
            setNavigationLevel('month');
            updateDateRange(selectedYear);
        } else if (navigationLevel === 'month') {
            setSelectedYear(null);
            setSelectedMonth(null);
            setNavigationLevel('year');
            clearDateRangeFilters();
        } else if (navigationLevel === 'year') {
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedWeek(null);
            clearDateRangeFilters();
        }
    };

    // Generate available years from date range
    const availableYears = useMemo(() => {
        if (!dateRange.start || !dateRange.end) {
            return [];
        }

        const startYear = new Date(dateRange.start).getFullYear();
        const endYear = new Date(dateRange.end).getFullYear();

        const years = [];
        for (let year = startYear; year <= endYear; year++) {
            years.push(year);
        }
        return years;
    }, [dateRange]);

    // Generate available months for selected year
    const availableMonths = useMemo(() => {
        if (!selectedYear || !dateRange.start || !dateRange.end) return [];

        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);

        const months = [];

        // If this is the start year, start from the start month
        const startMonth =
            selectedYear === startDate.getFullYear()
                ? startDate.getMonth() + 1
                : 1;

        // If this is the end year, end at the end month
        const endMonth =
            selectedYear === endDate.getFullYear()
                ? endDate.getMonth() + 1
                : 12;

        for (let month = startMonth; month <= endMonth; month++) {
            months.push(month);
        }

        return months;
    }, [selectedYear, dateRange]);

    // Generate available weeks for selected year and month
    const availableWeeks = useMemo(() => {
        if (!selectedYear || !selectedMonth) return [];

        // Get the number of weeks in this month
        const lastDay = new Date(selectedYear, selectedMonth, 0);

        const weeks = [];
        const totalDays = lastDay.getDate();
        const totalWeeks = Math.ceil(totalDays / 7);

        for (let week = 1; week <= totalWeeks; week++) {
            weeks.push(week);
        }

        return weeks;
    }, [selectedYear, selectedMonth]);

    const getOrdinalSuffix = (num) => {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    };

    const renderBreadcrumb = () => {
        const breadcrumbItems = [];

        if (selectedYear) {
            breadcrumbItems.push(
                <span key="year" className="breadcrumb-item">
                    {selectedYear}
                </span>
            );
        }

        if (selectedMonth) {
            breadcrumbItems.push(
                <span key="separator1" className="breadcrumb-separator">
                    ›
                </span>,
                <span key="month" className="breadcrumb-item">
                    {monthNames[selectedMonth - 1]}
                </span>
            );
        }

        if (selectedWeek) {
            breadcrumbItems.push(
                <span key="separator2" className="breadcrumb-separator">
                    ›
                </span>,
                <span key="week" className="breadcrumb-item">
                    Week {selectedWeek}
                </span>
            );
        }

        return breadcrumbItems.length > 0 ? (
            <div className="time-selector-breadcrumb">{breadcrumbItems}</div>
        ) : null;
    };

    // Don't render if dateRange is not available yet
    if (!dateRange.start || !dateRange.end) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3>Time Period Selector</h3>
                </div>
                <div className="card-content">
                    <p className="card-description">Loading date range...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3>Time Period Selector</h3>
                {(selectedYear || selectedMonth || selectedWeek) && (
                    <div className="card-header-controls">
                        <button
                            className="time-selector-back-btn"
                            onClick={handleBack}
                            title="Go back"
                        >
                            ←
                        </button>
                    </div>
                )}
            </div>
            <div className="card-content">
                <p className="card-description">
                    Navigate through your music history
                </p>

                {renderBreadcrumb()}

                <div className="time-selector-container">
                    {navigationLevel === 'year' && (
                        <div className="time-selector-grid">
                            <h4>Select Year</h4>
                            <div className="time-selector-options">
                                {availableYears.length === 0 ? (
                                    <p
                                        style={{
                                            color: 'var(--color-text-secondary)',
                                            padding: '1rem',
                                            textAlign: 'center',
                                        }}
                                    >
                                        No years available
                                    </p>
                                ) : (
                                    availableYears.map((year) => (
                                        <button
                                            key={year}
                                            className={`time-selector-option ${selectedYear === year ? 'selected' : ''}`}
                                            onClick={() =>
                                                handleYearSelect(year)
                                            }
                                        >
                                            {year}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {navigationLevel === 'month' && selectedYear && (
                        <div className="time-selector-grid">
                            <h4>Select Month in {selectedYear}</h4>
                            <div className="time-selector-options">
                                {availableMonths.map((month) => (
                                    <button
                                        key={month}
                                        className={`time-selector-option ${selectedMonth === month ? 'selected' : ''}`}
                                        onClick={() => handleMonthSelect(month)}
                                    >
                                        {monthNames[month - 1]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {navigationLevel === 'week' &&
                        selectedYear &&
                        selectedMonth && (
                            <div className="time-selector-grid">
                                <h4>
                                    Select Week in{' '}
                                    {monthNames[selectedMonth - 1]}{' '}
                                    {selectedYear}
                                </h4>
                                <div className="time-selector-options">
                                    {availableWeeks.map((week) => (
                                        <button
                                            key={week}
                                            className={`time-selector-option ${selectedWeek === week ? 'selected' : ''}`}
                                            onClick={() =>
                                                handleWeekSelect(week)
                                            }
                                        >
                                            {getOrdinalSuffix(week)} week
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
};

export default TimeSelectorCard;
