import { NextRequest, NextResponse } from 'next/server';
import { readConfig, getFormattedEndpoint } from '@/lib/config';

// GET handler to retrieve recent measurements
export async function GET(
  request: NextRequest,
  context: { params: { name: string } }
) {
  const { name: bucketName } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

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

    // Get the last 200 measurements
    const sizeDataResponse = await fetch(`${endpointUrl}api/v3/query_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.adminToken}`
      },
      body: JSON.stringify({
        db: bucketName,
        q: `SELECT * FROM mqtt_consumer WHERE time >= now() - INTERVAL '1 minute' ORDER BY time DESC LIMIT ${limit}`
      })
    });

    const measurements = [];
    if (sizeDataResponse.ok) {
      const data = await sizeDataResponse.json();

      measurements.push(...data.map((item: any) => ({
        metric: item.topic.replace('msfs/', ''),
        value: item.value,
        timestamp: item.time,
        unit: ''
      })));
    }

    return NextResponse.json({
      success: true,
      bucketName,
      measurements,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching measurements for bucket ${bucketName}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch measurements',
      },
      { status: 500 }
    );
  }
}

// Helper function to get the appropriate unit for a metric
function getUnitForMetric(metricName: string): string {
  switch (metricName) {
    case 'altitude':
      return 'ft';
    case 'airspeed':
      return 'knots';
    case 'heading':
    case 'wind_direction':
      return '°';
    case 'pitch':
    case 'roll':
      return '°';
    case 'vertical_speed':
      return 'ft/min';
    case 'fuel_level':
      return '%';
    case 'engine_temperature':
    case 'outside_temperature':
      return '°C';
    case 'oil_pressure':
      return 'PSI';
    case 'wind_speed':
      return 'knots';
    case 'latitude':
    case 'longitude':
      return '°';
    default:
      return '';
  }
}
