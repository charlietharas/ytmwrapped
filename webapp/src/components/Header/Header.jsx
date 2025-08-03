import React, { useState } from 'react';
import PreferencesMenu from './PreferencesMenu';

const Header = () => {
    const [showPreferences, setShowPreferences] = useState(false);

    return (
        <header>
            <h1>YouTube Music Wrapped</h1>
            <div id="header-controls">
                <button
                    className="preferences-button"
                    onClick={() => setShowPreferences(!showPreferences)}
                    title="Preferences"
                >
                    ⋮
                </button>
                {showPreferences && (
                    <>
                        <div
                            className="preferences-backdrop"
                            onClick={() => setShowPreferences(false)}
                        />
                        <PreferencesMenu
                            onClose={() => setShowPreferences(false)}
                        />
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
