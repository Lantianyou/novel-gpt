import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'
import unocss from 'unocss/astro'
import { presetUno } from 'unocss'
import presetAttributify from '@unocss/preset-attributify'

// https://astro.build/config
export default defineConfig({
  integrations: [
    unocss({
      presets: [
        presetAttributify(),
        presetUno(),
      ],
    }),
  ],
  output: 'server',
  adapter: vercel()
});