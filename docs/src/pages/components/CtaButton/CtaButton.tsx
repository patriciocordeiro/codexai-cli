import Link from '@docusaurus/Link';
import React from 'react';
import styles from './CtaButton.module.css';

type CtaButtonProps = {
  children: React.ReactNode;
  href?: string; // For external links
  to?: string; // For internal Docusaurus links
  className?: string;
};

export default function CtaButton({
  children,
  href,
  to,
  className = '',
}: CtaButtonProps) {
  const buttonClassName = `${styles.ctaButton} ${className}`;

  // If `href` is provided, render a standard anchor tag for external links.
  if (href) {
    return (
      <a href={href} className={buttonClassName}>
        {children}
      </a>
    );
  }

  // Otherwise, render a Docusaurus <Link> component for internal navigation.
  return (
    <Link to={to} className={buttonClassName}>
      {children}
    </Link>
  );
}
