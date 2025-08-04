import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import * as Chart from 'chart.js';
import { format, parseISO } from 'date-fns';
import { useApp } from '../../hooks/useApp';
import { chartColors, commonChartStyles } from '../../utils/chartColors';

Chart.Chart.register(...Chart.registerables);

const selectionPlugin = {
    id: 'selectionPlugin',
    afterDraw: (chart) => {
        const {
            ctx,
            chartArea: { top, bottom },
        } = chart;
        const { dragStart, dragEnd } = chart.options.plugins.selectionPlugin;

        if (dragStart === null || dragEnd === null) return;

        const meta = chart.getDatasetMeta(0);
        if (!meta.data || meta.data.length === 0) return;

        const startX = meta.data[dragStart]?.x;
        const endX = meta.data[dragEnd]?.x;

        if (startX !== undefined && endX !== undefined) {
            ctx.save();
            ctx.fillStyle = 'rgba(173, 216, 230, 0.3)';
            ctx.fillRect(
                Math.min(startX, endX),
                top,
                Math.abs(endX - startX),
                bottom - top
            );
            ctx.restore();
        }
    },
};

Chart.Chart.register(selectionPlugin);

const TimelineCard = ({ data }) => {
    const {
        filters,
        updateFilter,
        dateRange,
        hasActiveFilters,
        clearDateRangeFilters,
    } = useApp();
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const [dragStartIndex, setDragStartIndex] = useState(null);
    const [dragEndIndex, setDragEndIndex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    const chartData = useMemo(() => {
        if (!data?.labels || !data?.datasets) return [];
        return data.labels.map((date, index) => ({
            date,
            timestamp: new Date(date).getTime(),
            count:
                (data.datasets[0]?.data[index] || 0) +
                (data.datasets[1]?.data[index] || 0),
            filtered: data.datasets[0]?.data[index] || 0,
            other: data.datasets[1]?.data[index] || 0,
        }));
    }, [data]);

    const isFiltered = hasActiveFilters(true);
    const displayData = useMemo(() => {
        if (!isZoomed || !isFiltered) return chartData;
        return chartData.filter(
            (d) =>
                d.timestamp >= filters.dateRange.start &&
                d.timestamp <= filters.dateRange.end
        );
    }, [chartData, isZoomed, isFiltered, filters.dateRange]);

    const showStacked = isFiltered && !isZoomed;

    // Effect for creating and destroying the chart
    useEffect(() => {
        if (!chartRef.current) return;
        const canvas = chartRef.current;

        const config = {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: chartColors.text.secondary,
                            maxRotation: 0,
                            autoSkip: true,
                            autoSkipPadding: 30,
                        },
                    },
                    y: {
                        stacked: true,
                        ticks: { color: chartColors.text.secondary },
                        grid: { color: commonChartStyles.grid.stroke },
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
                            title: (items) =>
                                format(parseISO(items[0].label), 'MMM d, yyyy'),
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`,
                            footer: (items) =>
                                showStacked
                                    ? `Total: ${displayData[items[0].dataIndex].count}`
                                    : '',
                        },
                    },
                    selectionPlugin: { dragStart: null, dragEnd: null },
                },
            },
        };

        chartInstance.current = new Chart.Chart(canvas, config);

        return () => {
            chartInstance.current?.destroy();
            chartInstance.current = null;
        };
    }, [displayData, showStacked]);

    // Effect for updating chart data
    useEffect(() => {
        if (!chartInstance.current) return;

        let datasets;
        if (showStacked) {
            datasets = [
                {
                    label: 'Filtered',
                    data: displayData.map((d) => d.filtered),
                    backgroundColor: chartColors.accent,
                },
                {
                    label: 'Other',
                    data: displayData.map((d) => d.other),
                    backgroundColor: 'rgba(100, 100, 100, 0.5)',
                },
            ];
        } else {
            const dataKey = isFiltered && isZoomed ? 'filtered' : 'count';
            datasets = [
                {
                    label: 'Plays',
                    data: displayData.map((d) => d[dataKey]),
                    backgroundColor: chartColors.accent,
                },
            ];
        }

        chartInstance.current.data.labels = displayData.map((d) => d.date);
        chartInstance.current.data.datasets = datasets;
        chartInstance.current.update();
    }, [displayData, showStacked, isFiltered, isZoomed]);

    // Effect to update the selection box without full animation
    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.options.plugins.selectionPlugin.dragStart =
                dragStartIndex;
            chartInstance.current.options.plugins.selectionPlugin.dragEnd =
                dragEndIndex;
            chartInstance.current.update('none');
        }
    }, [dragStartIndex, dragEndIndex]);

    // Effect for event listeners
    useEffect(() => {
        const canvas = chartRef.current;
        if (!canvas || !chartInstance.current) return;

        const getIndexFromEvent = (e) => {
            const chart = chartInstance.current;
            if (!chart) return null;
            const elements = chart.getElementsAtEventForMode(e, 'index', {
                intersect: false,
            });
            return elements.length > 0 ? elements[0].index : null;
        };

        const handleMouseDown = (e) => {
            const index = getIndexFromEvent(e);
            if (index !== null) {
                e.preventDefault();
                setIsDragging(true);
                setDragStartIndex(index);
                setDragEndIndex(index);
            }
        };

        const handleMouseMove = (e) => {
            if (isDragging) {
                e.preventDefault();
                const index = getIndexFromEvent(e);
                if (index !== null) setDragEndIndex(index);
            }
        };

        const handleMouseUp = () => {
            if (
                isDragging &&
                dragStartIndex !== null &&
                dragEndIndex !== null &&
                dragStartIndex !== dragEndIndex
            ) {
                const start =
                    displayData[Math.min(dragStartIndex, dragEndIndex)]
                        .timestamp;
                const end =
                    displayData[Math.max(dragStartIndex, dragEndIndex)]
                        .timestamp;
                updateFilter('dateRange', { start, end });
                setIsZoomed(false);
            }
            setIsDragging(false);
            setDragStartIndex(null);
            setDragEndIndex(null);
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, displayData, updateFilter, dragStartIndex, dragEndIndex]);

    return (
        <div className="card full-width">
            <div className="card-header">
                <h3>Timeline</h3>
                <div className="card-header-controls">
                    {isFiltered && (
                        <>
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
                                onClick={clearDateRangeFilters}
                            >
                                ↺
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="card-content">
                <p className="card-description">
                    Your listening timeline. Click and drag to select a date
                    range.
                </p>
                <div id="timeline-date-display">
                    {isFiltered &&
                    filters.dateRange.start &&
                    filters.dateRange.end
                        ? `${format(filters.dateRange.start, 'MMM d, yyyy')} – ${format(filters.dateRange.end, 'MMM d, yyyy')}`
                        : dateRange.start && dateRange.end
                          ? `Full Range: ${format(dateRange.start, 'MMM d, yyyy')} – ${format(dateRange.end, 'MMM d, yyyy')}`
                          : 'Loading date range...'}
                </div>
                <div
                    className="chart-wrapper"
                    style={{ userSelect: 'none', height: '350px' }}
                >
                    <canvas ref={chartRef} />
                </div>
            </div>
        </div>
    );
};

export default memo(TimelineCard);
