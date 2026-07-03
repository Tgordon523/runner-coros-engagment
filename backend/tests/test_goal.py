from datetime import date

from app.goal import goal_status


def test_on_track_midyear():
    # July 2 2026 = day 183 of 365
    g = goal_status(1000, 520, date(2026, 7, 2))
    assert g["on_track"] is True
    assert g["required_to_date_mi"] == round(1000 * 183 / 365, 1)
    assert g["projected_mi"] == round(520 / (183 / 365), 1)


def test_behind_pace():
    g = goal_status(1000, 400, date(2026, 7, 2))
    assert g["on_track"] is False
    assert g["required_per_week_mi"] > 1000 / 52  # must run faster than even split


def test_unset_goal():
    g = goal_status(0, 300, date(2026, 7, 2))
    assert g["on_track"] is None
    assert g["projected_mi"] is None
    assert g["ytd_mi"] == 300


def test_year_end_exact():
    g = goal_status(1000, 1000, date(2026, 12, 31))
    assert g["on_track"] is True
    assert g["elapsed_fraction"] == 1.0
    assert g["projected_mi"] == 1000.0
