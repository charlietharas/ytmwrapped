import React from 'react';
import { useApp } from '../../contexts/AppContext';

const KeyStatisticsCard = ({ data }) => {
  const { filters, dateRange } = useApp();
  
  // Check if we have date filters applied
  const hasActiveFilters = dateRange.start && dateRange.end &&
    (filters.dateRange.start !== dateRange.start || 
     filters.dateRange.end !== dateRange.end);
  const {
    total_videos = 0,
    unique_songs = 0,
    total_artists = 0,
    filtered_videos = 0,
    filtered_unique_songs = 0,
    filtered_artists = 0
  } = data || {};

  return (
    <div className="card">
      <div className="card-header">
        <h3>Key Statistics</h3>
      </div>
      <div className="card-content">
        <div id="total-videos" className="stat-item">
          Total Plays: {total_videos.toLocaleString()}
        </div>
        <div id="total-unique-songs" className="stat-item">
          Unique Songs: {unique_songs.toLocaleString()}
        </div>
        <div id="total-artists" className="stat-item">
          Unique Artists: {total_artists.toLocaleString()}
        </div>
        
        {hasActiveFilters && (
          <div id="filtered-stats-container">
            <hr />
            <div id="filtered-videos" className="stat-item">
              Plays in Filter: {filtered_videos.toLocaleString()}
            </div>
            <div id="filtered-unique-songs" className="stat-item">
              Unique Songs in Filter: {filtered_unique_songs.toLocaleString()}
            </div>
            <div id="filtered-artists" className="stat-item">
              Unique Artists in Filter: {filtered_artists.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyStatisticsCard;