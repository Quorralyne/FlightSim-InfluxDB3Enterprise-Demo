import React, { useState } from 'react';
import styles from './PilotName.module.css';

interface PilotNameProps {
  initialName?: string;
  onSubmit?: (name: string) => void;
  className?: string;
}

const PilotName: React.FC<PilotNameProps> = ({ initialName = '', onSubmit, className }) => {
  const [name, setName] = useState(initialName);
  const [inputValue, setInputValue] = useState(initialName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setName(inputValue);
    if (onSubmit) onSubmit(inputValue);
    try {
      const resp = await fetch('/api/influxdb/flightsession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotName: inputValue })
      });
      const data = await resp.json();
      if (data.success) {
        console.log('Pilot name saved to InfluxDB');
      } else {
        console.error('Failed to save pilot name:', data.error);
      }
    } catch (err) {
      console.error('Error sending pilot name:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className ? `${styles.pilotNameContainer} ${className}` : styles.pilotNameContainer}>
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder="Enter pilot name"
        className={styles.pilotInput}
      />
      <button type="submit" className={styles.pilotButton}>
        Set
      </button>
    </form>
  );
};

export default PilotName;
