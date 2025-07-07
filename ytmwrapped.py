import json
import pandas as pd

# This will hold our master DataFrame after the initial analysis
master_df = None

def merge_histories(histories):
    """Merges multiple YouTube Music history lists into a single list."""
    merged_history = []
    for history in histories:
        if isinstance(history, list):
            merged_history.extend(history)
    return merged_history

def clean_data(item):
    """
    Safely extracts and cleans title and artist from a history item.
    Returns (None, None) if the item is not a valid song entry.
    """
    try:
        if (not item or 
            'header' not in item or item['header'] != 'YouTube Music' or
            'title' not in item or not item['title'].startswith('Watched ') or
            'titleUrl' not in item or 'watch?v=' not in item['titleUrl'] or
            'subtitles' not in item or not isinstance(item.get('subtitles'), list) or len(item['subtitles']) == 0 or
            'name' not in item['subtitles'][0] or 'url' not in item['subtitles'][0]):
            return None, None

        title = item['title'][8:]
        artist = item['subtitles'][0]['name'].replace(' - Topic', '')

        if title == artist:
            return None, None
        
        return title, artist
    except (TypeError, AttributeError, KeyError):
        return None, None

def perform_initial_analysis(history_data_proxy):
    """
    Performs the main, one-time analysis and stores the master DataFrame.
    """
    global master_df
    try:
        history_data = history_data_proxy.to_py()
        merged_history = merge_histories(history_data)
        
        processed_data = []
        for item in merged_history:
            if isinstance(item, dict) and 'time' in item:
                title, artist = clean_data(item)
                if title and artist:
                    processed_data.append({
                        'title': title,
                        'artist': artist,
                        'time': item['time']
                    })

        if not processed_data:
            return {"error": "No valid YouTube Music history found."}

        df = pd.DataFrame(processed_data)
        df['time'] = pd.to_datetime(df['time'], utc=True, errors='coerce')
        df.dropna(subset=['time'], inplace=True)
        df.sort_values(by='time', inplace=True)
        df.drop_duplicates(subset=['time', 'title', 'artist'], keep='first', inplace=True)
        
        # Store the processed DataFrame globally
        master_df = df
        
        min_date = master_df['time'].min().isoformat()
        max_date = master_df['time'].max().isoformat()

        return {
            "min_date": min_date,
            "max_date": max_date
        }

    except Exception as e:
        return {"error": f"An initial analysis error occurred: {str(e)}"}

def get_stats_for_period(start_date_str, end_date_str):
    """
    Calculates statistics for a given date range from the master DataFrame.
    """
    global master_df
    if master_df is None:
        return {"error": "Initial analysis has not been performed."}

    try:
        start_date = pd.to_datetime(start_date_str, utc=True)
        end_date = pd.to_datetime(end_date_str, utc=True) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
        
        mask = (master_df['time'] >= start_date) & (master_df['time'] <= end_date)
        filtered_df = master_df.loc[mask]

        if filtered_df.empty:
            return {"error": "No listening history found for the selected date range."}

        total_videos = len(filtered_df)
        top_songs = filtered_df['title'].value_counts()
        top_artists = filtered_df['artist'].value_counts()

        songs_per_day = filtered_df.groupby(filtered_df['time'].dt.date).size()
        songs_per_hour = filtered_df.groupby(filtered_df['time'].dt.hour).size()
        songs_per_day_of_week = filtered_df.groupby(filtered_df['time'].dt.dayofweek).size()

        filtered_df['artist_title'] = filtered_df['artist'] + ' - ' + filtered_df['title']
        
        top_songs_weekly = filtered_df.groupby([pd.Grouper(key='time', freq='W-MON'), 'artist_title']).size()
        top_songs_monthly = filtered_df.groupby([pd.Grouper(key='time', freq='MS'), 'artist_title']).size()

        weekly_dict = {}
        for (week, artist_title), count in top_songs_weekly.items():
            week_str = week.strftime('%Y-%m-%d')
            if week_str not in weekly_dict:
                weekly_dict[week_str] = []
            weekly_dict[week_str].append([artist_title, count])

        monthly_dict = {}
        for (month, artist_title), count in top_songs_monthly.items():
            month_str = month.strftime('%b %Y')
            if month_str not in monthly_dict:
                monthly_dict[month_str] = []
            monthly_dict[month_str].append([artist_title, count])

        songs_per_day_serializable = {day.strftime('%Y-%m-%d'): count for day, count in songs_per_day.items()}

        return {
            "total_videos": total_videos,
            "top_songs": top_songs.to_dict(),
            "top_artists": top_artists.to_dict(),
            "songs_per_day": songs_per_day_serializable,
            "songs_per_hour": songs_per_hour.to_dict(),
            "songs_per_day_of_week": songs_per_day_of_week.to_dict(),
            "top_songs_weekly": weekly_dict,
            "top_songs_monthly": monthly_dict,
        }

    except Exception as e:
        return {"error": f"An error occurred while filtering stats: {str(e)}"}

import js
# Make the new functions available to JavaScript
js.perform_initial_analysis = perform_initial_analysis
js.get_stats_for_period = get_stats_for_period
            
