import json
import pandas as pd
from io import StringIO
from urllib.parse import urlparse, parse_qs
import hashlib

master_df = None
filtered_df = None
filtered_truncated_df = None
min_date = None
max_date = None

# Cache for pre-computed aggregations
cached_aggregations = {
    'artists_total': None,
    'artists_filtered': None,
    'songs_total': None,
    'songs_filtered': None,
    'hourly_total': None,
    'hourly_filtered': None,
    'daily_total': None,
    'daily_filtered': None,
    'monthly_total': None,
    'monthly_filtered': None,
    'yearly_total': None,
    'yearly_filtered': None,
    'current_filters_hash': None
}

def _merge_histories(histories):
    merged_history = []
    for history in histories:
        if isinstance(history, list):
            merged_history.extend(history)
    return merged_history

def _clean_data(item):
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
        
        return title, artist, video_id, item.get('time')
    except (TypeError, AttributeError, KeyError):
        return None, None, None, None

def perform_initial_analysis(history_data_proxy):
    global master_df, min_date, max_date
    try:
        history_data = history_data_proxy.to_py()
        merged_history = _merge_histories(history_data)
        
        processed_data = [
            data for item in merged_history 
            if isinstance(item, dict) and 'time' in item 
            and (data := _clean_data(item)) and data[0] is not None
        ]
        
        if not processed_data:
            return {"error": "No valid YouTube Music history found."}

        df = pd.DataFrame(processed_data, columns=['title', 'artist', 'video_id', 'time'])
        df['time'] = pd.to_datetime(df['time'], utc=True, errors='coerce')
        df.dropna(subset=['time'], inplace=True)
        df.sort_values(by='time', inplace=True)
        df.drop_duplicates(subset=['time', 'video_id'], keep='first', inplace=True)
        
        df['artist_title'] = df['artist'] + ' - ' + df['title']
        
        master_df = df
        min_date = df['time'].min().isoformat()
        max_date = df['time'].max().isoformat()
        
        return {"success": True}

    except Exception as e:
        return {"error": f"An initial analysis error occurred: {str(e)}"}

def export_master_df_to_csv():
    global master_df
    if master_df is None:
        return {"error": "No data to export"}
    try:
        return {"csv": master_df.to_csv(index=False)}
    except Exception as e:
        return {"error": f"Failed to export dataframe: {str(e)}"}

def load_master_df_from_csv(csv_string):
    global master_df, min_date, max_date
    try:
        master_df = pd.read_csv(StringIO(csv_string))
        master_df['time'] = pd.to_datetime(master_df['time'], utc=True)
        min_date = master_df['time'].min().isoformat()
        max_date = master_df['time'].max().isoformat()
        return {"success": True}
    except Exception as e:
        return {"error": f"Failed to load dataframe from CSV: {str(e)}"}

def get_date_range():
    if master_df is None or min_date is None or max_date is None:
        return {"error": "Master dataframe not initialized."}
    return {"min_date": min_date, "max_date": max_date}

def _apply_filters(df, filters):
    if not filters:
        return pd.Series(True, index=df.index)

    final_mask = pd.Series(True, index=df.index)

    for filter_type, values in filters.items():
        if not values: continue
        category_mask = pd.Series(False, index=df.index)
        if filter_type == 'artist':
            category_mask = df['artist'].isin(values)
        elif filter_type == 'song':
            category_mask = df['artist_title'].isin(values)
        elif filter_type == 'hour':
            category_mask = df['time_local'].dt.hour.isin(values)
        elif filter_type == 'dayOfWeek':
            category_mask = df['time_local'].dt.dayofweek.isin(values)
        elif filter_type == 'month':
            category_mask = df['time_local'].dt.month.isin(values)
        elif filter_type == 'dateRange':
            for date_range in values:
                start_date = pd.to_datetime(date_range['start'], utc=True).normalize()
                end_date = pd.to_datetime(date_range['end'], utc=True).normalize() + pd.Timedelta(days=1, microseconds=-1)
                range_mask = (df['time'] >= start_date) & (df['time'] <= end_date)
                category_mask |= range_mask
        
        final_mask &= category_mask
        
    return final_mask

