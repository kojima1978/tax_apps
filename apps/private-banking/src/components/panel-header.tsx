export function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="panel-header"><div><h3>{title}</h3>{subtitle ? <p>{subtitle}</p> : null}</div>{action ?? null}</header>;
}
