import { useEffect, useState } from "react";
import { apiGet } from "./api";
import type { Settings } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface Props {
  onSaved: () => void;
}

export default function SettingsPanel({ onSaved }: Props) {
  const [goal, setGoal] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<Settings>("/api/settings").then((s) => {
      setGoal(s.annual_goal_mi ? String(s.annual_goal_mi) : "");
      setMaxHr(String(s.max_hr));
    });
  }, []);

  const save = async () => {
    const body: Record<string, number> = {};
    if (goal !== "") body.annual_goal_mi = Number(goal);
    if (maxHr !== "") body.max_hr = Number(maxHr);
    const res = await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onSaved();
    }
  };

  return (
    <div className="settings">
      <h3>Settings</h3>
      <label className="field">
        <span>Annual goal (mi)</span>
        <input
          type="number"
          min="0"
          placeholder="e.g. 1000"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Max heart rate</span>
        <input
          type="number"
          min="100"
          max="250"
          value={maxHr}
          onChange={(e) => setMaxHr(e.target.value)}
        />
      </label>
      <p className="dim">Changing max HR re-buckets Effort for every run.</p>
      <button className="sync-btn" onClick={save}>
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
