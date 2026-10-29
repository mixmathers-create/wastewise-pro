import CreateReceiptForm from "@/components/collection/CreateReceiptForm";

const DevReceiptHarness = () => (
  <div className="mx-auto max-w-md p-4">
    <CreateReceiptForm
      profile={{ user_id: "dev-user" }}
      onSuccess={() => {}}
      isOnline={false}
      cachedClients={
        [
          {
            id: "c1",
            name: "Test Client",
            qr_code: "QR-TEST-001",
            industry: "Hotel",
            address: "Cebu City",
            contact_person: "Ana",
            contact_number: "0917",
          },
        ] as any
      }
      cachedTrucks={[{ id: "t1", code: "TRUCK-1", type: "GC1" }] as any}
      cachedDrivers={[{ id: "d1", name: "Driver One" }] as any}
      cachedHelpers={[{ id: "h1", name: "Helper One" }] as any}
    />
  </div>
);

export default DevReceiptHarness;
