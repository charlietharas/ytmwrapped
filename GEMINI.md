# Gemini Project Context: YouTube Music Wrapped Analyzer

## 1. Project Overview

- **Purpose:** A client-side, in-browser "YouTube Music Wrapped" application. It allows users to upload their Google Takeout history (at least one `watch-history.json` file) and visualize their listening habits without their data ever leaving their browser.
- **Core Technologies:**
    - **Frontend:** HTML, CSS, JavaScript
    - **Analysis Engine:** Python 3, running in the browser via **Pyodide**.
    - **Currently Included Libraries:** `pandas` (for data manipulation in Python), `Chart.js` (for data visualization), `noUiSlider` (for the interactive date range slider).

## 2. Core Architecture: "Process Once, Filter Dynamically"

- **Initial Analysis (`perform_initial_analysis` in `ytmwrapped.py`):**
    - This is the **heavy-lifting** phase. It is computationally expensive and should only be run **once** per user session (triggered by file upload).
    - **Responsibilities:**
        1.  Reads and merges one or more `watch-history.json` files.
        2.  Performs rigorous data cleaning and validation.
        3.  Creates a single, master `pandas` DataFrame containing the user's entire, cleaned listening history.
        4.  This master DataFrame is stored in a global variable within the Pyodide environment for subsequent use.

- **Dynamic Filtering (`get_stats_for_period` in `ytmwrapped.py`):**
    - This is a **lightweight, fast** function designed for real-time updates.
    - It is called every time the user adjusts the date slider.
    - **Responsibilities:**
        1.  Takes a start and end date from the JavaScript front-end.
        2.  Filters the *existing* master DataFrame to the specified date range.
        3.  Performs quick aggregations (`value_counts`, `groupby`, etc.) on the small, filtered dataset.
        4.  Returns the results to the front-end for rendering.
    - **Goal:** This function must remain as fast as possible to ensure a smooth, responsive UI. Avoid any file I/O, heavy re-computation, or complex data transformations here.

## 3. The Unique Identifier: Video ID

- To ensure data accuracy, the application uses the **YouTube video ID** as the canonical unique identifier for each song.
- This ID is parsed from the `titleUrl` field of each history entry (e.g., `...watch?v=VIDEO_ID`).
- All aggregations (top songs, repeats, weekly charts) are grouped by `video_id`.
- For display purposes, the `video_id` is mapped back to a human-readable `Artist - Title` string before being sent to the front-end.

## 4. User Flow & UI State Management

The application follows a specific, stateful user flow managed by `static/js/script.js`:

1.  **Initialization:** The page loads, Pyodide is initialized, and a "Loading Python..." indicator is shown.
2.  **Ready for Upload:** Once Pyodide is ready, the loader is hidden, and the file input is shown.
3.  **Analysis:** The user selects their file(s). This action **automatically triggers** the `perform_initial_analysis` function. The file input is hidden, and an "Analyzing..." indicator is displayed.
4.  **Display Results:** When the initial analysis is complete, the results and the interactive date slider are displayed. A "Start Over" button also appears.
5.  **Interaction:** The user can now move the slider, which triggers the fast `get_stats_for_period` function and updates the dashboard dynamically.
6.  **Reset:** The "Start Over" button resets the application to its initial state, ready for a new file upload.

## 5. Future Development & Legacy Code

- The file `original_script.py` is a legacy script from a Jupyter/Colab environment.
- It is **not used** in the live application.
- It serves as a source of inspiration for potential future features (some of which are listed below)

### User goals:
- Disclaimer section somewhere (likely a different page) to provide clear information about how data is handled
- Improved UI appearance and separation of different chart/analysis results
- Increased interactivity, such as by clicking on charts to view details
- Straightforward, visually engaging section to more directly explore watch history
- Use YouTube API and song durations for more analysis on total, average listening duration, etc.
    - User will need to input their own API key
    - Cache results locally to avoid excessive API fetches
- Use MusicBrainz API (or some other song info API) for more analysis on genre, release year, etc.
    - User will need to input their own API key
    - Cache results locally to avoid excessive API fetches
- Export report to file