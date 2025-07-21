document.addEventListener('DOMContentLoaded', (event) => {
    // === DOM Elements ===
    const historyFilesInput = document.getElementById('history-files');
    const totalVideosDiv = document.getElementById('total-videos');
    const totalArtistsDiv = document.getElementById('total-artists');
    const topSongsChartCanvas = document.getElementById('top-songs-chart');
    const topArtistsChartCanvas = document.getElementById('top-artists-chart');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsDiv = document.getElementById('results');
    const analyzingIndicator = document.getElementById('analyzing-indicator');
    const dateSlider = document.getElementById('date-slider');
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

    // === State ===
    let pyodide;
    let topSongsChart, topArtistsChart, songsPerDayChart, songsPerHourChart, songsPerDayOfWeekChart;
    let isAnalysisComplete = false;

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
            total_videos, top_songs, top_artists, songs_per_day,
            songs_per_hour, songs_per_day_of_week, top_songs_weekly, top_songs_monthly
        } = results;

        const allSongs = Object.entries(top_songs).sort((a, b) => b[1] - a[1]);
        const allArtists = Object.entries(top_artists).sort((a, b) => b[1] - a[1]);

        allSongsData = allSongs;
        allArtistsData = allArtists;

        totalVideosDiv.textContent = `Total songs: ${total_videos}`;
        totalArtistsDiv.textContent = `Total artists: ${allArtists.length}`;

        const top20Songs = allSongs.slice(0, 20);
        const top20Artists = allArtists.slice(0, 20);

        updateChart(topSongsChart, top20Songs.map(item => item[0]), top20Songs.map(item => item[1]));
        updateChart(topArtistsChart, top20Artists.map(item => item[0]), top20Artists.map(item => item[1]));
        updateChart(songsPerDayChart, Object.keys(songs_per_day), Object.values(songs_per_day));
        
        const hourLabels = Array.from({length: 24}, (_, i) => i);
        const hourData = hourLabels.map(hour => songs_per_hour[hour] || 0);
        updateChart(songsPerHourChart, hourLabels.map(h => `${h}:00`), hourData);

        const dayOfWeekLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayOfWeekData = dayOfWeekLabels.map((_, index) => songs_per_day_of_week[index] || 0);
        updateChart(songsPerDayOfWeekChart, dayOfWeekLabels, dayOfWeekData);

        renderList(allSongsList, allSongs, songSearchInput.value, 'song');
        renderList(allArtistsList, allArtists, artistSearchInput.value, 'artist');
        renderPeriodicTable('weekly-top-songs-card', top_songs_weekly, 'week');
        renderPeriodicTable('monthly-top-songs-card', top_songs_monthly, 'month');
        
        resetAndLoadHistory();
    }

    function updateChart(chart, labels, data) {
        if (!chart) return;
        chart.data.labels = labels;
        chart.data.datasets.forEach((dataset) => { dataset.data = data; });
        if (chart.config.type === 'polarArea') {
            chart.data.datasets[0].backgroundColor = generateColorPalette(labels.length);
        }
        chart.update();
    }

    function generateColorPalette(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(`hsla(${(i * 360) / count}, 70%, 70%, 0.6)`);
        }
        return colors;
    }

    function renderList(listElement, data, searchTerm, filterType) {
        if (!listElement) return;
        listElement.innerHTML = '';
        const filteredData = data.filter(item => item[0].toLowerCase().includes(searchTerm.toLowerCase()));
        filteredData.forEach(([name, count]) => {
            const li = document.createElement('li');
            li.textContent = `${name} - ${count} views`;
            li.dataset.filterValue = name;
            li.dataset.filterType = filterType;
            listElement.appendChild(li);
        });
    }

    function renderPeriodicTable(cardId, data, periodType) {
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

        const list = document.createElement('ol');

        // Function to update the list content
        function updateContent() {
            const currentPeriod = periods[currentIndex];
            const songs = [...data[currentPeriod]]
                .filter(song => song[0].toLowerCase().includes(currentSearchTerm.toLowerCase()))
                .sort((a, b) => b[1] - a[1]);
            
            dropdown.value = currentPeriod;
            list.innerHTML = ''; // Clear previous list

            if (songs.length === 0) {
                list.innerHTML = '<li>No matching songs found.</li>';
            } else {
                songs.forEach(song => {
                    const li = document.createElement('li');
                    li.dataset.song = song[0];
                    li.dataset.period = currentPeriod;
                    li.dataset.periodType = periodType;
                    li.textContent = `${song[0]} (${song[1]} plays)`;
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

        const [startTimestamp, endTimestamp] = dateSlider.noUiSlider.get(true);
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
        resetAndLoadHistory();
    }

    function removeHistoryFilter(index) {
        historyFilters.splice(index, 1);
        renderActiveFilters();
        resetAndLoadHistory();
    }

    function clearAllHistoryFilters() {
        historyFilters = [];
        renderActiveFilters();
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
        const minTimestamp = dateToTimestamp(new Date(min_date));
        const maxTimestamp = dateToTimestamp(new Date(max_date));

        if (isNaN(minTimestamp) || isNaN(maxTimestamp)) {
            alert("The date range from the history files is invalid.");
            resetApp();
            return;
        }

        dateSlider.noUiSlider.updateOptions({
            range: { min: minTimestamp, max: maxTimestamp },
            start: [minTimestamp, maxTimestamp]
        });
        
        isAnalysisComplete = true;
        await updateStatsForPeriod();
        resultsDiv.classList.remove('hidden');
        historyExplorerContainer.classList.remove('hidden');
        historyControls.classList.remove('hidden');
    }

    async function updateStatsForPeriod() {
        if (!isAnalysisComplete) return;
        const [startTimestamp, endTimestamp] = dateSlider.noUiSlider.get(true);
        const startDate = new Date(startTimestamp).toISOString();
        const endDate = new Date(endTimestamp).toISOString();

        const resultsProxy = pyodide.globals.get('get_stats_for_period')(startDate, endDate);
        const results = resultsProxy.toJs({ dict_converter: Object.fromEntries });
        resultsProxy.destroy();
        updateDashboard(results);
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

        const topChartsOptions = JSON.parse(JSON.stringify(commonOptions));
        topChartsOptions.indexAxis = 'y';
        topChartsOptions.scales.y.ticks.autoSkip = false;

        topSongsChart = new Chart(topSongsChartCanvas, { 
            type: 'bar', 
            options: topChartsOptions, 
            data: { labels: [], datasets: [{ label: 'View Count', ...barChartColors, data: [] }] } 
        });

        topArtistsChart = new Chart(topArtistsChartCanvas, { 
            type: 'bar', 
            options: topChartsOptions, 
            data: { labels: [], datasets: [{ label: 'View Count', ...barChartColors, data: [] }] } 
        });
        
        songsPerDayChart = new Chart(songsPerDayChartCanvas, { 
            type: 'bar', 
            options: { ...commonOptions }, 
            data: { labels: [], datasets: [{ label: 'Songs', ...barChartColors, data: [] }] } 
        });

        songsPerHourChart = new Chart(songsPerHourChartCanvas, { 
            type: 'polarArea', 
            options: { ...commonOptions, scales: { r: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, angleLines: { color: 'rgba(255, 255, 255, 0.1)' }, pointLabels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 14 } }, ticks: { display: false, backdropColor: 'rgba(0,0,0,0)' } } } }, 
            data: { labels: [], datasets: [{ label: 'Songs', data: [] }] } 
        });

        songsPerDayOfWeekChart = new Chart(songsPerDayOfWeekChartCanvas, { 
            type: 'bar', 
            options: { ...commonOptions }, 
            data: { labels: [], datasets: [{ label: 'Songs', ...barChartColors, data: [] }] } 
        });
    }

    // === Interactivity Setup ===
    function chartClickHandler(event, elements, chart, filterType) {
        if (elements.length > 0) {
            const elementIndex = elements[0].index;
            const label = chart.data.labels[elementIndex];
            addHistoryFilter(filterType, label);
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

        // Date slider tooltip editing
        dateSlider.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('noUi-tooltip')) {
                const handleIndex = e.target.closest('.noUi-handle').dataset.handle;
                const originalValue = timestampToDateString(dateSlider.noUiSlider.get(true)[handleIndex]);
                
                e.target.innerHTML = `<input type="date" value="${originalValue}" style="width: 100px; border: 1px solid #ccc; font-size: 12px;">`;
                const input = e.target.querySelector('input');
                input.focus();
                input.select();

                const saveChange = () => {
                    const newTimestamp = dateToTimestamp(new Date(input.value));
                    if (!isNaN(newTimestamp)) {
                        const currentValues = dateSlider.noUiSlider.get(true);
                        currentValues[handleIndex] = newTimestamp;
                        dateSlider.noUiSlider.set(currentValues);
                    }
                    // The 'set' event will trigger the tooltip to re-render, so no need to manually remove the input
                };

                input.addEventListener('change', saveChange);
                input.addEventListener('blur', saveChange);
                input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') saveChange(); });
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
            renderList(allSongsList, allSongsData, e.target.value, 'song');
        });

        artistSearchInput.addEventListener('input', (e) => {
            renderList(allArtistsList, allArtistsData, e.target.value, 'artist');
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

        noUiSlider.create(dateSlider, {
            range: { min: 0, max: 1 },
            start: [0, 1],
            connect: true,
            tooltips: [
                { to: (value) => timestampToDateString(value) },
                { to: (value) => timestampToDateString(value) }
            ]
        });
        
        dateSlider.noUiSlider.on('set', () => {
            if (isAnalysisComplete) {
                updateStatsForPeriod();
            }
        });

        createCharts();
        setupInteractivity();
        initializePyodide();
    }

    setup();
});