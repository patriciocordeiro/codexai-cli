import { motion } from 'framer-motion';
import styles from './HowItWorksSection.module.css';

const Step = ({ number, title, children }) => (
  <div className={styles.step}>
    <div className={styles.stepNumber}>{number}</div>
    <div className={styles.stepContent}>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  </div>
);

export default function HowItWorksSection() {
  const lineVariants = {
    hidden: { pathLength: 0 },
    // visible: { pathLength: 1, transition: { duration: 1, ease: 'easeInOut' } },
  };

  return (
    <motion.section
      className={`section-padding ${styles.howItWorks}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ staggerChildren: 0.4 }}
    >
      <div className="container">
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsContainer}>
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -50 },
              visible: { opacity: 1, x: 0 },
            }}
          >
            <Step number="1" title="Analyze">
              Run <code>codeai analyze .</code> in your project terminal. The
              CLI securely bundles your code for analysis.
            </Step>
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Step number="2" title="Process">
              Our AI engine processes your code, checking for bugs,
              vulnerabilities, and best-practice violations.
            </Step>
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, x: 50 },
              visible: { opacity: 1, x: 0 },
            }}
          >
            <Step number="3" title="Review">
              Receive a link to a private, interactive web report to view,
              filter, and understand every suggestion.
            </Step>
          </motion.div>
          <svg
            className={styles.connectorLines}
            width="100%"
            height="100%"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 100 50 Q 200 70 200 150"
              stroke="var(--neon-magenta)"
              strokeWidth="2"
              fill="none"
              variants={lineVariants}
            />
            <motion.path
              d="M 300 50 Q 200 70 200 150"
              stroke="var(--neon-cyan)"
              strokeWidth="2"
              fill="none"
              variants={lineVariants}
            />
          </svg>
        </div>
      </div>
    </motion.section>
  );
}
