import path from "node:path";
import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Get the site URL from environment variables, or use the default value if not set
// Note: After the first deployment, be sure to set the correct PUBLIC_SITE_URL in the .env file
const siteUrl =
	import.meta.env.PUBLIC_SITE_URL || "https://ricofast.pages.dev/";

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	base: "/",
	envPrefix: "PUBLIC_",
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	},

	server: {
		port: 5200,
	},

	integrations: [sitemap()],
});
