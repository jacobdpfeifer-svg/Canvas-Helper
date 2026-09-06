type Item = { id: string; title: string; due: string };

export function Top3Sticky({
  items,
  onExpand,
}: {
  items: Item[];
  onExpand: () => void;
}) {
  return (
    <section className="top3" onClick={onExpand} role="button" tabIndex={0}>
      <h1>Today</h1>
      <ol>
        {items.slice(0, 3).map((item, i) => (
          <li key={item.id}>
            <span className="idx">{i + 1}</span>
            <div>
              <strong>{item.title}</strong>
              <em>{item.due}</em>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
