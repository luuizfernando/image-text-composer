import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Type, Trash2, Lock, Unlock, Copy } from "lucide-react";
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

  const toggleLockLayer = (layerId: string) => {
    if (!canvas) return;
    const obj = canvas.getObjects().find((o: any) => o.data?.id === layerId) as any;
    if (!obj) return;
    const currentlyLocked = (!obj.selectable && !obj.evented) || !!obj.data?.locked;
    const nextLocked = !currentlyLocked;
    obj.set({ selectable: !nextLocked, evented: !nextLocked });
    if (obj.data) obj.data.locked = nextLocked;
    canvas.requestRenderAll();
    onUpdateLayers(prev => prev.map(l => l.id === layerId ? { ...l, locked: nextLocked } : l));
    onAfterCanvasChange();
  };

  const duplicateLayer = (layerId: string) => {
    if (!canvas) return;
    const obj = canvas.getObjects().find((o: any) => o.data?.id === layerId) as any;
    if (!obj) return;
    const doAppend = (cloned: any) => {
      const newId = `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
      if (!cloned.data) cloned.data = {};
      cloned.data.id = newId;
      // manter estado de lock da origem
      const originLocked = (!obj.selectable && !obj.evented) || !!obj.data?.locked;
      cloned.set({ selectable: !originLocked, evented: !originLocked });
      cloned.data.locked = originLocked;
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      // garantir que a cópia fique no topo
      if (typeof (cloned as any).bringToFront === "function") {
        (cloned as any).bringToFront();
      } else if (typeof (canvas as any).bringObjectToFront === "function") {
        (canvas as any).bringObjectToFront(cloned);
      }
      canvas.requestRenderAll();
      onUpdateLayers(prev => {
        const base = prev.find(l => l.id === layerId) as TextLayer;
        const newLayer: TextLayer = {
          ...base,
          id: newId,
          left: (obj.left ?? 0) + 20,
          top: (obj.top ?? 0) + 20,
        };
        return [...prev, newLayer];
      });
      onAfterCanvasChange();
    };

    // clone em Fabric v6 é promessa
    if (typeof obj.clone === "function") {
      const result = obj.clone();
      if (result && typeof (result as any).then === "function") {
        (result as Promise<any>).then((cloned) => doAppend(cloned));
      } else {
        // alguns builds ainda suportam callback
        try {
          obj.clone((cloned: any) => doAppend(cloned));
        } catch {
          // último recurso: usar toObject + constructor
          const Ctor = (obj as any).constructor as any;
          const clone = new Ctor(obj.text, { ...obj.toObject(), left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
          doAppend(clone);
        }
      }
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj: any) => obj.data?.id === layerId);
    
    if (targetObject) {
      targetObject.set("visible", !targetObject.visible);
      canvas.renderAll();
      onAfterCanvasChange();
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
                  {(() => {
                    if (!canvas) return <Eye className="h-3 w-3 text-white" />;
                    const obj = canvas.getObjects().find((o: any) => o.data?.id === layer.id) as any;
                    const isVisible = obj ? obj.visible !== false : true;
                    return isVisible ? (
                      <Eye className="h-3 w-3 text-white" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-white" />
                    );
                  })()}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLockLayer(layer.id);
                  }}
                  className="h-6 w-6 p-0"
                >
                  {(() => {
                    if (!canvas) return <Lock className="h-3 w-3 text-white" />;
                    const obj = canvas.getObjects().find((o: any) => o.data?.id === layer.id) as any;
                    const locked = obj ? (!obj.selectable && !obj.evented) : false;
                    return locked ? (
                      <Lock className="h-3 w-3 text-white" />
                    ) : (
                      <Unlock className="h-3 w-3 text-white" />
                    );
                  })()}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateLayer(layer.id);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3 text-white" />
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