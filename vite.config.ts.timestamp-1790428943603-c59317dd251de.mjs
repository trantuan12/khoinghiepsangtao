// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import react from "file:///D:/DuAn/khoinghiepsangtao/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///D:/DuAn/khoinghiepsangtao/node_modules/@tailwindcss/vite/dist/index.mjs";
import { defineConfig } from "file:///D:/DuAn/khoinghiepsangtao/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/DuAn/khoinghiepsangtao/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var port = process.env.PORT ? Number(process.env.PORT) : 3e3;
var basePath = process.env.BASE_PATH || "/";
var vite_config_default = defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    },
    dedupe: ["react", "react-dom"]
  },
  server: {
    port,
    host: "0.0.0.0"
  },
  preview: {
    port,
    host: "0.0.0.0"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEdUFuXFxcXGtob2luZ2hpZXBzYW5ndGFvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxEdUFuXFxcXGtob2luZ2hpZXBzYW5ndGFvXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9EdUFuL2tob2luZ2hpZXBzYW5ndGFvL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoX19maWxlbmFtZSk7XG5cbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUID8gTnVtYmVyKHByb2Nlc3MuZW52LlBPUlQpIDogMzAwMDtcbmNvbnN0IGJhc2VQYXRoID0gcHJvY2Vzcy5lbnYuQkFTRV9QQVRIIHx8ICcvJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYmFzZTogYmFzZVBhdGgsXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHRhaWx3aW5kY3NzKClcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKVxuICAgIH0sXG4gICAgZGVkdXBlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQsXG4gICAgaG9zdDogJzAuMC4wLjAnXG4gIH0sXG4gIHByZXZpZXc6IHtcbiAgICBwb3J0LFxuICAgIGhvc3Q6ICcwLjAuMC4wJ1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVEsT0FBTyxVQUFVO0FBQ3BSLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixTQUFTLG9CQUFvQjtBQUprSSxJQUFNLDJDQUEyQztBQU1oTixJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksS0FBSyxRQUFRLFVBQVU7QUFFekMsSUFBTSxPQUFPLFFBQVEsSUFBSSxPQUFPLE9BQU8sUUFBUSxJQUFJLElBQUksSUFBSTtBQUMzRCxJQUFNLFdBQVcsUUFBUSxJQUFJLGFBQWE7QUFFMUMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsS0FBSztBQUFBLElBQ3BDO0FBQUEsSUFDQSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsRUFDL0I7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOO0FBQUEsSUFDQSxNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1A7QUFBQSxJQUNBLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
