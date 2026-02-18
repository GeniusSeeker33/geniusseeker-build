import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // keep your existing static pages
        main: "index.html",
        candidates: "candidates.html",
        contact: "contact.html",
        employers: "employers.html",
        jobs: "jobs.html",
        founder: "meet-the-founder.html",
        recruiters: "recruiters.html",
        submitJob: "submit-a-job.html",
        testimonials: "testimonials.html",
        privacy: "privacy-policy.html",

        // NEW React quiz entry
        quiz: "quiz.html"
      }
    }
  }
});

