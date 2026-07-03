"""Goal projection math, purely. See CONTEXT.md: Goal is always the whole
calendar year, unfiltered."""

from datetime import date


def goal_status(target_mi: float, ytd_mi: float, today: date) -> dict:
    """On-track status for an annual mileage Goal as of `today`."""
    year_start = date(today.year, 1, 1)
    year_end = date(today.year, 12, 31)
    days_in_year = (year_end - year_start).days + 1
    day_of_year = (today - year_start).days + 1
    elapsed = day_of_year / days_in_year

    if target_mi <= 0:
        return {
            "target_mi": 0,
            "ytd_mi": round(ytd_mi, 1),
            "elapsed_fraction": round(elapsed, 4),
            "required_to_date_mi": None,
            "projected_mi": None,
            "required_per_week_mi": None,
            "on_track": None,
        }

    required_to_date = target_mi * elapsed
    projected = ytd_mi / elapsed
    days_left = days_in_year - day_of_year
    weeks_left = max(days_left / 7, 1e-9)
    remaining = max(target_mi - ytd_mi, 0)

    return {
        "target_mi": target_mi,
        "ytd_mi": round(ytd_mi, 1),
        "elapsed_fraction": round(elapsed, 4),
        "required_to_date_mi": round(required_to_date, 1),
        "projected_mi": round(projected, 1),
        "required_per_week_mi": round(remaining / weeks_left, 1),
        "on_track": ytd_mi >= required_to_date,
    }
