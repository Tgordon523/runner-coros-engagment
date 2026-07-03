from app.privacy import apply_privacy_zones

# ~111m per 0.001 deg lat at this latitude
HOME = {"lat": 41.88, "lon": -87.63, "radius_m": 200}


def _track(points):
    return {"run_id": 1, "started_at": "x", "distance_mi": 5, "effort": "easy",
            "points": points}


def _pt(lat, lon):
    return [lon, lat, 0.0, 140, 480.0]


def test_points_inside_zone_trimmed():
    tracks = [_track([
        _pt(41.88, -87.63),        # at the center -> trimmed
        _pt(41.8805, -87.63),      # ~55m -> trimmed
        _pt(41.89, -87.63),        # ~1.1km -> kept
    ])]
    out = apply_privacy_zones(tracks, [HOME])
    assert len(out[0]["points"]) == 1
    assert out[0]["points"][0][1] == 41.89


def test_fully_trimmed_run_disappears():
    tracks = [_track([_pt(41.88, -87.63)])]
    assert apply_privacy_zones(tracks, [HOME]) == []


def test_no_zones_passthrough():
    tracks = [_track([_pt(41.88, -87.63)])]
    assert apply_privacy_zones(tracks, []) is tracks


def test_multiple_zones():
    z2 = {"lat": 41.89, "lon": -87.63, "radius_m": 200}
    tracks = [_track([_pt(41.88, -87.63), _pt(41.89, -87.63), _pt(41.885, -87.63)])]
    out = apply_privacy_zones(tracks, [HOME, z2])
    assert len(out[0]["points"]) == 1  # only the midpoint survives
