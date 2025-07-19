import clsx from 'clsx';
import React, { JSX } from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

// Placeholder SVGs. Replace these with your own or from a library like heroicons.
const FeatureList: FeatureItem[] = [
  {
    title: 'AI-Powered Code Review',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Get intelligent, context-aware feedback on your code. Find bugs,
        security flaws, and style issues before they ever reach production.
      </>
    ),
  },
  {
    title: 'Seamless Workflow',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Analyze your entire project or just the files you've changed. Integrates
        perfectly with your existing Git workflow.
      </>
    ),
  },
  {
    title: 'Interactive Web Reports',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Don't get lost in terminal output. View rich, interactive analysis
        reports in your browser for a comprehensive overview of your code's
        health.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
