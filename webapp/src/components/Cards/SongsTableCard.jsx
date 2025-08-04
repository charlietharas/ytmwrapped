import React, { useState, useMemo, memo } from 'react';
import { useApp } from '../../hooks/useApp';

const SongsTableCard = ({ data }) => {
    const { hasActiveFilters, clearSongsFilters } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [isZoomed, setIsZoomed] = useState(false);

    const isFiltered = hasActiveFilters();

    const filteredSongs = useMemo(() => {
        if (!data || data.error || !data.labels) {
            return [];
        }

        const songs = data.labels.map((song, index) => {
            const filteredPlays = data.datasets?.[0]?.data?.[index] || 0;
            const otherPlays = data.datasets?.[1]?.data?.[index] || 0;
            const totalPlays = filteredPlays + otherPlays;
            
            return {
                rank: index + 1,
                name: song,
                filteredPlays: filteredPlays,
                totalPlays: totalPlays,
                otherPlays: otherPlays
            };
        });

        if (searchTerm) {
            return songs.filter(song => 
                song.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        let filtered = songs;

        if (searchTerm) {
            filtered = filtered.filter(song => 
                song.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply zoom filter - show only filtered rows when zoomed
        if (isFiltered && isZoomed) {
            filtered = filtered.filter(song => song.filteredPlays > 0);
        }

        return filtered;
    }, [data, searchTerm, isFiltered, isZoomed]);

    const handleClearFilters = () => {
        clearSongsFilters();
        setSearchTerm('');
        setIsZoomed(false);
    };

    if (!data || data.error) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3>All Songs</h3>
                </div>
                <div className="card-content">
                    <p className="card-description">
                        {data?.error || 'No data available'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3>All Songs</h3>
                {isFiltered && (
                    <div className="card-header-controls">
                        <button
                            id="zoom-toggle-btn"
                            title={
                                isZoomed
                                    ? 'Show all rows'
                                    : 'Show only filtered rows'
                            }
                            onClick={() => setIsZoomed(!isZoomed)}
                        >
                            {isZoomed ? '⤆' : '⤢'}
                        </button>
                        <button
                            id="clear-filter-btn"
                            title="Clear all filters"
                            onClick={handleClearFilters}
                        >
                            ↺
                        </button>
                    </div>
                )}
            </div>
            <div className="card-content">
                <p className="card-description">
                    All of your favorite songs
                </p>
                
                <input
                    type="text"
                    placeholder="Search songs..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Song</th>
                                <th>Plays</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSongs.map((song) => (
                                <tr 
                                    key={song.name}
                                    className={isFiltered && song.filteredPlays > 0 ? 'highlighted' : ''}
                                >
                                    <td className="rank-cell">{song.rank}</td>
                                    <td className="name-cell">{song.name}</td>
                                    <td className="plays-cell">
                                        {isFiltered ? (
                                            <>
                                                <span className="filtered-plays">{song.filteredPlays}</span>
                                                {song.otherPlays > 0 && (
                                                    <span className="other-plays"> + {song.otherPlays}</span>
                                                )}
                                            </>
                                        ) : (
                                            song.totalPlays
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default memo(SongsTableCard); 