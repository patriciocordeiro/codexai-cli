import { Config } from '@docusaurus/types';
const webAppUrl =
  'https://codex-ai-30da8-105725632786.europe-southwest1.run.app'; // CHANGE THIS to your actual web app URL

type ThemeConfig = Config['themeConfig'] & {
  navbar: {
    items: Array<{
      id?: string;
      label?: string;
      to?: string;
      href?: string;
      activeBasePath?: string;
      position?: 'left' | 'right';
      className?: string;
      'aria-label'?: string;
    }>;
  };
};
export const navItems: ThemeConfig['navbar']['items'] = [
  {
    label: 'Workflow',
    to: '/#workflow',
    activeBasePath: ' ',
    position: 'right',
  },
  {
    label: 'Features',
    to: '/#features',
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
    to: '/docs/introduction',
    position: 'right',
  },

  // Right-aligned items
  {
    id: 'permanent',
    label: 'Signup',
    to: `${webAppUrl}/signup`,
    position: 'right',
    className: 'header-cta-button',
  },
  {
    id: 'permanent',
    href: 'https://github.com/your-organization/your-repo',
    position: 'right',
    className: 'header-github-link',
    'aria-label': 'GitHub repository',
  },
];