def _get_filtered_df(filters_json="[]", filter_by_date=True, timezone="UTC"):
    if master_df is None or min_date is None or max_date is None:
        return None

    filters = json.loads(filters_json)
    grouped_filters = {}
    for f in filters:
        filter_type, filter_value = f.get('type'), f.get('value')
        if filter_type and filter_value is not None:
            grouped_filters.setdefault(filter_type, []).append(filter_value)

    start_date = pd.to_datetime(min_date, utc=True)
    end_date = pd.to_datetime(max_date, utc=True)

    if filter_by_date:
        found_date_range = False
        for filter_type, values in grouped_filters.items():
            if found_date_range: break
            if filter_type == 'dateRange':
                for date_range in values:
                    start_date = pd.to_datetime(date_range['start'], utc=True)
                    end_date = pd.to_datetime(date_range['end'], utc=True)
                    found_date_range = True
                    break

    time_mask = (master_df['time'] >= start_date) & (master_df['time'] <= end_date)
    period_df = master_df.loc[time_mask].copy()

    if period_df.empty:
        return period_df

    period_df['time_local'] = period_df['time'].dt.tz_convert(timezone)
    filter_mask = _apply_filters(period_df, grouped_filters)
    period_df['matches_filter'] = filter_mask.astype(int)
    
    return period_df

def generate_filtered_dfs(filters_json="[]", timezone="UTC"):
    global filtered_df, filtered_truncated_df
    try:
        filtered_truncated_df = _get_filtered_df(filters_json, timezone=timezone)

        filters = json.loads(filters_json)
        grouped_filters = {}
        for f in filters:
            filter_type, filter_value = f.get('type'), f.get('value')
            if filter_type and filter_value is not None:
                grouped_filters.setdefault(filter_type, []).append(filter_value)

        # Apply filters to master_df without date filtering
        if master_df is not None:
            filtered_df = master_df.copy()
            filtered_df['time_local'] = filtered_df['time'].dt.tz_convert(timezone)
            if grouped_filters:
                filter_mask = _apply_filters(filtered_df, grouped_filters)
                filtered_df['matches_filter'] = filter_mask.astype(int)
            else:
                filtered_df['matches_filter'] = 1
        else:
            filtered_df = None

        _compute_aggregations()

        return {"success": True}
    except Exception as e:
        return {"error": f"Error in generate_filtered_dfs: {str(e)}"}

def _compute_aggregations():
    global filtered_truncated_df, cached_aggregations

    if filtered_truncated_df is None or filtered_truncated_df.empty:
        return

    filters_hash = hashlib.md5(str(filtered_truncated_df['matches_filter'].values.tobytes()).encode()).hexdigest()

    # Skip if aggregations are already computed for these filters
    if cached_aggregations['current_filters_hash'] == filters_hash:
        return

    time_local = filtered_truncated_df['time_local']

    cached_aggregations['artists_total'] = filtered_truncated_df.groupby('artist').size()
    cached_aggregations['artists_filtered'] = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby('artist').size()

    cached_aggregations['songs_total'] = filtered_truncated_df.groupby('artist_title').size()
    cached_aggregations['songs_filtered'] = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby('artist_title').size()

    cached_aggregations['hourly_total'] = filtered_truncated_df.groupby(time_local.dt.hour).size()
    cached_aggregations['hourly_filtered'] = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby(time_local.dt.hour).size()

    cached_aggregations['daily_total'] = filtered_truncated_df.groupby(time_local.dt.dayofweek).size()
    cached_aggregations['daily_filtered'] = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby(time_local.dt.dayofweek).size()

    cached_aggregations['monthly_total'] = filtered_truncated_df.groupby(time_local.dt.month).size()
    cached_aggregations['monthly_filtered'] = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby(time_local.dt.month).size()

    cached_aggregations['yearly_total'] = filtered_truncated_df.groupby(time_local.dt.year).size()
    cached_aggregations['yearly_filtered'] = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby(time_local.dt.year).size()

    cached_aggregations['current_filters_hash'] = filters_hash

