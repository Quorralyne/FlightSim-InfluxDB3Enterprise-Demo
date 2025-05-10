import { NextRequest, NextResponse } from 'next/server';
import { readConfig, getFormattedEndpoint, hasValidCredentials } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {

  const tableName = "mqtt_consumer";
  let bucketInfo = {
    status: "offline",
    hasTable: false
  };

  const { name: bucketName } = await params;  try {
    // Get configuration
    const config = await readConfig();

    if (!config.influxEndpoint || !config.adminToken) {
      return NextResponse.json(
        { success: false, error: 'InfluxDB configuration is incomplete. Please configure the endpoint and admin token first.' },
        { status: 400 }
      );
    }

    // Get  the properly formatted endpoint URL
    const endpointUrl = getFormattedEndpoint(config);

    if (!endpointUrl) {
      return NextResponse.json(
        { success: false, error: 'InfluxDB endpoint is not configured' },
        { status: 400 }
      );
    }

    // Find out if there are any records in the last minute
    const response = await fetch(`${endpointUrl}api/v3/query_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.adminToken}`
      },
      body: JSON.stringify({
        db: bucketName,
        q: `SELECT 1 AS online FROM ${tableName} WHERE time >= now() - INTERVAL '1 minute' LIMIT 1`
      })
    });

    if (response.ok) {
      bucketInfo.hasTable = true;
      const data = await response.json();
      bucketInfo.status = data[0]?.online > 0 ? "online" : "offline";
    }

    return NextResponse.json(bucketInfo);
  } catch (error) {
    return NextResponse.json({ status: "offline" });
  }
}
