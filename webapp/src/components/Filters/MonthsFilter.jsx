import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../hooks/useApp';

const MonthsFilter = () => {
    const { filters, updateFilter } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const months = [
        { id: 1, name: 'January' },
        { id: 2, name: 'February' },
        { id: 3, name: 'March' },
        { id: 4, name: 'April' },
        { id: 5, name: 'May' },
        { id: 6, name: 'June' },
        { id: 7, name: 'July' },
        { id: 8, name: 'August' },
        { id: 9, name: 'September' },
        { id: 10, name: 'October' },
        { id: 11, name: 'November' },
        { id: 12, name: 'December' },
    ];

    const sortedMonthsForDropdown = [...months].sort((a, b) => {
        const aIsSelected = filters.months.includes(a.id);
        const bIsSelected = filters.months.includes(b.id);
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        return a.id - b.id;
    });

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleMonthToggle = (monthId) => {
        const newMonths = filters.months.includes(monthId)
            ? filters.months.filter((m) => m !== monthId)
            : [...filters.months, monthId];
        updateFilter(
            'months',
            newMonths.sort((a, b) => a - b)
        );
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getButtonText = () => {
        if (filters.months.length === 0) {
            return <i className="filter-placeholder">Select Months</i>;
        }
        if (filters.months.length === months.length) {
            return 'All Months';
        }

        const selectedMonths = filters.months
            .map((id) => months.find((m) => m.id === id).name.substring(0, 3))
            .join(', ');

        return selectedMonths;
    };

    const buttonText = getButtonText();

    return (
        <div className="filter-item" ref={dropdownRef}>
            <label>Month</label>
            <button
                className="filter-dropdown-trigger"
                onClick={toggleDropdown}
            >
                {buttonText}
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    <div className="filter-dropdown-content">
                        {sortedMonthsForDropdown.map((month) => (
                            <label
                                key={month.id}
                                className="filter-dropdown-item"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.months.includes(month.id)}
                                    onChange={() => handleMonthToggle(month.id)}
                                />
                                <span>{month.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthsFilter;
