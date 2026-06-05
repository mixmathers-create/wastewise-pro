import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface ReceiptPdfSettings {
  logoUrl?: string | null;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  headerText?: string;
  footerText?: string;
  fontSize?: number;
}

export interface ReceiptPdfPayload {
  receiptQR: string;
  createdAt: string | Date;
  client: any;
  truck?: any;
  driver?: any;
  helpers?: any[];
  items: Array<{ waste_type: string; quantity: number; unit: string }>;
  signedBy?: string;
  signatureData?: string | null;
  settings?: ReceiptPdfSettings;
}

const getReceiptSettings = (settings?: ReceiptPdfSettings) => {
  const companyName = settings?.companyName ?? localStorage.getItem("receipt_company_name") ?? "WASTEWISE";
  const companyAddress = settings?.companyAddress ?? localStorage.getItem("receipt_company_address") ?? "";
  const companyContact = settings?.companyContact ?? localStorage.getItem("receipt_company_contact") ?? "";
  const headerText = settings?.headerText ?? localStorage.getItem("receipt_header") ?? "COLLECTION RECEIPT";
  const footerText = settings?.footerText ?? localStorage.getItem("receipt_footer") ?? "Thank you for your cooperation!";
  const fontSize = settings?.fontSize ?? parseInt(localStorage.getItem("receipt_font_size") || "8", 10);
  const logoUrl = settings?.logoUrl ?? null;

  return {
    logoUrl,
    companyName,
    companyAddress,
    companyContact,
    headerText,
    footerText,
    fontSize,
  };
};

export const createReceiptPdfDocument = async (payload: ReceiptPdfPayload) => {
  const now = new Date(payload.createdAt);
  const {
    logoUrl,
    companyName,
    companyAddress,
    companyContact,
    headerText,
    footerText,
    fontSize,
  } = getReceiptSettings(payload.settings);

  const truckName = payload.truck?.code || payload.truck?.name || "";
  const driverName = payload.driver?.name || payload.driver?.full_name || "";
  const helperNames = (payload.helpers || []).map((h) => h?.name || h?.full_name || "Unknown");
  const totalQuantity = (payload.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const clientQrUrl = await QRCode.toDataURL(payload.client.qr_code || payload.client.id || payload.receiptQR, { width: 150 });
  const receiptQrUrl = await QRCode.toDataURL(payload.receiptQR, { width: 150 });

  const doc = new jsPDF({ format: [58, 200], unit: "mm" });
  let y = 10;

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, "PNG", 14, y, 30, 15);
      y += 18;
    } catch (error) {
      doc.setFontSize(fontSize + 4);
      doc.text(companyName, 29, y, { align: "center" });
      y += 8;
    }
  } else {
    doc.setFontSize(fontSize + 4);
    doc.text(companyName, 29, y, { align: "center" });
    y += 8;
  }

  if (companyAddress || companyContact) {
    doc.setFontSize(fontSize - 2);
    if (companyAddress) {
      doc.text(companyAddress, 29, y, { align: "center", maxWidth: 48 });
      y += 4;
    }
    if (companyContact) {
      doc.text(companyContact, 29, y, { align: "center" });
      y += 4;
    }
  }

  doc.setFontSize(fontSize + 1);
  doc.text(headerText, 29, y, { align: "center" });
  y += 5;
  doc.setFontSize(fontSize - 1);
  doc.text(`Serial: ${payload.receiptQR}`, 29, y, { align: "center" });
  y += 4;
  doc.text(`${now.toLocaleDateString()} • ${now.toLocaleTimeString()}`, 29, y, { align: "center" });
  y += 8;

  doc.setFontSize(fontSize - 2);
  doc.text("CLIENT INFORMATION", 5, y);
  y += 4;
  doc.setFontSize(fontSize - 1);
  doc.text(payload.client.name || "", 5, y);
  y += 3;
  doc.setFontSize(fontSize - 2);
  if (payload.client.id) {
    doc.text(`ID: ${String(payload.client.id).slice(0, 8)}`, 5, y);
    y += 3;
  }
  if (payload.client.address) {
    doc.text(payload.client.address, 5, y, { maxWidth: 48 });
    y += 3;
  }
  if (payload.client.industry) {
    doc.text(`Industry: ${payload.client.industry}`, 5, y);
    y += 3;
  }
  if (payload.client.contact_person) {
    doc.text(`Contact: ${payload.client.contact_person}`, 5, y);
    y += 3;
  }
  if (payload.client.contact_number) {
    doc.text(`Tel: ${payload.client.contact_number}`, 5, y);
    y += 3;
  }

  doc.addImage(clientQrUrl, "PNG", 40, y - 15, 15, 15);
  y += 5;

  doc.setFontSize(fontSize - 2);
  doc.text("COLLECTION DETAILS", 5, y);
  y += 4;
  doc.setFontSize(fontSize - 1);
  if (truckName) {
    doc.text(`Truck: ${truckName}`, 5, y);
    y += 3;
  }
  if (driverName) {
    doc.text(`Driver: ${driverName}`, 5, y);
    y += 3;
  }
  if (helperNames.length > 0) {
    doc.text(`Helpers: ${helperNames.join(", ")}`, 5, y, { maxWidth: 48 });
    y += 6;
  }

  doc.setFontSize(fontSize - 2);
  doc.text("WASTE COLLECTED", 5, y);
  y += 4;
  doc.setFontSize(fontSize - 1);
  (payload.items || []).forEach((item) => {
    doc.text(`${item.waste_type}: ${item.quantity} ${item.unit}`, 5, y, { maxWidth: 48 });
    y += 4;
  });
  y += 2;
  const displayUnit = payload.items.length > 0 ? payload.items[0].unit : "units";
  doc.setFontSize(fontSize);
  doc.text(`TOTAL: ${totalQuantity} ${displayUnit}`, 5, y);
  y += 6;

  doc.setFontSize(6);
  doc.text("CLIENT SIGNATURE", 5, y);
  y += 4;
  if (payload.signatureData) {
    doc.addImage(payload.signatureData, "PNG", 5, y, 48, 12);
    y += 14;
  }
  doc.setFontSize(7);
  doc.text(`Signed by: ${payload.signedBy || ""}`, 5, y);
  y += 8;

  doc.addImage(receiptQrUrl, "PNG", 19, y, 20, 20);
  y += 22;
  doc.setFontSize(fontSize - 2);
  doc.text("Scan to verify receipt", 29, y, { align: "center" });
  y += 5;
  doc.setFontSize(fontSize - 3);
  doc.text(footerText, 29, y, { align: "center", maxWidth: 50 });

  return doc;
};

export const downloadReceiptPdf = async (payload: ReceiptPdfPayload) => {
  const doc = await createReceiptPdfDocument(payload);
  const filename = `receipt-${payload.receiptQR}.pdf`;
  doc.save(filename);
};

export const downloadMultipleReceiptPdfs = async (payloads: ReceiptPdfPayload[]) => {
  for (const payload of payloads) {
    await downloadReceiptPdf(payload);
  }
};
