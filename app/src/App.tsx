import { useEffect, useState } from "react";
import { FirstRun } from "./components/FirstRun";
import { PlanView } from "./views/PlanView";
import { SettingsView } from "./views/SettingsView";
import { SourcesView } from "./views/SourcesView";
import { StudyView } from "./views/StudyView";
import { useTheme } from "./theme";
import { setDockMode } from "./ipc";

export type Tab = "study" | "plan" | "sources" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "plan", label: "Plan" },
  { id: "sources", label: "Sources" },
  { id: "settings", label: "Settings" },
];

const TAB_KEY = "pn_tab";

export function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("pn_onboarded") === "1");
  const [tab, setTab] = useState<Tab>(() => {
    const raw = localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === raw) ? (raw as Tab) : "study";
  });
  useTheme();

  useEffect(() => {
    localStorage.setItem(TAB_KEY, tab);
  }, [tab]);

  useEffect(() => {
    void setDockMode(onboarded ? "workspace" : "onboarding");
  }, [onboarded]);

  if (!onboarded) {
    return (
      <FirstRun
        onDone={() => {
          localStorage.setItem("pn_onboarded", "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <nav className="workspace-nav" aria-label="Sections">
        <span className="brand-mark" aria-hidden="true">
          PN
        </span>
        <ul role="tablist">
          {TABS.map((t) => (
            <li key={t.id} role="presentation">
              <button
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="main"
                className={tab === t.id ? "active" : undefined}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  const idx = TABS.findIndex((x) => x.id === t.id);
                  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = TABS[(idx + 1) % TABS.length].id;
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prev = TABS[(idx - 1 + TABS.length) % TABS.length].id;
                    setTab(prev);
                    document.getElementById(`tab-${prev}`)?.focus();
                  }
                }}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className="workspace-main" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1}>
        {tab === "study" && <StudyView onGoToSources={() => setTab("sources")} />}
        {tab === "plan" && <PlanView />}
        {tab === "sources" && <SourcesView />}
        {tab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
