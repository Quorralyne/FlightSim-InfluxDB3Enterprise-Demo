"use client";

import { useConfig } from '@/contexts/ConfigContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Config from '@/components/config/Config';
import styles from './page.module.css';

export default function Home() {
  const { isConfigured } = useConfig();
  const router = useRouter();

  // If not configured, show the configuration wizard
  if (!isConfigured) {
    return <Config />;
  }

  // Redirect to the list of buckets when configuration is complete
  
  useEffect(() => {
    if (isConfigured) {
      router.push('/buckets');
    }
  }, [isConfigured, router]);
  
  return null; // This will briefly show before redirect happens
}
