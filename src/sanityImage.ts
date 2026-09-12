import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from './sanityClient'

const builder = createImageUrlBuilder(client)

// auto('format') sert du WebP/AVIF aux navigateurs compatibles au lieu du
// PNG/JPEG source — gain de poids important, sans rien changer côté appelant.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  return builder.image(source).auto('format')
}
