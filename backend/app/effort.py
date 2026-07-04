"""Effort: the intensity-bucket vocabulary and its derivation.

Buckets are ordered upper bounds as fractions of max HR (exclusive), the last
bucket a catch-all. Effort is computed at read time — never stored — so
adjusting max HR re-buckets all history (see CONTEXT.md). Everything that
speaks Effort derives from BUCKETS: the SQL fragment, the valid-name set,
and the list /api/meta serves to the filter panel.
"""

# (name, upper bound as fraction of max HR); None marks the catch-all
BUCKETS: list[tuple[str, float | None]] = [
    ("easy", 0.70),
    ("moderate", 0.80),
    ("hard", 0.90),
    ("max", None),
]

NAMES: list[str] = [name for name, _ in BUCKETS]


def _check_invariants() -> None:
    if BUCKETS[-1][1] is not None:
        raise ValueError("last Effort bucket must be the catch-all (None bound)")
    bounds = [hi for _, hi in BUCKETS[:-1]]
    if any(hi is None for hi in bounds):
        raise ValueError("only the last Effort bucket may omit its bound")
    if bounds != sorted(bounds) or len(set(bounds)) != len(bounds):
        raise ValueError("Effort bucket bounds must be strictly increasing")
    if len(set(NAMES)) != len(NAMES):
        raise ValueError("Effort bucket names must be unique")


_check_invariants()


def case_sql() -> tuple[str, int]:
    """SQL CASE computing the Effort bucket from avg_hr and a bound max HR.

    Returns (sql, number of max-HR parameters to bind).
    """
    whens = " ".join(
        f"WHEN avg_hr < {hi} * ? THEN '{name}'" for name, hi in BUCKETS[:-1]
    )
    sql = f"CASE WHEN avg_hr IS NULL THEN NULL {whens} ELSE '{BUCKETS[-1][0]}' END"
    return sql, len(BUCKETS) - 1
