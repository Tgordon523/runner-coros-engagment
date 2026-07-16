"""Pure aggregations for the Dashboard: filtered run rows in, chart series out.

The store supplies rows and the goal inputs; everything here is testable with
plain dicts.
"""

from datetime import date, timedelta


def _week_start(d: str) -> str:
    """Monday of the week containing ISO date `d`."""
    day = date.fromisoformat(d)
    return (day - timedelta(days=day.weekday())).isoformat()


def weekly_mileage(runs: list[dict]) -> list[dict]:
    """Miles per week (Monday-keyed) plus running cumulative, gaps filled."""
    if not runs:
        return []
    by_week: dict[str, float] = {}
    for r in runs:
        wk = _week_start(r["local_date"])
        by_week[wk] = by_week.get(wk, 0.0) + r["distance_mi"]

    first = date.fromisoformat(min(by_week))
    last = date.fromisoformat(max(by_week))
    out = []
    cumulative = 0.0
    wk = first
    while wk <= last:
        miles = by_week.get(wk.isoformat(), 0.0)
        cumulative += miles
        out.append(
            {
                "week_start": wk.isoformat(),
                "miles": round(miles, 2),
                "cumulative_mi": round(cumulative, 2),
            }
        )
        wk += timedelta(days=7)
    return out


def daily_mileage(runs: list[dict]) -> list[dict]:
    """Miles per Run Day plus running cumulative. Only days with runs appear
    — no gap fill, unlike weeks (see CONTEXT.md "Run Day")."""
    by_day: dict[str, float] = {}
    for r in runs:
        d = r["local_date"]
        by_day[d] = by_day.get(d, 0.0) + r["distance_mi"]
    out = []
    cumulative = 0.0
    for d in sorted(by_day):
        cumulative += by_day[d]
        out.append(
            {
                "date": d,
                "miles": round(by_day[d], 2),
                "cumulative_mi": round(cumulative, 2),
            }
        )
    return out


def pace_trend(runs: list[dict], window: int = 5) -> list[dict]:
    """Per-run avg pace in date order with a rolling mean over `window` runs."""
    dated = sorted(
        (r for r in runs if r["avg_pace_s_per_mi"] is not None),
        key=lambda r: (r["local_date"], r["id"]),
    )
    out = []
    for i, r in enumerate(dated):
        recent = [x["avg_pace_s_per_mi"] for x in dated[max(0, i - window + 1) : i + 1]]
        out.append(
            {
                "run_id": r["id"],
                "local_date": r["local_date"],
                "distance_mi": r["distance_mi"],
                "pace_s_per_mi": round(r["avg_pace_s_per_mi"], 1),
                "rolling_pace_s_per_mi": round(sum(recent) / len(recent), 1),
            }
        )
    return out
