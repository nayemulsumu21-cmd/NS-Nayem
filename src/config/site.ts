export interface SocialLink {
  id: string;
  label: string;
  handlePlaceholder: string;
  url: string;
}

export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  categoryFilter: string;
  description: string;
  deliverables: string[];
}

export interface SoftwareItem {
  id: string;
  shortCode: string;
  name: string;
  focus: string;
  accentColor: string;
}

export interface PhilosophyItem {
  title: string;
  detail: string;
}

export interface HeaderAvatarConfig {
  /** Uses Nayemul Islam's uploaded portrait by default; empty string shows monogram */
  imageUrl: string | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface PortraitAdjustments {
  scale: number;
  offsetX: number;
  offsetY: number;
  cropTop: number;
  cropBottom: number;
}

export interface SiteConfigData {
  name: string;
  firstName: string;
  lastName: string;
  monogram: string;
  /** Brand logo image used in footer / loading / branding badges */
  logoUrl?: string;
  title: string;
  profession: string;
  experienceLevel: string;
  availability: string;
  heroGreeting: string;
  heroBackgroundText: string;
  heroIntro: string;
  headerAvatar: HeaderAvatarConfig;
  aboutHeading: string;
  aboutIntroduction: string;
  aboutStoryHeading?: string;
  aboutStoryLead?: string;
  aboutStoryBody?: string;
  aboutCtaHeading?: string;
  aboutCtaSubtext?: string;
  designPhilosophy: PhilosophyItem[];
  portraits: {
    heroPortraitPath: string;
    heroPlaceholderPath: string;
    heroPortraitBackupPath?: string;
    heroAdjustments?: PortraitAdjustments;
    aboutPortraitPath: string;
    aboutPlaceholderPath: string;
    aboutAdjustments?: PortraitAdjustments;
  };
  sectionHeadings: {
    aboutEyebrow: string;
    featuredEyebrow: string;
    featuredHeading: string;
    portfolioEyebrow: string;
    portfolioHeading: string;
    servicesEyebrow: string;
    servicesHeading: string;
  };
  services: ServiceItem[];
  software: SoftwareItem[];
  contact: {
    heading: string;
    supportingText: string;
    emailPlaceholder: string;
    socialLinks: SocialLink[];
  };
}

export const SITE_CONFIG: SiteConfigData = {
  name: 'NAYEMUL ISLAM',
  firstName: 'NAYEMUL',
  lastName: 'ISLAM',
  monogram: 'NI',
  logoUrl: '/favicon.svg',
  title: 'Brand Identity Designer',
  profession: 'Graphic Designer',
  experienceLevel: 'Intermediate / Professional',
  availability: 'Available for Freelance Work',
  heroGreeting: "HELLO, I'M",
  heroBackgroundText: 'NAYEMUL ISLAM',
  heroIntro:
    'I create meaningful visual identities and engaging designs that help brands stand out.',
  headerAvatar: {
    imageUrl: '/images/profile/hero-portrait.png',
    zoom: 1.35,
    offsetX: 0,
    offsetY: 10,
  },
  aboutHeading: 'DESIGNING IDENTITIES. CREATING IMPACT.',
  aboutIntroduction:
    "Hello, I'm NAYEMUL ISLAM, a Brand Identity Designer passionate about creating meaningful visual identities and engaging digital designs. I focus on transforming ideas into clean, memorable, and visually consistent designs that help brands communicate effectively.",
  aboutStoryHeading: 'MY STORY',
  aboutStoryLead:
    'I am a Graphic Designer dedicated to crafting distinctive visual identities and cohesive brand systems that leave a lasting impression.',
  aboutStoryBody:
    'My work centers on visual identity and branding—translating a brand’s core purpose into structured logos, comprehensive style guides, and engaging social media visuals. I believe strong design is built on clarity, consistency, and intentional detail, helping businesses communicate who they are with confidence across every digital and print touchpoint.',
  aboutCtaHeading: "LET'S CREATE SOMETHING MEANINGFUL.",
  aboutCtaSubtext:
    "Have a project in mind? Let's work together to build a strong and memorable visual identity for your brand.",
  designPhilosophy: [
    {
      title: 'Understand',
      detail:
        'Understanding the brand, its audience, and its visual communication needs.',
    },
    {
      title: 'Create',
      detail:
        'Developing thoughtful concepts and translating ideas into meaningful visual designs.',
    },
    {
      title: 'Refine',
      detail:
        'Improving the details, consistency, and overall quality of the final design.',
    },
  ],
  portraits: {
    heroPortraitPath: '/images/profile/hero-portrait.png',
    heroPlaceholderPath: '/images/profile/hero-portrait-placeholder.svg',
    heroPortraitBackupPath: '/images/profile/hero-portrait-backup.png',
    heroAdjustments: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      cropTop: 0,
      cropBottom: 0,
    },
    aboutPortraitPath: '/images/profile/about-portrait.png',
    aboutPlaceholderPath: '/images/profile/about-portrait-placeholder.svg',
    aboutAdjustments: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      cropTop: 0,
      cropBottom: 0,
    },
  },
  sectionHeadings: {
    aboutEyebrow: 'ABOUT ME',
    featuredEyebrow: 'FEATURED WORKS',
    featuredHeading: 'SELECTED IDENTITY HIGHLIGHTS',
    portfolioEyebrow: 'PORTFOLIO',
    portfolioHeading: 'CURATED DESIGN WORKS',
    servicesEyebrow: 'WHAT I DO',
    servicesHeading: 'MY SERVICES',
  },
  services: [
    {
      id: 'logo-design',
      number: '01',
      title: 'Logo Design',
      categoryFilter: 'logo',
      description:
        "Creating distinctive and memorable visual identities that communicate a brand's personality.",
      deliverables: [
        'Primary & Secondary Logomarks',
        'Geometric Grid Construction',
        'Monochrome & Responsive Lockups',
        'Scalable Vector Master Files',
      ],
    },
    {
      id: 'brand-style-guide',
      number: '02',
      title: 'Brand Style Guide',
      categoryFilter: 'brand-guideline',
      description:
        'Developing consistent visual guidelines, including typography, colors, logo usage, and brand elements.',
      deliverables: [
        'Logo Usage & Clear-Space Rules',
        'Color Palette & Contrast System',
        'Typographic Hierarchy & Scales',
        'Visual Tone & Layout Guidelines',
      ],
    },
    {
      id: 'social-media-design',
      number: '03',
      title: 'Social Media Design',
      categoryFilter: 'social-media',
      description:
        "Creating engaging and visually consistent social media graphics that strengthen a brand's online presence.",
      deliverables: [
        'Campaign Post & Story Graphics',
        'Branded Carousel Systems',
        'Product Launch Visual Templates',
        'Cohesive Feed Art Direction',
      ],
    },
  ],
  software: [
    {
      id: 'photoshop',
      shortCode: 'Ps',
      name: 'Adobe Photoshop',
      focus: 'Social Media Visuals, Key Art & Brand Mockup Presentation',
      accentColor: '#7CA6E8',
    },
    {
      id: 'illustrator',
      shortCode: 'Ai',
      name: 'Adobe Illustrator',
      focus: 'Vector Logo Construction, Custom Marks & Identity Geometry',
      accentColor: '#F1B39C',
    },
    {
      id: 'indesign',
      shortCode: 'Id',
      name: 'Adobe InDesign',
      focus: 'Multi-Page Brand Style Guides, Editorial Layouts & Systems',
      accentColor: '#B86BD4',
    },
  ],
  contact: {
    heading: 'HAVE A PROJECT IN MIND?',
    supportingText: "Let's work together to create something meaningful.",
    emailPlaceholder: 'nayemulsumu21@gmail.com',
    socialLinks: [
      {
        id: 'behance',
        label: 'Behance',
        handlePlaceholder: 'behance.net/nayemulislam10',
        url: 'https://www.behance.net/nayemulislam10',
      },
      {
        id: 'instagram',
        label: 'Instagram',
        handlePlaceholder: '@nayemul321',
        url: 'https://www.instagram.com/nayemul321/?hl=en',
      },
      {
        id: 'facebook',
        label: 'Facebook',
        handlePlaceholder: 'facebook.com/mdnaemul66',
        url: 'https://www.facebook.com/mdnaemul66',
      },
      {
        id: 'linkedin',
        label: 'LinkedIn',
        handlePlaceholder: 'linkedin.com/in/nayemul-islam-a288923b3',
        url: 'https://www.linkedin.com/in/nayemul-islam-a288923b3/',
      },
      {
        id: 'fiverr',
        label: 'Fiverr',
        handlePlaceholder: 'fiverr.com/nayemulgfx',
        url: 'https://www.fiverr.com/nayemulgfx',
      },
    ],
  },
};
