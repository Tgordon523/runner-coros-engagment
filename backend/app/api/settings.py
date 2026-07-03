import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/api/settings", tags=["settings"])


class PrivacyZone(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    radius_m: float = Field(gt=0, le=5_000)


class SettingsPatch(BaseModel):
    annual_goal_mi: float | None = Field(None, ge=0, le=20_000)
    max_hr: int | None = Field(None, ge=100, le=250)
    privacy_zones: list[PrivacyZone] | None = None


def _current(store: Store) -> dict:
    return {
        "annual_goal_mi": store.annual_goal_mi(),
        "max_hr": store.max_hr(),
        "privacy_zones": store.privacy_zones(),
    }


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
    if patch.privacy_zones is not None:
        store.set_setting(
            "privacy_zones",
            json.dumps([z.model_dump() for z in patch.privacy_zones]),
        )
    return _current(store)
