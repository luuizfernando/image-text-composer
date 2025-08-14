import { useState, useRef, useEffect } from "react";
import { Canvas as FabricCanvas, IText as FabricIText, Image as FabricImage } from "fabric";
import { UploadArea } from "./UploadArea";
import { Toolbar } from "./Toolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";
import { toast } from "sonner";

export interface TextLayer {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  opacity: number;
  textAlign: string;
  left: number;
  top: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  lineHeight?: number;
  charSpacing?: number; // fabric units: 1/1000 em
}

export interface EditorState {
  backgroundImage: string | null;
  textLayers: TextLayer[];
  selectedLayerId: string | null;
  history: any[];
  historyIndex: number;
  originalWidth?: number | null;
  originalHeight?: number | null;
}

export const ImageEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [originalImageWidth, setOriginalImageWidth] = useState<number | null>(null);
  const [originalImageHeight, setOriginalImageHeight] = useState<number | null>(null);

  // Load saved state on mount (does not require canvas)
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  // Initialize Fabric.js canvas after the editor view is visible (when backgroundImage exists)
  useEffect(() => {
    if (!backgroundImage) return;
    if (!canvasRef.current) return;
    if (fabricCanvas) return; // already initialized

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#f8f9fa",
    });

    // Canvas event handlers
    canvas.on("selection:created", (e) => {
      const activeObject = e.selected?.[0];
      if (activeObject && (activeObject as any).data) {
        setSelectedLayerId((activeObject as any).data.id);
      }
    });

    canvas.on("selection:cleared", () => {
      setSelectedLayerId(null);
      // Atualizar dicas de espaçamento
      canvas.requestRenderAll();
    });

    canvas.on("object:modified", (e: any) => {
      const target = e?.target as any;
      if (target?.data?.id) {
        const updatedId = target.data.id as string;
        setTextLayers(prev => prev.map(layer => {
          if (layer.id !== updatedId) return layer;
          return {
            ...layer,
            left: target.left ?? layer.left,
            top: target.top ?? layer.top,
            angle: target.angle ?? layer.angle,
            scaleX: target.scaleX ?? layer.scaleX,
            scaleY: target.scaleY ?? layer.scaleY,
            text: target.text ?? layer.text,
            fontFamily: target.fontFamily ?? layer.fontFamily,
            fontSize: target.fontSize ?? layer.fontSize,
            fontWeight: (target.fontWeight ?? layer.fontWeight) as any,
            fill: target.fill ?? layer.fill,
            opacity: typeof target.opacity === "number" ? target.opacity : layer.opacity,
            textAlign: (target.textAlign ?? layer.textAlign) as any,
            lineHeight: typeof target.lineHeight === "number" ? target.lineHeight : (layer.lineHeight ?? 1.2),
            charSpacing: typeof target.charSpacing === "number" ? target.charSpacing : (layer.charSpacing ?? 0),
          };
        }));
      }
      saveState(canvas);
      // Atualizar dicas de espaçamento
      canvas.requestRenderAll();
    });

    canvas.on("selection:updated", () => {
      // Atualizar dicas de espaçamento
      canvas.requestRenderAll();
    });
    canvas.on("selection:created", () => {
      // Atualizar dicas de espaçamento
      canvas.requestRenderAll();
    });
    canvas.on("object:moving", () => {
      // Atualizar dicas de espaçamento em tempo real durante o movimento
      canvas.requestRenderAll();
    });

    // Desenhar dicas de espaçamento no contexto superior (não exportado)
    const renderSpacingHints = () => {
      const anyCanvas = canvas as any;
      if (!anyCanvas.contextTop) return;
      anyCanvas.clearContext(anyCanvas.contextTop);

      const getActive = (canvas as any).getActiveObjects
        ? (canvas as any).getActiveObjects()
        : [];
      const activeObjects: any[] = Array.isArray(getActive) ? getActive : [];
      if (!activeObjects || activeObjects.length < 2) return;

      const rects = activeObjects.map((obj: any) => {
        const r = obj.getBoundingRect(true, true);
        return { obj, left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height, width: r.width, height: r.height };
      });

      const ctx: CanvasRenderingContext2D = anyCanvas.contextTop;
      const drawDoubleArrow = (x1: number, y1: number, x2: number, y2: number) => {
        const arrow = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // ponta 1
        const angle1 = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + arrow * Math.cos(angle1 + Math.PI / 6), y1 + arrow * Math.sin(angle1 + Math.PI / 6));
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + arrow * Math.cos(angle1 - Math.PI / 6), y1 + arrow * Math.sin(angle1 - Math.PI / 6));
        ctx.stroke();
        // ponta 2
        const angle2 = Math.atan2(y1 - y2, x1 - x2);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + arrow * Math.cos(angle2 + Math.PI / 6), y2 + arrow * Math.sin(angle2 + Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + arrow * Math.cos(angle2 - Math.PI / 6), y2 + arrow * Math.sin(angle2 - Math.PI / 6));
        ctx.stroke();
      };

      const drawLabel = (x: number, y: number, text: string) => {
        ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
        ctx.textBaseline = "top";
        const padding = 4;
        const metrics = ctx.measureText(text);
        const w = metrics.width + padding * 2;
        const h = 16;
        ctx.fillStyle = "#111827CC"; // bg slate-900/80
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(text, x - metrics.width / 2, y - h / 2 + 2);
      };

      ctx.save();
      ctx.strokeStyle = "#38bdf8"; // sky-400
      ctx.lineWidth = 1.5;

      // Horizontal: ordenar por left e medir gaps entre adjacentes com sobreposição vertical
      const byX = [...rects].sort((a, b) => a.left - b.left);
      for (let i = 0; i < byX.length - 1; i++) {
        const a = byX[i];
        const b = byX[i + 1];
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const gap = b.left - a.right; // se negativo, há sobreposição
        if (overlapY > 0 && gap >= 0) {
          const y = Math.max(a.top, b.top) + overlapY / 2;
          drawDoubleArrow(a.right, y, b.left, y);
          drawLabel((a.right + b.left) / 2, y - 10, `${Math.round(gap)}px`);
        }
      }

      // Vertical: ordenar por top e medir gaps entre adjacentes com sobreposição horizontal
      const byY = [...rects].sort((a, b) => a.top - b.top);
      for (let i = 0; i < byY.length - 1; i++) {
        const a = byY[i];
        const b = byY[i + 1];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const gap = b.top - a.bottom;
        if (overlapX > 0 && gap >= 0) {
          const x = Math.max(a.left, b.left) + overlapX / 2;
          drawDoubleArrow(x, a.bottom, x, b.top);
          drawLabel(x, (a.bottom + b.top) / 2 - 10, `${Math.round(gap)}px`);
        }
      }

      ctx.restore();
    };

    canvas.on("after:render", renderSpacingHints);

    setFabricCanvas(canvas);

    return () => {
      canvas.off("after:render", renderSpacingHints);
      canvas.dispose();
      setFabricCanvas(null);
    };
  }, [backgroundImage]);

  // When a background image exists but the canvas wasn't ready during upload,
  // apply it as soon as the canvas initializes.
  useEffect(() => {
    if (fabricCanvas && backgroundImage && !fabricCanvas.backgroundImage) {
      handleImageUpload(backgroundImage, fabricCanvas);
    }
  }, [fabricCanvas, backgroundImage]);

  // Re-create text objects on the canvas from saved state once the canvas is ready
  useEffect(() => {
    if (!fabricCanvas) return;
    if (textLayers.length === 0) return;

    const existingIds = new Set(
      fabricCanvas
        .getObjects()
        .map((obj: any) => obj.data?.id)
        .filter(Boolean)
    );

    let addedAny = false;
    for (const layer of textLayers) {
      if (existingIds.has(layer.id)) continue;

      const textObject = new FabricIText(layer.text, {
        left: layer.left,
        top: layer.top,
        fontSize: layer.fontSize,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight as any,
        fill: layer.fill,
        opacity: layer.opacity,
        textAlign: layer.textAlign as any,
        angle: layer.angle,
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        originX: "left",
        originY: "top",
        lineHeight: layer.lineHeight ?? 1.2,
        charSpacing: layer.charSpacing ?? 0,
      });
      (textObject as any).data = { id: layer.id };
      fabricCanvas.add(textObject);
      addedAny = true;
    }

    if (addedAny) {
      fabricCanvas.renderAll();
      saveState(fabricCanvas);
    }
  }, [fabricCanvas]);

  // Auto-save to localStorage
  useEffect(() => {
    if (fabricCanvas && (backgroundImage || textLayers.length > 0)) {
      const editorState: EditorState = {
        backgroundImage,
        textLayers,
        selectedLayerId,
        history,
        historyIndex,
        originalWidth: originalImageWidth,
        originalHeight: originalImageHeight,
      };
      localStorage.setItem("imageEditor", JSON.stringify(editorState));
    }
  }, [backgroundImage, textLayers, selectedLayerId, history, historyIndex, originalImageWidth, originalImageHeight]);

  const saveState = (canvas: FabricCanvas) => {
    // Ensure custom 'data' field is preserved in history for undo/redo
    const state = JSON.stringify((canvas as any).toObject(["data"]));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };

  const collectLayersFromCanvas = (canvas: FabricCanvas): TextLayer[] => {
    const layers: TextLayer[] = [];
    const objects = canvas.getObjects();
    for (const obj of objects) {
      const anyObj = obj as any;
      if ((anyObj.type === "i-text" || anyObj.type === "textbox") && typeof anyObj.text === "string") {
        let id: string | undefined = anyObj.data?.id;
        if (!id) {
          id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          anyObj.data = { id };
        }
        layers.push({
          id,
          text: anyObj.text ?? "",
          fontFamily: anyObj.fontFamily ?? "Arial",
          fontSize: anyObj.fontSize ?? 32,
          fontWeight: String(anyObj.fontWeight ?? "normal"),
          fill: anyObj.fill ?? "#000000",
          opacity: typeof anyObj.opacity === "number" ? anyObj.opacity : 1,
          textAlign: anyObj.textAlign ?? "left",
          left: anyObj.left ?? 0,
          top: anyObj.top ?? 0,
          angle: anyObj.angle ?? 0,
          scaleX: anyObj.scaleX ?? 1,
          scaleY: anyObj.scaleY ?? 1,
          lineHeight: typeof anyObj.lineHeight === "number" ? anyObj.lineHeight : 1.2,
          charSpacing: typeof anyObj.charSpacing === "number" ? anyObj.charSpacing : 0,
        });
      }
    }
    return layers;
  };

  const syncLayersAndSelection = (canvas: FabricCanvas) => {
    const layers = collectLayersFromCanvas(canvas);
    setTextLayers(layers);
    const active = canvas.getActiveObject() as any;
    setSelectedLayerId(active?.data?.id ?? null);
  };

  const loadFromLocalStorage = (canvas?: FabricCanvas) => {
    const saved = localStorage.getItem("imageEditor");
    if (saved) {
      try {
        const editorState: EditorState = JSON.parse(saved);
        setBackgroundImage(editorState.backgroundImage);
        setTextLayers(editorState.textLayers || []);
        setSelectedLayerId(editorState.selectedLayerId);
        setHistory(editorState.history || []);
        setHistoryIndex(editorState.historyIndex || -1);
        setOriginalImageWidth(editorState.originalWidth ?? null);
        setOriginalImageHeight(editorState.originalHeight ?? null);
      } catch (error) {
        console.error("Error loading saved state:", error);
      }
    }
  };

  const handleImageUpload = (imageDataUrl: string, canvas?: FabricCanvas) => {
    console.log("handleImageUpload called with imageDataUrl:", imageDataUrl.substring(0, 50) + "...");
    const targetCanvas = canvas || fabricCanvas;
    if (!targetCanvas) {
      console.log("No target canvas available yet. Caching image in state to apply later.");
      setBackgroundImage(imageDataUrl);
      return;
    }

    console.log("Creating FabricImage from URL...");
    FabricImage.fromURL(imageDataUrl).then((img) => {
      console.log("FabricImage created successfully:", img);
      // Set canvas size to match image aspect ratio
      const maxWidth = 1200;
      const maxHeight = 800;
      const aspectRatio = img.width! / img.height!;
      
      let canvasWidth = Math.min(img.width!, maxWidth);
      let canvasHeight = Math.min(img.height!, maxHeight);
      
      if (canvasWidth / canvasHeight > aspectRatio) {
        canvasWidth = canvasHeight * aspectRatio;
      } else {
        canvasHeight = canvasWidth / aspectRatio;
      }

      console.log("Setting canvas dimensions:", canvasWidth, "x", canvasHeight);
      targetCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      
      img.set({
        left: 0,
        top: 0,
        scaleX: canvasWidth / img.width!,
        scaleY: canvasHeight / img.height!,
        selectable: false,
        evented: false,
      });

      console.log("Setting background image and rendering...");
      targetCanvas.backgroundImage = img;
      targetCanvas.renderAll();
      setBackgroundImage(imageDataUrl);
      setOriginalImageWidth(img.width!);
      setOriginalImageHeight(img.height!);
      saveState(targetCanvas);
      toast.success("Image uploaded successfully!");
    }).catch((error) => {
      console.error("Error creating FabricImage:", error);
      toast.error("Failed to load image");
    });
  };

  const addTextLayer = () => {
    if (!fabricCanvas) return;

    const id = `text-${Date.now()}`;
    const textObject = new FabricIText("Double click to edit", {
      left: fabricCanvas.width! / 2,
      top: fabricCanvas.height! / 2,
      fontSize: 32,
      fontFamily: "Arial",
      fill: "#000000",
      originX: "center",
      originY: "center",
      lineHeight: 1.2,
      charSpacing: 0,
    });
    
    (textObject as any).data = { id };

    fabricCanvas.add(textObject);
    fabricCanvas.setActiveObject(textObject);
    
    const newLayer: TextLayer = {
      id,
      text: "Double click to edit",
      fontFamily: "Arial",
      fontSize: 32,
      fontWeight: "normal",
      fill: "#000000",
      opacity: 1,
      textAlign: "left",
      left: textObject.left!,
      top: textObject.top!,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      lineHeight: 1.2,
      charSpacing: 0,
    };

    setTextLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(id);
    saveState(fabricCanvas);
    toast.success("Text layer added!");
  };

  const exportImage = () => {
    if (!fabricCanvas) return;

    // Exportar no tamanho original da imagem de fundo, se disponível
    const width = fabricCanvas.width!;
    const height = fabricCanvas.height!;
    const multiplier = originalImageWidth && width
      ? originalImageWidth / width
      : 1;

    // Limpar dicas visuais do contexto superior para não irem para a exportação
    const anyCanvas = fabricCanvas as any;
    if (anyCanvas.clearContext && anyCanvas.contextTop) {
      anyCanvas.clearContext(anyCanvas.contextTop);
    }

    const dataUrl = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: multiplier > 0 ? multiplier : 1,
    });

    const link = document.createElement("a");
    link.download = `edited-image-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success("Image exported successfully!");
    // Re-render para restaurar as dicas no topo após exportar
    fabricCanvas.requestRenderAll();
  };

  const resetEditor = () => {
    if (fabricCanvas) {
      try {
        fabricCanvas.dispose();
      } catch (e) {
        // noop
      }
    }
    setFabricCanvas(null);

    // Resetar o estado do editor
    setBackgroundImage(null);
    setTextLayers([]);
    setSelectedLayerId(null);
    setHistory([]);
    setHistoryIndex(-1);
    setOriginalImageWidth(null);
    setOriginalImageHeight(null);

    localStorage.removeItem("imageEditor");
    toast.success("Editor reset!");
  };

  const undo = () => {
    if (historyIndex > 0 && fabricCanvas) {
      const newIndex = historyIndex - 1;
      fabricCanvas.loadFromJSON(history[newIndex]).then(() => {
        fabricCanvas.renderAll();
        syncLayersAndSelection(fabricCanvas);
        setHistoryIndex(newIndex);
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      const newIndex = historyIndex + 1;
      fabricCanvas.loadFromJSON(history[newIndex]).then(() => {
        fabricCanvas.renderAll();
        syncLayersAndSelection(fabricCanvas);
        setHistoryIndex(newIndex);
      });
    }
  };

  if (!backgroundImage) {
    return (
      <div className="flex h-screen bg-background">
        <UploadArea onImageUpload={handleImageUpload} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 bg-editor-sidebar border-r border-editor-panel flex flex-col">
        <div className="p-4 border-b border-editor-panel">
          <h1 className="text-xl font-semibold text-editor-sidebar-foreground">
            Image Editor
          </h1>
        </div>
        
        <div className="flex-1 overflow-auto">
          <LayersPanel 
            layers={textLayers}
            selectedLayerId={selectedLayerId}
            onLayerSelect={setSelectedLayerId}
            canvas={fabricCanvas}
            onDeleteLayer={(layerId) => {
              setTextLayers(prev => prev.filter(l => l.id !== layerId));
              saveState(fabricCanvas!);
            }}
        onUpdateLayers={setTextLayers}
        onAfterCanvasChange={() => saveState(fabricCanvas!)}
          />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        <Toolbar 
          onAddText={addTextLayer}
          onExport={exportImage}
          onReset={resetEditor}
          onUndo={undo}
          onRedo={redo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
        
        <div className="flex-1 bg-editor-canvas p-8 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="max-w-full max-h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-80 bg-editor-sidebar border-l border-editor-panel">
        <PropertiesPanel 
          selectedLayerId={selectedLayerId}
          textLayers={textLayers}
          onUpdateLayer={setTextLayers}
          canvas={fabricCanvas}
        />
      </div>
    </div>
  );
};