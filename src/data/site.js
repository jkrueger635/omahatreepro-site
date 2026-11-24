// Everything client-specific lives here.
export const site = {
  name: 'Omaha Tree Pro',
  short: 'Omaha Tree Pro',
  url: 'https://omahatreepro.com', // no trailing slash; same as astro.config.mjs `site`
  phone: '402-807-3324',
  phoneHref: 'tel:4028073324',
  email: 'omahatreepro@gmail.com',
  gaId: 'G-HX1RB5Q3RH', // Google Analytics, loaded in production builds only
  // CHANGE: Elfsight form widget ID, the part after "elfsight-app-" in the embed code. Empty = a placeholder box shows.
  elfsightId: '4fa36a69-e500-4211-9c19-e39004968546',
};

export const nav = [
  { label: 'Tree Removal', href: '/tree-removal/' },
  { label: 'Trimming', href: '/tree-trimming/' },
  { label: 'Stump Grinding', href: '/stump-grinding/' },
];
export const navCta = { label: 'Schedule an Estimate', href: '/estimate/' };
