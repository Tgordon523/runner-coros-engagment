"""Effort module: the bucket vocabulary, its derivations, and its invariants.

Bucketing behavior (boundaries, re-bucketing on max-HR change) is covered in
test_store.py through the Store interface; this file pins the module's own
surface: NAMES ordering, case_sql parameter count, and the invariant check.
"""

import pytest

from app import effort


def test_names_derive_from_buckets_in_order():
    assert effort.NAMES == [name for name, _ in effort.BUCKETS]
    assert effort.NAMES == ["easy", "moderate", "hard", "max"]


def test_case_sql_binds_one_max_hr_per_bounded_bucket():
    sql, n_params = effort.case_sql()
    assert n_params == len(effort.BUCKETS) - 1
    assert sql.count("?") == n_params
    assert "IS NULL THEN NULL" in sql  # no HR -> no Effort


@pytest.mark.parametrize(
    "buckets",
    [
        [("easy", 0.70), ("max", 0.90)],  # no catch-all
        [("easy", 0.90), ("hard", 0.70), ("max", None)],  # not increasing
        [("easy", 0.70), ("easy", 0.80), ("max", None)],  # duplicate name
        [("easy", None), ("max", None)],  # early catch-all
    ],
)
def test_invariant_check_rejects_malformed_buckets(monkeypatch, buckets):
    monkeypatch.setattr(effort, "BUCKETS", buckets)
    monkeypatch.setattr(effort, "NAMES", [n for n, _ in buckets])
    with pytest.raises(ValueError):
        effort._check_invariants()
