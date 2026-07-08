// Load every business config JSON file at build time.
// import.meta.glob is used instead of node:fs because Astro's static generation
// runs this code from dist/.prerender/, where filesystem paths relative to
// __dirname do not exist. The glob embeds the JSON content into the bundle.
// https://vite.dev/guide/features.html#glob-import
// https://docs.astro.build/en/guides/imports/#vite-features
const modules = import.meta.glob("/src/data/businesses/*.json", {
	eager: true,
});

// Top-level fields required in every business config.
const REQUIRED_FIELDS = [
	"slug",
	"name",
	"tagline",
	"description",
	"logo",
	"theme",
	"contact",
	"services",
	"bookingUrl",
];

// Theme tokens that every business theme object must provide.
// These are converted to CSS custom properties in BusinessLayout.astro.
const THEME_FIELDS = [
	"primary",
	"primaryStrong",
	"accent",
	"bg",
	"bgDark",
	"text",
	"textDark",
];

// Validate a single business config. Fail fast with a clear message so
// build-time errors point directly to the offending file and field.
function validateBusiness(data, filename) {
	for (const field of REQUIRED_FIELDS) {
		if (data[field] === undefined || data[field] === null) {
			throw new Error(
				`Business config ${filename} is missing required field: ${field}`,
			);
		}
	}

	if (typeof data.theme !== "object" || Array.isArray(data.theme)) {
		throw new Error(`Business config ${filename} has invalid theme object`);
	}

	for (const field of THEME_FIELDS) {
		if (!data.theme[field]) {
			throw new Error(
				`Business config ${filename} theme is missing token: ${field}`,
			);
		}
	}

	if (!Array.isArray(data.services) || data.services.length === 0) {
		throw new Error(
			`Business config ${filename} must define at least one service`,
		);
	}

	for (const service of data.services) {
		if (!service.name || typeof service.price !== "number") {
			throw new Error(`Business config ${filename} has invalid service entry`);
		}
	}

	// The slug inside the JSON must match the filename stem. This prevents
	// mismatched URLs and makes the file itself the source of truth.
	const stem = filename.split("/").pop()?.replace(".json", "");
	if (data.slug !== stem) {
		throw new Error(
			`Business config ${filename} slug "${data.slug}" does not match filename stem "${stem}"`,
		);
	}
}

// Load and validate every business config once at module initialization.
function loadBusinesses() {
	const businesses = [];

	for (const [filepath, module] of Object.entries(modules)) {
		// Vite JSON imports expose the object directly or under .default.
		const data = module.default ?? module;
		validateBusiness(data, filepath);
		businesses.push(data);
	}

	return businesses;
}

const ALL_BUSINESSES = loadBusinesses();
const BUSINESS_BY_SLUG = new Map(
	ALL_BUSINESSES.map((business) => [business.slug, business]),
);

// Return all validated business configs. Used by getStaticPaths().
export function getAllBusinesses() {
	return ALL_BUSINESSES;
}

// Look up a single business by slug. Returns null for unknown slugs,
// which the route turns into a 404 response.
export function getBusinessBySlug(slug) {
	if (!slug || typeof slug !== "string") {
		return null;
	}
	return BUSINESS_BY_SLUG.get(slug) ?? null;
}

// Render an integer price as British Pounds.
export function formatPrice(price) {
	return `£${price}`;
}
