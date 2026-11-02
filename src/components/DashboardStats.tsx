interface Stat {
  label: string;
  value: string;
  /** Destaca o número quando ele indica um problema. */
  alert?: boolean;
}

interface DashboardStatsProps {
  stats: Stat[];
}

/** Resumo numérico do time na barra do topo. */
export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <dl className="stats" aria-label="Resumo do time">
      {stats.map((stat) => (
        <div key={stat.label} className={stat.alert ? 'stat is-alert' : 'stat'}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
