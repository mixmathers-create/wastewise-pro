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
  items: Array<{ waste_type: string; quantity: number; unit: string; bin_size?: string }>;
  signedBy?: string;
  signatureData?: string | null;
  settings?: ReceiptPdfSettings;
}

const getReceiptSettings = (settings?: ReceiptPdfSettings) => {
  return {
    logoUrl: settings?.logoUrl ?? null,
    companyName: settings?.companyName ?? localStorage.getItem("receipt_company_name") ?? "WASTEWISE",
    companyAddress: settings?.companyAddress ?? localStorage.getItem("receipt_company_address") ?? "",
    companyContact: settings?.companyContact ?? localStorage.getItem("receipt_company_contact") ?? "",
    headerText: settings?.headerText ?? localStorage.getItem("receipt_header") ?? "COLLECTION RECEIPT",
    footerText: settings?.footerText ?? localStorage.getItem("receipt_footer") ?? "Thank you for your cooperation!",
    fontSize: settings?.fontSize ?? parseInt(localStorage.getItem("receipt_font_size") || "8", 10),
  };
};

// Safely call doc.text — skips if value is empty/null/undefined
const safeText = (doc: jsPDF, value: any, x: number, y: number, options?: any) => {
  const str = value == null ? "" : String(value).trim();
  if (!str) return;
  if (options) {
    doc.text(str, x, y, options);
  } else {
    doc.text(str, x, y);
  }
};

