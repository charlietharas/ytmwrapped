import json
import pandas as pd
import itertools
from urllib.parse import urlparse, parse_qs

master_df = None

def merge_histories(histories):
    merged_history = []
    for history in histories:
        if isinstance(history, list):
            merged_history.extend(history)
    return merged_history

def clean_data(item):
    try:
        if (not item or 
            'header' not in item or item['header'] != 'YouTube Music' or
            'title' not in item or not item['title'].startswith('Watched ') or
            'titleUrl' not in item or 'watch?v=' not in item['titleUrl'] or
            'subtitles' not in item or not isinstance(item.get('subtitles'), list) or len(item['subtitles']) == 0 or
            'name' not in item['subtitles'][0] or 'url' not in item['subtitles'][0]):
            return None, None, None

        title = item['title'][8:]
        artist = item['subtitles'][0]['name'].replace(' - Topic', '')
        
        parsed_url = urlparse(item['titleUrl'])
        video_id = parse_qs(parsed_url.query).get('v', [None])[0]

        if not video_id or title == artist:
            return None, None, None
        
        return title, artist, video_id
    except (TypeError, AttributeError, KeyError):
        return None, None, None

def perform_initial_analysis(history_data_proxy):
    global master_df
    try:
        history_data = history_data_proxy.to_py()
        merged_history = merge_histories(history_data)
        
        processed_data = []
        for item in merged_history:
            if isinstance(item, dict) and 'time' in item:
                title, artist, video_id = clean_data(item)
                if title and artist and video_id:
                    processed_data.append({
                        'title': title,
                        'artist': artist,
                        'video_id': video_id,
                        'time': item['time']
                    })

        if not processed_data:
            return {"error": "No valid YouTube Music history found."}

        df = pd.DataFrame(processed_data)
        df['time'] = pd.to_datetime(df['time'], utc=True, errors='coerce')
        df.dropna(subset=['time'], inplace=True)
        df.sort_values(by='time', inplace=True)
        df.drop_duplicates(subset=['time', 'video_id'], keep='first', inplace=True)
        
        df['artist_title'] = df['artist'] + ' - ' + df['title']
        
        master_df = df
        
        min_date = master_df['time'].min().isoformat()
        max_date = master_df['time'].max().isoformat()

        return {"min_date": min_date, "max_date": max_date}

    except Exception as e:
        return {"error": f"An initial analysis error occurred: {str(e)}"}

def get_stats_for_period(start_date_str, end_date_str):
    global master_df
    if master_df is None:
        return {"error": "Initial analysis has not been performed."}

    try:
        start_date = pd.to_datetime(start_date_str, utc=True)
        end_date = pd.to_datetime(end_date_str, utc=True) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
        
        mask = (master_df['time'] >= start_date) & (master_df['time'] <= end_date)
        filtered_df = master_df.loc[mask].copy()

        # Timeline data should always cover the full range
        songs_per_day = master_df.groupby(master_df['time'].dt.date).size()
        songs_per_day_serializable = {day.strftime('%Y-%m-%d'): count for day, count in songs_per_day.items()}

        if filtered_df.empty:
            return {
                "total_videos": 0, "top_songs": {}, "top_artists": {},
                "songs_per_day": songs_per_day_serializable,
                "songs_per_hour": {}, "songs_per_day_of_week": {},
                "top_songs_weekly": {}, "top_songs_monthly": {}
            }
        
        # All other stats are based on the filtered period
        total_videos = len(filtered_df)
        
        # Create a mapping from video_id to artist_title for display
        video_id_to_display_name = filtered_df.drop_duplicates(subset=['video_id'])[['video_id', 'artist_title']].set_index('video_id')
        
        top_songs_by_id = filtered_df['video_id'].value_counts()
        top_songs = top_songs_by_id.rename(index=video_id_to_display_name['artist_title']).to_dict()

        top_artists = filtered_df['artist'].value_counts().to_dict()

        songs_per_hour = filtered_df.groupby(filtered_df['time'].dt.hour).size()
        songs_per_day_of_week = filtered_df.groupby(filtered_df['time'].dt.dayofweek).size()
        
        top_songs_weekly_by_id = filtered_df.groupby([pd.Grouper(key='time', freq='W-MON'), 'video_id']).size()
        top_songs_monthly_by_id = filtered_df.groupby([pd.Grouper(key='time', freq='MS'), 'video_id']).size()

        weekly_dict = {}
        for (week, video_id), count in top_songs_weekly_by_id.items():
            week_str = week.strftime('%Y-%m-%d')
            if week_str not in weekly_dict:
                weekly_dict[week_str] = []
            display_name = video_id_to_display_name.loc[video_id, 'artist_title']
            weekly_dict[week_str].append([display_name, count])

        monthly_dict = {}
        for (month, video_id), count in top_songs_monthly_by_id.items():
            month_str = month.strftime('%b %Y')
            if month_str not in monthly_dict:
                monthly_dict[month_str] = []
            display_name = video_id_to_display_name.loc[video_id, 'artist_title']
            monthly_dict[month_str].append([display_name, count])

        songs_per_day_serializable = {day.strftime('%Y-%m-%d'): count for day, count in songs_per_day.items()}

        return {
            "total_videos": total_videos,
            "top_songs": top_songs,
            "top_artists": top_artists,
            "songs_per_day": songs_per_day_serializable,
            "songs_per_hour": songs_per_hour.to_dict(),
            "songs_per_day_of_week": songs_per_day_of_week.to_dict(),
            "top_songs_weekly": weekly_dict,
            "top_songs_monthly": monthly_dict
        }

    except Exception as e:
        return {"error": f"An error occurred while filtering stats: {str(e)}"}

