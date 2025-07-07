import json
import pandas as pd

def merge_histories(histories):
    """Merges multiple YouTube Music history lists into a single list."""
    merged_history = []
    for history in histories:
        merged_history.extend(history)
    return merged_history

def clean_data(item):
    """
    Safely extracts and cleans title and artist from a history item.
    Returns (None, None) if the item is not a valid song entry.
    """
    try:
        # Strict check for valid music entries.
        if (not item or 
            'subtitles' not in item or 
            not isinstance(item.get('subtitles'), list) or 
            len(item['subtitles']) == 0 or
            'titleUrl' not in item or
            'music.youtube.com' not in item['titleUrl']):
            return None, None

        title = item.get('title', 'Unknown Title')
        if title.startswith('Watched '):
            title = title[8:]

        artist = item['subtitles'][0].get('name', 'Unknown Artist').replace(' - Topic', '')
        
        return title, artist
    except (TypeError, AttributeError):
        return None, None


def analyze_history(history_data_proxy, start_date_str, end_date_str):
    """
    Analyzes the listening history for a given time period.
    """
    history_data = history_data_proxy.to_py()
    merged_history = merge_histories(history_data)
    
    processed_data = []
    for item in merged_history:
        # Ensure item is a dictionary before processing
        if isinstance(item, dict) and 'time' in item:
            title, artist = clean_data(item)
            if title and artist:
                processed_data.append({
                    'title': title,
                    'artist': artist,
                    'time': item['time']
                })

    if not processed_data:
        return {
            "total_videos": 0,
            "top_songs": pd.Series(),
            "top_artists": pd.Series(),
            "debug_info": "No data passed the initial filtering in Python."
        }

    df = pd.DataFrame(processed_data)
    
    df['time'] = pd.to_datetime(df['time'], utc=True)
    start_date = pd.to_datetime(start_date_str, utc=True)
    end_date = pd.to_datetime(end_date_str, utc=True) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
    
    mask = (df['time'] >= start_date) & (df['time'] <= end_date)
    filtered_df = df.loc[mask]

    total_videos = len(filtered_df)
    top_songs = filtered_df['title'].value_counts()
    top_artists = filtered_df['artist'].value_counts()

    # Chronological analysis
    songs_per_day = filtered_df.groupby(filtered_df['time'].dt.date).size()
    songs_per_hour = filtered_df.groupby(filtered_df['time'].dt.hour).size()
    songs_per_day_of_week = filtered_df.groupby(filtered_df['time'].dt.dayofweek).size()

    # Create artist-title combination for grouping
    filtered_df['artist_title'] = filtered_df['artist'] + ' - ' + filtered_df['title']
    
    # All songs per week
    top_songs_weekly = filtered_df.groupby([pd.Grouper(key='time', freq='W-MON'), 'artist_title']) \
                                  .size()
    
    # All songs per month
    top_songs_monthly = filtered_df.groupby([pd.Grouper(key='time', freq='MS'), 'artist_title']) \
                                   .size()

    # Convert weekly data to a serializable format
    weekly_dict = {}
    for (week, artist_title), count in top_songs_weekly.items():
        week_str = week.strftime('%Y-%m-%d')
        if week_str not in weekly_dict:
            weekly_dict[week_str] = []
        weekly_dict[week_str].append([artist_title, count])

    # Convert monthly data to a serializable format
    monthly_dict = {}
    for (month, artist_title), count in top_songs_monthly.items():
        month_str = month.strftime('%b %Y')
        if month_str not in monthly_dict:
            monthly_dict[month_str] = []
        monthly_dict[month_str].append([artist_title, count])


    songs_per_day_serializable = {
        day.strftime('%Y-%m-%d'): count for day, count in songs_per_day.items()
    }

    debug_info = {
        "merged_history_count": len(merged_history),
        "processed_data_count": len(processed_data),
        "filtered_df_count": len(filtered_df),
        "start_date_utc": start_date.isoformat(),
        "end_date_utc": end_date.isoformat(),
        "first_5_processed_items": processed_data[:5]
    }

    results = {
        "total_videos": total_videos,
        "top_songs": top_songs.to_dict(),
        "top_artists": top_artists.to_dict(),
        "songs_per_day": songs_per_day_serializable,
        "songs_per_hour": songs_per_hour.to_dict(),
        "songs_per_day_of_week": songs_per_day_of_week.to_dict(),
        "top_songs_weekly": weekly_dict,
        "top_songs_monthly": monthly_dict,
        "debug_info": debug_info
    }
    
    return results
