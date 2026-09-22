import { useEffect, useState } from "react";
import { FirstRun } from "./components/FirstRun";
import { CalendarView } from "./views/CalendarView";
import { ExamPrepView } from "./views/ExamPrepView";
import { HomeView } from "./views/HomeView";
import { PlanView } from "./views/PlanView";
import { SettingsView } from "./views/SettingsView";
import { StudyView } from "./views/StudyView";
import { IconCalendar, IconHome, IconPlan, IconSettings, IconStudy } from "./components/Icons";
import { useTheme } from "./theme";
import { setDockMode, type SemesterTick } from "./ipc";

export type Tab = "home" | "plan" | "study" | "calendar" | "settings";

const TABS: { id: Tab; label: string; Icon: typeof IconStudy }[] = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "plan", label: "Plan", Icon: IconPlan },
  { id: "study", label: "Study", Icon: IconStudy },
  { id: "calendar", label: "Calendar", Icon: IconCalendar },
  { id: "settings", label: "Settings", Icon: IconSettings },
];

const TAB_KEY = "pn_tab";

export function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("pn_onboarded") === "1");
  const [tab, setTab] = useState<Tab>(() => {
    const raw = localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === raw) ? (raw as Tab) : "home";
  });
  const [examTick, setExamTick] = useState<SemesterTick | null>(null);
  const [studyPreselect, setStudyPreselect] = useState<{ course?: string; examId?: string } | null>(null);
  useTheme();

  useEffect(() => {
    if (tab !== "settings" && tab !== "home" && tab !== "study" && tab !== "calendar" && tab !== "plan") {
      setTab("home");
    } else {
      localStorage.setItem(TAB_KEY, tab);
    }
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
          setTab("home");
        }}
      />
    );
  }

  if (examTick) {
    return (
      <div className="workspace">
        <ExamPrepView
          tick={examTick}
          sources={examTick.description ? [{ title: examTick.title, text: examTick.description }] : []}
          hasPractice={Boolean(examTick.description)}
          onBack={() => setExamTick(null)}
          onTest={() => {
            setStudyPreselect({ course: examTick.course_label, examId: examTick.id });
            setExamTick(null);
            setTab("study");
          }}
        />
      </div>
    );
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <nav className="workspace-nav glass" aria-label="Sections">
        <span className="squircle-mark" aria-hidden="true" />
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
                <t.Icon />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className="workspace-main" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1}>
        {tab === "home" && <HomeView onExamPrep={setExamTick} />}
        {tab === "plan" && <PlanView />}
        {tab === "study" && (
          <StudyView onGoToSources={() => setTab("settings")} preselect={studyPreselect} />
        )}
        {tab === "calendar" && <CalendarView />}
        {tab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
