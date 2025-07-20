import { motion } from 'framer-motion';
import styles from './WorkflowSection.module.css';

// --- UPDATED, THEME-AWARE SVG ICONS ---

const TerminalIcon = ({ isReversed = false }) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 17l6-6-6-6"
      stroke="var(--accent-color-3)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 19h8"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AIBrainIcon = ({ isReversed = false }) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L9 5M12 2L15 5M12 2V9"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 15C14.2091 15 16 13.2091 16 11C16 8.79086 14.2091 7 12 7C9.79086 7 8 8.79086 8 11C8 13.2091 9.79086 15 12 15Z"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
    />
    <path
      d="M21 12H19"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5 12H3"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 21V19"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M17.6569 17.6569L16.2426 16.2426"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.34315 6.34315L7.75736 7.75736"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ReportIcon = ({ isReversed = false }) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke={isReversed ? 'var(--accent-color-2)' : 'var(--accent-color-1)'}
      strokeWidth="1.5"
    />
    <path
      d="M7 8H17"
      stroke="var(--accent-color-2)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7 12H17"
      stroke="var(--accent-color-3)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7 16H12"
      stroke="var(--accent-color-2)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// --- SIMPLIFIED WorkflowStep COMPONENT ---

const WorkflowStep = ({
  icon: Icon,
  title,
  description,
  isReversed = false,
}) => {
  return (
    <motion.div
      className={`${styles.step} ${isReversed ? styles.reversed : ''}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className={styles.card}>
        <div className={styles.textContainer}>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className={styles.iconContainer}>
        {/* Pass the isReversed prop directly to the Icon component */}
        <Icon isReversed={isReversed} />
      </div>
    </motion.div>
  );
};

export default function WorkflowSection() {
  return (
    <section
      id="workflow"
      className={`section-padding ${styles.workflowSection}`}
    >
      <div className="container">
        <h2 className={styles.sectionTitle}>
          Your Workflow,{' '}
          <span className="animated-gradient-text">Supercharged</span>
        </h2>
        <div className={styles.stepsContainer}>
          <WorkflowStep
            icon={TerminalIcon}
            title="1. Analyze with Ease"
            description={
              <>
                Run <code>codeai analyze .</code> in your terminal.{' '}
                <strong>Or, upload a .zip file directly in our web app.</strong>
              </>
            }
          />
          <WorkflowStep
            icon={AIBrainIcon}
            title="2. Unleash the AI"
            description="Our engine goes beyond basic linting. It understands the context and intent of your code to find complex logical flaws, security vulnerabilities, and anti-patterns."
            isReversed={true}
          />
          <WorkflowStep
            icon={ReportIcon}
            title="3. Review with Clarity"
            description="Forget endless terminal output. Receive a link to a rich, interactive web report where you can explore, filter, and understand every suggestion in detail."
          />
        </div>
      </div>
    </section>
  );
}
