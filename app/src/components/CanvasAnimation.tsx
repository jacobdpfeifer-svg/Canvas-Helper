/**
 * Onboarding Screen 2 animation, in CSS + inline SVG only (no video, no
 * Lottie, no assets). A stylized Canvas window → a cursor moves to "Sign in"
 * and clicks → course cards fly out of Canvas into a stylized ProductName
 * window. Loops gently. With reduced motion (system or app setting) the
 * keyframes are frozen at the final frame by the global rules in styles.css,
 * which reads as "cards already in ProductName".
 */
export function CanvasAnimation({ state = "idle" }: { state?: "idle" | "busy" | "done" }) {
  return (
    <div className={`canvas-anim state-${state}`} aria-hidden="true">
      <div className="anim-window anim-canvas">
        <div className="anim-titlebar">
          <span className="anim-dot" />
          <span className="anim-dot" />
          <span className="anim-dot" />
          <span className="anim-title">Canvas</span>
        </div>
        <div className="anim-body">
          <div className="anim-field" />
          <div className="anim-field short" />
          <div className="anim-signin">Sign in</div>
          <div className="anim-cards">
            <span className="anim-card c1" />
            <span className="anim-card c2" />
            <span className="anim-card c3" />
            <span className="anim-card c4" />
          </div>
        </div>
      </div>
      <svg className="anim-cursor" viewBox="0 0 24 24" width="22" height="22">
        <path d="M5 3l14 8-6 1.5L16 20l-3 1-3-7.5L5 17z" fill="currentColor" stroke="var(--surface-solid)" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <div className="anim-window anim-pn">
        <div className="anim-titlebar">
          <span className="anim-dot" />
          <span className="anim-dot" />
          <span className="anim-dot" />
          <span className="anim-title">ProductName</span>
        </div>
        <div className="anim-body">
          <div className="anim-line" />
          <div className="anim-line" />
          <div className="anim-line" />
          <div className="anim-line" />
        </div>
      </div>
    </div>
  );
}
