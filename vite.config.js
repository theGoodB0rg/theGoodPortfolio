import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Use relative base path for GitHub Pages compatibility
  server: {
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        blog: 'blog.html',
        blogPost: 'blog-post.html'
      }
    }
  }
})
