import React, { useState, useEffect } from 'react';
import { useApp } from '../../hooks/useApp';
import HoursFilter from './HoursFilter';
import WeeksFilter from './WeeksFilter';
import MonthsFilter from './MonthsFilter';
import SongsFilter from './SongsFilter';
import ArtistsFilter from './ArtistsFilter';

const FilterBar = ({ songsData, artistsData }) => {
    const { filters, updateFilter, dateRange, clearAllFilters } = useApp();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const toYYYYMMDD = (timestamp) => {
            const d = new Date(timestamp);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setStartDate(filters.dateRange.start ? toYYYYMMDD(filters.dateRange.start) : '');
        setEndDate(filters.dateRange.end ? toYYYYMMDD(filters.dateRange.end) : '');
    }, [filters.dateRange]);

    const handleDateUpdate = () => {
        let newStart, newEnd;

        if (startDate) {
            const [year, month, day] = startDate.split('-').map(Number);
            newStart = new Date(year, month - 1, day).getTime();
        } else {
            newStart = dateRange.start;
        }

        if (endDate) {
            const [year, month, day] = endDate.split('-').map(Number);
            newEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
        } else {
            newEnd = dateRange.end;
        }

        if (newStart < dateRange.start) newStart = dateRange.start;
        if (newStart > dateRange.end) newStart = dateRange.end;
        if (newEnd < dateRange.start) newEnd = dateRange.start;
        if (newEnd > dateRange.end) newEnd = dateRange.end;
        if (newStart > newEnd) {
            newStart = newEnd;
        }

        updateFilter('dateRange', { start: newStart, end: newEnd });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleDateUpdate();
            e.target.blur();
        }
    };

    return (
        <div className="filter-bar">
            <div className="filter-group">
                <div className="filter-item filter-date-range">
                    <label>Date Range</label>
                    <input
                        type="date"
                        placeholder="Start"
                        value={startDate}
                        min={
                            dateRange.start
                                ? new Date(dateRange.start)
                                      .toISOString()
                                      .split('T')[0]
                                : ''
                        }
                        max={
                            dateRange.end
                                ? new Date(dateRange.end)
                                      .toISOString()
                                      .split('T')[0]
                                : ''
                        }
                        onChange={(e) => setStartDate(e.target.value)}
                        onBlur={handleDateUpdate}
                        onKeyDown={handleKeyDown}
                    />
                    <input
                        type="date"
                        placeholder="End"
                        value={endDate}
                        min={
                            dateRange.start
                                ? new Date(dateRange.start)
                                      .toISOString()
                                      .split('T')[0]
                                : ''
                        }
                        max={
                            dateRange.end
                                ? new Date(dateRange.end)
                                      .toISOString()
                                      .split('T')[0]
                                : ''
                        }
                        onChange={(e) => setEndDate(e.target.value)}
                        onBlur={handleDateUpdate}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        className="clear-all-filters-btn"
                        onClick={clearAllFilters}
                    >
                        Clear all filters
                    </button>
                </div>

                <div className="filter-song-artist">
                    <SongsFilter songsData={songsData} />
                    <ArtistsFilter artistsData={artistsData} />
                </div>

                <div className="filter-time-grid">
                    <HoursFilter />
                    <WeeksFilter />
                    <MonthsFilter />
                </div>

                <div className="filter-item filter-release-year">
                    <label>Release Year</label>
                    <input
                        type="number"
                        placeholder="Min"
                        disabled
                        title="Requires MusicBrainz"
                    />
                    <input
                        type="number"
                        placeholder="Max"
                        disabled
                        title="Requires MusicBrainz"
                    />
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={filters.includeMissingReleaseYear}
                            disabled
                            title="TODO"
                        />
                        <span>Include missing</span>
                    </label>
                </div>

                <div className="filter-genre-duration">
                    <div className="filter-item filter-double">
                        <label>Genre</label>
                        <button
                            className="filter-dropdown-trigger"
                            disabled
                            title="Capped height, 'no genre' option, requires MusicBrainz"
                        >
                            TODO: Genres
                        </button>
                    </div>
                    <div className="filter-item filter-double">
                        <label>Duration</label>
                        <div
                            className="duration-slider disabled"
                            title="Requires API data"
                        >
                            <span>TODO: Slider</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
