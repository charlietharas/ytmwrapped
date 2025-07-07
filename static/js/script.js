document.addEventListener('DOMContentLoaded', (event) => {
    // DOM Elements
    const historyFilesInput = document.getElementById('history-files');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const totalVideosDiv = document.getElementById('total-videos');
    const topSongsChartCanvas = document.getElementById('top-songs-chart');
    const topArtistsChartCanvas = document.getElementById('top-artists-chart');
    const loadingIndicator = document.getElementById('loading-indicator');
    const controlsDiv = document.querySelector('.controls');
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
    
    const startOverBtn = document.createElement('button');
    startOverBtn.textContent = 'Start Over';
    startOverBtn.style.display = 'none';
    startOverBtn.style.marginTop = '1rem';

    // State
    let pyodide;
    let topSongsChart, topArtistsChart, songsPerDayChart, songsPerHourChart, songsPerDayOfWeekChart;
    let isAnalysisComplete = false;

    // Utility Functions
    function dateToTimestamp(date) {
        if (!date || isNaN(date.getTime())) return NaN;
        return date.getTime();
    }

    function timestampToDateString(ts) {
        if (isNaN(ts)) return "";
        return new Date(ts).toISOString().split('T')[0];
    }

    // --- UI Update Functions ---
    function updateDashboard(results) {
        if (results.error) {
            alert(`Analysis Error: ${results.error}`);
            totalVideosDiv.textContent = `Error: ${results.error}`;
            return;
        }

        const {
            total_videos, top_songs, top_artists, songs_per_day,
            songs_per_hour, songs_per_day_of_week, top_songs_weekly, top_songs_monthly,
            consecutive_repeats
        } = results;

        const allSongs = Object.entries(top_songs).sort((a, b) => b[1] - a[1]);
        const allArtists = Object.entries(top_artists).sort((a, b) => b[1] - a[1]);

        totalVideosDiv.textContent = `Total songs listened to: ${total_videos}`;

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

        renderList(allSongsList, allSongs, songSearchInput.value);
        renderList(allArtistsList, allArtists, artistSearchInput.value);
        renderList(document.getElementById('top-repeats-list'), consecutive_repeats, '');
        renderPeriodicTable(weeklyTopSongsDiv, top_songs_weekly);
        renderPeriodicTable(monthlyTopSongsDiv, top_songs_monthly);
    }

    function updateChart(chart, labels, data) {
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets.forEach((dataset) => {
                dataset.data = data;
            });

            // Special handling for polar area chart colors
            if (chart.config.type === 'polarArea') {
                chart.data.datasets[0].backgroundColor = generateColorPalette(labels.length);
            }

            chart.update();
        }
    }

    function generateColorPalette(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 360) / count;
            colors.push(`hsla(${hue}, 70%, 70%, 0.6)`);
        }
        return colors;
    }

    function renderList(listElement, data, searchTerm) {
        listElement.innerHTML = '';
        const filteredData = data.filter(item => item[0].toLowerCase().includes(searchTerm.toLowerCase()));
        filteredData.forEach(([name, count]) => {
            const li = document.createElement('li');
            li.textContent = `${name} - ${count} views`;
            listElement.appendChild(li);
        });
    }

    function renderPeriodicTable(container, data) {
        container.innerHTML = '';
        const periods = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
        if (periods.length === 0) return;

        const navigationDiv = document.createElement('div');
        navigationDiv.style.display = 'flex';
        navigationDiv.style.alignItems = 'center';
        navigationDiv.style.gap = '1rem';
        navigationDiv.style.marginBottom = '1rem';

        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        const nextButton = document.createElement('button');
        nextButton.textContent = '→';
        const dropdown = document.createElement('select');
        dropdown.style.flex = '1';
        const contentDiv = document.createElement('div');
        contentDiv.style.minHeight = '200px';

        let currentIndex = periods.length - 1;

        function updateContent() {
            const currentPeriod = periods[currentIndex];
            const songs = [...data[currentPeriod]].sort((a, b) => b[1] - a[1]);
            dropdown.value = currentPeriod;
            contentDiv.innerHTML = `<h4 style="margin-top: 0; margin-bottom: 1rem; color: #666;">${currentPeriod}</h4><ol style="margin: 0; padding-left: 2rem;">${songs.map(song => `<li>${song[0]} (${song[1]} plays)</li>`).join('')}</ol>`;
            prevButton.disabled = currentIndex === 0;
            nextButton.disabled = currentIndex === periods.length - 1;
        }

        periods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = period;
            dropdown.appendChild(option);
        });

        prevButton.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateContent(); } });
        nextButton.addEventListener('click', () => { if (currentIndex < periods.length - 1) { currentIndex++; updateContent(); } });
        dropdown.addEventListener('change', () => { currentIndex = periods.indexOf(dropdown.value); updateContent(); });

        navigationDiv.append(prevButton, dropdown, nextButton);
        container.append(navigationDiv, contentDiv);
        updateContent();
    }

    // --- Pyodide and Analysis Logic ---
    async function initializePyodide() {
        loadingIndicator.classList.remove('hidden');
        pyodide = await loadPyodide();
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        await micropip.install('pandas');
        const response = await fetch('ytmwrapped.py');
        const ytmwrappedCode = await response.text();
        pyodide.runPython(ytmwrappedCode);
        loadingIndicator.classList.add('hidden');
        fileInputContainer.classList.remove('hidden');
    }

    async function handleFileSelectionAndAnalyze() {
        const files = historyFilesInput.files;
        if (files.length === 0) return;

        let fullHistoryData = [];
        for (const file of files) {
            try {
                const content = await file.text();
                const history = JSON.parse(content);
                if (Array.isArray(history)) fullHistoryData.push(history);
                else console.warn(`File ${file.name} is not a valid JSON array and will be skipped.`);
            } catch (e) {
                alert(`Error reading or parsing ${file.name}: ${e.message}`);
                historyFilesInput.value = '';
                return;
            }
        }

        if (fullHistoryData.length === 0) {
            alert("No valid history files selected.");
            return;
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
        if (!min_date || !max_date) {
             alert("Could not determine a valid date range from the history files.");
             resetApp();
             return;
        }

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
        controlsDiv.classList.remove('hidden');
        startOverBtn.style.display = 'block';
    }

    async function updateStatsForPeriod() {
        if (!isAnalysisComplete) return;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        const resultsProxy = pyodide.globals.get('get_stats_for_period')(startDate, endDate);
        const results = resultsProxy.toJs({ dict_converter: Object.fromEntries });
        resultsProxy.destroy();
        updateDashboard(results);
    }
    
    function resetApp() {
        isAnalysisComplete = false;
        historyFilesInput.value = '';
        resultsDiv.classList.add('hidden');
        controlsDiv.classList.add('hidden');
        startOverBtn.style.display = 'none';
        fileInputContainer.classList.remove('hidden');
    }

    // --- Chart Initialization ---
    function createCharts() {
        topSongsChart = new Chart(topSongsChartCanvas, { type: 'bar', options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } }, maintainAspectRatio: false }, data: { labels: [], datasets: [{ label: 'View Count', data: [], backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1 }] } });
        topArtistsChart = new Chart(topArtistsChartCanvas, { type: 'bar', options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } }, maintainAspectRatio: false }, data: { labels: [], datasets: [{ label: 'View Count', data: [], backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] } });
        songsPerDayChart = new Chart(songsPerDayChartCanvas, { type: 'bar', options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }, data: { labels: [], datasets: [{ label: 'Songs', data: [], backgroundColor: 'rgba(75, 192, 192, 0.2)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] } });
        songsPerHourChart = new Chart(songsPerHourChartCanvas, { type: 'polarArea', options: { plugins: { legend: { display: false } }, scales: { r: { display: true, angleLines: { display: true }, pointLabels: { display: true, centerPointLabels: false, font: { size: 14 } }, ticks: { display: false } } } }, data: { labels: [], datasets: [{ label: 'Songs', data: [] }] } });
        songsPerDayOfWeekChart = new Chart(songsPerDayOfWeekChartCanvas, { type: 'bar', options: { scales: { y: { beginAtZero: true }, x: { ticks: { font: { size: 14 } } } }, plugins: { legend: { display: false } }, maintainAspectRatio: false }, data: { labels: [], datasets: [{ label: 'Songs', data: [], backgroundColor: 'rgba(255, 159, 64, 0.2)', borderColor: 'rgba(255, 159, 64, 1)', borderWidth: 1 }] } });
    }

    // --- Event Listeners & Initial Setup ---
    function setup() {
        const mainElement = document.querySelector('main');
        mainElement.insertBefore(startOverBtn, resultsDiv);

        historyFilesInput.addEventListener('change', handleFileSelectionAndAnalyze);
        startOverBtn.addEventListener('click', resetApp);

        songSearchInput.addEventListener('input', () => renderList(allSongsList, allSongs, songSearchInput.value));
        artistSearchInput.addEventListener('input', () => renderList(allArtistsList, allArtists, artistSearchInput.value));

        noUiSlider.create(dateSlider, {
            range: { min: 0, max: 1 }, // Dummy range
            start: [0, 1],
            connect: true,
            tooltips: [{ to: timestampToDateString }, { to: timestampToDateString }]
        });

        dateSlider.noUiSlider.on('update', (values) => {
            startDateInput.value = timestampToDateString(Number(values[0]));
            endDateInput.value = timestampToDateString(Number(values[1]));
        });
        
        dateSlider.noUiSlider.on('set', updateStatsForPeriod);

        startDateInput.addEventListener('change', () => dateSlider.noUiSlider.set([dateToTimestamp(new Date(startDateInput.value)), null]));
        endDateInput.addEventListener('change', () => dateSlider.noUiSlider.set([null, dateToTimestamp(new Date(endDateInput.value))]));

        createCharts();
        initializePyodide();
    }

    setup();
});

