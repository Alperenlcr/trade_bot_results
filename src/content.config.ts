import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Yazılar: src/content/blog/{lang}/{slug}.md. Dil klasörden, adres dosya adından gelir;
// aynı yazının çevirileri aynı `key`'i taşır (hreflang ve dil menüsü bununla eşleşir).
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    key: z.string(),
    image: z.string().optional(), // /public altındaki yol; yoksa /og/{lang}.png
  }),
});

export const collections = { blog };
