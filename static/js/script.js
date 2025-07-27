document.addEventListener('DOMContentLoaded', (event) => {
    // === DOM Elements ===
    const historyFilesInput = document.getElementById('history-files');
    const totalVideosDiv = document.getElementById('total-videos');
    const totalUniqueSongsDiv = document.getElementById('total-unique-songs');
    const totalArtistsDiv = document.getElementById('total-artists');
    const filteredStatsContainer = document.getElementById('filtered-stats-container');
    const filteredVideosDiv = document.getElementById('filtered-videos');
    const filteredUniqueSongsDiv = document.getElementById('filtered-unique-songs');
    const filteredArtistsDiv = document.getElementById('filtered-artists');
    const topSongsChartCanvas = document.getElementById('top-songs-chart');
    const topArtistsChartCanvas = document.getElementById('top-artists-chart');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsDiv = document.getElementById('results');
    const analyzingIndicator = document.getElementById('analyzing-indicator');
    const songSearchInput = document.getElementById('song-search');
    const artistSearchInput = document.getElementById('artist-search');
    const allSongsList = document.getElementById('all-songs-list');
    const allArtistsList = document.getElementById('all-artists-list');
    const songsPerDayChartCanvas = document.getElementById('songs-per-day-chart');
    const songsPerHourChartCanvas = document.getElementById('songs-per-hour-chart');
    const songsPerDayOfWeekChartCanvas = document.getElementById('songs-per-day-of-week-chart');
    const weeklyTopSongsDiv = document.getElementById('weekly-top-songs');
    const monthlyTopSongsDiv = document.getElementById('monthly-top-songs');
    const fileInputContainer = document.getElementById('file-input-container');
    
    // History Explorer Elements
    const historyExplorerContainer = document.getElementById('history-explorer-container');
    const historyListWrapper = document.getElementById('history-list-wrapper');
    const historyList = document.getElementById('history-list');
    const historySearchInput = document.getElementById('history-search');
    const historyControls = document.querySelector('.history-controls');
    const activeFilterContainer = document.getElementById('active-filter-container');
    const filterManagementContainer = document.getElementById('filter-management-container');
    const zoomToggleBtn = document.getElementById('zoom-toggle-btn');
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    const timelineDateDisplay = document.getElementById('timeline-date-display');

    // === State ===
    let pyodide;
    let topSongsChart, topArtistsChart, songsPerDayChart, songsPerHourChart, songsPerDayOfWeekChart;
    let isAnalysisComplete = false;

    // Date range state
    let totalMinTimestamp, totalMaxTimestamp;
    let filterStartTimestamp, filterEndTimestamp;

    // History Explorer State
    let historyCurrentPage = 1;
    let historyHasMore = true;
    let historyIsLoading = false;
    let historySearchTerm = '';
    let historyDebounceTimer;
    let historyFilters = []; // Changed to an array for stacking
    const HISTORY_PAGE_SIZE = 75;
    const MAX_HISTORY_ITEMS = 450;
    let allSongsData = [], allArtistsData = [];

    // === Utility Functions ===
    const dateToTimestamp = (date) => date && !isNaN(date.getTime()) ? date.getTime() : NaN;
    const timestampToDateString = (ts) => isNaN(ts) ? "" : new Date(ts).toISOString().split('T')[0];

    // === UI Update Functions ===
    function updateDashboard(results) {
        if (results.error) {
            alert(`Analysis Error: ${results.error}`);
            totalVideosDiv.textContent = `Error: ${results.error}`;
            return;
        }

        const {
            total_videos, unique_songs, total_artists,
            filtered_videos, filtered_unique_songs, filtered_artists,
            has_active_filters,
            top_songs, top_artists, songs_per_day,
            top_songs_stacked, top_artists_stacked, 
            songs_per_hour_stacked, songs_per_day_of_week_stacked,
            songs_per_day_stacked,
            top_songs_weekly, top_songs_monthly
        } = results;

        const allSongs = Object.entries(top_songs)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count], index) => ({ name, count, rank: index + 1 }));
        
        const allArtists = Object.entries(top_artists)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count], index) => ({ name, count, rank: index + 1 }));

        allSongsData = allSongs;
        allArtistsData = allArtists;

        totalVideosDiv.textContent = `Total Plays: ${total_videos.toLocaleString()}`;
        totalUniqueSongsDiv.textContent = `Unique Songs: ${unique_songs.toLocaleString()}`;
        totalArtistsDiv.textContent = `Unique Artists: ${total_artists.toLocaleString()}`;

        if (has_active_filters) {
            filteredVideosDiv.textContent = `Plays in Filter: ${filtered_videos.toLocaleString()}`;
            filteredUniqueSongsDiv.textContent = `Unique Songs in Filter: ${filtered_unique_songs.toLocaleString()}`;
            filteredArtistsDiv.textContent = `Unique Artists in Filter: ${filtered_artists.toLocaleString()}`;
            filteredStatsContainer.classList.remove('hidden');
        } else {
            filteredStatsContainer.classList.add('hidden');
        }

        // --- Update Charts ---
        const isFiltered = historyFilters.length > 0;
        
        // Update stacked charts
        updateStackedChart(topSongsChart, top_songs_stacked, 20, isFiltered);
        updateStackedChart(topArtistsChart, top_artists_stacked, 20, isFiltered);
        updateStackedChart(songsPerHourChart, songs_per_hour_stacked, 24, isFiltered);
        updateStackedChart(songsPerDayOfWeekChart, songs_per_day_of_week_stacked, 7, isFiltered);
        
        // Special handling for the timeline chart
        if (isFiltered) {
            updateStackedChart(songsPerDayChart, songs_per_day_stacked, songs_per_day_stacked.labels.length, isFiltered);
        } else {
            const songsPerDayLabels = Object.keys(songs_per_day);
            const songsPerDayData = Object.values(songs_per_day);
            const accentColor = 'rgba(187, 134, 252, 1)';
            const accentBgColor = 'rgba(187, 134, 252, 0.2)';
            const greyColor = 'rgba(100, 100, 100, 0.5)';
            const greyBgColor = 'rgba(100, 100, 100, 0.2)';

            const songsPerDayBarColors = songsPerDayLabels.map(dateStr => {
                const timestamp = dateToTimestamp(new Date(dateStr));
                return (timestamp >= filterStartTimestamp && timestamp <= filterEndTimestamp) ? accentBgColor : greyBgColor;
            });
            const songsPerDayBorderColors = songsPerDayLabels.map(dateStr => {
                const timestamp = dateToTimestamp(new Date(dateStr));
                return (timestamp >= filterStartTimestamp && timestamp <= filterEndTimestamp) ? accentColor : greyColor;
            });
            
            // Ensure it's a single dataset for the non-stacked view
            songsPerDayChart.data.labels = songsPerDayLabels;
            songsPerDayChart.data.datasets = [{
                label: 'Total',
                data: songsPerDayData,
                backgroundColor: songsPerDayBarColors,
                borderColor: songsPerDayBorderColors,
                borderWidth: 1
            }];
            songsPerDayChart.update();
        }

        renderList(allSongsList, allSongs, songSearchInput.value, 'song', historyFilters);
        renderList(allArtistsList, allArtists, artistSearchInput.value, 'artist', historyFilters);
        renderPeriodicTable('weekly-top-songs-card', top_songs_weekly, 'week', historyFilters);
        renderPeriodicTable('monthly-top-songs-card', top_songs_monthly, 'month', historyFilters);
        
        resetAndLoadHistory();
    }

    function updateStackedChart(chart, stackedData, slice, isFiltered) {
        if (!chart) return;

        const redColor = 'rgba(207, 102, 121, 1)';
        const greyColor = 'rgba(100, 100, 100, 0.5)';
        const accentColor = 'rgba(187, 134, 252, 1)';

        if (isFiltered) {
            chart.data.labels = stackedData.labels.slice(0, slice);
            chart.data.datasets = [
                {
                    label: 'Filtered',
                    data: stackedData.datasets[0].data.slice(0, slice),
                    backgroundColor: redColor,
                    borderColor: redColor,
                    borderWidth: 1
                },
                {
                    label: 'Other',
                    data: stackedData.datasets[1].data.slice(0, slice),
                    backgroundColor: greyColor,
                    borderColor: greyColor,
                    borderWidth: 1
                }
            ];
        } else {
            // If not filtered, show a normal, non-stacked chart with a single dataset
            const combinedData = stackedData.datasets[0].data.map((d, i) => d + stackedData.datasets[1].data[i]);
            chart.data.labels = stackedData.labels.slice(0, slice);
            chart.data.datasets = [{
                label: 'Total',
                data: combinedData.slice(0, slice),
                backgroundColor: accentColor,
                borderColor: accentColor,
                borderWidth: 1
            }];
        }
        
        if (chart.config.type === 'polarArea' && !isFiltered) {
            chart.data.datasets[0].backgroundColor = generateColorPalette(chart.data.labels.length, 'accent');
        }

        chart.update();
    }

    function updateChart(chart, labels, data, options = {}) {
        if (!chart) return;
        chart.data.labels = labels;
        // This function is now only for the timeline chart, which has one dataset
        chart.data.datasets[0].data = data; 
        if (options.barColors) {
            chart.data.datasets[0].backgroundColor = options.barColors;
            chart.data.datasets[0].borderColor = options.borderColors;
        }
        chart.update();
    }

    function generateColorPalette(count, theme = 'accent') {
        const colors = [];
        for (let i = 0; i < count; i++) {
            if (theme === 'red') {
                colors.push(`hsla(0, 50%, ${70 - (i * 2)}, 0.6)`);
            } else if (theme === 'grey') {
                colors.push(`hsla(0, 0%, ${50 - (i * 2)}, 0.4)`);
            } else {
                colors.push(`hsla(${(i * 360) / count}, 70%, 70%, 0.6)`);
            }
        }
        return colors;
    }

    function renderList(listElement, data, searchTerm, filterType, activeFilters = []) {
        if (!listElement) return;
        listElement.innerHTML = '';
        const filteredData = data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const activeSongFilters = activeFilters.filter(f => f.type === 'song').map(f => f.value);
        const activeArtistFilters = activeFilters.filter(f => f.type === 'artist').map(f => f.value);
        const artistsFromSongFilters = activeSongFilters.map(songName => songName.split(' - ')[0]);

        filteredData.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.rank}. ${item.name} - ${item.count} views`;
            li.dataset.filterValue = item.name;
            li.dataset.filterType = filterType;

            // Add highlighting
            const artistName = filterType === 'song' ? item.name.split(' - ')[0] : item.name;
            if (
                (filterType === 'song' && activeSongFilters.includes(item.name)) ||
                (activeArtistFilters.includes(artistName)) ||
                (filterType === 'artist' && artistsFromSongFilters.includes(item.name))
            ) {
                li.classList.add('highlighted');
            }

            listElement.appendChild(li);
        });
    }

    function renderPeriodicTable(cardId, data, periodType, activeFilters) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const navContainer = card.querySelector('.card-header-controls');
        const contentContainer = card.querySelector('.card-content');
        contentContainer.innerHTML = ''; // Clear previous content

        // Add the description
        const description = document.createElement('p');
        description.className = 'card-description';
        description.textContent = `Your top track for each ${periodType}.`;
        contentContainer.appendChild(description);

        const periods = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
        if (periods.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No data for this period.';
            contentContainer.appendChild(p);
            // Ensure nav is cleared even if there's no data
            if (navContainer) navContainer.innerHTML = '';
            return;
        }

        let currentIndex = periods.length - 1;
        let currentSearchTerm = '';

        // Create main elements
        const navigationDiv = document.createElement('div');
        navigationDiv.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        prevButton.style.padding = '0.5rem';

        const nextButton = document.createElement('button');
        nextButton.textContent = '→';
        nextButton.style.padding = '0.5rem';

        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'select-wrapper';
        selectWrapper.style.flex = '1';
        const dropdown = document.createElement('select');
        
        const listWrapper = document.createElement('div');
        listWrapper.className = 'list-wrapper';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter songs...';

        const list = document.createElement('ul');

        // Function to update the list content
        function updateContent() {
            const currentPeriod = periods[currentIndex];
            
            const rankedSongs = [...data[currentPeriod]]
                .sort((a, b) => b[1] - a[1])
                .map((song, index) => ({ name: song[0], count: song[1], rank: index + 1 }));

            const filteredSongs = rankedSongs
                .filter(song => song.name.toLowerCase().includes(currentSearchTerm.toLowerCase()));
            
            dropdown.value = currentPeriod;
            list.innerHTML = ''; // Clear previous list

            const activeSongFilters = activeFilters.filter(f => f.type === 'song').map(f => f.value);
            const activeArtistFilters = activeFilters.filter(f => f.type === 'artist').map(f => f.value);

            if (filteredSongs.length === 0) {
                // Do nothing, leave the list empty
            } else {
                filteredSongs.forEach(song => {
                    const li = document.createElement('li');
                    const songName = song.name;
                    const artistName = songName.split(' - ')[0];

                    li.dataset.song = songName;
                    li.dataset.period = currentPeriod;
                    li.dataset.periodType = periodType;
                    li.textContent = `${song.rank}. ${songName} (${song.count} plays)`;

                    if (
                        activeSongFilters.includes(songName) ||
                        activeArtistFilters.includes(artistName)
                    ) {
                        li.classList.add('highlighted');
                    }

                    list.appendChild(li);
                });
            }

            prevButton.disabled = currentIndex === 0;
            nextButton.disabled = currentIndex === periods.length - 1;
        }

        // Populate dropdown
        periods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = period;
            dropdown.appendChild(option);
        });

        // Event Listeners
        prevButton.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateContent(); } });
        nextButton.addEventListener('click', () => { if (currentIndex < periods.length - 1) { currentIndex++; updateContent(); } });
        dropdown.addEventListener('change', () => { currentIndex = periods.indexOf(dropdown.value); updateContent(); });
        searchInput.addEventListener('input', (e) => { currentSearchTerm = e.target.value; updateContent(); });

        // Assemble the component
        selectWrapper.appendChild(dropdown);
        navigationDiv.append(prevButton, selectWrapper, nextButton);
        navContainer.innerHTML = ''; // Clear old nav
        navContainer.appendChild(navigationDiv);

        listWrapper.append(searchInput, list);
        contentContainer.appendChild(listWrapper);
        
        // Initial render
        updateContent();
    }

    // === History Explorer Functions ===
    async function fetchHistoryPage(page) {
        if (!isAnalysisComplete || historyIsLoading || !historyHasMore) return;
        historyIsLoading = true;

        const { min: startTimestamp, max: endTimestamp } = songsPerDayChart.scales.x;
        const startDate = new Date(startTimestamp).toISOString();
        const endDate = new Date(endTimestamp).toISOString();

        const filtersJson = JSON.stringify(historyFilters);
        const resultsProxy = pyodide.globals.get('get_filtered_history')(
            startDate, endDate, page, HISTORY_PAGE_SIZE, 
            historySearchTerm, filtersJson
        );
        const results = resultsProxy.toJs({ dict_converter: Object.fromEntries });
        resultsProxy.destroy();

        if (results.error) {
            console.error("History fetch error:", results.error);
            historyHasMore = false;
            historyIsLoading = false;
            return;
        }

        const { history, total_items } = results;

        if (page === 1) {
            historyList.innerHTML = '';
        }

        while (historyList.children.length > MAX_HISTORY_ITEMS) {
            historyList.removeChild(historyList.firstChild);
        }

        if (history.length === 0) {
            historyHasMore = false;
            if (page === 1) {
                historyList.innerHTML = '<li>No history found for this period or filter.</li>';
            }
        } else {
            const fragment = document.createDocumentFragment();
            history.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${item.artist_title}</strong><br><small>${item.time}</small>`;
                fragment.appendChild(li);
            });
            historyList.appendChild(fragment);
            historyCurrentPage++;
            historyHasMore = historyList.children.length < total_items;
        }
        historyIsLoading = false;
    }

    function resetAndLoadHistory() {
        historyList.innerHTML = '';
        historyCurrentPage = 1;
        historyHasMore = true;
        historyIsLoading = false;
        historyListWrapper.scrollTop = 0;
        fetchHistoryPage(1);
    }

    function renderActiveFilters() {
        activeFilterContainer.innerHTML = '';
        if (historyFilters.length > 0) {
            filterManagementContainer.classList.remove('hidden');
            historyFilters.forEach((filter, index) => {
                let displayValue = filter.value;
                if (filter.type === 'song_in_period') {
                    const parsed = JSON.parse(filter.value);
                    displayValue = `${parsed.song} (${parsed.period})`;
                }
                const filterTag = document.createElement('div');
                filterTag.className = 'active-filter';
                filterTag.innerHTML = `<span>${displayValue}</span><button data-index="${index}" title="Remove filter">&times;</button>`;
                activeFilterContainer.appendChild(filterTag);
            });
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clear-all-filters-btn';
            clearBtn.title = 'Clear all filters';
            clearBtn.innerHTML = '&times;';
            clearBtn.className = 'clear-all-filters-btn';
            activeFilterContainer.appendChild(clearBtn);
        } else {
            filterManagementContainer.classList.add('hidden');
        }
    }

    function addHistoryFilter(type, value) {
        // Prevent adding duplicate filters
        const exists = historyFilters.some(f => f.type === type && f.value === value);
        if (exists) return;

        historyFilters.push({ type, value });
        historySearchInput.value = '';
        historySearchTerm = '';
        
        renderActiveFilters();
        updateStatsForPeriod(filterStartTimestamp, filterEndTimestamp);
        resetAndLoadHistory();
    }

    function removeHistoryFilter(index) {
        historyFilters.splice(index, 1);
        renderActiveFilters();
        updateStatsForPeriod(filterStartTimestamp, filterEndTimestamp);
        resetAndLoadHistory();
    }

    function clearAllHistoryFilters() {
        historyFilters = [];
        renderActiveFilters();
        updateStatsForPeriod(filterStartTimestamp, filterEndTimestamp);
        resetAndLoadHistory();
    }

    // === Pyodide and Analysis Logic ===
    async function initializePyodide() {
        loadingIndicator.classList.remove('hidden');
        fileInputContainer.classList.add('hidden');
        analyzingIndicator.classList.add('hidden');
        historyExplorerContainer.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        try {
            pyodide = await loadPyodide();
            await pyodide.loadPackage("micropip");
            const micropip = pyodide.pyimport("micropip");
            await micropip.install('pandas');
            const response = await fetch('ytmwrapped.py');
            const ytmwrappedCode = await response.text();
            pyodide.runPython(ytmwrappedCode);
            loadingIndicator.classList.add('hidden');
            fileInputContainer.classList.remove('hidden');
        } catch (error) {
            console.error("Pyodide initialization failed:", error);
            loadingIndicator.innerHTML = "<p>Failed to load Python environment. Please refresh the page.</p>";
        }
    }

    async function handleFileSelectionAndAnalyze() {
        const files = historyFilesInput.files;
        if (files.length === 0) return;

        let fullHistoryData = [];
        for (const file of files) {
            try {
                const content = await file.text();
                fullHistoryData.push(JSON.parse(content));
            } catch (e) {
                alert(`Error reading or parsing ${file.name}: ${e.message}`);
                return;
            }
        }

        fileInputContainer.classList.add('hidden');
        analyzingIndicator.classList.remove('hidden');
        await new Promise(resolve => setTimeout(resolve, 100));

        const initialResultsProxy = pyodide.globals.get('perform_initial_analysis')(fullHistoryData);
        const initialResults = initialResultsProxy.toJs({ dict_converter: Object.fromEntries });
        initialResultsProxy.destroy();

        analyzingIndicator.classList.add('hidden');

        if (initialResults.error) {
            alert(`Initial Analysis Error: ${initialResults.error}`);
            resetApp();
            return;
        }

        const { min_date, max_date } = initialResults;
        totalMinTimestamp = dateToTimestamp(new Date(min_date));
        totalMaxTimestamp = dateToTimestamp(new Date(max_date));
        filterStartTimestamp = totalMinTimestamp;
        filterEndTimestamp = totalMaxTimestamp;

        if (isNaN(totalMinTimestamp) || isNaN(totalMaxTimestamp)) {
            alert("The date range from the history files is invalid.");
            resetApp();
            return;
        }

        songsPerDayChart.options.scales.x.min = totalMinTimestamp;
        songsPerDayChart.options.scales.x.max = totalMaxTimestamp;
        
        isAnalysisComplete = true;
        resultsDiv.classList.remove('hidden');
        historyExplorerContainer.classList.remove('hidden');
        historyControls.classList.remove('hidden');
        await updateStatsForPeriod(totalMinTimestamp, totalMaxTimestamp);
    }

    async function updateStatsForPeriod(startTimestamp, endTimestamp) {
        if (!isAnalysisComplete) return;

        filterStartTimestamp = startTimestamp;
        filterEndTimestamp = endTimestamp;

        const startDate = new Date(startTimestamp).toISOString();
        const endDate = new Date(endTimestamp).toISOString();
        const filtersJson = JSON.stringify(historyFilters);

        // Update annotations to show the greyed-out areas
        if (songsPerDayChart.options.plugins.annotation) {
            songsPerDayChart.options.plugins.annotation.annotations.leftBox.xMax = startTimestamp;
            songsPerDayChart.options.plugins.annotation.annotations.rightBox.xMin = endTimestamp;
        }
        
        // When a new filter is applied, always reset the zoom to the full view
        songsPerDayChart.options.scales.x.min = totalMinTimestamp;
        songsPerDayChart.options.scales.x.max = totalMaxTimestamp;

        songsPerDayChart.update('none');
        updateChartControlButtons();

        const resultsProxy = pyodide.globals.get('get_stats_for_period')(startDate, endDate, filtersJson);
        const results = resultsProxy.toJs({ dict_converter: Object.fromEntries });
        resultsProxy.destroy();
        updateDashboard(results);
    }

    function updateChartControlButtons() {
        const isFiltered = filterStartTimestamp > totalMinTimestamp || filterEndTimestamp < totalMaxTimestamp;

        // Update date range display
        const formatDate = (ts) => new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        if (isFiltered) {
            timelineDateDisplay.textContent = `${formatDate(filterStartTimestamp)} – ${formatDate(filterEndTimestamp)}`;
        } else {
            timelineDateDisplay.textContent = `Full Range: ${formatDate(totalMinTimestamp)} – ${formatDate(totalMaxTimestamp)}`;
        }

        if (!isFiltered) {
            zoomToggleBtn.classList.add('hidden');
            clearFilterBtn.classList.add('hidden');
            return;
        }

        // If a filter is active, show the buttons
        zoomToggleBtn.classList.remove('hidden');
        clearFilterBtn.classList.remove('hidden');

        // --- Configure Clear Button ---
        clearFilterBtn.innerHTML = '&#x21BA;'; // Restart arrow icon
        clearFilterBtn.title = 'Clear Filter';
        clearFilterBtn.onclick = () => {
            updateStatsForPeriod(totalMinTimestamp, totalMaxTimestamp);
        };

        // --- Configure Zoom Button ---
        const chart = songsPerDayChart;
        const isZoomedIn = chart.scales.x.min > totalMinTimestamp || chart.scales.x.max < totalMaxTimestamp;

        if (isZoomedIn) {
            zoomToggleBtn.innerHTML = '&#x2194;'; // Zoom Out icon (expand)
            zoomToggleBtn.title = 'Zoom Out';
            zoomToggleBtn.onclick = () => {
                chart.options.scales.x.min = totalMinTimestamp;
                chart.options.scales.x.max = totalMaxTimestamp;
                chart.update();
                updateChartControlButtons(); // Update button state after action
            };
        } else {
            zoomToggleBtn.innerHTML = '&#x2922;'; // Zoom In icon (focus)
            zoomToggleBtn.title = 'Zoom to Selection';
            zoomToggleBtn.onclick = () => {
                chart.options.scales.x.min = filterStartTimestamp;
                chart.options.scales.x.max = filterEndTimestamp;
                chart.update();
                updateChartControlButtons(); // Update button state after action
            };
        }
    }
    
    function resetApp() {
        isAnalysisComplete = false;
        historyFilesInput.value = '';
        resultsDiv.classList.add('hidden');
        historyExplorerContainer.classList.add('hidden');
        historyControls.classList.add('hidden');
        filterManagementContainer.classList.add('hidden');
        
        loadingIndicator.classList.add('hidden');
        analyzingIndicator.classList.add('hidden');
        fileInputContainer.classList.remove('hidden');

        historyList.innerHTML = '';
        historySearchInput.value = '';
        historyFilters = [];
        renderActiveFilters();
    }

    // === Chart Initialization ===
    function createCharts() {
        const commonOptions = { 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    bodyFont: { size: 14 },
                    titleFont: { size: 16 }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        };

        const barChartColors = {
            backgroundColor: 'rgba(187, 134, 252, 0.2)',
            borderColor: 'rgba(187, 134, 252, 1)',
            borderWidth: 1
        };

        // Create independent options objects for each chart to prevent conflicts
        const topSongsOptions = JSON.parse(JSON.stringify(commonOptions));
        topSongsOptions.indexAxis = 'y';
        topSongsOptions.scales.y.ticks.autoSkip = false;
        topSongsOptions.scales.x.stacked = true;
        topSongsOptions.scales.y.stacked = true;

        const topArtistsOptions = JSON.parse(JSON.stringify(commonOptions));
        topArtistsOptions.indexAxis = 'y';
        topArtistsOptions.scales.y.ticks.autoSkip = false;
        topArtistsOptions.scales.x.stacked = true;
        topArtistsOptions.scales.y.stacked = true;

        topSongsChart = new Chart(topSongsChartCanvas, { 
            type: 'bar', 
            options: topSongsOptions, 
            data: { labels: [], datasets: [] } 
        });

        topArtistsChart = new Chart(topArtistsChartCanvas, { 
            type: 'bar', 
            options: topArtistsOptions, 
            data: { labels: [], datasets: [] } 
        });
        
        songsPerDayChart = new Chart(songsPerDayChartCanvas, { 
            type: 'bar', 
            options: { 
                ...commonOptions,
                scales: {
                    x: {
                        ...commonOptions.scales.x,
                        type: 'time',
                        time: {
                            unit: 'month',
                            tooltipFormat: 'MMM dd, yyyy',
                            displayFormats: {
                                year: 'yyyy',
                                month: 'MMM'
                            }
                        },
                        ticks: {
                            ...commonOptions.scales.x.ticks,
                            major: {
                                enabled: true, // This will highlight year ticks
                            },
                            font: function(context) {
                                if (context.tick && context.tick.major) {
                                    return { weight: 'bold' };
                                }
                            }
                        },
                        min: new Date().setFullYear(new Date().getFullYear() - 1), // Default
                        max: new Date(), // Default
                    },
                    y: { 
                        ...commonOptions.scales.y,
                        stacked: true 
                    }
                },
                plugins: {
                    ...commonOptions.plugins,
                    annotation: {
                        drawTime: 'afterDatasetsDraw',
                        annotations: {
                            // This will be the selection box drawn by the user
                            selectionBox: {
                                type: 'box',
                                display: false,
                                xMin: 0,
                                xMax: 0,
                                backgroundColor: 'rgba(187, 134, 252, 0.2)',
                                borderColor: 'rgba(187, 134, 252, 1)',
                                borderWidth: 1,
                            },
                            // These create the greyed-out areas
                            leftBox: {
                                type: 'box',
                                xMin: -Infinity,
                                xMax: 0, // Placeholder
                                backgroundColor: 'rgba(100, 100, 100, 0.2)',
                                borderColor: 'rgba(100, 100, 100, 0.0)',
                            },
                            rightBox: {
                                type: 'box',
                                xMin: 0, // Placeholder
                                xMax: Infinity,
                                backgroundColor: 'rgba(100, 100, 100, 0.2)',
                                borderColor: 'rgba(100, 100, 100, 0.0)',
                            }
                        }
                    }
                }
            }, 
            data: { labels: [], datasets: [{ label: 'Songs', ...barChartColors, data: [] }] } 
        });

        const polarAreaOptions = { ...commonOptions, scales: { r: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, angleLines: { color: 'rgba(255, 255, 255, 0.1)' }, pointLabels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 14 } }, ticks: { display: false, backdropColor: 'rgba(0,0,0,0)' } } } };
        polarAreaOptions.scales.r.stacked = true;

        songsPerHourChart = new Chart(songsPerHourChartCanvas, { 
            type: 'polarArea', 
            options: polarAreaOptions, 
            data: { labels: [], datasets: [] } 
        });

        const dayOfWeekOptions = { ...commonOptions };
        dayOfWeekOptions.scales.x.stacked = true;
        dayOfWeekOptions.scales.y.stacked = true;

        songsPerDayOfWeekChart = new Chart(songsPerDayOfWeekChartCanvas, { 
            type: 'bar', 
            options: dayOfWeekOptions, 
            data: { labels: [], datasets: [] } 
        });
    }

    // === Interactivity Setup ===
    function chartClickHandler(event, elements, chart, defaultFilterType) {
        if (elements.length > 0) {
            const elementIndex = elements[0].index;
            const label = chart.data.labels[elementIndex];
            addHistoryFilter(defaultFilterType, label);
        }
    }

    function setupInteractivity() {
        // Chart clicks
        topSongsChart.options.onClick = (e, el) => chartClickHandler(e, el, topSongsChart, 'song');
        topArtistsChart.options.onClick = (e, el) => chartClickHandler(e, el, topArtistsChart, 'artist');
        songsPerDayChart.options.onClick = (e, el) => chartClickHandler(e, el, songsPerDayChart, 'day');
        songsPerHourChart.options.onClick = (e, el) => chartClickHandler(e, el, songsPerHourChart, 'hour');
        songsPerDayOfWeekChart.options.onClick = (e, el) => chartClickHandler(e, el, songsPerDayOfWeekChart, 'dayofweek');

        // Delegated list clicks
        document.getElementById('results').addEventListener('click', (e) => {
            const target = e.target.closest('li');
            if (!target) return;

            const { filterType, filterValue, song, period, periodType } = target.dataset;

            if (filterType && filterValue) {
                addHistoryFilter(filterType, filterValue);
            } else if (song && period && periodType) {
                const value = JSON.stringify({ song, period, period_type: periodType });
                addHistoryFilter('song_in_period', value);
            }
        });

        // Clear filter buttons
        activeFilterContainer.addEventListener('click', (e) => {
            if (e.target.id === 'clear-all-filters-btn') {
                clearAllHistoryFilters();
            } else if (e.target.closest('.active-filter button')) {
                const index = parseInt(e.target.dataset.index, 10);
                removeHistoryFilter(index);
            }
        });
    }

    // === Event Listeners & Initial Setup ===
    function setup() {
        historyFilesInput.addEventListener('change', handleFileSelectionAndAnalyze);
        
        const startOverButtonInHeader = document.createElement('button');
        startOverButtonInHeader.textContent = "Start Over";
        document.getElementById('header-controls').appendChild(startOverButtonInHeader);
        startOverButtonInHeader.addEventListener('click', resetApp);


        songSearchInput.addEventListener('input', (e) => {
            renderList(allSongsList, allSongsData, e.target.value, 'song', historyFilters);
        });

        artistSearchInput.addEventListener('input', (e) => {
            renderList(allArtistsList, allArtistsData, e.target.value, 'artist', historyFilters);
        });

        historySearchInput.addEventListener('input', (e) => {
            clearTimeout(historyDebounceTimer);
            historyDebounceTimer = setTimeout(() => {
                historySearchTerm = e.target.value;
                resetAndLoadHistory();
            }, 300);
        });

        historyListWrapper.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = historyListWrapper;
            if (scrollHeight - scrollTop - clientHeight < 200) {
                fetchHistoryPage(historyCurrentPage);
            }
        });

        // Manual drag-to-select logic
        let isDragging = false;
        let selectionStartValue = null;

        songsPerDayChartCanvas.addEventListener('mousedown', (e) => {
            const rect = songsPerDayChartCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const chart = songsPerDayChart;
            const xScale = chart.scales.x;
            
            // Check if click is within the chart area
            if (x >= xScale.left && x <= xScale.right) {
                isDragging = true;
                selectionStartValue = xScale.getValueForPixel(x);
                
                // Initialize selection box
                const selectionBox = chart.options.plugins.annotation.annotations.selectionBox;
                selectionBox.display = true;
                selectionBox.xMin = selectionStartValue;
                selectionBox.xMax = selectionStartValue;
                chart.update('none');
            }
        });

        songsPerDayChartCanvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const rect = songsPerDayChartCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const chart = songsPerDayChart;
                const xScale = chart.scales.x;
                const currentValue = xScale.getValueForPixel(x);

                // Update selection box
                const selectionBox = chart.options.plugins.annotation.annotations.selectionBox;
                selectionBox.xMax = currentValue;
                chart.update('none');
            }
        });

        songsPerDayChartCanvas.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                const chart = songsPerDayChart;
                const selectionBox = chart.options.plugins.annotation.annotations.selectionBox;
                selectionBox.display = false;

                let start = selectionBox.xMin;
                let end = selectionBox.xMax;

                // Ensure start is before end
                if (start > end) {
                    [start, end] = [end, start];
                }

                // If selection is valid (not just a click)
                if (start !== end) {
                    updateStatsForPeriod(start, end);
                }
                chart.update('none');
            }
        });

        createCharts();
        setupInteractivity();
        initializePyodide();
    }

    setup();
});