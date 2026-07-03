from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsPatch(BaseModel):
    annual_goal_mi: float | None = Field(None, ge=0, le=20_000)
    max_hr: int | None = Field(None, ge=100, le=250)


def _current(store: Store) -> dict:
    return {"annual_goal_mi": store.annual_goal_mi(), "max_hr": store.max_hr()}


@router.get("")
def get_settings(store: Store = Depends(get_store)) -> dict:
    return _current(store)


@router.put("")
def put_settings(
    patch: SettingsPatch, store: Store = Depends(get_store)
) -> dict:
    if patch.annual_goal_mi is not None:
        store.set_setting("annual_goal_mi", str(patch.annual_goal_mi))
    if patch.max_hr is not None:
        store.set_setting("max_hr", str(patch.max_hr))
    return _current(store)
