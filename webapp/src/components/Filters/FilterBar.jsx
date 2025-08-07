import React, { useState, useEffect } from 'react';
import { useApp } from '../../hooks/useApp';
import HoursFilter from './HoursFilter';
import WeeksFilter from './WeeksFilter';
import MonthsFilter from './MonthsFilter';
import SongsFilter from './SongsFilter';

const FilterBar = ({ songsData }) => {
    const { filters, updateFilter, dateRange, clearAllFilters } = useApp();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        setStartDate(
            filters.dateRange.start
                ? new Date(filters.dateRange.start).toISOString().split('T')[0]
                : ''
        );
        setEndDate(
            filters.dateRange.end
                ? new Date(filters.dateRange.end).toISOString().split('T')[0]
                : ''
        );
    }, [filters.dateRange]);

    const handleDateUpdate = () => {
        let newStart = startDate
            ? new Date(startDate).getTime()
            : dateRange.start;
        let newEnd = endDate ? new Date(endDate).getTime() : dateRange.end;

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
                    <div className="filter-item">
                        <label>Artist</label>
                        <button
                            className="filter-dropdown-trigger"
                            disabled
                            title="Searchable, capped height, selected on top"
                        >
                            TODO: Artists
                        </button>
                    </div>
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
