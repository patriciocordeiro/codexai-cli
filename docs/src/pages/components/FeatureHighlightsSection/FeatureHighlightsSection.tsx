import { motion } from 'framer-motion';
import styles from './FeatureHighlightsSection.module.css';

// We'll reuse some icons and create one new one for Flexible Analysis
const FlexibleAnalysisIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
  >
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path d="M7 8h10M7 12h5M7 16h3" />
  </svg>
);
const CiCdIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
  >
    <path d="M14 6l-3.75 5.25M14 6l-3.75-5.25M14 6h-3.75" />
    <circle cx="17.5" cy="17.5" r="3.5" />
    <path d="M6 18H2M11.5 17.5H9.25M6 6H2M11.5 6.5H9.25" />
  </svg>
);
const SecurityIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const LanguageIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
  >
    <path d="M3 5h12M9 3v2m4 16l-6-6-6 6" />
    <path d="M18 18h-5a1 1 0 01-1-1V4a1 1 0 011-1h5a1 1 0 011 1v13a1 1 0 01-1 1z" />
  </svg>
);

const FeatureCard = ({ icon, title, description }) => (
  <motion.div
    className={styles.featureCard}
    variants={{
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 },
    }}
  >
    <div className={styles.iconWrapper}>{icon}</div>
    <h3 className={styles.cardTitle}>{title}</h3>
    <p className={styles.cardDescription}>{description}</p>
  </motion.div>
);

export default function FeatureHighlightsSection() {
  return (
    <motion.section
      className={`section-padding ${styles.featuresSection}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: 0.1 }}
    >
      <div className="container">
        <h2 className={styles.sectionTitle}>
          A Complete Code Quality Platform
        </h2>
        {/* We will change the grid class to support 4 items better */}
        <div className={`${styles.grid} ${styles.fourItems}`}>
          <FeatureCard
            icon={<FlexibleAnalysisIcon />}
            title="Flexible Analysis"
            description="Analyze exactly what you need: the entire project, specific files and folders, or just the changes in your Git diff."
          />
          <FeatureCard
            icon={<CiCdIcon />}
            title="CI/CD Integration"
            description="Automate reviews on every pull request with first-class support for GitHub Actions, GitLab CI, and more."
          />
          <FeatureCard
            icon={<SecurityIcon />}
            title="Security Focused"
            description="Our AI is trained to find common security vulnerabilities like XSS, SQL Injection, and insecure configurations."
          />
          <FeatureCard
            icon={<LanguageIcon />}
            title="Multi-Language Support"
            description="From JavaScript & TypeScript to Python, Go, and beyond. We support the languages your team loves."
          />
        </div>
      </div>
    </motion.section>
  );
}
