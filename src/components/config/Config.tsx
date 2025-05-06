"use client";

import { useConfig } from '@/contexts/ConfigContext';
import ConfigForm from './ConfigForm';

export default function Config() {
  const { isLoading } = useConfig();

  // Show loading state while initially fetching configuration
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Loading configuration...
      </div>
    );
  }

  // Simply return the endpoint form for initial configuration
  return <ConfigForm onComplete={() => {}} />;
}
