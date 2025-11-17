import { Capacitor, registerPlugin } from '@capacitor/core';
import html2canvas from 'html2canvas';
import Printerservice from 'android/app/src/main/java/com/h10p/printerservice/Printerservice'

// Define the plugin interface
interface BluetoothPrinterPlugin {
  connect(): Promise<{ success: boolean; name?: string; encoding?: string; serviceVersion?: string }>;
  disconnect(): Promise<void>;
  printText(options: { text: string; align: number }): Promise<void>;
  printImage(options: { base64Image: string; align: number }): Promise<void>;
  printBarcode(options: { data: string; symbology: number; height: number; width: number; align: number }): Promise<void>;
  cutPaper(): Promise<void>;
  feedLine(options: { lines: number }): Promise<void>;
  beginWork(): Promise<void>;
  endWork(): Promise<void>;
  setTextBold(options: { bold: boolean }): Promise<void>;
  setTextSize(options: { size: number }): Promise<void>;
  printQRCode(options: { data: string; moduleSize: number; errorLevel: number; align: number }): Promise<void>;
  printTableText(options: { text: string[]; weight: number[]; alignment: number[] }): Promise<void>;
  printEpson(options: { data: string }): Promise<void>;
}

// Register the custom BluetoothPrinter plugin
const BluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter');

/**
 * H10P Internal Printer Service
 * Uses vendor AIDL interface to communicate with internal ESC/POS printer
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
   * Test printer connection
   */
  async testConnection(): Promise<{ success: boolean; name?: string; encoding?: string; serviceVersion?: string }> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    try {
      const result = await BluetoothPrinter.connect();
      console.log('Printer connection result:', result);
      return result;
    } catch (error) {
      console.error('Printer connection test failed:', error);
      throw error;
    }
  }

  /**
   * Execute print job with begin/end work wrapper
   */
  private async executePrintJob(printCallback: () => Promise<void>): Promise<void> {
    try {
      await BluetoothPrinter.beginWork();
      await printCallback();
      await BluetoothPrinter.endWork();
    } catch (error) {
      // Try to end work on error
      try {
        await BluetoothPrinter.endWork();
      } catch (e) {
        // Ignore endWork errors
      }
      throw error;
    }
  }

  /**
   * Print formatted receipt
   */
  async printReceipt(receiptData: {
    header: string;
    items: Array<{ label: string; value: string }>;
    footer?: string;
    qrCode?: string;
  }): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    await this.executePrintJob(async () => {
      // Print header (centered, bold)
      await BluetoothPrinter.setTextBold({ bold: true });
      await BluetoothPrinter.setTextSize({ size: 28 });
      await BluetoothPrinter.printText({ text: receiptData.header + '\n', align: 1 });
      await BluetoothPrinter.setTextBold({ bold: false });
      await BluetoothPrinter.setTextSize({ size: 24 });
      await BluetoothPrinter.printText({ text: '--------------------------------\n', align: 1 });
      await BluetoothPrinter.feedLine({ lines: 1 });

      // Print items
      for (const item of receiptData.items) {
        const line = `${item.label.padEnd(20)}${item.value.padStart(12)}\n`;
        await BluetoothPrinter.printText({ text: line, align: 0 });
      }

      await BluetoothPrinter.feedLine({ lines: 1 });
      await BluetoothPrinter.printText({ text: '--------------------------------\n', align: 1 });

      // Print QR code if provided
      if (receiptData.qrCode) {
        await BluetoothPrinter.feedLine({ lines: 1 });
        await BluetoothPrinter.printQRCode({
          data: receiptData.qrCode,
          moduleSize: 8,
          errorLevel: 3,
          align: 1,
        });
      }

      // Print footer
      if (receiptData.footer) {
        await BluetoothPrinter.feedLine({ lines: 1 });
        await BluetoothPrinter.printText({ text: receiptData.footer + '\n', align: 1 });
      }

      await BluetoothPrinter.feedLine({ lines: 3 });
      await BluetoothPrinter.cutPaper();
    });
  }

  /**
   * Print HTML element as image
   */
  async printElement(element: HTMLElement, align: number = 1): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    });
    
    const base64 = canvas.toDataURL('image/png').split(',')[1];

    await this.executePrintJob(async () => {
      await BluetoothPrinter.printImage({ base64Image: base64, align });
      await BluetoothPrinter.feedLine({ lines: 3 });
      await BluetoothPrinter.cutPaper();
    });
  }

  /**
   * Print simple test receipt
   */
  async printTest(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    await this.executePrintJob(async () => {
      await BluetoothPrinter.setTextBold({ bold: true });
      await BluetoothPrinter.setTextSize({ size: 32 });
      await BluetoothPrinter.printText({ text: 'TEST PRINT\n', align: 1 });
      
      await BluetoothPrinter.setTextBold({ bold: false });
      await BluetoothPrinter.setTextSize({ size: 24 });
      await BluetoothPrinter.printText({ text: '--------------------------------\n', align: 1 });
      await BluetoothPrinter.feedLine({ lines: 1 });
      
      await BluetoothPrinter.printText({ text: 'H10P Internal Printer\n', align: 1 });
      await BluetoothPrinter.printText({ text: 'GB18030 Encoding\n', align: 1 });
      await BluetoothPrinter.printText({ text: 'Connection: OK\n', align: 1 });
      await BluetoothPrinter.feedLine({ lines: 1 });
      
      await BluetoothPrinter.printText({ text: new Date().toLocaleString() + '\n', align: 1 });
      await BluetoothPrinter.feedLine({ lines: 3 });
      await BluetoothPrinter.cutPaper();
    });
  }

  /**
   * Print a standalone barcode using the vendor symbology/size parameters
   */
  async printBarcode(options: {
    data: string;
    symbology?: number;
    height?: number;
    width?: number;
    align?: number;
  }): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    await this.executePrintJob(async () => {
      await BluetoothPrinter.printBarcode({
        data: options.data,
        symbology: options.symbology ?? 8,
        height: options.height ?? 162,
        width: options.width ?? 2,
        align: options.align ?? 1,
      });
      await BluetoothPrinter.feedLine({ lines: 2 });
    });
  }

  /**
   * Print tabular rows using the vendor-supplied column widths and alignments
   */
  async printTable(options: { text: string[]; weight: number[]; alignment: number[] }): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    await this.executePrintJob(async () => {
      await BluetoothPrinter.printTableText({
        text: options.text,
        weight: options.weight,
        alignment: options.alignment,
      });
      await BluetoothPrinter.feedLine({ lines: 1 });
    });
  }

  /**
   * Send raw ESC/POS commands using the vendor "printEpson" bridge
   */
  async printRawEpson(base64Data: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on Android');
    }

    await this.executePrintJob(async () => {
      await BluetoothPrinter.printEpson({ data: base64Data });
      await BluetoothPrinter.feedLine({ lines: 1 });
    });
  }
}

// Export singleton instance
export const printerService = PrinterService.getInstance();
