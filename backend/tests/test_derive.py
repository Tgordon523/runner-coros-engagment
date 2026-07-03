from app.ingest.derive import effort_bucket, pace_s_per_mi, time_of_day

MAX_HR = 190  # boundaries: 70% = 133, 80% = 152, 90% = 171


def test_effort_boundaries():
    assert effort_bucket(132, MAX_HR) == "easy"
    assert effort_bucket(133, MAX_HR) == "moderate"
    assert effort_bucket(151, MAX_HR) == "moderate"
    assert effort_bucket(152, MAX_HR) == "hard"
    assert effort_bucket(170, MAX_HR) == "hard"
    assert effort_bucket(171, MAX_HR) == "max"
    assert effort_bucket(190, MAX_HR) == "max"


def test_effort_no_hr():
    assert effort_bucket(None, MAX_HR) is None


def test_time_of_day_buckets():
    assert time_of_day(5) == "morning"
    assert time_of_day(11) == "morning"
    assert time_of_day(12) == "lunch"
    assert time_of_day(13) == "lunch"
    assert time_of_day(14) == "evening"
    assert time_of_day(20) == "evening"
    assert time_of_day(21) == "night"
    assert time_of_day(4) == "night"


def test_pace():
    # 3.352 m/s ~ 8:00 min/mi
    assert abs(pace_s_per_mi(3.3528) - 480) < 1
    assert pace_s_per_mi(0) is None
    assert pace_s_per_mi(None) is None
