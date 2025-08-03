// Chart color constants matching our dark theme
export const chartColors = {
    accent: '#bb86fc',
    accentHover: '#a76efd',
    danger: '#cf6679',
    text: {
        primary: '#e0e0e0',
        secondary: '#a0a0a0',
    },
    background: {
        main: '#121212',
        card: '#1e1e1e',
        hover: 'rgba(255, 255, 255, 0.05)',
    },
    border: '#333333',

    // Chart-specific colors
    filtered: 'rgba(207, 102, 121, 1)',
    filteredLight: 'rgba(207, 102, 121, 0.2)',
    other: 'rgba(100, 100, 100, 0.5)',
    otherLight: 'rgba(100, 100, 100, 0.2)',
};

// Generate color palette for multiple items
export const generateColorPalette = (count, theme = 'accent') => {
    const colors = [];
    for (let i = 0; i < count; i++) {
        if (theme === 'accent') {
            colors.push(`hsla(${(i * 360) / count}, 70%, 70%, 0.6)`);
        } else if (theme === 'red') {
            colors.push(`hsla(0, 50%, ${70 - i * 2}, 0.6)`);
        } else if (theme === 'grey') {
            colors.push(`hsla(0, 0%, ${50 - i * 2}, 0.4)`);
        }
    }
    return colors;
};

// Common chart styles for Recharts
export const commonChartStyles = {
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    tooltip: {
        contentStyle: {
            backgroundColor: chartColors.background.card,
            border: `1px solid ${chartColors.border}`,
            borderRadius: '8px',
        },
        labelStyle: {
            color: chartColors.text.primary,
        },
    },
    axis: {
        stroke: chartColors.text.secondary,
        style: {
            fontSize: 12,
        },
    },
    grid: {
        stroke: 'rgba(255, 255, 255, 0.1)',
        strokeDasharray: '3 3',
    },
};
