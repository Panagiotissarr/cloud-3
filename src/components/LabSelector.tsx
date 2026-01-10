import { FlaskConical, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lab } from "@/hooks/useLabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LabSelectorProps {
  labs: Lab[];
  selectedLabId: string | null;
  onSelectLab: (labId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function LabSelector({
  labs,
  selectedLabId,
  onSelectLab,
  disabled,
  className,
}: LabSelectorProps) {
  const selectedLab = labs.find((l) => l.id === selectedLabId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={selectedLabId || "no-lab"}
        onValueChange={(value) => onSelectLab(value === "no-lab" ? null : value)}
        disabled={disabled || labs.length === 0}
      >
        <SelectTrigger className="w-auto min-w-[160px] h-8 text-xs bg-secondary border-border">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
            <SelectValue placeholder="No Lab" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-lab">
            <span className="text-muted-foreground">No Lab</span>
          </SelectItem>
          {labs.map((lab) => (
            <SelectItem key={lab.id} value={lab.id}>
              {lab.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLab && (
        <button
          onClick={() => onSelectLab(null)}
          className="p-1 rounded-full hover:bg-muted transition-colors"
          title="Clear lab selection"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
