import { Type, Download, RotateCcw, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Separator } from "@/components/ui/separator";

interface ToolbarProps {
  onAddText: () => void;
  onExport: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar = ({
  onAddText,
  onExport,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) => {
  return (
    <div className="bg-editor-panel border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Text Tools */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onAddText}
          className="gap-2"
        >
          <Type className="h-4 w-4" />
          Add Text
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* History */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="gap-2 bg-sky-600 text-white hover:bg-sky-700 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
        >
          <Redo2 className="h-4 w-4" />
          Redo
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Export and Reset */}
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          className="gap-2"
          aria-label="Save Image"
        >
          <Download className="h-4 w-4" />
          Save Image
        </Button>

        <ConfirmDialog
          title="Reset editor?"
          description="This will erase all changes and return you to the upload screen."
          confirmText="Reset"
          cancelText="Cancel"
          confirmDestructive
          onConfirm={onReset}
          trigger={
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          }
        />
      </div>
    </div>
  );
};