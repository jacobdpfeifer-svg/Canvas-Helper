import { useCallback, useEffect, useState } from "react";
import { FirstRun } from "./components/FirstRun";
import { CalendarView } from "./views/CalendarView";
import { ExamPrepView } from "./views/ExamPrepView";
import { HomeView } from "./views/HomeView";
import { SettingsView } from "./views/SettingsView";
import { StudyView } from "./views/StudyView";
import { useTheme } from "./theme";
import { setDockMode } from "./ipc";

export type Tab = "home" | "study" | "calendar" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "study", label: "Study" },
  { id: "calendar", label: "Calendar" },
  { id: "settings", label: "Settings" },
];

type Route = { kind: "tab" } | { kind: "exam-prep"; courseId: string; itemId: string };

/**
 * Shell. Home is the landing tab after onboarding and on every launch; the
 * exam-prep page is a route inside the Home tab (back returns to the line).
 * "Import a source" no longer exists: Canvas sync is the only ingestion path,
 * and the read-only inspection of synced data lives under Settings.
 */
export function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("pn_onboarded") === "1");
  const [tab, setTab] = useState<Tab>("home");
  const [route, setRoute] = useState<Route>({ kind: "tab" });
  const [studyCourse, setStudyCourse] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    void setDockMode(onboarded ? "workspace" : "onboarding").catch(() => undefined);
  }, [onboarded]);

  const goTab = useCallback((t: Tab) => {
    setRoute({ kind: "tab" });
    setTab(t);
  }, []);

  if (!onboarded) {
    return (
      <FirstRun
        onDone={() => {
          localStorage.setItem("pn_onboarded", "1");
          setOnboarded(true);
          setTab("home");
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
                onClick={() => goTab(t.id)}
                onKeyDown={(e) => {
                  const idx = TABS.findIndex((x) => x.id === t.id);
                  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = TABS[(idx + 1) % TABS.length].id;
                    goTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prev = TABS[(idx - 1 + TABS.length) % TABS.length].id;
                    goTab(prev);
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
        {tab === "home" && route.kind === "tab" && <HomeView theme={theme} onViewPlan={(t) => setRoute({ kind: "exam-prep", ...t })} />}
        {tab === "home" && route.kind === "exam-prep" && (
          <ExamPrepView
            courseId={route.courseId}
            itemId={route.itemId}
            theme={theme}
            onBack={() => setRoute({ kind: "tab" })}
            onStudy={(course) => {
              setStudyCourse(course);
              goTab("study");
            }}
          />
        )}
        {tab === "study" && <StudyView initialCourse={studyCourse} onGoToSources={() => goTab("settings")} />}
        {tab === "calendar" && <CalendarView theme={theme} />}
        {tab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
