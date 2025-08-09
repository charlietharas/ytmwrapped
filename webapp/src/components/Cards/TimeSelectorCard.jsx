import React, { useState, useMemo } from 'react';
import { useApp } from '../../hooks/useApp';
import {
    getDaysInMonth,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isWithinInterval,
} from 'date-fns';

const TimeSelectorCard = () => {
    const { updateFilter, clearDateRangeFilters, dateRange } = useApp();

    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    const [navigationLevel, setNavigationLevel] = useState('year'); // 'year', 'month', 'week', 'day'

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
    const updateDateRange = (year, month = null, week = null, day = null) => {
        let startDate, endDate;

        if (year && month && day) {
            startDate = startOfDay(new Date(year, month - 1, day));
            endDate = endOfDay(new Date(year, month - 1, day));
        } else if (year && month && week) {
            const firstDayOfMonth = new Date(year, month - 1, 1);
            const weekStart = startOfWeek(
                new Date(year, month - 1, (week - 1) * 7 + 1),
                { weekStartsOn: 1 }
            );
            startDate =
                weekStart < firstDayOfMonth ? firstDayOfMonth : weekStart;
            endDate = endOfWeek(startDate, { weekStartsOn: 1 });
        } else if (year && month) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else if (year) {
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
        setNavigationLevel('month');
        updateDateRange(year);
    };

    const handleMonthSelect = (month) => {
        setSelectedMonth(month);
        setNavigationLevel('week');
        updateDateRange(selectedYear, month);
    };

    const handleWeekSelect = (week) => {
        setSelectedWeek(week);
        setNavigationLevel('day');
        updateDateRange(selectedYear, selectedMonth, week);
    };

    const handleDaySelect = (day) => {
        setSelectedDay(day);
        updateDateRange(selectedYear, selectedMonth, null, day);
    };

    const handleBack = () => {
        if (navigationLevel === 'day') {
            setSelectedDay(null);
            setSelectedWeek(null);
            setNavigationLevel('week');
            updateDateRange(selectedYear, selectedMonth);
        } else if (navigationLevel === 'week') {
            setSelectedWeek(null);
            setSelectedMonth(null);
            setNavigationLevel('month');
            updateDateRange(selectedYear);
        } else if (navigationLevel === 'month') {
            setSelectedMonth(null);
            setSelectedYear(null);
            setNavigationLevel('year');
            clearDateRangeFilters();
        } else if (navigationLevel === 'year') {
            setSelectedYear(null);
            clearDateRangeFilters();
        }
    };

    const availableYears = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return [];
        const startYear = new Date(dateRange.start).getFullYear();
        const endYear = new Date(dateRange.end).getFullYear();
        const years = [];
        for (let year = startYear; year <= endYear; year++) years.push(year);
        return years;
    }, [dateRange]);

    const availableMonths = useMemo(() => {
        if (!selectedYear || !dateRange.start || !dateRange.end) return [];
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        const startMonth =
            selectedYear === startDate.getFullYear() ? startDate.getMonth() : 0;
        const endMonth =
            selectedYear === endDate.getFullYear() ? endDate.getMonth() : 11;
        const months = [];
        for (let month = startMonth; month <= endMonth; month++)
            months.push(month + 1);
        return months;
    }, [selectedYear, dateRange]);

    const availableWeeks = useMemo(() => {
        if (!selectedYear || !selectedMonth) return [];
        const daysInMonth = getDaysInMonth(
            new Date(selectedYear, selectedMonth - 1)
        );
        return [...Array(Math.ceil(daysInMonth / 7)).keys()].map((i) => i + 1);
    }, [selectedYear, selectedMonth]);

    const availableDays = useMemo(() => {
        if (!selectedYear || !selectedMonth || !selectedWeek) return [];
        const weekStart = startOfWeek(
            new Date(
                selectedYear,
                selectedMonth - 1,
                (selectedWeek - 1) * 7 + 1
            ),
            { weekStartsOn: 1 }
        );
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd })
            .filter(
                (day) =>
                    day.getMonth() + 1 === selectedMonth &&
                    isWithinInterval(day, {
                        start: new Date(dateRange.start),
                        end: new Date(dateRange.end),
                    })
            )
            .map((day) => day.getDate());
    }, [selectedYear, selectedMonth, selectedWeek, dateRange]);

    const getOrdinalSuffix = (num) => {
        const j = num % 10,
            k = num % 100;
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    };

    const renderBreadcrumb = () => {
        const items = [];
        if (selectedYear)
            items.push(
                <span key="year" className="breadcrumb-item">
                    {selectedYear}
                </span>
            );
        if (selectedMonth)
            items.push(
                <span key="sep1" className="breadcrumb-separator">
                    ›
                </span>,
                <span key="month" className="breadcrumb-item">
                    {monthNames[selectedMonth - 1]}
                </span>
            );
        if (selectedWeek)
            items.push(
                <span key="sep2" className="breadcrumb-separator">
                    ›
                </span>,
                <span key="week" className="breadcrumb-item">
                    Week {selectedWeek}
                </span>
            );
        if (selectedDay)
            items.push(
                <span key="sep3" className="breadcrumb-separator">
                    ›
                </span>,
                <span key="day" className="breadcrumb-item">
                    {getOrdinalSuffix(selectedDay)}
                </span>
            );
        return items.length > 0 ? (
            <div className="time-selector-breadcrumb">{items}</div>
        ) : null;
    };

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
                {navigationLevel !== 'year' && (
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
                                {availableYears.map((year) => (
                                    <button
                                        key={year}
                                        className={`time-selector-option ${selectedYear === year ? 'selected' : ''}`}
                                        onClick={() => handleYearSelect(year)}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {navigationLevel === 'month' && (
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
                    {navigationLevel === 'week' && (
                        <div className="time-selector-grid">
                            <h4>
                                Select Week in {monthNames[selectedMonth - 1]}{' '}
                                {selectedYear}
                            </h4>
                            <div className="time-selector-options">
                                {availableWeeks.map((week) => (
                                    <button
                                        key={week}
                                        className={`time-selector-option ${selectedWeek === week ? 'selected' : ''}`}
                                        onClick={() => handleWeekSelect(week)}
                                    >
                                        {getOrdinalSuffix(week)} week
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {navigationLevel === 'day' && (
                        <div className="time-selector-grid">
                            <h4>
                                Select Day in Week {selectedWeek} of{' '}
                                {monthNames[selectedMonth - 1]} {selectedYear}
                            </h4>
                            <div className="time-selector-options">
                                {availableDays.map((day) => (
                                    <button
                                        key={day}
                                        className={`time-selector-option ${selectedDay === day ? 'selected' : ''}`}
                                        onClick={() => handleDaySelect(day)}
                                    >
                                        {getOrdinalSuffix(day)}
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
