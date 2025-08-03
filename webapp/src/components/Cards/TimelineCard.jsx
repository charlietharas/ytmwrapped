import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceArea
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useApp } from '../../hooks/useApp';
import { chartColors, commonChartStyles } from '../../utils/chartColors';

const TimelineCard = ({ data }) => {
  const { filters, updateFilter, dateRange } = useApp();
  const [dragStartX, setDragStartX] = useState(null);
  const [dragEndX, setDragEndX] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const chartData = useMemo(() => {
    if (!data?.labels || !data?.datasets) return [];
    
    return data.labels.map((date, index) => {
      const filteredCount = data.datasets[0]?.data[index] || 0;
      const otherCount = data.datasets[1]?.data[index] || 0;
      const totalCount = filteredCount + otherCount;
      
      return {
        date,
        timestamp: new Date(date).getTime(),
        count: totalCount,
        filtered: filteredCount,
        other: otherCount
      };
    });
  }, [data]);

  const { hasActiveFilters, clearAllFilters } = useApp();
  const isFiltered = hasActiveFilters();

  // When zoomed, filter to show only the selected date range
  const displayData = useMemo(() => {
    if (!isZoomed || !isFiltered) return chartData;
    
    return chartData.filter(d => 
      d.timestamp >= filters.dateRange.start && 
      d.timestamp <= filters.dateRange.end
    );
  }, [chartData, isZoomed, isFiltered, filters.dateRange]);

  // Show stacked chart when filters are active and not zoomed
  // When zoomed, show only filtered data
  const showStacked = isFiltered && !isZoomed;

  const handleMouseDown = useCallback((e) => {
    if (e && e.activeLabel) {
      setDragStartX(e.activeLabel);
      setDragEndX(e.activeLabel);
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (dragStartX !== null && e && e.activeLabel) {
      setDragEndX(e.activeLabel);
    }
  }, [dragStartX]);

  const handleMouseUp = useCallback(() => {
    if (dragStartX !== null && dragEndX !== null && dragStartX !== dragEndX) {
      const startData = displayData.find(d => d.date === dragStartX);
      const endData = displayData.find(d => d.date === dragEndX);
      
      if (startData && endData) {
        const start = Math.min(startData.timestamp, endData.timestamp);
        const end = Math.max(startData.timestamp, endData.timestamp);
        updateFilter('dateRange', { start, end });
        setIsZoomed(false);
      }
    }
    setDragStartX(null);
    setDragEndX(null);
  }, [dragStartX, dragEndX, displayData, updateFilter]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const date = format(parseISO(payload[0].payload.date), 'MMM d, yyyy');
      const data = payload[0].payload;
      
      return (
        <div style={{
          backgroundColor: chartColors.background.card,
          border: `1px solid ${chartColors.border}`,
          borderRadius: '8px',
          padding: '8px 12px',
          color: chartColors.text.primary
        }}>
          <p style={{ margin: 0, color: chartColors.text.primary }}>
            {date}
          </p>
          {showStacked ? (
            <>
              <p style={{ margin: 0, color: chartColors.accent, fontWeight: 'bold' }}>
                Filtered: {data.filtered} plays
              </p>
              <p style={{ margin: 0, color: 'rgba(100, 100, 100, 0.8)' }}>
                Other: {data.other} plays
              </p>
              <p style={{ margin: 0, color: chartColors.text.primary, fontWeight: 'bold' }}>
                Total: {data.count} plays
              </p>
            </>
          ) : isFiltered && isZoomed ? (
            <p style={{ margin: 0, color: chartColors.accent, fontWeight: 'bold' }}>
              Filtered: {data.filtered} plays
            </p>
          ) : (
            <p style={{ margin: 0, color: chartColors.accent, fontWeight: 'bold' }}>
              {data.count} plays
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate which ticks to show
  const xAxisTicks = useMemo(() => {
    if (!displayData.length) return [];
    
    const totalDays = displayData.length;
    let tickIndices = [];
    
    // Calculate reasonable number of ticks based on data size
    const targetTicks = Math.min(12, Math.max(4, Math.floor(totalDays / 30)));
    const step = Math.floor(totalDays / targetTicks);
    
    for (let i = 0; i < totalDays; i += step) {
      tickIndices.push(displayData[i].date);
    }
    
    // Always include the last date if not already included
    if (tickIndices[tickIndices.length - 1] !== displayData[displayData.length - 1].date) {
      tickIndices.push(displayData[displayData.length - 1].date);
    }
    
    return tickIndices;
  }, [displayData]);

  // X-axis formatting
  const formatXAxisTick = useCallback((value) => {
    const date = parseISO(value);
    const totalDays = displayData.length;
    
    if (totalDays <= 60) {
      return format(date, 'MMM d');
    } else if (totalDays <= 365) {
      return format(date, 'MMM yyyy');
    } else {
      return format(date, 'MMM yyyy');
    }
  }, [displayData.length]);

  return (
    <div className="card full-width">
      <div className="card-header">
        <h3>Timeline</h3>
        <div className="card-header-controls">
          {isFiltered && (
            <>
              <button 
                id="zoom-toggle-btn" 
                title={isZoomed ? "Show full range" : "Zoom to selection"}
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
            </>
          )}
        </div>
      </div>
      <div className="card-content">
        <p className="card-description">Your listening timeline. Click and drag to select a date range.</p>
        <div id="timeline-date-display">
          {isFiltered && filters.dateRange.start && filters.dateRange.end
            ? `${format(filters.dateRange.start, 'MMM d, yyyy')} – ${format(filters.dateRange.end, 'MMM d, yyyy')}`
            : dateRange.start && dateRange.end
            ? `Full Range: ${format(dateRange.start, 'MMM d, yyyy')} – ${format(dateRange.end, 'MMM d, yyyy')}`
            : 'Loading date range...'
          }
        </div>
        <div className="chart-wrapper" style={{ userSelect: 'none' }}>
          <ResponsiveContainer width="100%" height={350} debounce={100}>
            <BarChart 
              data={displayData}
              margin={commonChartStyles.margin}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={useCallback(() => { setDragStartX(null); setDragEndX(null); }, [])}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={commonChartStyles.grid.stroke}
                horizontalPoints={[0, 50, 100, 150, 200, 250, 300]}
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisTick}
                stroke={commonChartStyles.axis.stroke}
                style={commonChartStyles.axis.style}
                ticks={xAxisTicks}
                tick={{ fontSize: 11, fill: chartColors.text.secondary }}
              />
              <YAxis 
                stroke={commonChartStyles.axis.stroke}
                style={commonChartStyles.axis.style}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                isAnimationActive={false}
              />
              {showStacked ? (
                <>
                  <Bar 
                    dataKey="filtered"
                    stackId="timeline"
                    fill={chartColors.accent}
                    name="Filtered"
                  />
                  <Bar 
                    dataKey="other"
                    stackId="timeline"
                    fill="rgba(100, 100, 100, 0.5)"
                    name="Other"
                  />
                </>
              ) : isFiltered && isZoomed ? (
                <Bar 
                  dataKey="filtered"
                  fill={chartColors.accent}
                  name="Filtered"
                />
              ) : (
                <Bar 
                  dataKey="count"
                  fill={chartColors.accent}
                  name="Plays"
                />
              )}
              {dragStartX !== null && dragEndX !== null && dragStartX !== dragEndX && (
                <ReferenceArea
                  x1={dragStartX}
                  x2={dragEndX}
                  strokeOpacity={0.3}
                  fill={chartColors.accent}
                  fillOpacity={0.3}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default memo(TimelineCard);