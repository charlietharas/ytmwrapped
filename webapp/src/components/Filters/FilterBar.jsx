import React from 'react';
import { useApp } from '../../hooks/useApp';

const FilterBar = () => {
  const { filters, updateFilter, dateRange, clearAllFilters } = useApp();
  return (
    <div className="filter-bar">
      <div className="filter-group">
        {/* Date Range Filter with Reset Button - Vertical */}
        <div className="filter-item filter-date-range">
          <label>Date Range</label>
          <input 
            type="date" 
            placeholder="Start"
            value={filters.dateRange.start ? new Date(filters.dateRange.start).toISOString().split('T')[0] : ''}
            min={dateRange.start ? new Date(dateRange.start).toISOString().split('T')[0] : ''}
            max={dateRange.end ? new Date(dateRange.end).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                let newStart = new Date(e.target.value).getTime();
                const currentEnd = filters.dateRange.end || dateRange.end;
                
                // Validate: start cannot be before min date
                if (newStart < dateRange.start) {
                  newStart = dateRange.start;
                }
                // Validate: start cannot be after max date
                if (newStart > dateRange.end) {
                  newStart = dateRange.end;
                }
                // Validate: start cannot be after end
                if (newStart > currentEnd) {
                  newStart = currentEnd;
                }
                
                updateFilter('dateRange', {
                  start: newStart,
                  end: currentEnd
                });
              } else {
                updateFilter('dateRange', {
                  start: dateRange.start,
                  end: filters.dateRange.end || dateRange.end
                });
              }
            }}
          />
          <input 
            type="date" 
            placeholder="End"
            value={filters.dateRange.end ? new Date(filters.dateRange.end).toISOString().split('T')[0] : ''}
            min={dateRange.start ? new Date(dateRange.start).toISOString().split('T')[0] : ''}
            max={dateRange.end ? new Date(dateRange.end).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                let newEnd = new Date(e.target.value).getTime();
                const currentStart = filters.dateRange.start || dateRange.start;
                
                // Validate: end cannot be before min date
                if (newEnd < dateRange.start) {
                  newEnd = dateRange.start;
                }
                // Validate: end cannot be after max date
                if (newEnd > dateRange.end) {
                  newEnd = dateRange.end;
                }
                // Validate: end cannot be before start
                if (newEnd < currentStart) {
                  newEnd = currentStart;
                }
                
                updateFilter('dateRange', {
                  start: currentStart,
                  end: newEnd
                });
              } else {
                updateFilter('dateRange', {
                  start: filters.dateRange.start || dateRange.start,
                  end: dateRange.end
                });
              }
            }}
          />
          <button 
            className="clear-all-filters-btn"
            onClick={clearAllFilters}
          >
            Clear all filters
          </button>
        </div>

        {/* Song and Artist Container */}
        <div className="filter-song-artist">
          {/* Song Filter */}
          <div className="filter-item">
            <label>Song</label>
            <button className="filter-dropdown-trigger" disabled title="Searchable, capped height, selected on top">
              TODO: Songs
            </button>
          </div>

          {/* Artist Filter */}
          <div className="filter-item">
            <label>Artist</label>
            <button className="filter-dropdown-trigger" disabled title="Searchable, capped height, selected on top">
              TODO: Artists
            </button>
          </div>
        </div>

        {/* Time Filters Container - 2x2 Grid */}
        <div className="filter-time-grid">
          {/* Hour of Day Filter */}
          <div className="filter-item">
            <label>Hour</label>
            <button className="filter-dropdown-trigger" disabled title="Capped height">
              TODO: Hours
            </button>
          </div>

          {/* Day of Week Filter */}
          <div className="filter-item">
            <label>Day</label>
            <button className="filter-dropdown-trigger" disabled title="Uncapped">
              TODO: Days
            </button>
          </div>

          {/* Month of Year Filter */}
          <div className="filter-item">
            <label>Month</label>
            <button className="filter-dropdown-trigger" disabled title="Uncapped">
              TODO: Months
            </button>
          </div>

          {/* Year Filter */}
          <div className="filter-item">
            <label>Year</label>
            <button className="filter-dropdown-trigger" disabled title="Uncapped">
              TODO: Years
            </button>
          </div>
        </div>

        {/* Release Year Range Filter - Vertical with checkbox */}
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

        {/* Genre and Duration Container */}
        <div className="filter-genre-duration">
          {/* Genre Filter - Double Length */}
          <div className="filter-item filter-double">
            <label>Genre</label>
            <button className="filter-dropdown-trigger" disabled title="Capped height, 'no genre' option, requires MusicBrainz">
              TODO: Genres
            </button>
          </div>

          {/* Duration Range Filter */}
          <div className="filter-item filter-double">
            <label>Duration</label>
            <div className="duration-slider disabled" title="Requires API data">
              <span>TODO: Slider</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FilterBar;