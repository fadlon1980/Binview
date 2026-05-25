import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the app work under GitHub Pages project URLs
// like https://your-user.github.io/binview-private-family-mvp/
export default defineConfig({
  plugins: [react()],
  base: './'
})
