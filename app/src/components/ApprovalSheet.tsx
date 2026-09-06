/** Little-Arc-style transient approval sheet. */
export function ApprovalSheet({
  title,
  why,
  onApprove,
  onSkip,
}: {
  title: string;
  why: string;
  onApprove: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="sheet-backdrop">
      <div className="sheet">
        <h2>{title}</h2>
        <p>{why}</p>
        <div className="sheet-actions">
          <button type="button" className="primary" onClick={onApprove}>
            Approve ⌘↵
          </button>
          <button type="button" onClick={onSkip}>
            Skip
          </button>
          <button type="button" onClick={onSkip}>
            Change calibration
          </button>
        </div>
      </div>
    </div>
  );
}
