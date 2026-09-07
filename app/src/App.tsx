import { useEffect, useState } from "react";
import { Top3Sticky } from "./components/Top3Sticky";
import { NarrateAfter } from "./components/NarrateAfter";
import { CommandPalette } from "./components/CommandPalette";
import { ApprovalSheet } from "./components/ApprovalSheet";
import { Onboarding } from "./components/Onboarding";
import { LedgerViewer } from "./components/LedgerViewer";
import {
  hideDock,
  onInboxUpdated,
  readTop3,
  routeIntent,
  setDockMode,
  showDock,
  syncCanvas,
  type Top3Item,
} from "./ipc";

export function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem("pn_onboarded") === "1"
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [approval, setApproval] = useState<null | {
    title: string;
    why: string;
  }>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [top3, setTop3] = useState<Top3Item[]>([]);
  const [routeHint, setRouteHint] = useState<string | null>(null);

  const expanded = paletteOpen || approval !== null || showLedger;

  const refreshTop3 = () => {
    readTop3()
      .then(setTop3)
      .catch((e) => console.error("read_top3 failed", e));
  };

  useEffect(() => {
    if (!onboarded) {
      setDockMode("onboarding");
      return;
    }
    setDockMode(expanded ? "expanded" : "peek");
  }, [onboarded, expanded]);

  useEffect(() => {
    if (onboarded) showDock();
  }, [onboarded]);

  useEffect(() => {
    if (!onboarded) return;
    refreshTop3();
    let unlisten: (() => void) | undefined;
    onInboxUpdated(() => refreshTop3()).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [onboarded]);

  if (!onboarded) {
    return (
      <Onboarding
        onDone={() => {
          localStorage.setItem("pn_onboarded", "1");
          setOnboarded(true);
        }}
      />
    );
  }

  const displayTop3 =
    top3.length > 0
      ? top3
      : [
          {
            id: "empty",
            title: "No open items — Sync Canvas",
            due: "inbox empty",
          },
        ];

  return (
    <div className={`dock ${expanded ? "dock-expanded" : "dock-peek"}`}>
      <header className="dock-controls">
        <button
          type="button"
          className="ghost"
          title="Command palette (⌥Space)"
          onClick={() => setPaletteOpen(true)}
        >
          ⌥
        </button>
        <button
          type="button"
          className="ghost stop"
          title="STOP all automation for 24h"
          onClick={() => window.alert("STOP engaged 24h")}
        >
          STOP
        </button>
        <button
          type="button"
          className="ghost dismiss"
          title="Hide"
          onClick={() => hideDock()}
        >
          ×
        </button>
      </header>

      <Top3Sticky items={displayTop3} onExpand={() => setShowLedger(true)} />
      {routeHint && <p className="route-hint">{routeHint}</p>}

      {expanded && (
        <NarrateAfter
          items={[
            {
              id: "n1",
              text: "Moved Wednesday study block because your flight changed",
              why: "calendar sync detected conflict",
            },
            {
              id: "n2",
              text: "Drafted email to professor — saved to Drafts",
              why: "inbox triage matched office-hours template",
            },
          ]}
          onUndo={(id) => console.log("undo", id)}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onAction={(action) => {
            setPaletteOpen(false);
            if (action === "approve-demo") {
              setApproval({
                title: "Submit assignment preview",
                why: "Course calibrated; mechanical busywork",
              });
            } else if (action === "sync") {
              syncCanvas()
                .then((r) => {
                  if (!r.ok) {
                    console.error("sync failed", r.error);
                    window.alert(r.error || "Sync failed");
                  } else {
                    refreshTop3();
                  }
                })
                .catch((e) => {
                  console.error(e);
                  window.alert(String(e));
                });
            } else if (action === "brief") {
              routeIntent("what should I do first")
                .then((r) => {
                  if (!r) {
                    setRouteHint("Router unavailable outside Tauri");
                    return;
                  }
                  setRouteHint(
                    r.skill_id
                      ? `Routed → ${r.skill_id} (${r.method})`
                      : r.ambiguous
                        ? "Ambiguous — ask student"
                        : "No skill matched"
                  );
                })
                .catch((e) => console.error("route_intent failed", e));
            }
          }}
        />
      )}

      {approval && (
        <ApprovalSheet
          title={approval.title}
          why={approval.why}
          onApprove={() => setApproval(null)}
          onSkip={() => setApproval(null)}
        />
      )}

      {showLedger && <LedgerViewer onClose={() => setShowLedger(false)} />}
    </div>
  );
}
