"""Generate a synthetic FIT activity: no personal data, provably so.

The fit_file fixture in conftest uses this so the parser tests always run
(real FIT files are personal data and *.fit is gitignored repo-wide). The
track is a straight-line jog away from Null Island — obviously not a person.
"""

from datetime import datetime, timezone
from pathlib import Path

from fit_tool.fit_file_builder import FitFileBuilder
from fit_tool.profile.messages.file_id_message import FileIdMessage
from fit_tool.profile.messages.record_message import RecordMessage
from fit_tool.profile.messages.session_message import SessionMessage
from fit_tool.profile.profile_type import FileType, Manufacturer, Sport

START = datetime(2026, 3, 15, 12, 0, tzinfo=timezone.utc)
N_POINTS = 120
INTERVAL_S = 5
SPEED_M_S = 3.0  # 120 points x 5 s x 3 m/s = 1800 m: over the 1-mile Run floor
AVG_HR = 140


def write_synthetic_fit(path: Path) -> Path:
    builder = FitFileBuilder(auto_define=True)

    file_id = FileIdMessage()
    file_id.type = FileType.ACTIVITY
    file_id.manufacturer = Manufacturer.DEVELOPMENT.value
    file_id.product = 0
    file_id.serial_number = 1
    file_id.time_created = round(START.timestamp() * 1000)
    builder.add(file_id)

    for i in range(N_POINTS):
        rec = RecordMessage()
        rec.timestamp = round((START.timestamp() + i * INTERVAL_S) * 1000)
        rec.position_lat = 0.0001 * i
        rec.position_long = 0.0001 * i
        rec.altitude = 100.0 + 0.1 * i
        rec.heart_rate = 130 + i % 20
        rec.speed = SPEED_M_S
        builder.add(rec)

    total_s = N_POINTS * INTERVAL_S
    session = SessionMessage()
    session.timestamp = round((START.timestamp() + total_s) * 1000)
    session.start_time = round(START.timestamp() * 1000)
    session.sport = Sport.RUNNING
    session.total_timer_time = total_s
    session.total_elapsed_time = total_s
    session.total_distance = SPEED_M_S * total_s
    session.avg_heart_rate = AVG_HR
    builder.add(session)

    builder.build().to_file(str(path))
    return path


if __name__ == "__main__":
    import sys

    out = Path(sys.argv[1] if len(sys.argv) > 1 else "sample.fit")
    print(f"wrote {write_synthetic_fit(out)}")
