// Get site URL from environment variable, use default value if not set.
// Set PUBLIC_SITE_URL in .env after the first deployment.
const SITE_URL = import.meta.env.PUBLIC_SITE_URL || "https://boka.io";

export const siteConfig = {
	title: "Boka",
	author: "Boka",
	url: SITE_URL,
	mail: "hello@boka.io",
	utm: {
		source: `${SITE_URL}`,
		medium: "referral",
		campaign: "navigation",
	},
	meta: {
		title: "Boka - Booking software for barbers, salons, and beauty professionals",
		description:
			"Get booked, get paid, and grow with Boka. Online booking, payments, reminders, staff management, custom websites, and business insights in one place.",
		keywords:
			"booking software, barber booking system, salon booking system, beauty business software, appointment scheduling, online payments",
		image: `${SITE_URL}/assets/boka/boka-dashboard.png`,
		twitterHandle: "",
	},
	links: {
		barberDemo: "https://alisbarber-dev.netlify.app/",
		dashboardDemo: "https://boka-business.netlify.app/",
		trial: "/contact",
	},
	social: {
		twitter: "",
		twitterName: "",
		github: "",
		blog: "",
	},
};

// Footer social links. Add social profiles here once the public accounts are ready.
export const socialLinks = [];
