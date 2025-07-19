import Layout from '@theme/Layout';

import { JSX } from 'react';
import ComparisonSection from './components/ComparisonSection/ComparisonSection';
import DeveloperExperienceSection from './components/DeveloperExperienceSection/DeveloperExperienceSection';
import FeatureHighlightsSection from './components/FeatureHighlightsSection/FeatureHighlightsSection';
import HomepageHeader from './components/HomepageHeader/HomepageHeader';
import PricingSection from './components/PricingSection/PricingSection';
import WorkflowSection from './components/WorkflowSection/WorkflowSection';

export default function Home(): JSX.Element {
  // const { siteConfig } = useDocusaurusContext();
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
      </main>
    </Layout>
  );
}
