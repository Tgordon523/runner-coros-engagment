"""Settings: one table declaring every Settings value exactly once.

A Settings value needs three things — a default, a way to become the text
SQLite stores, and a way to come back. Those used to live in three files, with
the encode/decode pair split across the store seam (the "1"/"0" boolean was
written in the API and read in the Store), so adding a setting meant touching
four places and getting the pair right twice.

The Store keeps raw key/value access and knows nothing about types; this
module owns the vocabulary. Defaults are held in encoded form so every read
takes the same decode path — and so no caller is ever handed a shared mutable
default list.
"""

import json
from typing import Any, Callable, Protocol

from .config import MAX_HR


class SettingStore(Protocol):
    """The slice of the Store this module needs (see store.Store).

    Adapters: the SQLite Store in prod, a plain dict in tests.
    """

    def get_setting(self, key: str) -> str | None: ...

    def set_setting(self, key: str, value: str) -> None: ...


def _encode_bool(v: bool) -> str:
    return "1" if v else "0"


def _decode_bool(s: str) -> bool:
    return s == "1"


# key -> (default as stored text, encode, decode).
# max_hr's default carries the env override (config.MAX_HR); the rest default
# to "unset", which each consumer reads as its own kind of empty.
SETTINGS: dict[str, tuple[str, Callable[[Any], str], Callable[[str], Any]]] = {
    "annual_goal_mi": ("0", str, float),
    "max_hr": (str(MAX_HR), str, int),
    "privacy_zones": ("[]", json.dumps, json.loads),
    "start_zone_enabled": ("0", _encode_bool, _decode_bool),
    "pace_zone_s_per_mi": ("[]", json.dumps, json.loads),
}


def setting(store: SettingStore, key: str) -> Any:
    """One decoded Settings value — its default when it was never set."""
    default, _, decode = SETTINGS[key]
    raw = store.get_setting(key)
    return decode(default if raw is None else raw)


def read_settings(store: SettingStore) -> dict:
    """Every Settings value, decoded — the whole /api/settings payload."""
    return {key: setting(store, key) for key in SETTINGS}


def write_settings(store: SettingStore, patch: dict) -> None:
    """Persist a patch. Keys mapped to None are left as they were; an unknown
    key is a programming error and raises."""
    for key, value in patch.items():
        if value is None:
            continue
        store.set_setting(key, SETTINGS[key][1](value))