def get_key_statistics_card_data():
    global filtered_df
    try:
        period_df = filtered_df
        if period_df is None or period_df.empty:
            return {"total_plays": 0, "total_unique_songs": 0, "total_unique_artists": 0,
                    "mean_replays": 0, "replay_quantiles": [0, 0, 0],
                    "filtered_plays": 0, "filtered_unique_songs": 0, "filtered_unique_artists": 0,
                    "filtered_mean_replays": 0, "filtered_replay_quantiles": [0, 0, 0]}

        # Unfiltered stats
        total_replays = period_df['video_id'].value_counts()
        mean_replays = total_replays.mean()
        replay_quantiles = total_replays.quantile([0.25, 0.5, 0.75]).tolist()

        # Filtered stats
        period_df_filtered = period_df[period_df['matches_filter'] == 1]
        if not period_df_filtered.empty:
            filtered_replays = period_df_filtered['video_id'].value_counts()
            filtered_mean_replays = filtered_replays.mean()
            filtered_replay_quantiles = filtered_replays.quantile([0.25, 0.5, 0.75]).tolist()
        else:
            filtered_mean_replays = 0
            filtered_replay_quantiles = [0, 0, 0]

        return {
            "total_plays": len(period_df),
            "total_unique_songs": period_df['video_id'].nunique(),
            "total_unique_artists": period_df['artist'].nunique(),
            "mean_replays": mean_replays,
            "replay_quantiles": replay_quantiles,
            "filtered_plays": len(period_df_filtered),
            "filtered_unique_songs": period_df_filtered['video_id'].nunique(),
            "filtered_unique_artists": period_df_filtered['artist'].nunique(),
            "filtered_mean_replays": filtered_mean_replays,
            "filtered_replay_quantiles": filtered_replay_quantiles,
        }
    except Exception as e:
        return {"error": f"Error in Key Statistics: {str(e)}"}

def get_timeline_card_data():
    global filtered_truncated_df
    try:
        period_df = filtered_truncated_df
        if period_df is None or period_df.empty:
            return {'day': {'labels': [], 'datasets': []},
                    'week': {'labels': [], 'datasets': []},
                    'month': {'labels': [], 'datasets': []}}

        # Ensure 'time_local' is the index for resampling
        df_resample = period_df.set_index('time_local')

        results = {}
        for period in ['D', 'W-MON', 'M']:
            # Total counts
            total_counts = df_resample.resample(period).size()
            
            # Filtered counts
            filtered_counts = df_resample[df_resample['matches_filter'] == 1].resample(period).size()

            # Create a DataFrame from the resampled data
            combined = pd.DataFrame({'total': total_counts, 'filtered': filtered_counts}).fillna(0)
            combined['other'] = combined['total'] - combined['filtered']

            period_name = 'day'
            labels = combined.index
            if period == 'W-MON':
                period_name = 'week'
            elif period == 'M':
                period_name = 'month'

            if period == 'M':
                formatted_labels = labels.strftime('%b %Y').tolist()
            else:
                formatted_labels = labels.strftime('%Y-%m-%d').tolist()

            results[period_name] = {
                'labels': formatted_labels,
                'datasets': [
                    {'label': 'Filtered', 'data': combined['filtered'].astype(int).tolist()},
                    {'label': 'Other', 'data': combined['other'].astype(int).tolist()}
                ]
            }
        
        return results
    except Exception as e:
        return {"error": f"Error in Timeline: {str(e)}"}

