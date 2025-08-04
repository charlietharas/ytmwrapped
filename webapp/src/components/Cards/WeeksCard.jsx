import React, { useMemo, memo, useRef, useEffect, useState } from 'react';
import * as Chart from 'chart.js';
import { useApp } from '../../hooks/useApp';
import { chartColors } from '../../utils/chartColors';

Chart.Chart.register(...Chart.registerables);

const WeeksCard = ({ data }) => {
    const { hasActiveFilters, clearWeeksFilters, filters } = useApp();
    const [isZoomed, setIsZoomed] = useState(false);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const isFiltered = hasActiveFilters();
    const showStacked = isFiltered && !isZoomed;

    const chartConfig = useMemo(() => {
        if (!data || data.error) {
            return null;
        }

        const labels = data.labels || [
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun',
        ];
        const filteredData = data.datasets?.[0]?.data || new Array(7).fill(0);
        const otherData = data.datasets?.[1]?.data || new Array(7).fill(0);
        const totalData = filteredData.map(
            (val, i) => val + (otherData[i] || 0)
        );

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
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: chartColors.text.secondary,
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
            },
        };
    }, [data, isFiltered, isZoomed, showStacked]);

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
                    <h3>Songs per Day of Week</h3>
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
                <h3>Songs per Day of Week</h3>
                {isFiltered && (
                    <div className="card-header-controls">
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
                        {filters.daysOfWeek.length > 0 && (
                            <button
                                id="clear-filter-btn"
                                title="Clear day of week filters"
                                onClick={clearWeeksFilters}
                            >
                                ↺
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className="card-content">
                <p className="card-description">
                    When you listen to music throughout the week
                </p>
                <div
                    className="chart-wrapper"
                    style={{ width: '100%', height: 400 }}
                >
                    <canvas ref={chartRef} />
                </div>
            </div>
        </div>
    );
};

export default memo(WeeksCard);
