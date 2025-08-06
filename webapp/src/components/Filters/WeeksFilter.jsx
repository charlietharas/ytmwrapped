import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../hooks/useApp';

const WeeksFilter = () => {
    const { filters, updateFilter } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const daysOfWeek = [
        { id: 0, name: 'Monday' },
        { id: 1, name: 'Tuesday' },
        { id: 2, name: 'Wednesday' },
        { id: 3, name: 'Thursday' },
        { id: 4, name: 'Friday' },
        { id: 5, name: 'Saturday' },
        { id: 6, name: 'Sunday' },
    ];

    const sortedDaysForDropdown = [...daysOfWeek].sort((a, b) => {
        const aIsSelected = filters.daysOfWeek.includes(a.id);
        const bIsSelected = filters.daysOfWeek.includes(b.id);
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        return a.id - b.id;
    });

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleDayToggle = (dayId) => {
        const newDays = filters.daysOfWeek.includes(dayId)
            ? filters.daysOfWeek.filter((d) => d !== dayId)
            : [...filters.daysOfWeek, dayId];
        updateFilter(
            'daysOfWeek',
            newDays.sort((a, b) => a - b)
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
        if (filters.daysOfWeek.length === 0) {
            return <i className="filter-placeholder">Select Days</i>;
        }
        if (filters.daysOfWeek.length === daysOfWeek.length) {
            return 'All Days';
        }

        const selectedDays = filters.daysOfWeek
            .map((id) =>
                daysOfWeek.find((d) => d.id === id).name.substring(0, 3)
            )
            .join(', ');

        return selectedDays;
    };

    const buttonText = getButtonText();

    return (
        <div className="filter-item" ref={dropdownRef}>
            <label>Day</label>
            <button
                className="filter-dropdown-trigger"
                onClick={toggleDropdown}
            >
                {buttonText}
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    <div className="filter-dropdown-content">
                        {sortedDaysForDropdown.map((day) => (
                            <label
                                key={day.id}
                                className="filter-dropdown-item"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.daysOfWeek.includes(
                                        day.id
                                    )}
                                    onChange={() => handleDayToggle(day.id)}
                                />
                                <span>{day.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeksFilter;
