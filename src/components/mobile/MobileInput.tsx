import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NumericKeypad } from "./NumericKeypad";
import { isNativePlatform } from "@/lib/capacitorUtils";


interface MobileInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  allowDecimal?: boolean;
  maxLength?: number;
  onSubmit?: () => void;
}

export const MobileInput = ({
  value,
  onChange,
  type = "text",
  allowDecimal = true,
  maxLength = 10,
  onSubmit,
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
      <Input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleInputClick}
        inputMode={type === "number" ? (allowDecimal ? "decimal" : "numeric") : undefined}
        pattern={type === "number" ? (allowDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*") : undefined}
        type={type === "number" ? "text" : type}
      />

      {isMobile && type === "number" && (
        <Dialog open={showKeypad} onOpenChange={setShowKeypad}>
          <DialogContent className="max-w-sm">
            <NumericKeypad
              value={value}
              onChange={handleKeypadChange}
              onClose={handleKeypadClose}
              onSubmit={onSubmit}
              maxLength={maxLength}
              allowDecimal={allowDecimal}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
