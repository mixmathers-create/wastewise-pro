import { useEffect } from "react";

export function useBlockCommaInput() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      const isInputElement = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputElement && event.key === ",") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (target.value && target.value.includes(",")) {
          const cursorPos = target.selectionStart || 0;
          const commasBefore = (target.value.substring(0, cursorPos).match(/,/g) || []).length;
          
          target.value = target.value.replace(/,/g, "");
          
          const newCursorPos = cursorPos - commasBefore;
          target.setSelectionRange(newCursorPos, newCursorPos);
        }
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      
      const isInputElement = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputElement) {
        const pastedText = event.clipboardData?.getData("text");
        
        if (pastedText && pastedText.includes(",")) {
          event.preventDefault();
          
          const cleanedText = pastedText.replace(/,/g, "");
          
          if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
            const input = target as HTMLInputElement | HTMLTextAreaElement;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentValue = input.value;
            
            input.value = currentValue.substring(0, start) + cleanedText + currentValue.substring(end);
            
            const newCursorPos = start + cleanedText.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
            
            input.dispatchEvent(new Event("input", { bubbles: true }));
          } else if (target.isContentEditable) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(cleanedText));
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("input", handleInput, { capture: true });
    document.addEventListener("paste", handlePaste, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("input", handleInput, { capture: true });
      document.removeEventListener("paste", handlePaste, { capture: true });
    };
  }, []);
}

export default useBlockCommaInput;