def get_hour_card_data():
    global filtered_truncated_df, cached_aggregations
    try:
        if filtered_truncated_df is None or filtered_truncated_df.empty:
            return {'labels': [], 'datasets': []}

        # Use cached aggregations if available
        if cached_aggregations['hourly_total'] is not None:
            total_counts = cached_aggregations['hourly_total']
            filtered_counts = cached_aggregations['hourly_filtered']
        else:
            time_local = filtered_truncated_df['time_local']
            total_counts = filtered_truncated_df.groupby(time_local.dt.hour).size()
            filtered_counts = filtered_truncated_df[filtered_truncated_df['matches_filter'] == 1].groupby(time_local.dt.hour).size()

        all_hours = pd.Series(index=range(24), dtype=int)
        total_counts = total_counts.reindex(all_hours.index, fill_value=0)
        filtered_counts = filtered_counts.reindex(all_hours.index, fill_value=0)

        other_counts = total_counts - filtered_counts

        hour_labels = [f"{hour:02d}" for hour in range(24)]

        return {
            'labels': hour_labels,
            'datasets': [
                {'label': 'Filtered', 'data': filtered_counts.astype(int).tolist()},
                {'label': 'Other', 'data': other_counts.astype(int).tolist()}
            ]
        }

    except Exception as e:
        return {"error": f"Error in Hour: {str(e)}"}

def get_week_card_data():
    global filtered_truncated_df
    try:
        period_df = filtered_truncated_df
        if period_df is None or period_df.empty:
            return {'labels': [], 'datasets': []}

        time_local = period_df['time_local']
        
        total_counts = period_df.groupby(time_local.dt.dayofweek).size()
        filtered_counts = period_df[period_df['matches_filter'] == 1].groupby(time_local.dt.dayofweek).size()
        
        all_days = pd.Series(index=range(7), dtype=int)
        total_counts = total_counts.reindex(all_days.index, fill_value=0)
        filtered_counts = filtered_counts.reindex(all_days.index, fill_value=0)
        
        other_counts = total_counts - filtered_counts
        
        day_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] # monday=0 in pandas
        
        return {
            'labels': day_labels,
            'datasets': [
                {'label': 'Filtered', 'data': filtered_counts.astype(int).tolist()},
                {'label': 'Other', 'data': other_counts.astype(int).tolist()}
            ]
        }
            
    except Exception as e:
        return {"error": f"Error in Week: {str(e)}"}

def get_month_card_data():
    global filtered_truncated_df
    try:
        period_df = filtered_truncated_df
        if period_df is None or period_df.empty:
            return {'labels': [], 'datasets': []}

        time_local = period_df['time_local']
        
        total_counts = period_df.groupby(time_local.dt.month).size()
        filtered_counts = period_df[period_df['matches_filter'] == 1].groupby(time_local.dt.month).size()
        
        all_months = pd.Series(index=range(1, 13), dtype=int)
        total_counts = total_counts.reindex(all_months.index, fill_value=0)
        filtered_counts = filtered_counts.reindex(all_months.index, fill_value=0)
        
        other_counts = total_counts - filtered_counts
        
        month_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        return {
            'labels': month_labels,
            'datasets': [
                {'label': 'Filtered', 'data': filtered_counts.astype(int).tolist()},
                {'label': 'Other', 'data': other_counts.astype(int).tolist()}
            ]
        }
            
    except Exception as e:
        return {"error": f"Error in Month: {str(e)}"}

def get_year_card_data():
    global filtered_truncated_df
    try:
        period_df = filtered_truncated_df
        if period_df is None or period_df.empty:
            return {'labels': [], 'datasets': []}

        time_local = period_df['time_local']
        
        total_counts = period_df.groupby(time_local.dt.year).size()
        filtered_counts = period_df[period_df['matches_filter'] == 1].groupby(time_local.dt.year).size()
        
        all_years = pd.Series(index=range(time_local.dt.year.min(), time_local.dt.year.max() + 1), dtype=int)
        total_counts = total_counts.reindex(all_years.index, fill_value=0)
        filtered_counts = filtered_counts.reindex(all_years.index, fill_value=0)
        
        other_counts = total_counts - filtered_counts
        
        year_labels = [str(year) for year in all_years.index]
        
        return {
            'labels': year_labels,
            'datasets': [
                {'label': 'Filtered', 'data': filtered_counts.astype(int).tolist()},
                {'label': 'Other', 'data': other_counts.astype(int).tolist()}
            ]
        }
            
    except Exception as e:
        return {"error": f"Error in Year: {str(e)}"}

