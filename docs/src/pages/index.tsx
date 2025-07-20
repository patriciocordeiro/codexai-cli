import Layout from '@theme/Layout';

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { JSX } from 'react';
import { navItems } from '../../routes';
import ComparisonSection from './components/ComparisonSection/ComparisonSection';
import CtaSection from './components/CtaSection/CtaSection';
import DeveloperExperienceSection from './components/DeveloperExperienceSection/DeveloperExperienceSection';
import FeatureHighlightsSection from './components/FeatureHighlightsSection/FeatureHighlightsSection';
import HomepageHeader from './components/HomepageHeader/HomepageHeader';
import PricingSection from './components/PricingSection/PricingSection';
import WorkflowSection from './components/WorkflowSection/WorkflowSection';

// This is a helper function to determine the page type.
// It checks the browser's current URL path.
function getPageType() {
  if (typeof window === 'undefined') {
    // During server-side rendering, we can't know the path.
    // Default to 'home' as a safe bet.
    return 'home';
  }
  // eslint-disable-next-line no-undef
  return window.location.pathname.startsWith('/docs') ? 'docs' : 'home';
}
export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const themeConfig = siteConfig.themeConfig as {
    navbar: { items: Array<{ label: string; to?: string; id: string }> };
  };
  const backupItems = navItems;
  const pathname = getPageType();

  console.log('start', pathname, backupItems);

  themeConfig.navbar.items = pathname.startsWith('docs')
    ? themeConfig.navbar.items.filter(item => item.id === 'permanent')
    : (backupItems as any);

  return (
    <Layout
      title={`Home`}
      description="AI-powered code analysis and automated code review right from your terminal."
    >
      <HomepageHeader />
      <main>
        <WorkflowSection />
        <FeatureHighlightsSection />
        <DeveloperExperienceSection />
        <ComparisonSection />
        <PricingSection />
        <CtaSection />
      </main>
    </Layout>
  );
}
