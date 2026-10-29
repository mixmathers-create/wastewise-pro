import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";

export interface TallyTemplateProps {
  receiptQR: string;
  createdAt: Date;
  
  tallyEntries: Array<{
    waste_type: string;
    quantity: number;
    unit: string;
    bin_size?: string;
  }>;
  
  // Totals by waste type
  totals: { [key: string]: { quantity: number; unit: string; bin_size?: string } };
}

const TallyTemplate = forwardRef<HTMLDivElement, TallyTemplateProps>(
  (
    {
      receiptQR,
      createdAt,
      tallyEntries,
      totals,
    },
    ref
  ) => {
    const [qrUrl, setQrUrl] = useState<string>("");
    
    const formattedDate = createdAt.toLocaleDateString();
    const formattedTime = createdAt.toLocaleTimeString();
    
    // Generate QR code URL
    useEffect(() => {
      const generateQRCode = async () => {
        try {
          const qr = await QRCode.toDataURL(receiptQR, { width: 200, margin: 2, errorCorrectionLevel: 'H' });
          setQrUrl(qr);
        } catch (error) {
          console.error("QR code generation error:", error);
        }
      };
      generateQRCode();
    }, [receiptQR]);

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
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2mm", marginRight: "5mm" }}>
          <div style={{ fontSize: "12pt", fontWeight: "bold" }}>
            WASTEWISE
          </div>
          <div style={{ fontSize: "9pt", fontWeight: "bold" }}>
            COLLECTION TALLY
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Receipt Info */}
        <div style={{ marginBottom: "2mm", fontSize: "7pt" }}>
          <div>
            <span style={{ fontWeight: "bold" }}>Date: </span>
            {formattedDate} {formattedTime}
          </div>
          <div style={{ wordWrap: "break-word", overflowWrap: "break-word" }}>
            <span style={{ fontWeight: "bold" }}>QR Code: </span>
            {receiptQR}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Tally Entries */}
        <div style={{ marginBottom: "2mm" }}>
          <div style={{ fontSize: "7pt", fontWeight: "bold", marginBottom: "1mm" }}>
            TALLY ENTRIES ({tallyEntries.length})
          </div>
          {tallyEntries.map((entry, idx) => (
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
              <div style={{ marginBottom: "0.5mm" }}>{idx + 1}. {entry.waste_type}</div>
              <div style={{ fontWeight: "bold", paddingLeft: "3mm" }}>
                Qty: {entry.quantity} {entry.unit ? entry.unit : 'pcs'}{entry.bin_size ? ` (${entry.bin_size})` : ""}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* Totals */}
        <div style={{ marginBottom: "2mm" }}>
          <div style={{ fontSize: "7pt", fontWeight: "bold", marginBottom: "1mm" }}>
            TOTALS
          </div>
          {Object.entries(totals).map(([key, total], idx) => {
            const wasteType = key.split('-')[0];
            return (
              <div
                key={idx}
                style={{
                  fontSize: "8pt",
                  fontWeight: "bold",
                  padding: "1mm",
                  backgroundColor: "#f0f0f0",
                  marginBottom: "1mm",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <div style={{ marginBottom: "0.5mm" }}>{wasteType}</div>
                <div style={{ paddingLeft: "3mm" }}>
                  Total: {total.quantity} {total.unit ? total.unit : 'pcs'}{total.bin_size ? ` (${total.bin_size})` : ""}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

        {/* QR Code */}
        <div style={{ textAlign: "center", marginBottom: "2mm", marginRight: "5mm" }}>
          {qrUrl && (
            <img 
              src={qrUrl} 
              alt="Receipt QR" 
              style={{ width: "70px", height: "70px", margin: "0 auto" }} 
            />
          )}
          <div style={{ fontSize: "6pt", marginTop: "1mm" }}>
            Scan to verify
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "6pt", marginRight: "5mm" }}>
          Printed: {new Date().toLocaleString()}
        </div>
      </div>
    );
  }
);

TallyTemplate.displayName = "TallyTemplate";

export default TallyTemplate;

