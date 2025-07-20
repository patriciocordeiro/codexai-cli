import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';
import { navItems } from './routes';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const webAppUrl =
  'https://codex-ai-30da8-105725632786.europe-southwest1.run.app'; // CHANGE THIS to your actual web app URL
const config: Config = {
  title: 'CodexAi',
  tagline: 'AI-powered code analysis and automated code review',
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

  customFields: {
    webAppUrl,
    signupUrl: `${webAppUrl}/signup`,
  },
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'patriciocordeiro', // Usually your GitHub org/user name.
  projectName: 'codexai', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

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
          path: 'docs',
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: false,

        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg', // CHANGE THIS
    navbar: {
      title: 'CodeAI', // Use your project name
      logo: {
        alt: 'CodeAI Logo',
        src: 'img/logo.svg', // CHANGE THIS
      },
      hideOnScroll: false,
      items: navItems,
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Product',
          items: [
            { label: 'Benefits', to: '/#benefits' },
            { label: 'Workflow', to: '/#workflow' },
            { label: 'Pricing', to: '/#pricing' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'Documentation', to: '/docs/introduction' },
            {
              label: 'GitHub',
              href: 'https://github.com/your-organization/your-repo',
            }, // CHANGE THIS
            { label: 'Discord', href: 'https://your-discord-invite.com' }, // CHANGE THIS
          ],
        },
        {
          title: 'Legal',
          items: [
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Terms of Service', to: '/terms' },
          ],
        },
      ],
      logo: {
        alt: 'CodeAI Logo',
        src: 'img/logo.svg', // CHANGE THIS
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
