import Link from '@docusaurus/Link';
import { motion } from 'framer-motion';
import styles from './HomepageHeader.module.css';

export default function HomepageHeader() {
  return (
    <motion.header
      className={styles.heroBanner}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="container">
        <motion.h1
          className={styles.heroTitle}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Your Code's{' '}
          <span className="animated-gradient-text">AI Co-Pilot</span>
        </motion.h1>
        <motion.p
          className={styles.heroSubtitle}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Analyze, review, and refactor your code with state-of-the-art AI. Use
          our powerful CLI or upload your project directly to the web. Ship with
          confidence.
        </motion.p>
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className={styles.installCommand}>
            <span className={styles.promptSymbol}>$</span>
            <code>npm install -g codeai-cli</code>
          </div>
          <Link className={styles.ctaButton} to="/docs/introduction">
            Get Started
          </Link>
        </motion.div>
      </div>
      <div className={styles.heroBgGradient} />
    </motion.header>
  );
}
