import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: 't7u49x1d',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01'
})