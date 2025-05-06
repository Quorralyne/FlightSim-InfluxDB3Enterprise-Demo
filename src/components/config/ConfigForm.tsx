"use client";

import { useState, FormEvent } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import styles from './Config.module.css';

interface ConfigFormProps {
  onComplete?: () => void;
}

export default function ConfigForm({ onComplete }: ConfigFormProps) {
  const { influxEndpoint, adminToken, saveConfiguration, isLoading, error } = useConfig();
  const [localEndpoint, setLocalEndpoint] = useState<string>(influxEndpoint || 'http://localhost:8181/');
  const [localToken, setLocalToken] = useState<string>(adminToken || '');

  const [isTesting, setIsTesting] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      await saveConfiguration(localEndpoint, localToken);
      // Call the onComplete callback if it exists
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      // Error is already handled in the context
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>InfluxDB Configuration</h1>
        <p className={styles.subtitle}>Connect to your InfluxDB instance</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="endpoint" className={styles.label}>
            InfluxDB Endpoint URL
          </label>
          <input
            id="endpoint"
            type="text"
            value={localEndpoint}
            onChange={(e) => setLocalEndpoint(e.target.value)}
            className={styles.input}
            placeholder="http://localhost:8181/"
            required
            disabled={isLoading}
          />
          <p className={styles.subtitle} style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            The URL where your InfluxDB v3 Enterprise is running, including port number
          </p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="token" className={styles.label}>
            Admin API Token
          </label>
          <input
            id="token"
            type="text"
            value={localToken}
            onChange={(e) => setLocalToken(e.target.value)}
            className={styles.input}
            placeholder="Enter your admin token"
            required
            disabled={isLoading}
          />
          <p className={styles.subtitle} style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            The admin token generated with <code>influxdb3.exe create token --admin</code>
          </p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={`${styles.button} ${styles.primary}`}
          disabled={isLoading || isTesting}
        >
          {isTesting ? 'Testing Connection...' : isLoading ? 'Saving...' : 'Test Connection and Save'}
        </button>
      </form>
    </div>
  );
}