const renderReceiptToDoc = (doc: jsPDF, payload: ReceiptPdfPayload, clientQrUrl: string, receiptQrUrl: string) => {
  const now = new Date(payload.createdAt);
  const { logoUrl, companyName, companyAddress, companyContact, headerText, footerText, fontSize } = getReceiptSettings(payload.settings);

  const truckName = payload.truck?.code || payload.truck?.name || "";
  const driverName = payload.driver?.name || payload.driver?.full_name || "";
  const helperNames = (payload.helpers || []).map((h) => h?.name || h?.full_name || "").filter(Boolean);
  const totalQuantity = (payload.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  let y = 10;

  if (logoUrl) {
    try { doc.addImage(logoUrl, "PNG", 14, y, 30, 15); y += 18; }
    catch { doc.setFontSize(fontSize + 4); safeText(doc, companyName, 29, y, { align: "center" }); y += 8; }
  } else {
    doc.setFontSize(fontSize + 4);
    safeText(doc, companyName, 29, y, { align: "center" });
    y += 8;
  }

  if (companyAddress || companyContact) {
    doc.setFontSize(fontSize - 2);
    if (companyAddress) { safeText(doc, companyAddress, 29, y, { align: "center", maxWidth: 48 }); y += 4; }
    if (companyContact) { safeText(doc, companyContact, 29, y, { align: "center" }); y += 4; }
  }

  doc.setFontSize(fontSize + 1); safeText(doc, headerText, 29, y, { align: "center" }); y += 5;
  doc.setFontSize(fontSize - 1); safeText(doc, `Serial: ${payload.receiptQR || "N/A"}`, 29, y, { align: "center" }); y += 4;
  safeText(doc, `${now.toLocaleDateString()} • ${now.toLocaleTimeString()}`, 29, y, { align: "center" }); y += 8;

  doc.setFontSize(fontSize - 2); safeText(doc, "CLIENT INFORMATION", 5, y); y += 4;
  doc.setFontSize(fontSize - 1); safeText(doc, payload.client?.name || "Unknown Client", 5, y); y += 3;
  doc.setFontSize(fontSize - 2);
  if (payload.client?.id) { safeText(doc, `ID: ${String(payload.client.id).slice(0, 8)}`, 5, y); y += 3; }
  if (payload.client?.address) { safeText(doc, payload.client.address, 5, y, { maxWidth: 48 }); y += 3; }
  if (payload.client?.industry) { safeText(doc, `Industry: ${payload.client.industry}`, 5, y); y += 3; }
  if (payload.client?.contact_person) { safeText(doc, `Contact: ${payload.client.contact_person}`, 5, y); y += 3; }
  if (payload.client?.contact_number) { safeText(doc, `Tel: ${payload.client.contact_number}`, 5, y); y += 3; }
  doc.addImage(clientQrUrl, "PNG", 40, y - 15, 15, 15); y += 5;

  doc.setFontSize(fontSize - 2); safeText(doc, "COLLECTION DETAILS", 5, y); y += 4;
  doc.setFontSize(fontSize - 1);
  if (truckName) { safeText(doc, `Truck: ${truckName}`, 5, y); y += 3; }
  if (driverName) { safeText(doc, `Driver: ${driverName}`, 5, y); y += 3; }
  if (helperNames.length > 0) { safeText(doc, `Helpers: ${helperNames.join(", ")}`, 5, y, { maxWidth: 48 }); y += 6; }

  doc.setFontSize(fontSize - 2); safeText(doc, "WASTE COLLECTED", 5, y); y += 4;
  doc.setFontSize(fontSize - 1);
  (payload.items || []).forEach((item) => {
    const binLabel = item.bin_size ? ` (${item.bin_size})` : "";
    safeText(doc, `${item.waste_type || "-"}: ${item.quantity} ${item.unit || ""}${binLabel}`, 5, y, { maxWidth: 48 });
    y += 4;
  });
  y += 2;
  const displayUnit = payload.items.length > 0 ? (payload.items[0].unit || "units") : "units";
  doc.setFontSize(fontSize); safeText(doc, `TOTAL: ${totalQuantity} ${displayUnit}`, 5, y); y += 6;

  doc.setFontSize(6); safeText(doc, "CLIENT SIGNATURE", 5, y); y += 4;
  if (payload.signatureData) { doc.addImage(payload.signatureData, "PNG", 5, y, 48, 12); y += 14; }
  doc.setFontSize(7); safeText(doc, `Signed by: ${payload.signedBy || "-"}`, 5, y); y += 8;

  doc.addImage(receiptQrUrl, "PNG", 19, y, 20, 20); y += 22;
  doc.setFontSize(fontSize - 2); safeText(doc, "Scan to verify receipt", 29, y, { align: "center" }); y += 5;
  doc.setFontSize(fontSize - 3); safeText(doc, footerText, 29, y, { align: "center", maxWidth: 50 });
};

export const createReceiptPdfDocument = async (payload: ReceiptPdfPayload) => {
  const clientQrUrl = await QRCode.toDataURL(String(payload.client?.qr_code || payload.client?.id || payload.receiptQR || "unknown"), { width: 150 });
  const receiptQrUrl = await QRCode.toDataURL(String(payload.receiptQR || "unknown"), { width: 150 });
  const doc = new jsPDF({ format: [58, 200], unit: "mm" });
  renderReceiptToDoc(doc, payload, clientQrUrl, receiptQrUrl);
  return doc;
};

export const downloadReceiptPdf = async (payload: ReceiptPdfPayload) => {
  const doc = await createReceiptPdfDocument(payload);
  doc.save(`receipt-${payload.receiptQR}.pdf`);
};

export const downloadMultipleReceiptPdfs = async (payloads: ReceiptPdfPayload[], filename?: string) => {
  if (payloads.length === 0) return;
  if (payloads.length === 1) { await downloadReceiptPdf(payloads[0]); return; }

  const yield_ = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  const CHUNK_SIZE = 50; // stay well under JS string length limit
  const chunks: ReceiptPdfPayload[][] = [];
  for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
    chunks.push(payloads.slice(i, i + CHUNK_SIZE));
  }

  const baseName = filename ? filename.replace(/\.pdf$/i, "") : `receipts-bulk-${Date.now()}`;

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const chunkFilename = chunks.length > 1 ? `${baseName}-part${c + 1}.pdf` : `${baseName}.pdf`;

    const qrData: { clientQrUrl: string; receiptQrUrl: string }[] = [];
    for (let i = 0; i < chunk.length; i++) {
      const p = chunk[i];
      qrData.push({
        clientQrUrl: await QRCode.toDataURL(String(p.client?.qr_code || p.client?.id || p.receiptQR || "unknown"), { width: 150 }),
        receiptQrUrl: await QRCode.toDataURL(String(p.receiptQR || "unknown"), { width: 150 }),
      });
      if (i % 5 === 4) await yield_();
    }

    const doc = new jsPDF({ format: [58, 200], unit: "mm" });
    for (let i = 0; i < chunk.length; i++) {
      if (i > 0) doc.addPage([58, 200]);
      renderReceiptToDoc(doc, chunk[i], qrData[i].clientQrUrl, qrData[i].receiptQrUrl);
      if (i % 5 === 4) await yield_();
    }

    doc.save(chunkFilename);
    await yield_(); // let browser process the download before next chunk
  }
};
