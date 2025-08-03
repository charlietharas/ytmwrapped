import React, { useState } from 'react';
import { usePreferences } from '../../hooks/usePreferences';
import { useApp } from '../../hooks/useApp';

const PrivacyDisclaimer = () => {
    const { setShowPrivacyDisclaimer } = usePreferences();
    const { setCurrentScreen } = useApp();
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [showInstructions, setShowInstructions] = useState(true);

    const handleNext = () => {
        if (dontShowAgain) {
            setShowPrivacyDisclaimer(false);
        }
        setCurrentScreen('upload');
    };

    return (
        <div className="privacy-disclaimer-container">
            <div className="privacy-disclaimer-content">
                <h2>Welcome to YouTube Music Wrapped</h2>

                <div className="privacy-section">
                    <div
                        className="privacy-section-header"
                        onClick={() => setShowDisclaimer(!showDisclaimer)}
                    >
                        <h3>Privacy Disclaimer</h3>
                        <span className="toggle-icon">
                            {showDisclaimer ? '▼' : '▶'}
                        </span>
                    </div>
                    {showDisclaimer && (
                        <div className="privacy-section-content">
                            <p>TODO privacy disclaimer.</p>
                        </div>
                    )}
                </div>

                <div className="privacy-section">
                    <div
                        className="privacy-section-header"
                        onClick={() => setShowInstructions(!showInstructions)}
                    >
                        <h3>Instructions</h3>
                        <span className="toggle-icon">
                            {showInstructions ? '▼' : '▶'}
                        </span>
                    </div>
                    {showInstructions && (
                        <div className="privacy-section-content">
                            <ol>
                                <li>
                                    Go to{' '}
                                    <a
                                        href="https://takeout.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Google Takeout
                                    </a>
                                </li>
                                <li>
                                    Deselect all products except "YouTube and
                                    YouTube Music" (at the bottom)
                                </li>
                                <li>
                                    Click "All YouTube data included" and
                                    deselect all except "history", then click OK
                                </li>
                                <li>
                                    Click "Multiple formats" and scroll down to
                                    history, then choose "JSON" (NOT "HTML")
                                </li>
                                <li>
                                    Click "OK", then "Next step" at the bottom,
                                    and complete the export
                                </li>
                                <li>
                                    Extract the downloaded .zip file and find
                                    the watch-history.json file inside
                                </li>
                                <li>Upload the file on the next screen</li>
                            </ol>
                            <p>
                                If you have multiple files from different
                                exports, upload them all at once and we'll
                                combine them for you.
                            </p>
                        </div>
                    )}
                </div>

                <div className="privacy-controls">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        <span>Don't show this again</span>
                    </label>
                    <button className="primary-button" onClick={handleNext}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyDisclaimer;
