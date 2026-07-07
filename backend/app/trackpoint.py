"""Wire layout of a Track Point as served by /api/tracks.

One point is [lon, lat, t_offset_s, hr, pace_s_per_mi] — a compact positional
tuple (deck.gl-friendly). This module is the only place that order is known:
consumers use the named indices, and the SELECT list is derived from the same
definition. The frontend mirror lives in frontend/src/trackpoint.ts; the two
must change together.
"""

WIRE_COLUMNS = ("lon", "lat", "t_offset_s", "hr", "pace_s_per_mi")
WIRE_SELECT = ", ".join(WIRE_COLUMNS)

LON, LAT, T_OFFSET_S, HR, PACE_S_PER_MI = range(len(WIRE_COLUMNS))
