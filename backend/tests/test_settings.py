"""The encode/decode table is the whole point of settings.py: a value that
survives a round trip through text is one that can't drift between the API
that writes it and the Store that reads it."""

from app.config import MAX_HR
from app.settings import SETTINGS, read_settings, setting, write_settings


class FakeStore(dict):
    """The SettingStore adapter for tests — the raw key/value slice, no SQL."""

    def get_setting(self, key):
        return self.get(key)

    def set_setting(self, key, value):
        assert isinstance(value, str), f"{key} was stored as {type(value)}, not text"
        self[key] = value


def test_defaults_apply_until_a_value_is_set():
    assert read_settings(FakeStore()) == {
        "annual_goal_mi": 0.0,
        "max_hr": MAX_HR,
        "privacy_zones": [],
        "start_zone_enabled": False,
        "pace_zone_s_per_mi": [],
    }


def test_every_setting_survives_the_round_trip():
    store = FakeStore()
    written = {
        "annual_goal_mi": 1000.0,
        "max_hr": 180,
        "privacy_zones": [{"lat": 41.88, "lon": -87.63, "radius_m": 200.0}],
        "start_zone_enabled": True,
        "pace_zone_s_per_mi": [510.0, 570.0, 630.0],
    }
    write_settings(store, written)
    assert read_settings(store) == written
    # every value reached the store as text (FakeStore asserts) and every key
    # in the table was covered
    assert set(store) == set(SETTINGS)


def test_false_and_empty_are_written_not_skipped():
    """Only None means "leave it alone" — False and [] are real values."""
    store = FakeStore()
    write_settings(store, {"start_zone_enabled": True, "pace_zone_s_per_mi": [1, 2, 3]})
    write_settings(store, {"start_zone_enabled": False, "pace_zone_s_per_mi": []})
    assert setting(store, "start_zone_enabled") is False
    assert setting(store, "pace_zone_s_per_mi") == []


def test_none_leaves_the_stored_value_alone():
    store = FakeStore()
    write_settings(store, {"max_hr": 180})
    write_settings(store, {"max_hr": None, "annual_goal_mi": 500.0})
    assert setting(store, "max_hr") == 180
