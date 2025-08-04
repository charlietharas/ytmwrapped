import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../hooks/useApp';

const HoursFilter = () => {
    const { filters, updateFilter } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const sortedHoursForDropdown = [...hours].sort((a, b) => {
        const aIsSelected = filters.hours.includes(a);
        const bIsSelected = filters.hours.includes(b);
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        return a - b;
    });

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleHourToggle = (hour) => {
        const newHours = filters.hours.includes(hour)
            ? filters.hours.filter((h) => h !== hour)
            : [...filters.hours, hour];
        updateFilter(
            'hours',
            newHours.sort((a, b) => a - b)
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

    const formatHour = (hour) => `${hour.toString().padStart(2, '0')}:00`;

    const getButtonText = () => {
        if (filters.hours.length === 0) {
            return <i className="filter-placeholder">Select Hours</i>;
        }

        const sortedHours = [...filters.hours].sort((a, b) => a - b);
        const ranges = [];
        let startRange = sortedHours[0];

        for (let i = 0; i < sortedHours.length; i++) {
            const current = sortedHours[i];
            const next = sortedHours[i + 1];

            if (next - current > 1 || next === undefined) {
                if (startRange === current) {
                    ranges.push(formatHour(current));
                } else {
                    ranges.push(
                        `${formatHour(startRange)}-${formatHour(current)}`
                    );
                }
                if (next !== undefined) {
                    startRange = next;
                }
            }
        }
        return ranges.join(', ');
    };

    const buttonText = getButtonText();

    return (
        <div className="filter-item" ref={dropdownRef}>
            <label>Hour</label>
            <button
                className="filter-dropdown-trigger"
                onClick={toggleDropdown}
            >
                {buttonText}
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    <div className="filter-dropdown-content">
                        {sortedHoursForDropdown.map((hour) => (
                            <label key={hour} className="filter-dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={filters.hours.includes(hour)}
                                    onChange={() => handleHourToggle(hour)}
                                />
                                <span>{formatHour(hour)}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HoursFilter;
