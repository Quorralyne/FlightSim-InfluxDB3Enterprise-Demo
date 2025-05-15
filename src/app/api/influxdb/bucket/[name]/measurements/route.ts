import { NextRequest, NextResponse } from 'next/server';
import { readConfig, getFormattedEndpoint } from '@/lib/config';

// GET handler to retrieve recent measurements
export async function GET(
  request: NextRequest,
  context: { params: { name: string } }
) {
  const { name: bucketName } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  
  try {
    // Get configuration
    const config = await readConfig();

    if (!config.influxEndpoint || !config.adminToken) {
      return NextResponse.json(
        { success: false, error: 'InfluxDB configuration is incomplete. Please configure the endpoint and admin token first.' },
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

    // Get the last measurements within the time window
    const dataResponse = await fetch(`${endpointUrl}api/v3/query_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.adminToken}`
      },
      body: JSON.stringify({
        db: bucketName,
        q: `SELECT * FROM flight_data WHERE time >= now() - INTERVAL '1 minute' ORDER BY time DESC LIMIT 20`
      })
    });

    let records = [];
    let totalMeasurements = 0;
    
    if (dataResponse.ok) {
      records = await dataResponse.json();
    }

    return NextResponse.json({
      success: true,
      bucketName,
      records,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching flight data records for bucket ${bucketName}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flight data records',
      },
      { status: 500 }
    );
  }
}
