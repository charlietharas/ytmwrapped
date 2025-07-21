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

def get_stats_for_period(start_date_str, end_date_str, filters_json="[]"):
    global master_df
    if master_df is None:
        return {"error": "Initial analysis has not been performed."}
    try:
        start_date = pd.to_datetime(start_date_str, utc=True)
        end_date = pd.to_datetime(end_date_str, utc=True) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
        
        # This is the main dataframe for the selected time period
        time_mask = (master_df['time'] >= start_date) & (master_df['time'] <= end_date)
        period_df = master_df.loc[time_mask].copy()

        # This is the more specific dataframe based on active filters (e.g., song, artist)
        active_filter_df = apply_active_filters(period_df, filters_json)

        # Timeline data should always cover the full range
        songs_per_day = master_df.groupby(master_df['time'].dt.date).size()
        songs_per_day_serializable = {day.strftime('%Y-%m-%d'): count for day, count in songs_per_day.items()}

        if period_df.empty:
            return {
                "total_videos": 0, "top_songs": {}, "top_artists": {},
                "songs_per_day": songs_per_day_serializable,
                "songs_per_hour": {}, "songs_per_day_of_week": {},
                "top_songs_weekly": {}, "top_songs_monthly": {}
            }
        
        # All other stats are based on the filtered period
        total_videos = len(period_df)
        
        # Create a mapping from video_id to artist_title for display
        video_id_to_display_name = period_df.drop_duplicates(subset=['video_id'])[['video_id', 'artist_title']].set_index('video_id')
        
        # --- Calculate Stacked Chart Data ---
        def get_stacked_data(full_df, filtered_df, group_by_col):
            total_counts = full_df[group_by_col].value_counts()
            filtered_counts = filtered_df[group_by_col].value_counts()
            
            # Combine the two series, fill missing values with 0, and sort by total
            combined = pd.DataFrame({'total': total_counts, 'filtered': filtered_counts}).fillna(0)
            combined.sort_values(by='total', ascending=False, inplace=True)
            combined['other'] = combined['total'] - combined['filtered']
            
            # For display, map video_id to artist_title if needed
            if group_by_col == 'video_id':
                display_names = full_df.drop_duplicates(subset=['video_id'])[['video_id', 'artist_title']].set_index('video_id')
                combined.index = combined.index.map(display_names['artist_title'])

            return {
                'labels': combined.index.tolist(),
                'datasets': [
                    {'label': 'Filtered', 'data': combined['filtered'].astype(int).tolist()},
                    {'label': 'Other', 'data': combined['other'].astype(int).tolist()}
                ]
            }

        top_songs_stacked = get_stacked_data(period_df, active_filter_df, 'video_id')
        top_artists_stacked = get_stacked_data(period_df, active_filter_df, 'artist')

        def get_stacked_time_data(full_df, filtered_df, time_attr):
            total_counts = full_df.groupby(getattr(full_df['time'].dt, time_attr)).size()
            filtered_counts = filtered_df.groupby(getattr(filtered_df['time'].dt, time_attr)).size()
            
            if time_attr == 'hour':
                labels = list(range(24))
                total_counts = total_counts.reindex(labels, fill_value=0)
                filtered_counts = filtered_counts.reindex(labels, fill_value=0)
            elif time_attr == 'dayofweek':
                day_map = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                labels = day_map
                total_counts.index = [day_map[i] for i in total_counts.index]
                filtered_counts.index = [day_map[i] for i in filtered_counts.index]
                total_counts = total_counts.reindex(labels, fill_value=0)
                filtered_counts = filtered_counts.reindex(labels, fill_value=0)
            else: # 'date'
                all_dates = sorted(full_df.groupby(full_df['time'].dt.date).size().index.unique().tolist())
                labels = [d.strftime('%Y-%m-%d') for d in all_dates]
                
                total_counts.index = total_counts.index.map(lambda d: d.strftime('%Y-%m-%d'))
                filtered_counts.index = filtered_counts.index.map(lambda d: d.strftime('%Y-%m-%d'))
                
                total_counts = total_counts.reindex(labels, fill_value=0)
                filtered_counts = filtered_counts.reindex(labels, fill_value=0)

            combined = pd.DataFrame({'total': total_counts, 'filtered': filtered_counts})
            combined['other'] = combined['total'] - combined['filtered']

            return {
                'labels': combined.index.tolist(),
                'datasets': [
                    {'label': 'Filtered', 'data': combined['filtered'].astype(int).tolist()},
                    {'label': 'Other', 'data': combined['other'].astype(int).tolist()}
                ]
            }

        songs_per_hour_stacked = get_stacked_time_data(period_df, active_filter_df, 'hour')
        songs_per_day_of_week_stacked = get_stacked_time_data(period_df, active_filter_df, 'dayofweek')
        songs_per_day_stacked = get_stacked_time_data(period_df, active_filter_df, 'date')

        # --- Legacy data for non-stacked views (can be removed later) ---
        top_songs = period_df['video_id'].value_counts().rename(index=video_id_to_display_name['artist_title']).to_dict()
        top_artists = period_df['artist'].value_counts().to_dict()
        
        top_songs_weekly_by_id = period_df.groupby([pd.Grouper(key='time', freq='W-MON'), 'video_id']).size()
        top_songs_monthly_by_id = period_df.groupby([pd.Grouper(key='time', freq='MS'), 'video_id']).size()

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

        return {
            "total_videos": total_videos,
            "top_songs": top_songs,
            "top_artists": top_artists,
            "songs_per_day": songs_per_day_serializable,
            "top_songs_stacked": top_songs_stacked,
            "top_artists_stacked": top_artists_stacked,
            "songs_per_hour_stacked": songs_per_hour_stacked,
            "songs_per_day_of_week_stacked": songs_per_day_of_week_stacked,
            "songs_per_day_stacked": songs_per_day_stacked,
            "top_songs_weekly": weekly_dict,
            "top_songs_monthly": monthly_dict
        }

    except Exception as e:
        return {"error": f"An error occurred while filtering stats: {str(e)}"}

