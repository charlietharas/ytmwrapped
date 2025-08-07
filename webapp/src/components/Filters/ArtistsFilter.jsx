import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../hooks/useApp';

const ArtistsFilter = ({ artistsData }) => {
    const { filters, updateFilter } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const allArtists = useMemo(() => artistsData?.labels || [], [artistsData]);

    const filteredArtists = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = allArtists.filter(artist =>
            artist.toLowerCase().includes(lowercasedFilter)
        );

        return filtered.sort((a, b) => {
            const aIsSelected = filters.artists.includes(a);
            const bIsSelected = filters.artists.includes(b);
            if (aIsSelected && !bIsSelected) return -1;
            if (!aIsSelected && bIsSelected) return 1;
            return allArtists.indexOf(a) - allArtists.indexOf(b);
        });
    }, [allArtists, searchTerm, filters.artists]);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleArtistToggle = (artist) => {
        const newArtists = filters.artists.includes(artist)
            ? filters.artists.filter((a) => a !== artist)
            : [...filters.artists, artist];
        updateFilter('artists', newArtists.sort());
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
        if (filters.artists.length === 0) {
            return <i className="filter-placeholder">Select Artists</i>;
        }
        if (filters.artists.length === 1) {
            return filters.artists[0];
        }
        return `${filters.artists.length} artists selected`;
    };

    return (
        <div className="filter-item" ref={dropdownRef}>
            <label>Artist</label>
            <button
                className="filter-dropdown-trigger"
                onClick={toggleDropdown}
                title={filters.artists.join(', ')}
            >
                <span className="truncate-text">{getButtonText()}</span>
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    <div className="filter-dropdown-search">
                        <input
                            type="text"
                            placeholder="Search artists..."
                            className="filter-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="filter-dropdown-content">
                        {filteredArtists.slice(0, 10).map((artist) => (
                            <label key={artist} className="filter-dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={filters.artists.includes(artist)}
                                    onChange={() => handleArtistToggle(artist)}
                                />
                                <span>{artist}</span>
                            </label>
                        ))}
                         {filteredArtists.length > 10 && (
                            <div className="filter-dropdown-info">
                                ...and {filteredArtists.length - 10} more
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistsFilter;