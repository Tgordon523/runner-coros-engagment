import { useEffect, useState } from "react";
import { apiGet, apiPost } from "./api";
import type { SyncStatus } from "./types";

interface Props {
  onSynced: () => void;
}

export default function SyncPanel({ onSynced }: Props) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => apiGet<SyncStatus>("/api/sync/status").then(setStatus);

  useEffect(() => {
    refresh().catch(() => setStatus(null));
  }, []);

  const sync = async () => {
    setBusy(true);
    try {
      await apiPost<SyncStatus>("/api/sync");
      await refresh();
      onSynced();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sync">
      <button className="sync-btn" onClick={sync} disabled={busy}>
        {busy ? "Syncing…" : "Sync"}
      </button>
      {status && (
        <p className={status.error ? "sync-note err" : "sync-note"}>
          {status.finished_at
            ? `last: ${status.finished_at.slice(0, 16).replace("T", " ")} · ${
                status.new_runs ?? 0
              } new`
            : status.status}
          {status.error ? ` · ${status.error}` : ""}
        </p>
      )}
    </div>
  );
}