def get_filtered_history(start_date_str, end_date_str, page=1, page_size=50, search_term="", filters_json="[]"):
    global master_df
    if master_df is None:
        return {"error": "Initial analysis has not been performed."}

    try:
        start_date = pd.to_datetime(start_date_str, utc=True)
        end_date = pd.to_datetime(end_date_str, utc=True) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)

        # Base filtering by date from main slider
        mask = (master_df['time'] >= start_date) & (master_df['time'] <= end_date)
        temp_df = master_df.loc[mask].copy()

        # Advanced filtering based on user clicks
        filters = json.loads(filters_json)
        for f in filters:
            filter_type = f.get('type')
            filter_value = f.get('value')
            if filter_type and filter_value is not None:
                if filter_type == 'artist':
                    temp_df = temp_df[temp_df['artist'] == filter_value]
                elif filter_type == 'song':
                    temp_df = temp_df[temp_df['artist_title'] == filter_value]
                elif filter_type == 'day':
                    filter_date = pd.to_datetime(filter_value).date()
                    temp_df = temp_df[temp_df['time'].dt.date == filter_date]
                elif filter_type == 'hour':
                    hour_val = int(str(filter_value).split(':')[0])
                    temp_df = temp_df[temp_df['time'].dt.hour == hour_val]
                elif filter_type == 'dayofweek':
                    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    day_index = days.index(filter_value)
                    temp_df = temp_df[temp_df['time'].dt.dayofweek == day_index]
                elif filter_type == 'song_in_period':
                    filter_data = json.loads(filter_value)
                    song_title = filter_data['song']
                    period_str = filter_data['period']
                    period_type = filter_data['period_type']

                    temp_df = temp_df[temp_df['artist_title'] == song_title]

                    if period_type == 'week':
                        start_period = pd.to_datetime(period_str, utc=True)
                        end_period = start_period + pd.Timedelta(days=7)
                        temp_df = temp_df[(temp_df['time'] >= start_period) & (temp_df['time'] < end_period)]
                    elif period_type == 'month':
                        start_period = pd.to_datetime(period_str, format='%b %Y', utc=True)
                        end_period = start_period + pd.DateOffset(months=1)
                        temp_df = temp_df[(temp_df['time'] >= start_period) & (temp_df['time'] < end_period)]

        # Text search
        if search_term:
            filtered_df = temp_df[temp_df['artist_title'].str.contains(search_term, case=False)]
        else:
            filtered_df = temp_df

        # Pagination
        total_items = len(filtered_df)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_df = filtered_df.iloc[start_index:end_index]

        # Format for JS
        history_list = paginated_df[['artist_title', 'time']].copy()
        history_list['time'] = history_list['time'].dt.strftime('%Y-%m-%d %H:%M:%S')

        return {
            "history": history_list.to_dict(orient='records'),
            "total_items": total_items,
            "page": page,
            "page_size": page_size
        }

    except Exception as e:
        return {"error": f"An error occurred while fetching history: {str(e)}"}

import js
js.perform_initial_analysis = perform_initial_analysis
js.get_stats_for_period = get_stats_for_period
js.get_filtered_history = get_filtered_history
            
