import React, { useState, useMemo, memo } from 'react';
import { useApp } from '../../hooks/useApp';

const ArtistsTableCard = ({ data }) => {
    const { hasActiveFilters, clearArtistsFilters } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [isZoomed, setIsZoomed] = useState(false);

    const isFiltered = hasActiveFilters();

    const filteredArtists = useMemo(() => {
        if (!data || data.error || !data.labels) {
            return [];
        }

        const artists = data.labels.map((artist, index) => {
            const filteredPlays = data.datasets?.[0]?.data?.[index] || 0;
            const otherPlays = data.datasets?.[1]?.data?.[index] || 0;
            const totalPlays = filteredPlays + otherPlays;

            return {
                rank: index + 1,
                name: artist,
                filteredPlays: filteredPlays,
                totalPlays: totalPlays,
                otherPlays: otherPlays,
            };
        });

        if (searchTerm) {
            return artists.filter((artist) =>
                artist.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        let filtered = artists;

        if (searchTerm) {
            filtered = filtered.filter((artist) =>
                artist.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply zoom filter - show only filtered rows when zoomed
        if (isFiltered && isZoomed) {
            filtered = filtered.filter((artist) => artist.filteredPlays > 0);
        }

        return filtered;
    }, [data, searchTerm, isFiltered, isZoomed]);

    const handleClearFilters = () => {
        clearArtistsFilters();
        setSearchTerm('');
        setIsZoomed(false);
    };

    if (!data || data.error) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3>All Artists</h3>
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
                <h3>All Artists</h3>
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
                <p className="card-description">All of your favorite artists</p>

                <input
                    type="text"
                    placeholder="Search artists..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Artist</th>
                                <th>Plays</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArtists.map((artist) => (
                                <tr
                                    key={artist.name}
                                    className={
                                        isFiltered && artist.filteredPlays > 0
                                            ? 'highlighted'
                                            : ''
                                    }
                                >
                                    <td className="rank-cell">{artist.rank}</td>
                                    <td className="name-cell">{artist.name}</td>
                                    <td className="plays-cell">
                                        {isFiltered ? (
                                            <>
                                                <span className="filtered-plays">
                                                    {artist.filteredPlays}
                                                </span>
                                                {artist.otherPlays > 0 && (
                                                    <span className="other-plays">
                                                        {' '}
                                                        + {artist.otherPlays}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            artist.totalPlays
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

export default memo(ArtistsTableCard);
