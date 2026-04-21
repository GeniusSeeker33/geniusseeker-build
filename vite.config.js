import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

// Plugin to copy static folders into dist after build
function copyStaticFolders() {
  return {
    name: "copy-static-folders",
    closeBundle() {
      const folders = ["css", "js", "partials"];
      folders.forEach((folder) => {
        const src = resolve(__dirname, folder);
        const dest = resolve(__dirname, "dist", folder);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
          console.log(`✔ Copied ${folder}/ → dist/${folder}/`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStaticFolders()],
  build: {
    rollupOptions: {
      input: {
        main:             "index.html",
        // Top-level product doors (new primary nav)
        path:             "path.html",
        talent:           "talent.html",
        sales:            "sales.html",
        // Sales platform deep-dive pages
        refer:            "refer.html",
        simulate:         "simulate.html",
        operate:          "operate.html",
        measure:          "measure.html",
        scale:            "scale.html",
        pricing:          "pricing.html",
        // Legacy funnel pages — kept intact, hidden from main nav
        candidates:       "candidates.html",
        candidatesDir:    "candidates-directory.html",
        contact:          "contact.html",
        employers:        "employers.html",
        employerVerify:   "employer-verify.html",
        employerReview:   "employer-review.html",
        jobs:             "jobs.html",
        founder:          "meet-the-founder.html",
        recruiters:       "recruiters.html",
        submitJob:        "submit-a-job.html",
        testimonials:     "testimonials.html",
        privacy:          "privacy-policy.html",
        platform:         "platform.html",
        profile:          "profile.html",
        connectIdentity:  "connect-identity.html",
        adminEmployers:   "admin-employers.html",
        adminJobs:        "admin-jobs.html",
        makeOffer:        "make-offer.html",
        myOffers:         "my-offers.html",
        quiz:             "quiz.html",
      },
    },
  },
});
