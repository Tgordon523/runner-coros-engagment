# Run Tracker

A single-runner map and run tracker fed by COROS Pace 3 FIT files, with filterable visualizations, goal tracking, and map-based art (e.g., run-trail timelapses).

## Language

**Run**:
A single recorded activity from the watch, parsed from one FIT file, at least 1 mile long. Shorter activities are stored but are not Runs — they appear in no view, total, Goal, or Timelapse. The cutoff is applied at read time, never at ingest.
_Avoid_: Activity, workout, session

**Track Point**:
One sampled moment within a Run — position plus time offset, heart rate, and pace.
_Avoid_: GPS point, coordinate, sample

**Effort**:
An intensity bucket (Easy / Moderate / Hard / Max) computed from heart rate as a percentage of the current max HR setting — never stored, so adjusting max HR re-buckets all history. A Run's Effort comes from its average HR; on the map, each Track Point is colored by the Effort of its instantaneous HR. There is exactly one HR bucketing in the app.
_Avoid_: Intensity, training load, RPE, HR zone

**Pace Zone**:
One of four pace buckets bounded by three user-set threshold paces (a Settings value, like max HR) — never stored, so adjusting thresholds re-buckets all history. On the map, each Track Point is colored by the Pace Zone of its instantaneous pace. A zone color means the same pace in every view.
_Avoid_: Pace band, speed zone

**Period**:
A date range bounding which runs are in view — a preset (last 30 days, this year, …) or a custom start/end.
_Avoid_: Timeframe, date filter

**Day**:
A day-of-week facet of a run (e.g., Sunday), distinct from Period.
_Avoid_: Date

**Run Day**:
A calendar day with at least one Run, its miles summed. The daily mileage view shows only Run Days, consecutively — rest days occupy no space. Distinct from Day (day-of-week facet).
_Avoid_: Active day

**Goal**:
A user-adjustable number of miles to achieve in the calendar year, against which on-track status is projected. Goal status always covers all runs in the year, regardless of active filters.
_Avoid_: Plan, target pace

**Privacy Zone**:
A configured radius around a saved location (e.g., home); track points inside it are trimmed from exported art but kept in local views.
_Avoid_: Blur, hidden area

**Start Zone**:
An automatic Privacy Zone of 400m radius centered on each Run's start point — that Run's points inside it, including a finish returning near the start, are trimmed under the same export-only scope as Privacy Zones. Toggled on/off independently of saved Privacy Zones.
_Avoid_: First-500m trim, start blur

**Timelapse**:
An animated map playback of run trails. Aligned-start mode aligns every run's t=0 so trails branch outward simultaneously; chronological mode draws runs in date order, each starting as the previous finishes.
_Avoid_: Replay, animation
