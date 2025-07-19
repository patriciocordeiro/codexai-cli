import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'My Site',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'My Site',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        // Left-aligned items
        {
          label: 'Features',
          to: '/#features', // Links to the section with id="features"
          activeBasePath: ' ', // Marks as active on the homepage
          position: 'right',
        },
        {
          label: 'Workflow',
          to: '/#workflow',
          activeBasePath: ' ',
          position: 'right',
        },
        {
          label: 'Benefits',
          to: '/#benefits',
          activeBasePath: ' ',
          position: 'right',
        },
        {
          label: 'Pricing',
          to: '/#pricing',
          activeBasePath: ' ',
          position: 'right',
        },
        {
          label: 'Docs',
          to: '/docs/introduction', // Links to your documentation
          position: 'right',
        },

        // --- ADD THIS NEW BUTTON ---
        {
          label: 'Get Started',
          to: 'https://app.yourdomain.com/signup', // CHANGE THIS to your actual web app signup URL
          position: 'right',
          className: 'header-cta-button', // Custom class for styling
        },

        // Right-aligned items
        {
          href: 'https://github.com/your-organization/your-repo', // CHANGE THIS
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Product',
          items: [
            {
              label: 'Benefits',
              to: '/#benefits',
            },
            {
              label: 'Workflow',
              to: '/#workflow',
            },
            {
              label: 'Pricing',
              to: '/#pricing',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Documentation',
              to: '/docs/introduction',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/your-organization/your-repo', // CHANGE THIS
            },
            {
              label: 'Discord',
              href: 'https://your-discord-invite.com', // CHANGE THIS
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'Privacy Policy',
              to: '/privacy', // We will need to create this page
            },
            {
              label: 'Terms of Service',
              to: '/terms', // We will need to create this page
            },
          ],
        },
      ],
      logo: {
        alt: 'CodeAI Logo',
        src: 'img/logo.svg', // CHANGE THIS to your logo
        href: '/',
        width: 160,
      },
      copyright: `Copyright © ${new Date().getFullYear()} CodeAI. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
