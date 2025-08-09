import React from 'react';
import { useApp } from '../../hooks/useApp';

const KeyStatisticsCard = ({ data }) => {
    const { hasActiveFilters } = useApp();

    // Check if any filters are active
    const filtersActive = hasActiveFilters(true);
    const {
        total_plays = 0,
        total_unique_songs = 0,
        total_unique_artists = 0,
        mean_replays = 0,
        replay_quantiles = [0, 0, 0],
        filtered_plays = 0,
        filtered_unique_songs = 0,
        filtered_unique_artists = 0,
        filtered_mean_replays = 0,
        filtered_replay_quantiles = [0, 0, 0],
    } = data || {};

    return (
        <div className="card">
            <div className="card-header">
                <h3>Key Statistics</h3>
            </div>
            <div className="card-content">
                <div id="total-plays" className="stat-item">
                    Total Plays: {total_plays.toLocaleString()}
                </div>
                <div id="total-unique-songs" className="stat-item">
                    Unique Songs: {total_unique_songs.toLocaleString()}
                </div>
                <div id="total-unique-artists" className="stat-item">
                    Unique Artists: {total_unique_artists.toLocaleString()}
                </div>
                <div id="mean-replays" className="stat-item">
                    Mean Replays: {mean_replays.toFixed(2)}
                </div>
                <div id="median-replays" className="stat-item">
                    Replay Percentiles (25/50/75%): {replay_quantiles.map(q => q.toLocaleString()).join(' / ')}
                </div>

                {filtersActive && (
                    <div id="filtered-stats-container">
                        <hr />
                        <div id="filtered-plays" className="stat-item">
                            Plays in Filter: {filtered_plays.toLocaleString()}
                        </div>
                        <div id="filtered-unique-songs" className="stat-item">
                            Unique Songs in Filter:{' '}
                            {filtered_unique_songs.toLocaleString()}
                        </div>
                        <div id="filtered-unique-artists" className="stat-item">
                            Unique Artists in Filter:{' '}
                            {filtered_unique_artists.toLocaleString()}
                        </div>
                        <div id="filtered-mean-replays" className="stat-item">
                            Mean Replays in Filter: {filtered_mean_replays.toFixed(2)}
                        </div>
                        <div id="filtered-median-replays" className="stat-item">
                            Replay Percentiles in Filter: {filtered_replay_quantiles.map(q => q.toLocaleString()).join(' / ')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KeyStatisticsCard;
