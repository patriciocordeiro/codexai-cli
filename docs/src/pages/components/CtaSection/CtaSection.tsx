import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { motion } from 'framer-motion';
import CtaButton from '../CtaButton/CtaButton';
import styles from './CtaSection.module.css';

export default function CtaSection() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <motion.section
      className={styles.ctaSection}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 1 }}
    >
      <div className="container">
        <h2 className={styles.title}>Start Reviewing Your Code in Minutes</h2>
        <p className={styles.subtitle}>
          No credit card required. Create your free account and get instant
          insights.
        </p>
        <CtaButton to={`${siteConfig.customFields.webAppUrl}/signup`}>
          Create Free Account
        </CtaButton>
      </div>
    </motion.section>
  );
}
