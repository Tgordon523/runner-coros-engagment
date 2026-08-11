"""The fetcher's region binding and error vocabulary.

The bug these cover: corosexport 0.1.5 moved the API host from module globals
onto the client constructor. The old monkey-patch went on "working" against a
module that no longer read it, so the client kept calling the EU host, login
kept succeeding, and every sync died at code 1019 with no hint why.
"""

import inspect
import types

import pytest

from app.config import COROS_API_BASE
from app.ingest import fetcher


class GlobalsClient:
    """corosexport <=0.1.4: endpoints live in module globals."""

    def __init__(self, email, password, timeout=30):
        self.email = email


class ConstructorClient:
    """corosexport 0.1.5+: the host is a constructor argument."""

    def __init__(self, email, password, timeout=30, base_url="https://teameuapi.coros.com"):
        self.base_url = base_url
        self.auth_endpoint = f"{base_url}/account/login"
        self.activities_endpoint = f"{base_url}/activity/query"
        self.download_endpoint = f"{base_url}/activity/detail/download"


def globals_module():
    mod = types.ModuleType("corosexport.client")
    mod.COROS_BASE_URL = "https://teameuapi.coros.com"
    mod.AUTH_ENDPOINT = "https://teameuapi.coros.com/account/login"
    mod.ACTIVITIES_ENDPOINT = "https://teameuapi.coros.com/activity/query"
    mod.DOWNLOAD_ENDPOINT = "https://teameuapi.coros.com/activity/detail/download"
    mod.CorosClient = GlobalsClient
    return mod


def constructor_module():
    mod = types.ModuleType("corosexport.client")
    mod.CorosClient = ConstructorClient
    return mod


def test_binds_region_via_module_globals():
    mod = globals_module()
    client = fetcher._make_client(mod.CorosClient, mod)
    assert mod.ACTIVITIES_ENDPOINT == f"{COROS_API_BASE}/activity/query"
    fetcher._check_region(client, mod)  # no raise


def test_binds_region_via_constructor():
    mod = constructor_module()
    client = fetcher._make_client(mod.CorosClient, mod)
    assert client.base_url == COROS_API_BASE
    fetcher._check_region(client, mod)  # no raise


def test_check_region_rejects_a_client_left_on_another_host():
    """The guard that turns a silent wrong-region sync into a named failure."""
    mod = constructor_module()
    stranded = ConstructorClient("e", "p")  # built without our base_url
    with pytest.raises(RuntimeError, match="teameuapi.coros.com"):
        fetcher._check_region(stranded, mod)


def test_make_client_passes_base_url_only_when_supported():
    """Guards against the reverse break: a build with neither knob must not crash."""
    mod = types.ModuleType("corosexport.client")
    mod.CorosClient = GlobalsClient
    client = fetcher._make_client(mod.CorosClient, mod)
    assert "base_url" not in inspect.signature(GlobalsClient).parameters
    assert client.email == fetcher.COROS_EMAIL


@pytest.mark.parametrize(
    "message, expected",
    [
        ("Access token is invalid: Access token is invalid", "wrong region"),
        ("API error (code 1019): nope", "wrong region"),
        ("Auth failed: account or password error", "COROS_EMAIL"),
        ("Network error: Connection refused", "check the network"),
        ("something new entirely", "something new entirely"),
    ],
)
def test_explain_failure_names_the_fix(message, expected):
    assert expected in fetcher.explain_failure(RuntimeError(message))


def test_explain_failure_suggests_the_other_region():
    explained = fetcher.explain_failure(RuntimeError("code 1019"))
    other = fetcher.EU_HOST if COROS_API_BASE == fetcher.US_HOST else fetcher.US_HOST
    assert other in explained
