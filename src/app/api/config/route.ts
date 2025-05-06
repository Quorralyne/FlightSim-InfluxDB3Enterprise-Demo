import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the path to our config file
const configFilePath = path.join(process.cwd(), 'config.json');

// Interface for our config structure
interface Config {
  influxEndpoint?: string;
  adminToken?: string;
  activeBucket?: string | null;
}

// Helper to read the config file
async function readConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(configFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return empty config
    return {};
  }
}

// Helper to write to the config file
async function writeConfig(config: Config): Promise<void> {
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');
}

// GET handler to retrieve configuration
export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

// POST handler to update configuration
export async function POST(request: NextRequest) {
  try {
    const currentConfig = await readConfig();
    const newData = await request.json();
    
    // Merge existing config with new data
    const updatedConfig = { ...currentConfig, ...newData };
    
    // Write updated config back to file
    await writeConfig(updatedConfig);
    
    return NextResponse.json(
      { success: true, config: updatedConfig },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// DELETE handler to remove specific configuration keys
export async function DELETE(request: NextRequest) {
  try {
    const currentConfig = await readConfig();
    const { keys } = await request.json();
    
    if (Array.isArray(keys)) {
      for (const key of keys) {
        delete currentConfig[key as keyof Config];
      }
      
      await writeConfig(currentConfig);
      
      return NextResponse.json(
        { success: true, config: currentConfig },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid keys provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting config keys:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration keys' },
      { status: 500 }
    );
  }
}
