import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator

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
    start_zone_enabled: bool | None = None
    pace_zone_s_per_mi: list[float] | None = None  # [] clears; else 3 ascending

    @field_validator("pace_zone_s_per_mi")
    @classmethod
    def _three_ascending_paces(cls, v: list[float] | None) -> list[float] | None:
        if v is None or v == []:
            return v
        if len(v) != 3 or v[0] <= 0 or not (v[0] < v[1] < v[2]):
            raise ValueError(
                "pace zones need exactly 3 ascending threshold paces (s/mi)"
            )
        return v


def _current(store: Store) -> dict:
    return {
        "annual_goal_mi": store.annual_goal_mi(),
        "max_hr": store.max_hr(),
        "privacy_zones": store.privacy_zones(),
        "start_zone_enabled": store.start_zone_enabled(),
        "pace_zone_s_per_mi": store.pace_zone_s_per_mi(),
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
    if patch.start_zone_enabled is not None:
        store.set_setting(
            "start_zone_enabled", "1" if patch.start_zone_enabled else "0"
        )
    if patch.pace_zone_s_per_mi is not None:
        store.set_setting(
            "pace_zone_s_per_mi", json.dumps(patch.pace_zone_s_per_mi)
        )
    return _current(store)
