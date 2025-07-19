import Link from '@docusaurus/Link';
import { motion, Variants } from 'framer-motion';
import styles from './PricingSection.module.css';

const PricingCard = ({
  plan,
  price,
  description,
  features,
  isFeatured = false,
}) => {
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <motion.div className={styles.cardWrapper} variants={cardVariants}>
      {isFeatured && <div className={styles.featuredBadge}>Recommended</div>}
      <div
        className={`${styles.card} ${isFeatured ? styles.featuredCard : ''}`}
      >
        <h3 className={styles.planName}>{plan}</h3>
        <div className={styles.price}>{price}</div>
        <p className={styles.description}>{description}</p>
        <ul className={styles.featuresList}>
          {features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
        <Link to="/docs/introduction" className={styles.ctaButton}>
          Choose Plan
        </Link>
      </div>
    </motion.div>
  );
};

export default function PricingSection() {
  return (
    <motion.section
      id="pricing"
      className={`section-padding ${styles.pricingSection}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: 0.2 }}
    >
      <div className="container">
        {/* Updated, more professional headline */}
        <h2 className={styles.sectionTitle}>
          Choose the Plan That's Right for You
        </h2>
        <div className={styles.grid}>
          <PricingCard
            plan="Free"
            price="$0"
            description="For individuals & hobby projects."
            features={[
              '10 analyses / month',
              'Core AI code review',
              'Community support',
            ]}
          />
          <PricingCard
            plan="Pro"
            price="$15"
            description="For professional developers."
            features={[
              'Unlimited analyses',
              'CLI + Web Upload access',
              'Project & analysis history',
              'All analysis tasks (Tests, etc.)',
              'Priority email support',
            ]}
            isFeatured={true}
          />
          <PricingCard
            plan="Team"
            price="$25"
            description="For collaborative teams & businesses."
            features={[
              'All Pro features',
              'Centralized billing',
              'Team collaboration features',
              'SSO & priority support',
            ]}
          />
        </div>
      </div>
    </motion.section>
  );
}
