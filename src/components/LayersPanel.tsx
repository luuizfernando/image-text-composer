import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Type, Trash2 } from "lucide-react";
import { TextLayer } from "./ImageEditor";
import type { Dispatch, SetStateAction } from "react";

interface LayersPanelProps {
  layers: TextLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  canvas: FabricCanvas | null;
  onDeleteLayer: (layerId: string) => void;
  onUpdateLayers: Dispatch<SetStateAction<TextLayer[]>>;
  onAfterCanvasChange: () => void;
}

export const LayersPanel = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  canvas,
  onDeleteLayer,
  onUpdateLayers,
  onAfterCanvasChange,
}: LayersPanelProps) => {
  const selectLayer = (layerId: string) => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj: any) => obj.data?.id === layerId);
    
    if (targetObject) {
      canvas.setActiveObject(targetObject);
      canvas.renderAll();
      onLayerSelect(layerId);
    }
  };

  const deleteLayer = (layerId: string) => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj: any) => obj.data?.id === layerId);
    
    if (targetObject) {
      canvas.remove(targetObject);
      canvas.renderAll();
      onLayerSelect(null);
      onDeleteLayer(layerId);
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj: any) => obj.data?.id === layerId);
    
    if (targetObject) {
      targetObject.set("visible", !targetObject.visible);
      canvas.renderAll();
    }
  };

  const moveLayer = (layerId: string, direction: "up" | "down") => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetIndex = objects.findIndex((obj: any) => obj.data?.id === layerId);
    
    if (targetIndex === -1) return;

    const targetObject = objects[targetIndex];
    
    if (direction === "up" && targetIndex < objects.length - 1) {
      canvas.bringObjectForward(targetObject);
    } else if (direction === "down" && targetIndex > 0) {
      canvas.sendObjectBackwards(targetObject);
    }
    
    canvas.renderAll();

    // Sincronizar a ordem no estado com a ordem do canvas
    const orderIndexById = new Map<string, number>();
    canvas.getObjects().forEach((obj: any, index: number) => {
      if (obj?.data?.id) orderIndexById.set(obj.data.id as string, index);
    });

    onUpdateLayers(prev => {
      const next = [...prev].sort((a, b) => {
        const ia = orderIndexById.get(a.id) ?? 0;
        const ib = orderIndexById.get(b.id) ?? 0;
        return ia - ib; // mesma ordem do canvas (base->topo)
      });
      return next;
    });

    onAfterCanvasChange();
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-editor-sidebar-foreground mb-4">
        Layers
      </h3>

      {layers.length === 0 ? (
        <p className="text-editor-panel-foreground text-sm">
          No text layers yet. Add some text to get started!
        </p>
      ) : (
        <div className="space-y-2">
          {[...layers].reverse().map((layer, index) => (
            <div
              key={layer.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedLayerId === layer.id
                  ? "border-editor-accent bg-editor-accent/10"
                  : "border-border bg-editor-panel hover:bg-editor-panel/80"
              }`}
              onClick={() => selectLayer(layer.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Type className="h-4 w-4 text-editor-panel-foreground" />
                <span className="flex-1 text-sm font-medium text-editor-panel-foreground truncate">
                  {layer.text.slice(0, 20)}
                  {layer.text.length > 20 ? "..." : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, "up");
                  }}
                  className="h-7 px-2 text-sm text-white"
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, "down");
                  }}
                  className="h-7 px-2 text-sm text-white"
                  disabled={index === layers.length - 1}
                >
                  ↓
                </Button>
                <span className="text-xs text-editor-panel-foreground ml-2">
                  {layer.fontFamily} • {layer.fontSize}px
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};