def get_artists_data():
    global filtered_truncated_df
    try:
        period_df = filtered_truncated_df
        if period_df is None or period_df.empty:
            return {'labels': [], 'datasets': []}

        total_counts = period_df.groupby('artist').size()
        filtered_counts = period_df[period_df['matches_filter'] == 1].groupby('artist').size()
        
        combined = pd.DataFrame({'total': total_counts, 'filtered': filtered_counts}).fillna(0)
        combined['other'] = combined['total'] - combined['filtered']
        
        combined = combined.sort_values('total', ascending=False)
        
        return {
            'labels': combined.index.tolist(),
            'datasets': [
                {'label': 'Filtered', 'data': combined['filtered'].astype(int).tolist()},
                {'label': 'Other', 'data': combined['other'].astype(int).tolist()}
            ]
        }
    except Exception as e:
        return {"error": f"Error in Artists Data: {str(e)}"}

def get_songs_data():
    global filtered_truncated_df
    try:
        period_df = filtered_truncated_df
        if period_df is None or period_df.empty:
            return {'labels': [], 'datasets': []}

        total_counts = period_df.groupby('artist_title').size()
        filtered_counts = period_df[period_df['matches_filter'] == 1].groupby('artist_title').size()
        
        combined = pd.DataFrame({'total': total_counts, 'filtered': filtered_counts}).fillna(0)
        combined['other'] = combined['total'] - combined['filtered']
        
        combined = combined.sort_values('total', ascending=False)
        
        return {
            'labels': combined.index.tolist(),
            'datasets': [
                {'label': 'Filtered', 'data': combined['filtered'].astype(int).tolist()},
                {'label': 'Other', 'data': combined['other'].astype(int).tolist()}
            ]
        }
    except Exception as e:
        return {"error": f"Error in Songs Data: {str(e)}"}

def get_history(offset=0, limit=1000):
    global filtered_truncated_df
    try:
        if filtered_truncated_df is None or filtered_truncated_df.empty:
            return {
                "data": [],
                "total_count": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False
            }

        total_count = len(filtered_truncated_df)

        paginated_df = filtered_truncated_df.iloc[offset:offset + limit]

        result_data = []
        for idx, row in paginated_df.iterrows():
            result_data.append({
                'time_local': row['time_local'].strftime('%Y-%m-%d %H:%M:%S'),
                'artist': row['artist'],
                'song': row['title']
            })

        result = {
            'data': result_data,
            'total_count': total_count,
            'offset': offset,
            'limit': limit,
            'has_more': offset + limit < total_count
        }
        return result
    except Exception as e:
        return {
            "error": f"An error occurred in get_history: {str(e)}",
            "data": [],
            "total_count": 0,
            "offset": offset,
            "limit": limit,
            "has_more": False
        }

def register_functions():
    function_map = {
        "perform_initial_analysis": perform_initial_analysis,
        "export_master_df_to_csv": export_master_df_to_csv,
        "load_master_df_from_csv": load_master_df_from_csv,
        "get_date_range": get_date_range,
        "generate_filtered_dfs": generate_filtered_dfs,
        "get_key_statistics_card_data": get_key_statistics_card_data,
        "get_timeline_card_data": get_timeline_card_data,
        "get_hour_card_data": get_hour_card_data,
        "get_week_card_data": get_week_card_data,
        "get_month_card_data": get_month_card_data,
        "get_year_card_data": get_year_card_data,
        "get_artists_data": get_artists_data,
        "get_songs_data": get_songs_data,
        "get_history": get_history,
    }
    # This part is for Pyodide to bridge Python functions to JavaScript
    import js
    for name, func in function_map.items():
        setattr(js, name, func)
    # This part is for making the functions callable within the Python script itself
    for name, func in function_map.items():
        globals()[name] = func

register_functions()
            
