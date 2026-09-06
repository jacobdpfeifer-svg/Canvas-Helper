export function LedgerViewer({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet ledger" onClick={(e) => e.stopPropagation()}>
        <h2>Ledger</h2>
        <p>Append-only audit trail. Export PDF from menubar.</p>
        <ul>
          <li>calendar · create_event · success · undo_ptr:gcal_event</li>
          <li>email_draft · create_draft · success · undo_ptr:gmail_draft</li>
          <li>canvas_submit · submit_assignment · veto</li>
        </ul>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
