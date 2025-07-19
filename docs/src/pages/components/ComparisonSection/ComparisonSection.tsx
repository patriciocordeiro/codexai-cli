import { motion } from 'framer-motion';
import styles from './ComparisonSection.module.css';

const ComparisonRow = ({ feature, traditional, codeAI }) => (
  <motion.div
    className={styles.row}
    variants={{
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.5 } },
    }}
  >
    <div className={styles.featureName}>{feature}</div>
    <div className={styles.column}>{traditional}</div>
    <div className={`${styles.column} ${styles.highlightedColumn}`}>
      {codeAI}
    </div>
  </motion.div>
);

export default function ComparisonSection() {
  return (
    <motion.section
      className={`section-padding ${styles.comparisonSection}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ staggerChildren: 0.2 }}
    >
      <div className="container">
        <h2 className={styles.sectionTitle}>An Evolution in Code Quality</h2>
        <motion.div
          className={styles.table}
          variants={{
            hidden: { opacity: 0, y: 50 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.7, ease: 'easeOut' },
            },
          }}
        >
          <div className={styles.header}>
            <div className={styles.featureName}>Aspect</div>
            <div className={styles.column}>Traditional Tools</div>
            <div className={`${styles.column} ${styles.highlightedHeader}`}>
              The CodeAI Way
            </div>
          </div>
          <ComparisonRow
            feature="Analysis Core"
            traditional="Rule-Based (Fixed checks)"
            codeAI="AI-Based (Understands intent)"
          />
          <ComparisonRow
            feature="Bug Detection"
            traditional="Finds known patterns & style errors"
            codeAI="Uncovers complex logical & security flaws"
          />
          <ComparisonRow
            feature="Scope"
            traditional="Analyzes files in isolation"
            codeAI="Considers entire project context"
          />
          <ComparisonRow
            feature="Feedback"
            traditional="Flags an error"
            codeAI="Explains the 'why' to level-up developers"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
