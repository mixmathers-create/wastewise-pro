import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';

// Access the lidta-capacitor-bl-printer plugin dynamically
const LidtaCapacitorBlPrinter = Capacitor.isPluginAvailable('LidtaCapacitorBlPrinter') 
  ? Capacitor.Plugins.LidtaCapacitorBlPrinter 
  : null;

interface PrinterConnection {
  address: string;
  name: string;
}

/**
 * Bluetooth Printer Service for Lidta Capacitor BL Printer
 * Uses html2canvas to convert HTML content to base64 images for printing
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
    return LidtaCapacitorBlPrinter !== null;
  }

  /**
   * Connect to a Bluetooth printer by address
   * @param address - Bluetooth MAC address (e.g., "00:11:22:33:44:55")
   */
  async connect(address: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    try {
      const result = await LidtaCapacitorBlPrinter!.connect({ address });
      if (result.value) {
        this.connectedPrinter = { address, name: 'Connected Printer' };
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
      await LidtaCapacitorBlPrinter!.disconnect();
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
   * List available Bluetooth devices
   * Note: Users must pair Bluetooth printer in Android Settings first
   */
  async listDevices(): Promise<any[]> {
    console.log('Please pair Bluetooth printer in Android Settings');
    console.log('Then use the Bluetooth MAC address with connect() method');
    return [];
  }

  /**
   * Print text by converting it to an image
   * @param text - Text content to print
   * @param align - Alignment (0=left, 1=center, 2=right)
   */
  async printText(text: string, align: number = 1): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Printer service only available on native platforms');
    }

    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }

    try {
      // Create a temporary HTML element
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        width: 380px;
        padding: 20px;
        font-family: monospace;
        font-size: 14px;
        background: white;
        color: black;
        text-align: ${align === 0 ? 'left' : align === 1 ? 'center' : 'right'};
      `;
      tempDiv.textContent = text;
      document.body.appendChild(tempDiv);

      // Convert to canvas and then base64
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      
      // Clean up
      document.body.removeChild(tempDiv);

      // Print
      await LidtaCapacitorBlPrinter!.printBase64({
        msg: base64,
        align: align
      });
    } catch (error) {
      console.error('Print error:', error);
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
      // Create HTML receipt
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        width: 380px;
        padding: 20px;
        font-family: monospace;
        font-size: 12px;
        background: white;
        color: black;
      `;

      let html = `
        <div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px;">
          ${receiptData.header}
        </div>
        <div style="border-top: 2px dashed black; margin: 10px 0;"></div>
      `;

      // Add items
      receiptData.items.forEach(item => {
        html += `
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${item.label}</span>
            <span>${item.value}</span>
          </div>
        `;
      });

      html += `<div style="border-top: 2px dashed black; margin: 10px 0;"></div>`;

      // Add QR code if provided
      if (receiptData.qrCode) {
        html += `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${receiptData.qrCode}" style="width: 150px; height: 150px;" />
          </div>
        `;
      }

      // Add footer
      if (receiptData.footer) {
        html += `
          <div style="text-align: center; font-size: 10px; margin-top: 20px;">
            ${receiptData.footer}
          </div>
        `;
      }

      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      // Convert to canvas and then base64
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      
      // Clean up
      document.body.removeChild(tempDiv);

      // Print
      await LidtaCapacitorBlPrinter!.printBase64({
        msg: base64,
        align: 1 // Center alignment
      });
    } catch (error) {
      console.error('Receipt print error:', error);
      throw error;
    }
  }

  /**
   * Print HTML element directly
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

      await LidtaCapacitorBlPrinter!.printBase64({
        msg: base64,
        align: align
      });
    } catch (error) {
      console.error('Element print error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const printerService = PrinterService.getInstance();
