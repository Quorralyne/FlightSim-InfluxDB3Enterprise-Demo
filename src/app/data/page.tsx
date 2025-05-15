"use client";

import { useState, useEffect, useRef } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import AppLayout from '../app-layout';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { RefreshIcon } from '@/components/ui/icons/Icons';
import styles from './data.module.css';

// Types for our data
interface DataPoint {
  timestamp: string;
  value: number;
}

// Interface for the consolidated flight data format
interface FlightDataPoint {
  time: string;
  topic: string;
  host: string;
  [key: string]: any; // For all the fields_* properties
}

interface BucketStats {
  recordCount: number;
  measurementCountPerRecord: number;
  dbSizeData: DataPoint[];
  compactedSizeData: DataPoint[];
  lastUpdated: string;
}

export default function DataPage() {
  const { activeBucket, isLoading } = useConfig();
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BucketStats | null>(null);
  const [records, setRecords] = useState<FlightDataPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);

  // Refs for canvas elements
  const dbSizeCanvasRef = useRef<HTMLCanvasElement>(null);
  const compactedSizeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Function to fetch data
  const fetchData = async () => {
    if (!activeBucket) return;

    setError(null);

    try {
      // Fetch stats with cache control headers
      fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/stats`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        } else {
          throw new Error(data.error || 'Failed to fetch stats');
        }
      });

      // Fetch measurements with cache control headers
      fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/measurements?limit=1000`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch measurements: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          setRecords(data.records);
          setLastUpdated(data.lastUpdated);

          // Extract unique metrics from the fields_* properties
          if (data.records.length > 0) {
            const firstRecord = data.records[0];
            const metrics = Object.keys(firstRecord)
              .filter(key => key.startsWith('fields_'))
              .map(key => key.replace('fields_', ''));

            setAvailableMetrics(metrics.sort());
          }
        } else {
          throw new Error(data.error || 'Failed to fetch flight data records');
        }
      });

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    }
  };

  // Function to draw the database size graph
  const drawDbSizeGraph = () => {
    if (!dbSizeCanvasRef.current || !stats?.dbSizeData) return;

    const canvas = dbSizeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = stats.dbSizeData;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 45;

    // Find min and max values
    const values = data.map(d => d.value);
    const minValue = Math.min(...values) * 0.9 / 1024 / 1024;
    const maxValue = Math.max(...values) * 1.1 / 1024 / 1024;

    console.log('Min value:', minValue);
    console.log('Max value:', maxValue);

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data points
    if (data.length > 1) {
      const xStep = (width - 2 * padding) / (data.length - 1);

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = '#3182ce';
      ctx.lineWidth = 2;

      data.forEach((point, i) => {
        const value = point.value / 1024 / 1024;
        const x = padding + i * xStep;
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      data.forEach((point, i) => {
        const value = point.value / 1024 / 1024;
        const x = padding + i * xStep;
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

        ctx.beginPath();
        ctx.fillStyle = '#3182ce';
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw y-axis labels
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Min value
      ctx.fillText(minValue.toFixed(2), padding - 5, height - padding);

      // Max value
      ctx.fillText(maxValue.toFixed(2), padding - 5, padding);

      // Middle value
      const middleValue = (minValue + maxValue) / 2;
      ctx.fillText(middleValue.toFixed(2), padding - 5, height - padding - (height - 2 * padding) / 2);
    }
  };

  // Function to draw the compacted size graph
  const drawCompactedSizeGraph = () => {
    if (!compactedSizeCanvasRef.current || !stats?.compactedSizeData) return;

    const canvas = compactedSizeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = stats.compactedSizeData;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 45;

    // Find min and max values
    const values = data.map(d => d.value);
    const minValue = Math.min(...values) * 0.9 / 1024 / 1024;
    const maxValue = Math.max(...values) * 1.1 / 1024 / 1024;

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data points
    if (data.length > 1) {
      const xStep = (width - 2 * padding) / (data.length - 1);

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = '#38a169';
      ctx.lineWidth = 2;

      data.forEach((point, i) => {
        const value = point.value / 1024 / 1024;
        const x = padding + i * xStep;
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      data.forEach((point, i) => {
        const value = point.value / 1024 / 1024;
        const x = padding + i * xStep;
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

        ctx.beginPath();
        ctx.fillStyle = '#38a169';
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw y-axis labels
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Min value
      ctx.fillText(minValue.toFixed(2), padding - 5, height - padding);

      // Max value
      ctx.fillText(maxValue.toFixed(2), padding - 5, padding);

      // Middle value
      const middleValue = (minValue + maxValue) / 2;
      ctx.fillText(middleValue.toFixed(2), padding - 5, height - padding - (height - 2 * padding) / 2);
    }
  };

  // Draw graphs when stats change
  useEffect(() => {
    if (stats) {
      drawDbSizeGraph();
      drawCompactedSizeGraph();
    }
  }, [stats]);

  // Fetch data on mount and when activeBucket changes
  useEffect(() => {
    if (activeBucket) {
      // Initial data fetch
      fetchData();

      // Set up polling interval (every 10 seconds)
      const interval = setInterval(() => {
        // Use a more controlled approach to fetch data
        (async () => {
          try {
            // Fetch stats
            fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/stats`, {
              // Add cache control headers to prevent caching
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            }).then(async (response) => {
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  setStats(data.stats);
                }
              }
            });

            // Fetch measurements
            fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/measurements`, {
              // Add cache control headers to prevent caching
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            }).then(async (response) => {
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  setRecords(data.records);
                  setLastUpdated(data.lastUpdated);

                  // Extract unique metrics from the fields_* properties
                  if (data.records.length > 0) {
                    const firstRecord = data.records[0];
                    const metrics = Object.keys(firstRecord)
                      .filter(key => key.startsWith('fields_'))
                      .map(key => key.replace('fields_', ''));

                    setAvailableMetrics(metrics.sort());
                  }
                }
              }
            });

          } catch (err) {
            console.error('Error in auto-refresh:', err);
          }
        })();
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [activeBucket]);

  // Format timestamp for display in UTC Zulu time with milliseconds
  const formatTimestamp = (timestamp: string) => {
    // Return the ISO string which is already in UTC Zulu time with milliseconds
    return timestamp;
  };

  // Let AppLayout handle the loading state
  // We don't need to check isLoading here anymore since AppLayout will handle it

  // Only show the "select a bucket" message if loading is complete and there's no active bucket
  if (!activeBucket) {
    return (
      <AppLayout>
        <div className={styles.tabContent}>
          <h2>Data Visualization</h2>
          <Notice type="info">
            Please select a bucket with data from the Buckets tab to view visualizations.
          </Notice>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.tabContent}>
        <div className={styles.cardHeader} style={{ marginBottom: '20px' }}>
          <h2>Flight Data Dashboard: {activeBucket}</h2>
          <Button
            variant="outline"
            onClick={fetchData}
          >
            <RefreshIcon size={16} className="mr-2" />
            Refresh Data
          </Button>
        </div>

        {error && (
          <Notice type="error">
            {error}
          </Notice>
        )}

        <div className={styles.dashboardGrid}>
          {/* Indicators Row - 6 small measurement cards */}
          <div className={styles.indicatorsRow}>
            {/* Indicator 1 - Measurements per minute */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {stats?.recordCount * stats?.measurementCountPerRecord || 0}
              </div>
              <div className={styles.indicatorLabel}>
                Record Count
              </div>
            </div>

            {/* Indicator 2 - Current DB Size */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {stats?.dbSizeData && stats.dbSizeData.length > 0
                  ? (stats.dbSizeData[stats.dbSizeData.length - 1].value / 1024 / 1024).toFixed(2)
                  : '0.00'}
              </div>
              <div className={styles.indicatorLabel}>
                Current DB Size (MB)
              </div>
            </div>

            {/* Indicator 3 - Current Compacted Size */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {stats?.compactedSizeData && stats.compactedSizeData.length > 0
                  ? (stats.compactedSizeData[stats.compactedSizeData.length - 1].value / 1024 / 1024).toFixed(2)
                  : '0.00'}
              </div>
              <div className={styles.indicatorLabel}>
                Compacted Size (MB)
              </div>
            </div>

            {/* Indicator 4 - Metrics Count */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {availableMetrics.length}
              </div>
              <div className={styles.indicatorLabel}>
                Unique Metrics
              </div>
            </div>

            {/* Indicator 5 - Data Points */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {records.length}
              </div>
              <div className={styles.indicatorLabel}>
                Recent Data Points
              </div>
            </div>

            {/* Indicator 6 - Monitoring Status */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue} style={{ fontSize: '1.4rem', color: stats ? 'green' : 'red' }}>
                {stats ? 'ACTIVE' : 'INACTIVE'}
              </div>
              <div className={styles.indicatorLabel}>
                Monitoring Status
              </div>
            </div>
          </div>

          {/* Graphs Row - Side by side */}
          <div className={styles.graphsRow}>
            {/* Database size graph */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Database Size (MB)</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.graphContainer}>
                  <canvas
                    ref={dbSizeCanvasRef}
                    width="500"
                    height="200"
                    style={{ width: '100%', height: '100%' }}
                  ></canvas>
                </div>
                <div className={styles.statLabel}>
                  Last hour (10s intervals)
                </div>
              </div>
            </div>

            {/* Compacted size graph */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Compacted Size (MB)</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.graphContainer}>
                  <canvas
                    ref={compactedSizeCanvasRef}
                    width="500"
                    height="200"
                    style={{ width: '100%', height: '100%' }}
                  ></canvas>
                </div>
                <div className={styles.statLabel}>
                  Last hour (10s intervals)
                </div>
              </div>
            </div>
          </div>

          {/* Measurements table - Full width */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recent Measurements</h3>
              <div className={styles.filterContainer}>
                <label htmlFor="metricFilter" className={styles.filterLabel}>Filter by metric:</label>
                <select
                  id="metricFilter"
                  value={metricFilter}
                  onChange={(e) => setMetricFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All metrics</option>
                  {availableMetrics.map((metric) => (
                    <option key={metric} value={metric}>{metric}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.tableContainer}>
                <table className={styles.measurementsTable}>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                          No flight data records found
                        </td>
                      </tr>
                    ) : (
                      // For each record, we'll display the selected metric
                      records.map((record: FlightDataPoint, recordIndex: number) => {
                        // If 'all' is selected, we'll show all metrics for this record
                        if (metricFilter === 'all') {
                          // Get all fields_* properties
                          const metricEntries = Object.entries(record)
                            .filter(([key]) => key.startsWith('fields_'))
                            .map(([key, value]) => ({
                              metric: key.replace('fields_', ''),
                              value: value
                            }));

                          // Return a row for each metric in this record
                          return metricEntries.map(({ metric, value }, metricIndex: number) => (
                            <tr key={`${recordIndex}-${metricIndex}`}>
                              <td>{metric}</td>
                              <td>{String(value)}</td>
                              <td>{formatTimestamp(record.time)}</td>
                            </tr>
                          ));
                        } else {
                          // Only show the selected metric
                          const fieldKey = `fields_${metricFilter}`;
                          if (record[fieldKey] !== undefined) {
                            return (
                              <tr key={recordIndex}>
                                <td>{metricFilter}</td>
                                <td>{String(record[fieldKey])}</td>
                                <td>{formatTimestamp(record.time)}</td>
                              </tr>
                            );
                          }
                          return null;
                        }
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {lastUpdated && (
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
                  Last updated: {formatTimestamp(lastUpdated)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
