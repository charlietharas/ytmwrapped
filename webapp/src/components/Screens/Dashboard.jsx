import React, { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import FilterBar from '../Filters/FilterBar';
import TimelineCard from '../Cards/TimelineCard';
import KeyStatisticsCard from '../Cards/KeyStatisticsCard';
import HoursCard from '../Cards/HoursCard';

const Dashboard = ({ keyStatisticsData, timelineData, hoursData }) => {
  const { isAnalysisComplete } = useApp();
  const [showHistoryExplorer, setShowHistoryExplorer] = useState(true);

  if (!isAnalysisComplete) {
    return <div>No data available</div>;
  }

  return (
    <>
      <FilterBar />
      
      <div className={`dashboard-container ${showHistoryExplorer ? 'with-history-explorer' : ''}`}>
        <button 
          className="toggle-history-explorer"
          onClick={() => setShowHistoryExplorer(!showHistoryExplorer)}
        >
          {showHistoryExplorer ? '◀' : '▶'}
        </button>
        {showHistoryExplorer && (
          <div id="history-explorer-container">
            <h2>History Explorer</h2>
            <input 
              type="text" 
              placeholder="Search history..." 
              className="search-input"
            />
            <div className="history-list">
              <p>TODO: Implement lazy-loaded history with filters</p>
            </div>
          </div>
        )}

        <div id="results">
          <TimelineCard data={timelineData} />

          <div className="card">
            <div className="card-header">
              <h3>Time Period Selector</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Month/Week selector</p>
            </div>
          </div>

          <KeyStatisticsCard data={keyStatisticsData} />

          <div className="card">
            <div className="card-header">
              <h3>Google/YouTube API Integration</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Add YouTube API key input and duration fetching</p>
              <details>
                <summary>Instructions to generate API key</summary>
                <p>TODO: Add instructions</p>
              </details>
              <input type="text" placeholder="Enter YouTube API key" disabled />
              <button disabled>Fetch durations (TODO)</button>
              <button disabled>Clear durations (TODO)</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>MusicBrainz Integration</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Fetch genre and release year information</p>
              <button disabled>Fetch MusicBrainz data (TODO)</button>
              <button disabled>Clear MusicBrainz data (TODO)</button>
            </div>
          </div>

          <h2 className="section-header">Temporal Patterns</h2>
          
          <HoursCard data={hoursData} />

          <div className="card">
            <div className="card-header">
              <h3>Songs per Day of Week</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Bar chart showing listening patterns by day of week</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Songs per Month of Year</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Bar chart showing listening patterns by month</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Songs per Year</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Bar chart showing listening patterns by year</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>TODO</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>TODO</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO</p>
            </div>
          </div>

          <h2 className="section-header">Cumulative Statistics</h2>

          <div className="card">
            <div className="card-header">
              <h3>Top 20 Artists</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Column chart of most played artists</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Top 20 Songs</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Column chart of most played songs</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>All Artists</h3>
            </div>
            <div className="card-content">
              <input type="text" placeholder="Search artists..." className="search-input" disabled />
              <p className="card-description">TODO: Scrollable table with rank, artist name, play count</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>All Songs</h3>
            </div>
            <div className="card-content">
              <input type="text" placeholder="Search songs..." className="search-input" disabled />
              <p className="card-description">TODO: Scrollable table with rank, song name, artist, play count</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>TODO</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>TODO</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO</p>
            </div>
          </div>

          <h2 className="section-header">Music Intelligence (MusicBrainz)</h2>

          <div className="card">
            <div className="card-header">
              <h3>Genre Breakdown</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Pie chart showing genre distribution</p>
              <p className="note">Genres under 2% will be grouped as "Other"</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Release Year</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Bar chart showing songs by release year</p>
              <p className="note">Songs without release year: TODO</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Release Decade</h3>
            </div>
            <div className="card-content">
              <p className="card-description">TODO: Bar chart showing songs by release decade</p>
              <p className="note">Songs without release year: TODO</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;