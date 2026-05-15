import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE_URL || '/',
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
