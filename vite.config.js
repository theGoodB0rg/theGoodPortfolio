import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE_URL || '/',
  server: {
    host: true
  },
  test: {
    environment: 'jsdom',
    globals: true
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
