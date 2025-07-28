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
import { useApp } from '../../contexts/AppContext';
import { chartColors, commonChartStyles } from '../../utils/chartColors';

const TimelineCard = ({ data }) => {
  const { filters, updateFilter, dateRange } = useApp();
  const [dragStartX, setDragStartX] = useState(null);
  const [dragEndX, setDragEndX] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const chartData = useMemo(() => {
    if (!data?.songs_per_day) return [];
    
    return Object.entries(data.songs_per_day)
      .map(([date, count]) => ({
        date,
        timestamp: new Date(date).getTime(),
        count
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const isFiltered = dateRange.start && dateRange.end && 
                     (filters.dateRange.start !== dateRange.start || 
                      filters.dateRange.end !== dateRange.end);

  // Calculate display data based on zoom state
  const displayData = useMemo(() => {
    if (!isZoomed || !isFiltered) return chartData;
    
    return chartData.filter(d => 
      d.timestamp >= filters.dateRange.start && 
      d.timestamp <= filters.dateRange.end
    );
  }, [chartData, isZoomed, isFiltered, filters.dateRange]);

  // Pre-calculate bar colors for better performance
  const barColors = useMemo(() => {
    if (!isFiltered) return null;
    
    return displayData.map(entry => {
      const inRange = entry.timestamp >= filters.dateRange.start && 
                      entry.timestamp <= filters.dateRange.end;
      return inRange ? chartColors.accent : 'rgba(100, 100, 100, 0.5)';
    });
  }, [displayData, isFiltered, filters.dateRange]);

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
          <p style={{ margin: 0, color: chartColors.accent, fontWeight: 'bold' }}>
            {payload[0].value} plays
          </p>
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
          <select disabled title="Jump to specific time">
            <option>TODO: Month/Week selector</option>
          </select>
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
                title="Clear filter"
                onClick={() => updateFilter('dateRange', dateRange)}
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
              <Bar 
                dataKey="count"
                fill={chartColors.accent}
              >
                {barColors && displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColors[index]} />
                ))}
              </Bar>
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