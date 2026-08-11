import { useEffect, useState } from "react";
import { apiGet, apiPost } from "./api";
import { describeSync } from "./sync";
import type { SyncStatus } from "./types";

interface Props {
  onSynced: () => void;
}

export default function SyncPanel({ onSynced }: Props) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    apiGet<SyncStatus>("/api/sync/status").then((s) => {
      setStatus(s);
      setReqError(null);
    });

  useEffect(() => {
    refresh().catch((e: unknown) => setReqError(String(e instanceof Error ? e.message : e)));
  }, []);

  const sync = async () => {
    setBusy(true);
    setReqError(null);
    try {
      const result = await apiPost<SyncStatus>("/api/sync");
      await refresh();
      // Reload runs only if this sync could have changed them; a failed fetch
      // shouldn't make the map flicker for nothing.
      if (result.status !== "error") onSynced();
    } catch (e: unknown) {
      setReqError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const note = describeSync(status, reqError);

  return (
    <div className="sync">
      <button className="sync-btn" onClick={sync} disabled={busy}>
        {busy ? "Syncing…" : "Sync"}
      </button>

      <div className={`sync-alert ${note.tone}`} role={note.tone === "error" ? "alert" : "status"}>
        <p className="sync-headline">
          <span className="sync-dot" aria-hidden="true" />
          {note.headline}
        </p>
        {note.stale && <p className="sync-stale">{note.stale}</p>}
        {note.detail && <p className="sync-detail">{note.detail}</p>}
        {note.hint && <p className="sync-hint">{note.hint}</p>}
        {note.tone !== "ok" && (
          <button className="sync-retry" onClick={sync} disabled={busy}>
            Retry sync
          </button>
        )}
      </div>
    </div>
  );
}
