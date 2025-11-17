import { Capacitor, registerPlugin } from '@capacitor/core';
import html2canvas from 'html2canvas';

// Define the plugin interface
interface BluetoothPrinterPlugin {
  connect(options: { address: string }): Promise<{ success: boolean; name?: string }>;
  disconnect(): Promise<void>;
  listPairedDevices(): Promise<{ devices: any[] }>;
  scanForDevices(): Promise<{ event: string; devices?: any[]; device?: any }>;
  stopScan(): Promise<{ success: boolean }>;
  pairDevice(options: { address: string }): Promise<{ success: boolean; message?: string }>;
  printText(options: { text: string; align: number }): Promise<void>;
  printImage(options: { base64Image: string; align: number }): Promise<void>;
  cutPaper(): Promise<void>;
  feedLine(options: { lines: number }): Promise<void>;
}

// Register the custom BluetoothPrinter plugin
const BluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter');

interface PrinterConnection {
  address: string;
  name: string;
}

/**
 * Bluetooth Printer Service for Android POS devices
 * Automatically finds and prints to "innerprinter" device
 */
export class PrinterService {
  private static instance: PrinterService;

  private constructor() {}

  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  /**
   * Check if printer plugin is available
   */
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Find "innerprinter" from paired Bluetooth devices
   */
  async findInnerPrinter(): Promise<{ address: string; name: string } | null> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.listPairedDevices();
      const devices = result.devices || [];
      
      // Find device with name "innerprinter" (case-insensitive)
      const innerPrinter = devices.find((device: any) => 
        device.name && device.name.toLowerCase().includes('innerprinter')
      );
      
      if (innerPrinter) {
        return {
          address: innerPrinter.address,
          name: innerPrinter.name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Find printer error:', error);
      throw error;
    }
  }

  /**
   * List paired Bluetooth devices
   */
  async listDevices(): Promise<any[]> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.listPairedDevices();
      return result.devices || [];
    } catch (error) {
      console.error('List devices error:', error);
      return [];
    }
  }

  /**
   * Scan for nearby Bluetooth devices (not just paired)
   */
  async scanForDevices(onDeviceFound?: (device: any) => void): Promise<any[]> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    return new Promise((resolve, reject) => {
      const discoveredDevices: any[] = [];
      
      BluetoothPrinter.scanForDevices()
        .then((result) => {
          if (result.event === 'deviceFound' && result.device) {
            discoveredDevices.push(result.device);
            if (onDeviceFound) {
              onDeviceFound(result.device);
            }
          } else if (result.event === 'scanComplete') {
            resolve(result.devices || discoveredDevices);
          }
        })
        .catch((error) => {
          console.error('Scan error:', error);
          reject(error);
        });
    });
  }

  /**
   * Stop Bluetooth device scanning
   */
  async stopScan(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      await BluetoothPrinter.stopScan();
    } catch (error) {
      console.error('Stop scan error:', error);
      throw error;
    }
  }

  /**
   * Pair with a Bluetooth device
   */
  async pairDevice(address: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      const result = await BluetoothPrinter.pairDevice({ address });
      return result;
    } catch (error) {
      console.error('Pairing error:', error);
      throw error;
    }
  }

  /**
   * Connect to printer and execute print commands
   * @param address - Bluetooth MAC address
   * @param printCallback - Function that executes print commands
   */
  private async connectAndPrint(address: string, printCallback: () => Promise<void>): Promise<void> {
    try {
      // Connect to printer
      const result = await BluetoothPrinter.connect({ address });
      if (!result.success) {
        throw new Error('Failed to connect to printer');
      }

      // Execute print commands
      await printCallback();

      // Disconnect
      await BluetoothPrinter.disconnect();
    } catch (error) {
      // Try to disconnect on error
      try {
        await BluetoothPrinter.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      throw error;
    }
  }

  /**
   * Print text directly to thermal printer (internal method)
   */
  private async printTextInternal(text: string, align: number = 0): Promise<void> {
    await BluetoothPrinter.printText({ text, align });
  }

  /**
   * Print image from base64 data (internal method)
   */
  private async printImageInternal(base64Image: string, align: number = 1): Promise<void> {
    await BluetoothPrinter.printImage({ base64Image, align });
  }

  /**
   * Feed paper lines (internal method)
   */
  private async feedLineInternal(lines: number = 1): Promise<void> {
    await BluetoothPrinter.feedLine({ lines });
  }

  /**
   * Cut paper (internal method)
   */
  private async cutPaperInternal(): Promise<void> {
    await BluetoothPrinter.cutPaper();
  }

  /**
   * Print formatted receipt - finds and prints to "innerprinter"
   * @param receiptData - Receipt data including header, items, and footer
   */
  async printReceipt(receiptData: {
    header: string;
    items: Array<{ label: string; value: string }>;
    footer?: string;
    qrCode?: string;
  }): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    // Find innerprinter
    const printer = await this.findInnerPrinter();
    if (!printer) {
      throw new Error('innerprinter device not found in paired Bluetooth devices');
    }

    await this.connectAndPrint(printer.address, async () => {
      // Print header (centered, bold)
      await this.printTextInternal(receiptData.header, 1);
      await this.printTextInternal('--------------------------------', 1);
      await this.feedLineInternal(1);

      // Print items
      for (const item of receiptData.items) {
        const line = `${item.label.padEnd(20)}${item.value.padStart(12)}`;
        await this.printTextInternal(line, 0);
      }

      await this.feedLineInternal(1);
      await this.printTextInternal('--------------------------------', 1);

      // Print QR code if provided
      if (receiptData.qrCode) {
        await this.feedLineInternal(1);
        await this.printImageInternal(receiptData.qrCode, 1);
      }

      // Print footer
      if (receiptData.footer) {
        await this.feedLineInternal(1);
        await this.printTextInternal(receiptData.footer, 1);
      }

      await this.feedLineInternal(3);
      await this.cutPaperInternal();
    });
  }

  /**
   * Print HTML element as image - finds and prints to "innerprinter"
   * @param element - HTML element to print
   * @param align - Alignment (0=left, 1=center, 2=right)
   */
  async printElement(element: HTMLElement, align: number = 1): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    // Find innerprinter
    const printer = await this.findInnerPrinter();
    if (!printer) {
      throw new Error('innerprinter device not found in paired Bluetooth devices');
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    });
    
    const base64 = canvas.toDataURL('image/png').split(',')[1];

    await this.connectAndPrint(printer.address, async () => {
      await this.printImageInternal(base64, align);
      await this.feedLineInternal(3);
      await this.cutPaperInternal();
    });
  }
}

// Export singleton instance
export const printerService = PrinterService.getInstance();
