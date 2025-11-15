import { Capacitor } from '@capacitor/core';

// Access Bluetooth plugin dynamically (will be implemented via custom Android plugin)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BluetoothPrinter: any = (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins && (window as any).Capacitor.Plugins.BluetoothPrinter)
  ? (window as any).Capacitor.Plugins.BluetoothPrinter
  : null;

export interface BluetoothDevice {
  address: string;
  name: string;
  bonded?: boolean;
}

/**
 * Bluetooth Service for printer discovery and connection
 */
export class BluetoothService {
  private static instance: BluetoothService;
  private connectedDevice: BluetoothDevice | null = null;

  private constructor() {}

  static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  /**
   * Check if Bluetooth plugin is available
   */
  isAvailable(): boolean {
    return BluetoothPrinter !== null && Capacitor.isNativePlatform();
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.requestPermissions();
      return result.granted || false;
    } catch (error) {
      console.error('Bluetooth permission error:', error);
      return false;
    }
  }

  /**
   * List paired Bluetooth devices
   */
  async listPairedDevices(): Promise<BluetoothDevice[]> {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.listPairedDevices();
      return result.devices || [];
    } catch (error) {
      console.error('List devices error:', error);
      throw error;
    }
  }

  /**
   * Scan for nearby Bluetooth devices (requires location permission)
   */
  async scanForDevices(): Promise<BluetoothDevice[]> {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.scanForDevices();
      return result.devices || [];
    } catch (error) {
      console.error('Scan devices error:', error);
      throw error;
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  async connect(address: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.connect({ address });
      if (result.success) {
        this.connectedDevice = { address, name: result.name || 'Printer' };
        return true;
      }
      return false;
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from current device
   */
  async disconnect(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth service only available on native platforms');
    }

    try {
      await BluetoothPrinter.disconnect();
      this.connectedDevice = null;
    } catch (error) {
      console.error('Bluetooth disconnection error:', error);
      throw error;
    }
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }
}

// Export singleton instance
export const bluetoothService = BluetoothService.getInstance();
