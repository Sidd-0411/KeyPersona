"""
Feature Extraction Service
Transforms raw keystroke events into a 22-dimensional feature vector.
"""
import numpy as np
from scipy import stats


FEATURE_NAMES = [
    "dw_mean", "dw_std", "dw_median", "dw_skew",
    "fl_mean", "fl_std", "fl_median", "fl_skew",
    "digraph_mean", "neg_flight_ratio",
    "typing_speed", "speed_variability", "burstiness",
    "backspace_rate", "long_pause_freq", "shift_ratio",
    "special_key_ratio", "error_to_speed", "pause_variability",
    "typing_acceleration", "key_diversity", "rhythm_regularity"
]


def extract_features(events):
    """
    Extract 22 keystroke features from a list of event dicts.
    Each event: {type, key, code, timestamp, is_repeat}
    Returns: numpy array of shape (22,) or None if insufficient data.
    """
    if len(events) < 30:
        return None

    # Sort by timestamp
    events = sorted(events, key=lambda e: e['timestamp'])

    # Filter out auto-repeats
    events = [e for e in events if not e.get('is_repeat', False)]

    keydowns = [e for e in events if e['event_type'] == 'keydown']
    keyups = [e for e in events if e['event_type'] == 'keyup']

    if len(keydowns) < 15:
        return None

    # --- Dwell times ---
    dwells = []
    down_map = {}
    for e in events:
        if e['event_type'] == 'keydown':
            down_map[e['code']] = e['timestamp']
        elif e['event_type'] == 'keyup' and e['code'] in down_map:
            dw = e['timestamp'] - down_map.pop(e['code'])
            if 0 < dw < 2000:
                dwells.append(dw)

    if len(dwells) < 10:
        return None

    dwells = np.array(dwells)

    # --- Flight times (inter-key intervals between consecutive keydowns) ---
    down_ts = np.array([e['timestamp'] for e in keydowns])
    flights_raw = np.diff(down_ts)
    flights = flights_raw[np.abs(flights_raw) < 5000]

    if len(flights) < 10:
        return None

    # --- Negative flight times (overlapping keys) ---
    neg_flights = np.sum(flights < 0)

    # Positive flights for stats
    pos_flights = flights[flights > 0]
    if len(pos_flights) < 5:
        pos_flights = np.abs(flights)

    # --- Basic timing stats ---
    dw_mean = np.mean(dwells)
    dw_std = np.std(dwells)
    dw_median = np.median(dwells)
    dw_skew = float(stats.skew(dwells)) if len(dwells) > 3 else 0.0

    fl_mean = np.mean(pos_flights)
    fl_std = np.std(flights)  # Use all flights for variability
    fl_median = np.median(pos_flights)
    fl_skew = float(stats.skew(pos_flights)) if len(pos_flights) > 3 else 0.0

    digraph_mean = dw_mean + fl_mean  # Approximation
    neg_flight_ratio = neg_flights / max(len(flights), 1)

    # --- Higher-order features ---
    total_keys = len(keydowns)
    duration_s = (events[-1]['timestamp'] - events[0]['timestamp']) / 1000.0
    typing_speed = (total_keys / max(duration_s, 0.1)) * 60  # CPM

    # Speed variability (windowed CV)
    win_size, win_step = 20, 10
    win_speeds = []
    for i in range(0, max(1, len(down_ts) - win_size), win_step):
        w_dur = (down_ts[min(i + win_size, len(down_ts) - 1)] - down_ts[i]) / 1000.0
        if w_dur > 0:
            win_speeds.append(win_size / w_dur * 60)
    speed_variability = (np.std(win_speeds) / max(np.mean(win_speeds), 1)) if len(win_speeds) > 2 else 0.0

    # Burstiness
    iki = pos_flights
    burstiness = (np.std(iki) / max(np.mean(iki), 1)) if len(iki) > 2 else 0.0

    # Key-specific rates
    backspaces = sum(1 for e in keydowns if e['key'] in ('Backspace', 'Delete'))
    shifts = sum(1 for e in keydowns if e['key'] == 'Shift')
    specials = sum(1 for e in keydowns if e['key'] in ('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'))

    backspace_rate = backspaces / max(total_keys, 1)
    long_pause_freq = np.sum(flights > 2000) / max(total_keys, 1)
    shift_ratio = shifts / max(total_keys, 1)
    special_key_ratio = specials / max(total_keys, 1)
    error_to_speed = backspaces / max(typing_speed / 60, 0.1)

    # Pause variability
    pauses = flights[flights > 500]
    pause_variability = float(np.std(pauses)) if len(pauses) > 2 else 0.0

    # Typing acceleration (slope of speed over time)
    if len(win_speeds) > 3:
        x = np.arange(len(win_speeds))
        slope, _, _, _, _ = stats.linregress(x, win_speeds)
        typing_acceleration = float(slope) / max(np.mean(win_speeds), 1)
    else:
        typing_acceleration = 0.0

    # Key diversity (Shannon entropy)
    key_counts = {}
    for e in keydowns:
        key_counts[e['key']] = key_counts.get(e['key'], 0) + 1
    probs = np.array(list(key_counts.values())) / total_keys
    key_diversity = float(-np.sum(probs * np.log(probs + 1e-10)))

    # Rhythm regularity (lag-1 autocorrelation of IKI)
    rhythm_regularity = 0.0
    if len(iki) > 5:
        iki_centered = iki - np.mean(iki)
        num = np.sum(iki_centered[:-1] * iki_centered[1:])
        den = np.sum(iki_centered ** 2)
        if den > 0:
            rhythm_regularity = float(num / den)

    # Assemble feature vector
    features = np.array([
        dw_mean, dw_std, dw_median, dw_skew,
        fl_mean, fl_std, fl_median, fl_skew,
        digraph_mean, neg_flight_ratio,
        typing_speed, speed_variability, burstiness,
        backspace_rate, long_pause_freq, shift_ratio,
        special_key_ratio, error_to_speed, pause_variability,
        typing_acceleration, key_diversity, rhythm_regularity
    ], dtype=np.float64)

    # Replace NaN/Inf
    features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)

    return features


def features_to_dict(features):
    """Convert feature vector to named dict."""
    if features is None:
        return {}
    return {name: round(float(features[i]), 4) for i, name in enumerate(FEATURE_NAMES)}
