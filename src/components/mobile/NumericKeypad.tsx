import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Delete, X } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  maxLength?: number;
  allowDecimal?: boolean;
}

export const NumericKeypad = ({
  value,
  onChange,
  onClose,
  maxLength = 10,
  allowDecimal = true,
}: NumericKeypadProps) => {
  const handleNumberClick = (num: string) => {
    if (value.length >= maxLength) return;
    onChange(value + num);
  };

  const handleDecimalClick = () => {
    if (!allowDecimal || value.includes(".")) return;
    if (value === "") {
      onChange("0.");
    } else {
      onChange(value + ".");
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange("");
  };

  const buttons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <Card className="p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-foreground min-h-[48px] flex items-center px-2 bg-muted rounded-md flex-1 mr-2">
          {value || "0"}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {buttons.flat().map((btn, idx) => {
          if (btn === ".") {
            return (
              <Button
                key={idx}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={handleDecimalClick}
                disabled={!allowDecimal || value.includes(".")}
              >
                {btn}
              </Button>
            );
          }
          if (btn === "⌫") {
            return (
              <Button
                key={idx}
                variant="destructive"
                size="lg"
                className="h-16"
                onClick={handleBackspace}
              >
                <Delete className="h-6 w-6" />
              </Button>
            );
          }
          return (
            <Button
              key={idx}
              variant="outline"
              size="lg"
              className="h-16 text-xl font-semibold"
              onClick={() => handleNumberClick(btn)}
            >
              {btn}
            </Button>
          );
        })}
        <Button
          variant="secondary"
          size="lg"
          className="h-16 col-span-3 text-lg font-semibold"
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
    </Card>
  );
};
