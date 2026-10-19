/**
 * Site-wide settings. Project data lives in src/content/projects.json — not here.
 */
export const site = {
  name: 'Datafolio',
  subtitle: 'Analytics Project Hub',
  title: 'Datafolio — Analytics Project Hub',
  description:
    'A curated collection of interactive dashboards, analytics applications, and data visualization projects across Tableau, Grafana, Streamlit, Power BI and more.',
  githubUrl: 'https://github.com/FadlyChaniago',
  /** Projects shown before "Load More". */
  pageSize: 12,
  /** Supporting tools shown in Tools & Technologies besides the project platforms. */
  supportingTools: ['Python', 'SQL', 'PostgreSQL', 'Docker', 'Git', 'Linux'],
} as const;