def apply_active_filters(df, filters_json):
    """Helper function to apply JSON filters to a dataframe with OR/AND logic."""
    filters = json.loads(filters_json)
    if not filters:
        return df.copy()

    # Group filters by their type
    grouped_filters = {}
    for f in filters:
        filter_type = f.get('type')
        filter_value = f.get('value')
        if not filter_type or filter_value is None:
            continue
        if filter_type not in grouped_filters:
            grouped_filters[filter_type] = []
        grouped_filters[filter_type].append(filter_value)

    # Start with a mask that includes all rows
    final_mask = pd.Series(True, index=df.index)

    # Apply OR logic within each category and AND logic between categories
    for filter_type, values in grouped_filters.items():
        category_mask = pd.Series(False, index=df.index)
        
        if filter_type == 'artist':
            category_mask = df['artist'].isin(values)
        elif filter_type == 'song':
            category_mask = df['artist_title'].isin(values)
        elif filter_type == 'day':
            dates = [pd.to_datetime(v).date() for v in values]
            category_mask = df['time'].dt.date.isin(dates)
        elif filter_type == 'hour':
            hours = [int(str(v).split(':')[0]) for v in values]
            category_mask = df['time'].dt.hour.isin(hours)
        elif filter_type == 'dayofweek':
            day_map = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            day_indices = [day_map.index(v) for v in values]
            category_mask = df['time'].dt.dayofweek.isin(day_indices)
        elif filter_type == 'song_in_period':
            # This filter type is special and is treated as an AND with itself
            for v in values:
                filter_data = json.loads(v)
                song_title = filter_data['song']
                period_str = filter_data['period']
                period_type = filter_data['period_type']
                
                song_mask = df['artist_title'] == song_title
                
                if period_type == 'week':
                    start_period = pd.to_datetime(period_str, utc=True)
                    end_period = start_period + pd.Timedelta(days=7)
                    time_mask = (df['time'] >= start_period) & (df['time'] < end_period)
                elif period_type == 'month':
                    start_period = pd.to_datetime(period_str, format='%b %Y', utc=True)
                    end_period = start_period + pd.DateOffset(months=1)
                    time_mask = (df['time'] >= start_period) & (df['time'] < end_period)
                
                final_mask &= (song_mask & time_mask)
            continue # Skip the final_mask update below

        final_mask &= category_mask

    return df[final_mask].copy()

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
            
