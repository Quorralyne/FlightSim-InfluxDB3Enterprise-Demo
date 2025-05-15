"use client";

import { useConfig } from '@/contexts/ConfigContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Config from '@/components/config/Config';
import styles from './page.module.css';

export default function Home() {
  const { isConfigured } = useConfig();
  const router = useRouter();

  useEffect(() => {
    if (isConfigured) {
      router.push('/buckets');
    }
  }, [isConfigured, router]);
  
  if (!isConfigured) {
    return <Config />;
  }
  
  return null;
}
