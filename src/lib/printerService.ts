import { CapacitorThermalPrinter } from 'capacitor-thermal-printer';
import { isNativePlatform } from './capacitorUtils';

interface PrinterConnection {
  address: string;
  name: string;
}

/**
 * Bluetooth Printer Service for Lidta Capacitor BL Printer
 * 
 * NOTE: The actual printer API methods need to be configured based on the
 * lidta-capacitor-bl-printer documentation. This is a template implementation.
 */
export class PrinterService {
  private static instance: PrinterService;
  private connectedPrinter: PrinterConnection | null = null;

  private constructor() {}

  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  /**
   * Check if running on native platform
   */
  isAvailable(): boolean {
    return isNativePlatform();
  }

  /**
   * Connect to a Bluetooth printer
   */
  async connect(address: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      await CapacitorThermalPrinter.connect({ address });
      this.connectedPrinter = { address, name: 'Connected Printer' };
      return true;
    } catch (error) {
      console.error('Printer connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      await CapacitorThermalPrinter.disconnect();
      this.connectedPrinter = null;
    } catch (error) {
      console.error('Printer disconnection error:', error);
      throw error;
    }
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.connectedPrinter !== null;
  }

  /**
   * Get list of available Bluetooth devices
   * Note: You need to pair Bluetooth devices in Android system settings first.
   * Use the device's Bluetooth address when calling connect().
   */
  async listDevices(): Promise<any[]> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    // capacitor-thermal-printer doesn't provide device discovery
    // Users must pair devices via Android settings and provide the address
    console.log('Please pair Bluetooth printer in Android Settings and use its address');
    return [];
  }

  /**
   * Print text using the high-performance builder pattern
   */
  async printText(text: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      await CapacitorThermalPrinter
        .begin()
        .text(text)
        .write();
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  /**
   * Print formatted receipt with enhanced styling
   */
  async printReceipt(receiptData: {
    header: string;
    items: Array<{ label: string; value: string }>;
    footer?: string;
    logo?: string; // Optional base64 image
  }): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      const builder = CapacitorThermalPrinter.begin().align('center');

      // Print logo if provided
      if (receiptData.logo) {
        builder.image(receiptData.logo);
      }

      // Header
      builder
        .bold()
        .underline()
        .text(`${receiptData.header}\n`)
        .clearFormatting()
        .text('--------------------------------\n')
        .align('left');

      // Items
      receiptData.items.forEach(item => {
        builder.text(`${item.label}: ${item.value}\n`);
      });

      // Footer
      if (receiptData.footer) {
        builder
          .text('--------------------------------\n')
          .align('center')
          .text(`${receiptData.footer}\n`);
      }

      // Cut paper and print
      await builder.cutPaper().write();
    } catch (error) {
      console.error('Receipt print error:', error);
      throw error;
    }
  }

  /**
   * Get connected printer info
   */
  getConnectedPrinter(): PrinterConnection | null {
    return this.connectedPrinter;
  }
}

export const printerService = PrinterService.getInstance();
