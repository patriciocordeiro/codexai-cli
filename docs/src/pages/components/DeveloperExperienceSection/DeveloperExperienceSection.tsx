import { motion } from 'framer-motion';
import styles from './DeveloperExperienceSection.module.css';

// --- UPDATED, THEME-AWARE SVG ICONS ---

// The "Before" icon. Its color will be the standard, secondary text color.
const BeforeIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
      fill="var(--text-color)"
    />
  </svg>
);

// The "After" icon. Its color will be the bright, green accent color.
const AfterIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      fill="var(--accent-color-3)"
    />
  </svg>
);

const ExperienceRow = ({ before, after }) => (
  <motion.div
    className={styles.row}
    variants={{
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 },
    }}
  >
    <div className={styles.columnBefore}>
      <div className={styles.iconWrapper}>
        <BeforeIcon />
      </div>
      <p>{before}</p>
    </div>
    <div className={styles.arrow}>→</div>
    <div className={styles.columnAfter}>
      <div className={styles.iconWrapper}>
        <AfterIcon />
      </div>
      <p>{after}</p>
    </div>
  </motion.div>
);

export default function DeveloperExperienceSection() {
  return (
    <motion.section
      id="benefits"
      className={`section-padding ${styles.devExSection}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ staggerChildren: 0.3 }}
    >
      <div className="container">
        <h2 className={styles.sectionTitle}>
          From Anxiety to{' '}
          <span className="animated-gradient-text">Acceleration</span>
        </h2>
        <div className={styles.grid}>
          <ExperienceRow
            before="Endless back-and-forth on pull requests"
            after="Instant, objective feedback before you even commit"
          />
          <ExperienceRow
            before="Anxiety about introducing a critical bug"
            after="Ship features with total confidence, backed by AI"
          />
          <ExperienceRow
            before="Hours wasted on tedious, manual reviews"
            after="Automate the mundane, and focus on innovation"
          />
        </div>
      </div>
    </motion.section>
  );
}
