import type { GoalStatus } from "./types";

/** Stat tile — Goal is always the whole calendar year, unfiltered. */
export default function GoalCard({ goal }: { goal: GoalStatus }) {
  const pct = goal.target_mi > 0 ? Math.min(goal.ytd_mi / goal.target_mi, 1) : 0;

  return (
    <div className="goal-card">
      <div className="goal-head">
        <span className="goal-label">{new Date().getFullYear()} goal</span>
        {goal.on_track != null && (
          <span className={goal.on_track ? "badge ok" : "badge behind"}>
            {goal.on_track ? "✓ on track" : "✗ behind"}
          </span>
        )}
      </div>
      <p className="goal-big">
        {goal.ytd_mi.toLocaleString()}
        <span className="goal-unit">
          {goal.target_mi > 0 ? ` / ${goal.target_mi.toLocaleString()} mi` : " mi this year"}
        </span>
      </p>
      {goal.target_mi > 0 ? (
        <>
          <div className="meter" role="img" aria-label={`${Math.round(pct * 100)}% of goal`}>
            <div className="meter-fill" style={{ width: `${pct * 100}%` }} />
            <div className="meter-mark" style={{ left: `${goal.elapsed_fraction * 100}%` }} title="where you should be today" />
          </div>
          <p className="goal-detail">
            projected {goal.projected_mi?.toLocaleString()} mi · need{" "}
            {goal.required_per_week_mi} mi/wk
          </p>
        </>
      ) : (
        <p className="goal-detail">Set an annual goal in settings to see projections.</p>
      )}
    </div>
  );
}
