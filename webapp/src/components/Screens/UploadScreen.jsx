import React, { useState, useRef } from 'react';
import { usePreferences } from '../../hooks/usePreferences';

const UploadScreen = ({ onFilesSelected }) => {
  const { cachedCSV } = usePreferences();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.name.endsWith('.json') || file.name.endsWith('.csv')
    );
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    } else {
      alert('Please upload JSON or CSV files only');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleLoadPrevious = () => {
    onFilesSelected(null, true); // Signal to load from cache
  };

  return (
    <div id="file-input-container">
      {cachedCSV ? (
        <div className="upload-split-container">
          <div 
            className={`file-input-area ${isDragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              <p className="upload-icon">📤</p>
              <p className="upload-title"><strong>Upload new files</strong></p>
              <p className="upload-subtitle">
                Click to browse or drag and drop your watch-history.json or processed CSV files here.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="history-files"
              multiple
              accept=".json,.csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          <div className="upload-or-divider">OR</div>
          
          <div 
            className="file-input-area load-previous"
            onClick={handleLoadPrevious}
          >
            <div className="upload-content">
              <p className="upload-icon">📂</p>
              <p className="upload-title"><strong>Load previous report</strong></p>
              <p className="upload-subtitle">
                Continue with your cached data from the last session.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className={`file-input-area ${isDragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            <p className="upload-icon">📤</p>
            <p className="upload-title"><strong>Select your YouTube Music history file(s)</strong></p>
            <p className="upload-subtitle">
              Click to browse or drag and drop your watch-history.json files here.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            id="history-files"
            multiple
            accept=".json,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
};

export default UploadScreen;