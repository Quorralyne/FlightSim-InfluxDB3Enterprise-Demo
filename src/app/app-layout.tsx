"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useConfig } from '@/contexts/ConfigContext';
import { InfluxDBIcon } from '@/components/ui/icons';
import { useEffect } from 'react';
import styles from './layout.module.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { influxEndpoint } = useConfig();
  const pathname = usePathname();
  const router = useRouter();

  // Use useEffect for redirection to ensure it only happens client-side
  useEffect(() => {
    if (!influxEndpoint) {
      router.push('/');
    }
  }, [influxEndpoint, router]);
  
  // If not configured, show loading or nothing until redirect happens
  if (!influxEndpoint) {
    return null;
  }

  // Helper to check if a tab is active
  const isActive = (path: string) => {
    return pathname.startsWith(`/${path}`);
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <h1><InfluxDBIcon size={32} className={styles.logoIcon} /> FlightSim Demo </h1>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.tabs}>
          <Link 
            href="/buckets" 
            className={`${styles.tabButton} ${isActive('buckets') ? styles.active : ''}`}
          >
            Buckets
          </Link>
          <Link 
            href="/data" 
            className={`${styles.tabButton} ${isActive('data') ? styles.active : ''}`}
          >
            Data
          </Link>
        </div>
        <div className={styles.tabContainer}>
          {children}
        </div>
      </div>
    </div>
  );
}
