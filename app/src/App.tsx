import { useState } from "react";
import { Top3Sticky } from "./components/Top3Sticky";
import { NarrateAfter } from "./components/NarrateAfter";
import { CommandPalette } from "./components/CommandPalette";
import { ApprovalSheet } from "./components/ApprovalSheet";
import { Onboarding } from "./components/Onboarding";
import { LedgerViewer } from "./components/LedgerViewer";

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

  return (
    <div className="shell">
      <header className="menubar">
        <span className="brand">ProductName</span>
        <button type="button" onClick={() => setPaletteOpen(true)}>
          ⌥Space
        </button>
        <button type="button" className="stop" onClick={() => window.alert("STOP engaged 24h")}>
          STOP
        </button>
      </header>

      <Top3Sticky
        items={[
          { id: "1", title: "Draft BCOR discussion", due: "Tonight" },
          { id: "2", title: "Review CSCI lab notes", due: "Tomorrow" },
          { id: "3", title: "Confirm COEN dinner RSVP", due: "Wed" },
        ]}
        onExpand={() => setShowLedger(true)}
      />

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
