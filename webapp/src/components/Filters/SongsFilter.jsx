import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../hooks/useApp';

const SongsFilter = ({ songsData }) => {
    const { filters, updateFilter } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const allSongs = useMemo(() => songsData?.labels || [], [songsData]);

    const filteredSongs = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = allSongs.filter(song =>
            song.toLowerCase().includes(lowercasedFilter)
        );

        // Sort to show selected songs at the top
        return filtered.sort((a, b) => {
            const aIsSelected = filters.songs.includes(a);
            const bIsSelected = filters.songs.includes(b);
            if (aIsSelected && !bIsSelected) return -1;
            if (!aIsSelected && bIsSelected) return 1;
            // The secondary sort can be alphabetical or based on original order (which is by play count)
            return allSongs.indexOf(a) - allSongs.indexOf(b);
        });
    }, [allSongs, searchTerm, filters.songs]);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSongToggle = (song) => {
        const newSongs = filters.songs.includes(song)
            ? filters.songs.filter((s) => s !== song)
            : [...filters.songs, song];
        updateFilter('songs', newSongs.sort());
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
        if (filters.songs.length === 0) {
            return <i className="filter-placeholder">Select Songs</i>;
        }
        if (filters.songs.length === 1) {
            return filters.songs[0];
        }
        return `${filters.songs.length} songs selected`;
    };

    return (
        <div className="filter-item" ref={dropdownRef}>
            <label>Song</label>
            <button
                className="filter-dropdown-trigger"
                onClick={toggleDropdown}
                title={filters.songs.join(', ')}
            >
                <span className="truncate-text">{getButtonText()}</span>
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    <div className="filter-dropdown-search">
                        <input
                            type="text"
                            placeholder="Search songs..."
                            className="filter-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="filter-dropdown-content">
                        {filteredSongs.slice(0, 10).map((song) => (
                            <label key={song} className="filter-dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={filters.songs.includes(song)}
                                    onChange={() => handleSongToggle(song)}
                                />
                                <span>{song}</span>
                            </label>
                        ))}
                         {filteredSongs.length > 10 && (
                            <div className="filter-dropdown-info">
                                ...and {filteredSongs.length - 10} more
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SongsFilter;