import React from 'react';
import './HistoryExplorer.css';

const HistoryExplorer = ({ history, visible }) => {
    return (
        <div className={`history-explorer ${visible ? 'visible' : ''}`}>
            <h2>History Explorer</h2>
            <div className="history-list">
                {history && history.map((item, index) => (
                    <div key={index} className="history-item">
                        <div className="song-artist">
                            <span className="song">{item.song}</span>
                            <span className="artist">{item.artist}</span>
                        </div>
                        <span className="timestamp">{item.timestamp}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryExplorer;
