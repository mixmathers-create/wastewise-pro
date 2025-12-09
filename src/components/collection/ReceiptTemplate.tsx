import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";

export interface ReceiptTemplateProps {
  
  logoUrl?: string | null;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  headerText?: string;
  footerText?: string;
  
  receiptQR: string;
  createdAt: Date;
  
  client: {
    id: string;
    name: string;
    industry: string;
    address?: string | null;
    contact_person?: string | null;
    contact_number?: string | null;
    qr_code: string;
  };
  
  truck: {
    code: string;
    type?: string;
  };
  driver: {
    name: string;
  };
  helpers: Array<{ name: string }>;
  
  items: Array<{
    waste_type: string;
    quantity: number;
    unit: string;
  }>;
  
  signedBy: string;
  signatureData?: string | null;
}

const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  (
    {
      logoUrl,
      companyName = "WASTEWISE",
      companyAddress = "",
      companyContact = "",
      headerText = "COLLECTION RECEIPT",
      footerText = "Thank you for your cooperation!",
      receiptQR,
      createdAt,
      client,
      truck,
      driver,
      helpers,
      items,
      signedBy,
      signatureData,
    },
    ref
  ) => {
    const [clientQrUrl, setClientQrUrl] = useState<string>("");
    const [receiptQrUrl, setReceiptQrUrl] = useState<string>("");
    
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const formattedDate = createdAt.toLocaleDateString();
    const formattedTime = createdAt.toLocaleTimeString();
    
    // Generate QR code URLs - Higher resolution for better scanning
    useEffect(() => {
      const generateQRCodes = async () => {
        try {
          const [clientQr, receiptQr] = await Promise.all([
            QRCode.toDataURL(client.qr_code, { width: 300, margin: 2, errorCorrectionLevel: 'H' }),
            QRCode.toDataURL(receiptQR, { width: 300, margin: 2, errorCorrectionLevel: 'H' }),
          ]);
          setClientQrUrl(clientQr);
          setReceiptQrUrl(receiptQr);
        } catch (error) {
          console.error("QR code generation error:", error);
        }
      };
      generateQRCodes();
    }, [client.qr_code, receiptQR]);

    return (
      <div
        ref={ref}
        style={{
          width: "58mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "monospace",
          fontSize: "8pt",
          padding: "3mm",
          boxSizing: "border-box",
        }}
      >
        {/* Logo or Company Name */}
        <div style={{ textAlign: "center", marginBottom: "2mm", marginRight: "5mm" }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ maxWidth: "30mm", maxHeight: "15mm", margin: "0 auto" }}
            />
          ) : (
            <div style={{ fontSize: "12pt", fontWeight: "bold" }}>
              {companyName}
            </div>
          )}
        </div>

        {/* Company Info */}
        {(companyAddress || companyContact) && (
          <div style={{ textAlign: "center", fontSize: "6pt", marginBottom: "2mm", marginRight: "5mm" }}>
            {companyAddress && <div>{companyAddress}</div>}
            {companyContact && <div>{companyContact}</div>}
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2mm", marginRight: "5mm" }}>
          <div style={{ fontSize: "9pt", fontWeight: "bold" }}>{headerText}</div>
          <div style={{ fontSize: "7pt" }}>Serial: {receiptQR}</div>
          <div style={{ fontSize: "7pt" }}>
            {formattedDate} • {formattedTime}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Client Information */}
        <div style={{ marginBottom: "2mm", wordWrap: "break-word", overflowWrap: "break-word" }}>
          <div style={{ fontSize: "7pt", fontWeight: "bold", marginBottom: "1mm" }}>
            CLIENT INFORMATION
          </div>
          <div style={{ fontSize: "8pt", fontWeight: "bold" }}>{client.name}</div>
          <div style={{ fontSize: "6pt" }}>ID: {client.id.slice(0, 8)}</div>
          {client.address && (
            <div style={{ fontSize: "6pt" }}>{client.address}</div>
          )}
          <div style={{ fontSize: "6pt" }}>Industry: {client.industry}</div>
          {client.contact_person && (
            <div style={{ fontSize: "6pt" }}>Contact: {client.contact_person}</div>
          )}
          {client.contact_number && (
            <div style={{ fontSize: "6pt" }}>Tel: {client.contact_number}</div>
          )}
          
          {/* Client QR Code - Below client info */}
          {clientQrUrl && (
            <div style={{ textAlign: "center", marginTop: "2mm" }}>
              <img src={clientQrUrl} alt="Client QR" style={{ width: "85px", height: "85px" }} />
              <div style={{ fontSize: "5pt" }}>Client ID</div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Collection Details */}
        <div style={{ marginBottom: "2mm", wordWrap: "break-word", overflowWrap: "break-word" }}>
          <div style={{ fontSize: "7pt", fontWeight: "bold", marginBottom: "1mm" }}>
            COLLECTION DETAILS
          </div>
          <div style={{ fontSize: "7pt" }}>
            Truck: {truck.code}
            {truck.type ? ` - ${truck.type}` : ""}
          </div>
          <div style={{ fontSize: "7pt" }}>Driver: {driver.name}</div>
          <div style={{ fontSize: "7pt" }}>
            Helpers: {helpers.map((h) => h.name).join(", ")}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Waste Collected */}
        <div style={{ marginBottom: "2mm" }}>
          <div style={{ fontSize: "7pt", fontWeight: "bold", marginBottom: "1mm" }}>
            WASTE COLLECTED
          </div>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                fontSize: "7pt",
                padding: "1mm 0",
                borderBottom: "1px dotted #ccc",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            >
              <div style={{ marginBottom: "0.5mm" }}>{item.waste_type}</div>
              <div style={{ fontWeight: "bold", paddingLeft: "3mm" }}>
                Qty: {item.quantity} {item.unit}
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: "1mm",
              paddingTop: "1mm",
              borderTop: "1px solid #000",
              fontSize: "8pt",
              fontWeight: "bold",
            }}
          >
            TOTAL: {totalQuantity} {items[0]?.unit || ""}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Signature Section */}
        <div style={{ marginBottom: "2mm", wordWrap: "break-word", overflowWrap: "break-word" }}>
          <div style={{ fontSize: "6pt", fontWeight: "bold", marginBottom: "1mm" }}>
            CLIENT SIGNATURE
          </div>
          {signatureData ? (
            <div
              style={{
                border: "1px solid #ccc",
                padding: "1mm",
                backgroundColor: "#fafafa",
                marginBottom: "1mm",
              }}
            >
              <img
                src={signatureData}
                alt="Signature"
                style={{ width: "100%", height: "12mm", objectFit: "contain" }}
              />
            </div>
          ) : (
            <div
              style={{
                height: "12mm",
                border: "1px solid #ccc",
                marginBottom: "1mm",
              }}
            />
          )}
          <div style={{ fontSize: "7pt", wordBreak: "break-word", overflowWrap: "break-word" }}>Signed by: {signedBy}</div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Receipt QR Code */}
        <div style={{ textAlign: "center", marginBottom: "2mm", marginRight: "5mm" }}>
          {receiptQrUrl && (
            <img 
              src={receiptQrUrl} 
              alt="Receipt QR" 
              style={{ width: "85px", height: "85px", margin: "0 auto" }} 
            />
          )}
          <div style={{ fontSize: "6pt", marginTop: "1mm" }}>
            Scan to verify receipt
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "6pt", marginRight: "5mm" }}>{footerText}</div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";

export default ReceiptTemplate;

