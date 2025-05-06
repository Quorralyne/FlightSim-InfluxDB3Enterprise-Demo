"use client";

import { useState } from 'react';
import Notice from '@/components/ui/Notice';
import AppLayout from '../app-layout';
import styles from './data.module.css';

export default function DataPage() {
  const [isLoading] = useState<boolean>(false);

  return (
    <AppLayout>
      <div className={styles.tabContent}>
        <h2>Data Visualization</h2>
        {isLoading ? (
          <p>Loading data...</p>
        ) : (
          <Notice type="info">
            Data visualization will be implemented in a future update. This page will display flight simulator data from your InfluxDB database.
          </Notice>
        )}
      </div>
    </AppLayout>
  );
}
