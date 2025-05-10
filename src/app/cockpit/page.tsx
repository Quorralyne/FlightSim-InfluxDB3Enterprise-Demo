"use client";

import { useState, useEffect, useRef } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import AppLayout from '../app-layout';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { RefreshIcon } from '@/components/ui/icons/Icons';
import styles from './cockpit.module.css';

// Types for our data
interface DataPoint {
  timestamp: string;
  value: number;
}

interface Measurement {
  metric: string;
  value: number;
  timestamp: string;
  unit: string;
}

interface BucketStats {
  measurementsLastMinute: number;
  dbSizeData: DataPoint[];
  compactedSizeData: DataPoint[];
  lastUpdated: string;
}

export default function CockpitPage() {
  const { activeBucket, isLoading } = useConfig();
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BucketStats | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);

  // No longer need canvas refs as we're using div-based indicators

  // Function to fetch data
  const fetchData = async () => {
    if (!activeBucket) return;

    setError(null);

    try {
      // Fetch stats with cache control headers
      const statsPromise = fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/stats`, {
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
      const measurementsPromise = fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/measurements?limit=1000`, {
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
          setMeasurements(data.measurements);
          setLastUpdated(data.lastUpdated);

          // Extract unique metrics for the filter
          const metrics = data.measurements.map((m: Measurement) => m.metric);
          const uniqueMetrics = Array.from(new Set(metrics)).sort() as string[];
          setAvailableMetrics(uniqueMetrics);
        } else {
          throw new Error(data.error || 'Failed to fetch measurements');
        }
      });

      // Wait for both promises to resolve or reject
      await Promise.allSettled([statsPromise, measurementsPromise]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    }
  };

  // No longer need graph drawing functions as we're using div-based indicators

  // No need to draw graphs when stats change
  useEffect(() => {
    // This effect is kept for potential future use, but currently does nothing
    // since we've replaced the graphs with direct DOM elements
  }, [stats]);

  // Fetch data on mount and when activeBucket changes
  useEffect(() => {
    if (activeBucket) {
      // Initial data fetch
      fetchData();

      // Set up polling interval (every 0.5 seconds for cockpit data)
      const interval = setInterval(() => {
        // Use a more controlled approach to fetch data
        (async () => {
          try {
            // For cockpit, we prioritize measurements over stats for more responsive flight data
            // Fetch measurements first
            const measurementsPromise = fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/measurements?limit=1000`, {
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
                  setMeasurements(data.measurements);
                  setLastUpdated(data.lastUpdated);

                  // Extract unique metrics for the filter during auto-refresh
                  const metrics = data.measurements.map((m: Measurement) => m.metric);
                  const uniqueMetrics = Array.from(new Set(metrics)).sort() as string[];
                  setAvailableMetrics(uniqueMetrics);
                }
              }
            });

            // Fetch stats (less critical for cockpit display)
            const statsPromise = fetch(`/api/influxdb/bucket/${encodeURIComponent(activeBucket)}/stats`, {
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

            // Wait for both promises to resolve or reject
            await Promise.allSettled([measurementsPromise, statsPromise]);
          } catch (err) {
            console.error('Error in auto-refresh:', err);
          }
        })();
      }, 500); // Update every 0.5 seconds for more responsive cockpit display

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

  // Only show the "select a bucket" message if loading is complete and there's no active bucket
  if (!activeBucket) {
    return (
      <AppLayout>
        <div className={styles.tabContent}>
          <h2>Cockpit Visualization</h2>
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
          <h2>Cockpit Dashboard: {activeBucket}</h2>
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
          {/* Indicators Row - 6 flight data indicators */}
          <div className={styles.indicatorsRow}>
            {/* Indicator 1 - True Air Speed */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {measurements.find(m => m.metric === 'speed_true_airspeed')?.value.toFixed(0) || '---'}
              </div>
              <div className={styles.indicatorLabel}>
                True Air Speed (knots)
              </div>
            </div>

            {/* Indicator 2 - Current Heading */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {measurements.find(m => m.metric === 'flight_heading_magnetic')?.value.toFixed(0) || '---'}
              </div>
              <div className={styles.indicatorLabel}>
                Current Heading (°)
              </div>
            </div>

            {/* Indicator 3 - Current Altitude */}
            <div className={styles.indicator}>
              <div className={styles.indicatorValue}>
                {measurements.find(m => m.metric === 'flight_altitude')?.value.toFixed(0) || '---'}
              </div>
              <div className={styles.indicatorLabel}>
                Current Altitude (ft)
              </div>
            </div>

            {/* Indicator 4 - Vertical Speed with conditional color */}
            {(() => {
              const vs = measurements.find(m => m.metric === 'speed_vertical')?.value || 0;
              let vsColor = 'black';
              if (Math.abs(vs) < 1) {
                vsColor = 'black';
              } else if (vs > 0) {
                vsColor = 'green';
              } else {
                vsColor = 'red';
              }

              return (
                <div className={styles.indicator}>
                  <div className={styles.indicatorValue} style={{ color: vsColor }}>
                    {vs.toFixed(0) || '---'}
                  </div>
                  <div className={styles.indicatorLabel}>
                    Vertical Speed (ft/min)
                  </div>
                </div>
              );
            })()}

            {/* Indicator 5 - AP Heading with conditional color */}
            {(() => {
              const apHeading = measurements.find(m => m.metric === 'autopilot_heading_target')?.value;
              const apOn = measurements.find(m => m.metric === 'autopilot_master')?.value === 1;

              return (
                <div className={styles.indicator}>
                  <div className={styles.indicatorValue} style={{ color: apOn ? 'green' : 'inherit' }}>
                    {apHeading?.toFixed(0) || '---'}
                  </div>
                  <div className={styles.indicatorLabel}>
                    AP HDG (°)
                  </div>
                </div>
              );
            })()}

            {/* Indicator 6 - AP Altitude with conditional color */}
            {(() => {
              const apAltitude = measurements.find(m => m.metric === 'autopilot_altitude_target')?.value;
              const apOn = measurements.find(m => m.metric === 'autopilot_master')?.value === 1;

              return (
                <div className={styles.indicator}>
                  <div className={styles.indicatorValue} style={{ color: apOn ? 'green' : 'inherit' }}>
                    {apAltitude?.toFixed(0) || '---'}
                  </div>
                  <div className={styles.indicatorLabel}>
                    AP ALT (ft)
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Flight Attitude Row - Side by side */}
          <div className={styles.graphsRow}>
            {/* Bank Angle */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Bank Angle</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.attitudeContainer}>
                  {(() => {
                    // Get bank angle value and invert it (multiply by -1) so positive values indicate left bank
                    const bankAngleRaw = measurements.find(m => m.metric === 'flight_bank')?.value || 0;
                    const bankAngle = -bankAngleRaw; // Invert the angle
                    const bankAngleStyle = {
                      transform: `rotate(${bankAngle}deg)`,
                      transition: 'transform 0.2s ease-out'
                    };

                    // Create bank angle markers at 0, 10, 20, and 30 degrees (both left and right)
                    const bankMarkers: React.ReactNode[] = [];
                    const markerAngles = [0, 10, 20, 30, -10, -20, -30];

                    markerAngles.forEach(angle => {
                      const isZero = angle === 0;
                      const markerStyle = {
                        transform: `rotate(${angle}deg)`
                      };

                      const labelStyle = {
                        transform: `rotate(${-angle}deg)`
                      };

                      bankMarkers.push(
                        <div
                          key={`marker-${angle}`}
                          className={`${styles.marker} ${isZero ? styles.markerZero : ''}`}
                          style={markerStyle}
                        >
                          {(angle === 0 || Math.abs(angle) === 30) && (
                            <div className={styles.markerLabel} style={labelStyle}>
                              {Math.abs(angle)}°
                            </div>
                          )}
                        </div>
                      );
                    });

                    return (
                      <div className={styles.attitudeIndicator}>
                        <div className={styles.bankIndicator}>
                          {/* Fixed elements */}
                          <div className={styles.horizonLine}></div>
                          <div className={styles.bankMarkers}>
                            {bankMarkers}
                          </div>
                          
                          {/* Rotating plane container */}
                          <div className={styles.planeContainer} style={bankAngleStyle}>
                            <div className={styles.bankPointer}></div>
                            <div className={styles.planeBody}></div>
                            <div className={styles.planeWings}></div>
                            <div className={styles.planeTail}></div>
                          </div>
                        </div>
                        <div className={styles.attitudeValue}>{bankAngle.toFixed(1)}°</div>
                      </div>
                    );
                  })()}
                </div>
                <div className={styles.statLabel}>
                  Positive values indicate left bank
                </div>
              </div>
            </div>

            {/* Pitch Angle */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Pitch Angle</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.attitudeContainer}>
                  {(() => {
                    const pitchAngle = measurements.find(m => m.metric === 'flight_pitch')?.value || 0;
                    const pitchAngleStyle = {
                      transform: `rotate(${pitchAngle}deg)`,
                      transition: 'transform 0.2s ease-out'
                    };

                    return (
                      <div className={styles.attitudeIndicator}>
                        <div className={styles.pitchIndicator} style={pitchAngleStyle}>
                          <div className={styles.pitchLine}></div>
                          <div className={styles.pitchArrow}></div>
                        </div>
                        <div className={styles.attitudeValue}>{pitchAngle.toFixed(1)}°</div>
                      </div>
                    );
                  })()}
                </div>
                <div className={styles.statLabel}>
                  Positive values indicate nose up
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
