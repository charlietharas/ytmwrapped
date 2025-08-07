import React, {
    useMemo,
    memo,
    useRef,
    useEffect,
    useState,
    useCallback,
} from 'react';
import * as Chart from 'chart.js';
import { useApp } from '../../hooks/useApp';
import { chartColors } from '../../utils/chartColors';

Chart.Chart.register(...Chart.registerables);

const ArtistsCard = ({ data }) => {
    const { hasActiveFilters, clearArtistsFilters, filters, updateFilter } =
        useApp();
    const [isZoomed, setIsZoomed] = useState(false);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const isFiltered = hasActiveFilters();
    const showStacked = isFiltered && !isZoomed;

    const handleChartClick = useCallback(
        (event) => {
            if (!chartInstance.current) return;
            const points = chartInstance.current.getElementsAtEventForMode(
                event,
                'nearest',
                { intersect: true },
                true
            );
            if (points.length) {
                const firstPoint = points[0];
                const label =
                    chartInstance.current.data.labels[firstPoint.index];
                const newArtists = filters.artists.includes(label)
                    ? filters.artists.filter((a) => a !== label)
                    : [...filters.artists, label];
                updateFilter('artists', newArtists.sort());
            }
        },
        [filters.artists, updateFilter]
    );

    const chartConfig = useMemo(() => {
        if (!data || data.error) {
            return null;
        }

        let artists =
            data.labels?.map((label, index) => ({
                name: label,
                filteredPlays: data.datasets?.[0]?.data?.[index] || 0,
                otherPlays: data.datasets?.[1]?.data?.[index] || 0,
                totalPlays:
                    (data.datasets?.[0]?.data?.[index] || 0) +
                    (data.datasets?.[1]?.data?.[index] || 0),
            })) || [];

        if (isFiltered && isZoomed) {
            artists = artists
                .filter((a) => a.filteredPlays > 0)
                .sort((a, b) => b.filteredPlays - a.filteredPlays);
        }

        const top20 = artists.slice(0, 20);
        const labels = top20.map((a) => a.name);
        const filteredData = top20.map((a) => a.filteredPlays);
        const otherData = top20.map((a) => a.otherPlays);
        const totalData = top20.map((a) => a.totalPlays);

        let datasets;
        if (showStacked) {
            datasets = [
                {
                    label: 'Filtered',
                    data: filteredData,
                    backgroundColor: chartColors.accent,
                },
                {
                    label: 'Other',
                    data: otherData,
                    backgroundColor: 'rgba(100, 100, 100, 0.5)',
                },
            ];
        } else {
            const displayData =
                isFiltered && isZoomed ? filteredData : totalData;
            datasets = [
                {
                    label: 'Plays',
                    data: displayData,
                    backgroundColor: chartColors.accent,
                },
            ];
        }

        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                interaction: {
                    mode: 'index',
                    axis: 'y',
                    intersect: false,
                },
                scales: {
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: chartColors.text.secondary,
                            callback: function (value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 30
                                    ? label.substring(0, 30) + '...'
                                    : label;
                            },
                        },
                        grid: {
                            color: chartColors.border,
                        },
                    },
                    x: {
                        stacked: true,
                        ticks: {
                            color: chartColors.text.secondary,
                        },
                        grid: {
                            color: chartColors.border,
                        },
                    },
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10,
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: chartColors.background.card,
                        titleColor: chartColors.text.primary,
                        bodyColor: chartColors.text.primary,
                        borderColor: chartColors.border,
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => {
                                if (showStacked) {
                                    const index = ctx.dataIndex;
                                    if (ctx.dataset.label === 'Other') {
                                        return `Other: ${otherData[index]}`;
                                    } else {
                                        return `Filtered: ${ctx.raw}`;
                                    }
                                }
                                return `Plays: ${ctx.raw}`;
                            },
                            footer: (ctx) => {
                                if (showStacked) {
                                    const index = ctx[0].dataIndex;
                                    return `Total: ${totalData[index]}`;
                                }
                                return '';
                            },
                        },
                    },
                },
                onClick: handleChartClick,
            },
        };
    }, [data, isFiltered, isZoomed, showStacked, handleChartClick]);

    useEffect(() => {
        if (!chartRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        if (chartConfig) {
            chartInstance.current = new Chart.Chart(
                chartRef.current,
                chartConfig
            );
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [chartConfig]);

    if (!data || data.error) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3>Top 20 Artists</h3>
                </div>
                <div className="card-content">
                    <p className="card-description">
                        {data?.error || 'No data available'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3>Top 20 Artists</h3>
                <div className="card-header-controls">
                    {isFiltered && (
                        <button
                            id="zoom-toggle-btn"
                            title={
                                isZoomed
                                    ? 'Show full range'
                                    : 'Zoom to selection'
                            }
                            onClick={() => setIsZoomed(!isZoomed)}
                        >
                            {isZoomed ? '⤆' : '⤢'}
                        </button>
                    )}
                    {filters.artists.length > 0 && (
                        <button
                            id="clear-filter-btn"
                            title="Clear artist filters"
                            onClick={clearArtistsFilters}
                        >
                            ↺
                        </button>
                    )}
                </div>
            </div>
            <div className="card-content">
                <p className="card-description">Your most played artists</p>
                <div className="chart-wrapper horizontal-bars">
                    <canvas ref={chartRef} />
                </div>
            </div>
        </div>
    );
};

export default memo(ArtistsCard);
