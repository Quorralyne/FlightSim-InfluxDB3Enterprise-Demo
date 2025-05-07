import fs from 'fs';
import path from 'path';
import { readConfig } from './config';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// Function to calculate directory size recursively
function calculateDirSize(dirPath: string): number {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += calculateDirSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error(`Error calculating size for ${dirPath}:`, error);
    return 0;
  }
}

// Function to write data to InfluxDB
async function writeToInfluxDB(data: string, config: any) {
  try {
    const url = new URL(`${config.influxEndpoint}/api/v3/write_lp`);
    url.searchParams.append('db', 'flightsim');
    url.searchParams.append('precision', 'ns');
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.adminToken}`,
        'Content-Type': 'text/plain'
      },
      body: data
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorData}`);
    }
    
    console.log(`[DirSizeMonitor] Data written successfully: ${new Date().toISOString()}`);
    return await response.json().catch(() => ({})); // Handle empty responses
  } catch (error) {
    console.error('[DirSizeMonitor] Error writing to InfluxDB:', 
      error instanceof Error ? error.message : String(error));
  }
}

// Main function to collect and send data
async function collectAndSendData() {
  try {
    const config = await readConfig();
    
    if (!config.influxEndpoint || !config.adminToken) {
      console.error('[DirSizeMonitor] InfluxDB configuration is incomplete');
      return;
    }
    
    // Define directories to monitor
    const dbDirectory = `${config.dataPath}/dbs/flightsim-7`;
    const compactedDirectory = `${config.dataPath}/c`;

    // Calculate directory sizes
    const dbSize = calculateDirSize(dbDirectory);
    const compactedSize = calculateDirSize(compactedDirectory);
    
    // Create timestamp in nanoseconds
    const timestamp = Date.now() * 1000000;
    
    // Prepare data in line protocol format
    const data = [
      `directory_stats,folder=db_size directory_size_bytes=${dbSize} ${timestamp}`,
      `directory_stats,folder=compacted_size directory_size_bytes=${compactedSize} ${timestamp}`
    ].join('\n');
    
    console.log('[DirSizeMonitor] Data to send:', data);
    
    // Send to InfluxDB
    await writeToInfluxDB(data, config);
    
  } catch (error) {
    console.error('[DirSizeMonitor] Error in collection cycle:', error);
  }
}

// Start monitoring
export function startMonitoring(intervalMinutes = 5) {
  if (isRunning) return;
  
  console.log('[DirSizeMonitor] Starting directory size monitoring...');
  
  // Run immediately
  collectAndSendData();
  
  // Schedule regular collection
  intervalId = setInterval(collectAndSendData, intervalMinutes * 60 * 1000);
  isRunning = true;
}

// Stop monitoring
export function stopMonitoring() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    console.log('[DirSizeMonitor] Directory size monitoring stopped');
  }
}