document.addEventListener('DOMContentLoaded', (event) => {
    const historyFilesInput = document.getElementById('history-files');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const analyzeBtn = document.getElementById('analyze-btn');
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

    let pyodide;
    let topSongsChart, topArtistsChart, songsPerDayChart, songsPerHourChart, songsPerDayOfWeekChart;
    let fullHistoryData = [];
    let allSongs = [];
    let allArtists = [];

    function dateStringToTimestamp(str) {
        if (!str) return NaN;
        return new Date(str + 'T00:00:00Z').getTime();
    }

    function timestampToDateString(ts) {
        if (isNaN(ts)) return "";
        return new Date(ts).toISOString().split('T')[0];
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = dateStringToTimestamp(`${currentYear}-01-01`);
    const endOfYear = dateStringToTimestamp(`${currentYear}-12-31`);

    noUiSlider.create(dateSlider, {
        range: { min: startOfYear, max: endOfYear },
        start: [startOfYear, endOfYear],
        connect: true,
        tooltips: [
            { to: value => timestampToDateString(Number(value)) },
            { to: value => timestampToDateString(Number(value)) }
        ]
    });

    dateSlider.noUiSlider.on('update', (values, handle) => {
        startDateInput.value = timestampToDateString(Number(values[0]));
        endDateInput.value = timestampToDateString(Number(values[1]));
    });

    startDateInput.addEventListener('change', () => dateSlider.noUiSlider.set([dateStringToTimestamp(startDateInput.value), null]));
    endDateInput.addEventListener('change', () => dateSlider.noUiSlider.set([null, dateStringToTimestamp(endDateInput.value)]));

    historyFilesInput.addEventListener('change', async () => {
        const files = historyFilesInput.files;
        if (files.length === 0) return;

        fullHistoryData = [];
        let minDate = new Date('2999-12-31'), maxDate = new Date('1970-01-01'), datesFound = false;

        for (const file of files) {
            const content = await file.text();
            const history = JSON.parse(content);
            fullHistoryData.push(history);

            for (const item of history) {
                if (item && item.time) {
                    const itemDate = new Date(item.time);
                    if (!isNaN(itemDate.getTime())) {
                        if (itemDate < minDate) minDate = itemDate;
                        if (itemDate > maxDate) maxDate = itemDate;
                        datesFound = true;
                    }
                }
            }
        }

        if (datesFound) {
            dateSlider.noUiSlider.updateOptions({
                range: { min: minDate.getTime(), max: maxDate.getTime() },
                start: [minDate.getTime(), maxDate.getTime()]
            });
        }
    });

    function renderList(listElement, data, searchTerm, isSongs = false) {
        listElement.innerHTML = '';
        const filteredData = data.filter(item => item[0].toLowerCase().includes(searchTerm.toLowerCase()));
        
        filteredData.forEach((item, index) => {
            const [name, count] = item;
            const li = document.createElement('li');
            li.textContent = `${name} - ${count} views`;
            listElement.appendChild(li);
        });
    }

    function renderPeriodicTable(container, data, title) {
        container.innerHTML = '';
        
        const periods = Object.keys(data);
        if (periods.length === 0) return;
        
        const navigationDiv = document.createElement('div');
        navigationDiv.style.display = 'flex';
        navigationDiv.style.alignItems = 'center';
        navigationDiv.style.gap = '1rem';
        navigationDiv.style.marginBottom = '1rem';
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        prevButton.style.padding = '0.5rem 1rem';
        prevButton.style.fontSize = '1.2rem';
        
        const nextButton = document.createElement('button');
        nextButton.textContent = '→';
        nextButton.style.padding = '0.5rem 1rem';
        nextButton.style.fontSize = '1.2rem';
        
        const dropdown = document.createElement('select');
        dropdown.style.padding = '0.5rem';
        dropdown.style.flex = '1';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';
        
        const contentDiv = document.createElement('div');
        contentDiv.style.minHeight = '200px';
        
        let currentIndex = 0;
        
        function updateContent() {
            const currentPeriod = periods[currentIndex];
            const songs = [...data[currentPeriod]].sort((a, b) => b[1] - a[1]);
            
            dropdown.value = currentPeriod;
            
            contentDiv.innerHTML = `
                <h4 style="margin-top: 0; margin-bottom: 1rem; color: #666;">${currentPeriod}</h4>
                <ol style="margin: 0; padding-left: 2rem;">
                    ${songs.map(song => `<li>${song[0]} (${song[1]} plays)</li>`).join('')}
                </ol>
            `;
            
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
        
        // Event listeners
        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateContent();
            }
        });
        
        nextButton.addEventListener('click', () => {
            if (currentIndex < periods.length - 1) {
                currentIndex++;
                updateContent();
            }
        });
        
        dropdown.addEventListener('change', () => {
            currentIndex = periods.indexOf(dropdown.value);
            updateContent();
        });
        
        navigationDiv.appendChild(prevButton);
        navigationDiv.appendChild(dropdown);
        navigationDiv.appendChild(nextButton);
        
        container.appendChild(navigationDiv);
        container.appendChild(contentDiv);
        
        updateContent();
    }

    songSearchInput.addEventListener('input', (e) => renderList(allSongsList, allSongs, e.target.value, true));
    artistSearchInput.addEventListener('input', (e) => renderList(allArtistsList, allArtists, e.target.value));

    async function main() {
        controlsDiv.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        
        pyodide = await loadPyodide();
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        await micropip.install('pandas');
        const response = await fetch('ytmwrapped.py');
        const ytmwrappedCode = await response.text();
        pyodide.runPython(ytmwrappedCode);

        loadingIndicator.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
    }

    main();

    analyzeBtn.addEventListener('click', async () => {
        if (fullHistoryData.length === 0) {
            alert('Please select your history files.');
            return;
        }
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!startDate || !endDate) {
            alert('Please select a start and end date.');
            return;
        }

        resultsDiv.classList.add('hidden');
        analyzingIndicator.classList.remove('hidden');

        // Force UI update before starting analysis
        await new Promise(resolve => setTimeout(resolve, 100));

        // Run analysis in chunks to prevent UI blocking
        const results = await new Promise((resolve) => {
            setTimeout(() => {
                const analysisResults = pyodide.globals.get('analyze_history')(fullHistoryData, startDate, endDate);
                resolve(analysisResults);
            }, 0);
        });

        const totalVideos = results.get('total_videos');
        const topSongsData = results.get('top_songs').toJs();
        const topArtistsData = results.get('top_artists').toJs();
        const songsPerDayData = results.get('songs_per_day').toJs();
        const songsPerHourData = results.get('songs_per_hour').toJs();
        const songsPerDayOfWeekData = results.get('songs_per_day_of_week').toJs();
        const topSongsWeeklyData = results.get('top_songs_weekly').toJs({ dict_converter: Object.fromEntries });
        const topSongsMonthlyData = results.get('top_songs_monthly').toJs({ dict_converter: Object.fromEntries });
        results.destroy();

        allSongs = Array.from(topSongsData.entries());
        allArtists = Array.from(topArtistsData.entries());
        const songsPerDay = Object.fromEntries(songsPerDayData);
        const songsPerHour = Object.fromEntries(songsPerHourData);
        const songsPerDayOfWeek = Object.fromEntries(songsPerDayOfWeekData);

        analyzingIndicator.classList.add('hidden');
        resultsDiv.classList.remove('hidden');

        totalVideosDiv.textContent = `Total songs listened to: ${totalVideos}`;

        const top20Songs = allSongs.slice(0, 20);
        const top20Artists = allArtists.slice(0, 20);

        if (topSongsChart) topSongsChart.destroy();
        topSongsChart = new Chart(topSongsChartCanvas, {
            type: 'bar',
            data: {
                labels: top20Songs.map(item => item[0]),
                datasets: [{
                    label: 'View Count',
                    data: top20Songs.map(item => item[1]),
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } }, maintainAspectRatio: false }
        });

        if (topArtistsChart) topArtistsChart.destroy();
        topArtistsChart = new Chart(topArtistsChartCanvas, {
            type: 'bar',
            data: {
                labels: top20Artists.map(item => item[0]),
                datasets: [{
                    label: 'View Count',
                    data: top20Artists.map(item => item[1]),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } }, maintainAspectRatio: false }
        });

        renderList(allSongsList, allSongs, '', true);
        renderList(allArtistsList, allArtists, '');

        if (songsPerDayChart) songsPerDayChart.destroy();
        songsPerDayChart = new Chart(songsPerDayChartCanvas, {
            type: 'bar',
            data: {
                labels: Object.keys(songsPerDay),
                datasets: [{
                    label: 'Songs',
                    data: Object.values(songsPerDay),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });

        if (songsPerHourChart) songsPerHourChart.destroy();
        const hourLabels = Array.from({length: 24}, (_, i) => i);
        const hourData = hourLabels.map(hour => songsPerHour[hour] || 0);
        songsPerHourChart = new Chart(songsPerHourChartCanvas, {
            type: 'polarArea',
            data: {
                labels: hourLabels.map(h => `${h}:00`),
                datasets: [{
                    label: 'Songs',
                    data: hourData,
                }]
            },
            options: { 
                plugins: { 
                    legend: { display: false } 
                },
                scales: {
                    r: {
                        display: true,
                        angleLines: { display: true },
                        pointLabels: {
                            display: true,
                            centerPointLabels: false,
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            display: false
                        }
                    }
                }
            }
        });

        if (songsPerDayOfWeekChart) songsPerDayOfWeekChart.destroy();
        const dayOfWeekLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayOfWeekData = dayOfWeekLabels.map((_, index) => songsPerDayOfWeek[index] || 0);
        songsPerDayOfWeekChart = new Chart(songsPerDayOfWeekChartCanvas, {
            type: 'bar',
            data: {
                labels: dayOfWeekLabels,
                datasets: [{
                    label: 'Songs',
                    data: dayOfWeekData,
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: { 
                scales: { 
                    y: { beginAtZero: true },
                    x: {
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    }
                }, 
                plugins: { 
                    legend: { display: false } 
                },
                maintainAspectRatio: false
            }
        });

        renderPeriodicTable(weeklyTopSongsDiv, topSongsWeeklyData, 'Week Starting');
        renderPeriodicTable(monthlyTopSongsDiv, topSongsMonthlyData, 'Month');
    });
});