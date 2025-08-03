import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import * as Chart from 'chart.js';
import { useApp } from '../../hooks/useApp';
import { chartColors } from '../../utils/chartColors';

Chart.Chart.register(...Chart.registerables);

const HoursCard = ({ data }) => {
    const { hasActiveFilters, clearAllFilters } = useApp();
    const [isZoomed, setIsZoomed] = useState(false);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const isFiltered = hasActiveFilters();
    const showStacked = isFiltered && !isZoomed;

    const chartConfig = useMemo(() => {
        const labels =
            data?.labels?.map((hour) => hour.split(':')[0]) ||
            Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
        const filteredData = data?.datasets?.[0]?.data || new Array(24).fill(0);
        const otherData = data?.datasets?.[1]?.data || new Array(24).fill(0);
        const totalData = filteredData.map(
            (val, i) => val + (otherData[i] || 0)
        );

        let datasets;
        if (showStacked) {
            datasets = [
                {
                    label: 'Total',
                    data: totalData,
                    backgroundColor: 'rgba(173, 216, 230, 0.3)',
                },
                {
                    label: 'Filtered',
                    data: filteredData,
                    backgroundColor: chartColors.accent,
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
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        grid: {
                            color: chartColors.border,
                            circular: true,
                        },
                        ticks: {
                            display: false,
                        },
                        pointLabels: {
                            display: true,
                            color: chartColors.text.secondary,
                            font: {
                                size: 12,
                            },
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
                            title: (ctx) => `${ctx[0].label}:00`,
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`,
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

        chartInstance.current = new Chart.Chart(chartRef.current, chartConfig);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [chartConfig]);

    return (
        <div className="card">
            <div className="card-header">
                <h3>Songs per Hour of Day</h3>
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
                        <button
                            id="clear-filter-btn"
                            title="Clear all filters"
                            onClick={clearAllFilters}
                        >
                            ↺
                        </button>
                    </div>
                )}
            </div>
            <div className="card-content">
                <p className="card-description">
                    When you listen to music throughout the day.
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

export default memo(HoursCard);
