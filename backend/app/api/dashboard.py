from datetime import date, datetime

from fastapi import APIRouter, Depends
from zoneinfo import ZoneInfo

from ..config import LOCAL_TZ
from ..dashboard import daily_mileage, pace_trend, weekly_mileage
from ..deps import get_store
from ..filters import RunFilter, run_filter
from ..goal import goal_status
from ..settings import setting
from ..store import Store

router = APIRouter(prefix="/api", tags=["dashboard"])


def assemble_dashboard(store: Store, f: RunFilter, today: date | None = None) -> dict:
    today = today or datetime.now(ZoneInfo(LOCAL_TZ)).date()
    rows = store.runs(f)
    ytd = store.ytd_miles(today.year)
    return {
        "weekly": weekly_mileage(rows),
        "daily": daily_mileage(rows),
        "pace_trend": pace_trend(rows),
        "goal": goal_status(setting(store, "annual_goal_mi"), ytd, today),
    }


@router.get("/dashboard")
def dashboard(
    f: RunFilter = Depends(run_filter), store: Store = Depends(get_store)
) -> dict:
    return assemble_dashboard(store, f)
