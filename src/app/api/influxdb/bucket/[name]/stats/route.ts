import { NextRequest, NextResponse } from 'next/server';
import { readConfig, getFormattedEndpoint } from '@/lib/config';

// GET handler to retrieve bucket statistics
export async function GET(
  request: NextRequest,
  context: { params: { name: string } }
) {
  const { name: bucketName } = await context.params;

  let stats = {
    measurementsLastMinute: 0,
    dbSizeData: [],
    compactedSizeData: [],
    lastUpdated: new Date().toISOString()
  };

  try {
    // Get configuration
    const config = await readConfig();

    if (!config.influxEndpoint || !config.adminToken) {
      return NextResponse.json(
        { success: false, error: 'InfluxDB configuration is incomplete. Please configure the endpoint, admin token, and data path.' },
        { status: 400 }
      );
    }

    // Get the properly formatted endpoint URL
    const endpointUrl = getFormattedEndpoint(config);

    if (!endpointUrl) {
      return NextResponse.json(
        { success: false, error: 'InfluxDB endpoint is not configured' },
        { status: 400 }
      );
    }

    // Count the number of records in the last minute
    const response = await fetch(`${endpointUrl}api/v3/query_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.adminToken}`
      },
      body: JSON.stringify({
        db: bucketName,
        q: `SELECT COUNT(*) AS count FROM mqtt_consumer WHERE time >= now() - INTERVAL '1 minute'`
      })
    });

    if (response.ok) {
      const data = await response.json();
      stats.measurementsLastMinute = data[0].count;
    }

    // Count the number of records in the last minute
    const sizeDataResponse = await fetch(`${endpointUrl}api/v3/query_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.adminToken}`
      },
      body: JSON.stringify({
        db: bucketName,
        q: `SELECT * FROM directory_stats WHERE time >= now() - INTERVAL '5 minute'`
      })
    });

    if (sizeDataResponse.ok) {
      const data = await sizeDataResponse.json();
      // data looks like this:
      // [{
      //   directory_size_bytes: 161574683,
      //   folder: 'db_size',
      //   time: '2025-05-07T06:03:10.474'
      // }]
      
      // Convert data to the format we need
      // [{
      //   timestamp: '2025-05-07T06:03:10.474',
      //   value: 161574683
      // }]
      stats.dbSizeData = data.filter((item: any) => item.folder === 'db_size').map((item: any) => ({
        timestamp: item.time,
        value: item.directory_size_bytes
      }));
      stats.compactedSizeData = data.filter((item: any) => item.folder === 'compacted_size').map((item: any) => ({
        timestamp: item.time,
        value: item.directory_size_bytes
      }));
    }

    return NextResponse.json({
      success: true,
      bucketName,
      stats
    });
  } catch (error) {
    console.error(`Error fetching stats for bucket ${bucketName}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bucket statistics',
      },
      { status: 500 }
    );
  }
}