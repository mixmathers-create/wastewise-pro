import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';

// Access the custom BluetoothPrinter plugin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BluetoothPrinter: any = (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins && (window as any).Capacitor.Plugins.BluetoothPrinter)
  ? (window as any).Capacitor.Plugins.BluetoothPrinter
  : null;

interface PrinterConnection {
  address: string;
  name: string;
}

/**
 * Bluetooth Printer Service for Android POS devices
 * Supports ESC/POS thermal printers with direct text and image printing
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
   * Check if printer plugin is available
   */
  isAvailable(): boolean {
    return BluetoothPrinter !== null && Capacitor.isNativePlatform();
  }

  /**
   * Connect to a Bluetooth printer by MAC address
   * @param address - Bluetooth MAC address (e.g., "00:11:22:33:44:55")
   */
  async connect(address: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!macRegex.test(address)) {
      throw new Error('Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX');
    }

    try {
      const result = await BluetoothPrinter.connect({ address });
      if (result.success) {
        this.connectedPrinter = { 
          address, 
          name: result.name || 'Thermal Printer' 
        };
        return true;
      }
      return false;
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
      await BluetoothPrinter.disconnect();
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
   * Get current connected printer info
   */
  getConnectedPrinter(): PrinterConnection | null {
    return this.connectedPrinter;
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
   * Print text directly to thermal printer
   * @param text - Text content to print
   * @param align - Alignment (0=left, 1=center, 2=right)
   */
  async printText(text: string, align: number = 0): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      await BluetoothPrinter.printText({ text, align });
    } catch (error) {
      console.error('Print text error:', error);
      throw error;
    }
  }

  /**
   * Print image from base64 data
   * @param base64Image - Base64 encoded image
   * @param align - Alignment (0=left, 1=center, 2=right)
   */
  async printImage(base64Image: string, align: number = 1): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      await BluetoothPrinter.printImage({ image: base64Image, align });
    } catch (error) {
      console.error('Print image error:', error);
      throw error;
    }
  }

  /**
   * Feed paper lines
   * @param lines - Number of lines to feed
   */
  async feedLine(lines: number = 1): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      await BluetoothPrinter.feedLine({ lines });
    } catch (error) {
      console.error('Feed line error:', error);
      throw error;
    }
  }

  /**
   * Cut paper
   */
  async cutPaper(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      await BluetoothPrinter.cutPaper();
    } catch (error) {
      console.error('Cut paper error:', error);
      throw error;
    }
  }

  /**
   * Print formatted receipt
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

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      // Print header (centered, bold)
      await this.printText(receiptData.header, 1);
      await this.printText('--------------------------------', 1);
      await this.feedLine(1);

      // Print items
      for (const item of receiptData.items) {
        const line = `${item.label.padEnd(20)}${item.value.padStart(12)}`;
        await this.printText(line, 0);
      }

      await this.feedLine(1);
      await this.printText('--------------------------------', 1);

      // Print QR code if provided
      if (receiptData.qrCode) {
        await this.feedLine(1);
        await this.printImage(receiptData.qrCode, 1);
      }

      // Print footer
      if (receiptData.footer) {
        await this.feedLine(1);
        await this.printText(receiptData.footer, 1);
      }

      await this.feedLine(3);
      await this.cutPaper();
    } catch (error) {
      console.error('Receipt print error:', error);
      throw error;
    }
  }

  /**
   * Print HTML element as image
   * @param element - HTML element to print
   * @param align - Alignment (0=left, 1=center, 2=right)
   */
  async printElement(element: HTMLElement, align: number = 1): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      await this.printImage(base64, align);
    } catch (error) {
      console.error('Element print error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const printerService = PrinterService.getInstance();
