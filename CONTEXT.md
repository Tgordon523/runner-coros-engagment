# Run Tracker

A single-runner map and run tracker fed by COROS Pace 3 FIT files, with filterable visualizations, goal tracking, and map-based art (e.g., run-trail timelapses).

## Language

**Run**:
A single recorded activity from the watch, parsed from one FIT file.
_Avoid_: Activity, workout, session

**Effort**:
A run's intensity bucket (Easy / Moderate / Hard / Max), computed at read time from average heart rate as a percentage of the current max HR setting — never stored, so adjusting max HR re-buckets all history.
_Avoid_: Intensity, training load, RPE

**Period**:
A date range bounding which runs are in view — a preset (last 30 days, this year, …) or a custom start/end.
_Avoid_: Timeframe, date filter

**Day**:
A day-of-week facet of a run (e.g., Sunday), distinct from Period.
_Avoid_: Date

**Goal**:
A user-adjustable number of miles to achieve in the calendar year, against which on-track status is projected. Goal status always covers all runs in the year, regardless of active filters.
_Avoid_: Plan, target pace

**Privacy Zone**:
A configured radius around a saved location (e.g., home); track points inside it are trimmed from exported art but kept in local views.
_Avoid_: Blur, hidden area

**Timelapse**:
An animated map playback of run trails. Aligned-start mode (v1) aligns every run's t=0 so trails branch outward simultaneously; chronological mode (later) draws runs in date order.
_Avoid_: Replay, animation
