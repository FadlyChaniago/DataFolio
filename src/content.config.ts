import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

/** Platforms the UI knows about. Add a new one here first, then use it in projects.json. */
export const PLATFORMS = [
  'Tableau',
  'Streamlit',
  'Grafana',
  'Power BI',
  'Metabase',
  'Looker Studio',
  'Apache Superset',
  'Python',
  'GitHub',
  'Other',
] as const;

export const STATUSES = ['live', 'demo', 'archived', 'private'] as const;

const httpsUrl = z
  .url({ protocol: /^https?$/ })
  .refine((u) => !/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u), {
    message: 'Internal/private network URLs must not be published',
  });

const projects = defineCollection({
  // One JSON array, one source of truth for cards, featured, filters, search, sorting and stats.
  loader: file('src/content/projects.json'),
  schema: z
    .object({
      id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case (a-z, 0-9, -)'),
      title: z.string().min(1).max(80),
      description: z.string().min(1).max(160),
      platform: z.enum(PLATFORMS),
      category: z.string().min(1).max(40),
      tags: z.array(z.string().min(1).max(24)).max(6).default([]),
      // Path under /public (e.g. "/images/projects/foo.webp") or null → designed fallback.
      thumbnail: z
        .string()
        .regex(/^\/images\/projects\/[a-z0-9._-]+\.(webp|png|jpe?g|avif)$/i, 'thumbnail must live in /public/images/projects/')
        .nullable()
        .default(null),
      projectUrl: httpsUrl.nullable().default(null),
      githubUrl: httpsUrl.nullable().default(null),
      status: z.enum(STATUSES),
      featured: z.boolean().default(false),
      publishedAt: z.coerce.date(),
      // true = demonstration data. While any sample project exists, the site says so.
      sample: z.boolean().default(false),
    })
    .refine((p) => p.status === 'private' || p.projectUrl !== null, {
      message: 'projectUrl is required unless status is "private"',
      path: ['projectUrl'],
    }),
});

export const collections = { projects };
