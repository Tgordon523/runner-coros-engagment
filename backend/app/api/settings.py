from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator

from ..deps import get_store
from ..settings import read_settings, write_settings
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


@router.get("")
def get_settings(store: Store = Depends(get_store)) -> dict:
    return read_settings(store)


@router.put("")
def put_settings(
    patch: SettingsPatch, store: Store = Depends(get_store)
) -> dict:
    """Validate here, encode in settings.SETTINGS. An omitted field is left
    alone; an empty list clears (see the Pace Zone validator)."""
    write_settings(store, patch.model_dump(exclude_none=True))
    return read_settings(store)
