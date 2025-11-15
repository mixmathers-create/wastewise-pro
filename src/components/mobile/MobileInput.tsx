import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NumericKeypad } from "./NumericKeypad";
import { isNativePlatform } from "@/lib/capacitorUtils";
import { MobileInput } from "@/components/mobile/MobileInput";

interface MobileInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  allowDecimal?: boolean;
  maxLength?: number;
}

export const MobileInput = ({
  value,
  onChange,
  type = "text",
  allowDecimal = true,
  maxLength = 10,
  ...props
}: MobileInputProps) => {
  const [showKeypad, setShowKeypad] = useState(false);
  const isMobile = isNativePlatform();

  const handleInputClick = (e: React.MouseEvent) => {
    if (isMobile && type === "number") {
      e.preventDefault();
      setShowKeypad(true);
    }
  };

  const handleKeypadChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleKeypadClose = () => {
    setShowKeypad(false);
  };

  return (
    <>
      <MobileInput
        type="number"
        value={value}
        onChange={setValue}
        allowDecimal={true}
        maxLength={10}
      />

      {isMobile && type === "number" && (
        <Dialog open={showKeypad} onOpenChange={setShowKeypad}>
          <DialogContent className="max-w-sm">
            <NumericKeypad
              value={value}
              onChange={handleKeypadChange}
              onClose={handleKeypadClose}
              maxLength={maxLength}
              allowDecimal={allowDecimal}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
