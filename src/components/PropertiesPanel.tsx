import { useState, useEffect } from "react";
import { Canvas as FabricCanvas, IText as FabricIText } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { TextLayer } from "./ImageEditor";

interface PropertiesPanelProps {
  selectedLayerId: string | null;
  textLayers: TextLayer[];
  onUpdateLayer: React.Dispatch<React.SetStateAction<TextLayer[]>>;
  canvas: FabricCanvas | null;
}

const GOOGLE_FONTS = [
  "Arial", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Source Sans Pro",
  "Raleway", "PT Sans", "Lora", "Playfair Display", "Merriweather", "Dancing Script",
  "Pacifico", "Lobster", "Indie Flower", "Shadows Into Light", "Amatic SC"
];

const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "100", label: "Thin" },
  { value: "300", label: "Light" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "900", label: "Black" },
];

export const PropertiesPanel = ({
  selectedLayerId,
  textLayers,
  onUpdateLayer,
  canvas,
}: PropertiesPanelProps) => {
  const [properties, setProperties] = useState<Partial<TextLayer>>({});

  const selectedLayer = textLayers.find(layer => layer.id === selectedLayerId);

  useEffect(() => {
    if (selectedLayer) {
      setProperties(selectedLayer);
    }
  }, [selectedLayer]);

  const updateProperty = (key: keyof TextLayer, value: any) => {
    if (!selectedLayerId || !canvas) return;

    const activeObject = canvas.getActiveObject() as FabricIText;
    if (!activeObject) return;

    // Update fabric object
    if (key === "text") {
      activeObject.set("text", value);
    } else if (key === "fontFamily") {
      activeObject.set("fontFamily", value);
    } else if (key === "fontSize") {
      activeObject.set("fontSize", value);
    } else if (key === "fontWeight") {
      activeObject.set("fontWeight", value);
    } else if (key === "fill") {
      activeObject.set("fill", value);
    } else if (key === "opacity") {
      // Slider fornece 0..100. Canvas e estado guardam 0..1
      const normalized = value / 100;
      activeObject.set("opacity", normalized);
      // Atualiza estado com valor normalizado (0..1)
      setProperties(prev => ({ ...prev, [key]: normalized }));
      onUpdateLayer(prev => 
        prev.map(layer => 
          layer.id === selectedLayerId 
            ? { ...layer, [key]: normalized }
            : layer
        )
      );
      canvas.renderAll();
      return;
    } else if (key === "textAlign") {
      activeObject.set("textAlign", value);
    }

    canvas.renderAll();

    // Update state
    setProperties(prev => ({ ...prev, [key]: value }));
    onUpdateLayer(prev => 
      prev.map(layer => 
        layer.id === selectedLayerId 
          ? { ...layer, [key]: value }
          : layer
      )
    );
  };

  const loadGoogleFont = (fontFamily: string) => {
    if (fontFamily === "Arial") return; // Skip default fonts

    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@100;300;400;500;600;700;900&display=swap`;
    link.rel = "stylesheet";
    
    if (!document.querySelector(`link[href="${link.href}"]`)) {
      document.head.appendChild(link);
    }
  };

  if (!selectedLayer) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-editor-sidebar-foreground mb-4">
          Properties
        </h3>
        <p className="text-editor-panel-foreground text-sm">
          Select a text layer to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <h3 className="text-lg font-semibold text-editor-sidebar-foreground mb-6">
        Text Properties
      </h3>

      <div className="space-y-6">
        {/* Text Content */}
        <div>
          <Label className="text-editor-panel-foreground">Text Content</Label>
          <Textarea
            value={properties.text || ""}
            onChange={(e) => updateProperty("text", e.target.value)}
            className="mt-2 bg-editor-panel border-border text-editor-panel-foreground"
            rows={3}
          />
        </div>

        {/* Font Family */}
        <div>
          <Label className="text-editor-panel-foreground">Font Family</Label>
          <Select
            value={properties.fontFamily || "Arial"}
            onValueChange={(value) => {
              loadGoogleFont(value);
              updateProperty("fontFamily", value);
            }}
          >
            <SelectTrigger className="mt-2 bg-editor-panel border-border text-editor-panel-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOOGLE_FONTS.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div>
          <Label className="text-editor-panel-foreground">Font Size</Label>
          <div className="mt-2 space-y-2">
            <Slider
              value={[properties.fontSize || 32]}
              onValueChange={([value]) => updateProperty("fontSize", value)}
              max={200}
              min={8}
              step={1}
              className="w-full"
            />
            <Input
              type="number"
              value={properties.fontSize || 32}
              onChange={(e) => updateProperty("fontSize", parseInt(e.target.value))}
              className="bg-editor-panel border-border text-editor-panel-foreground"
              min={8}
              max={200}
            />
          </div>
        </div>

        {/* Font Weight */}
        <div>
          <Label className="text-editor-panel-foreground">Font Weight</Label>
          <Select
            value={properties.fontWeight || "normal"}
            onValueChange={(value) => updateProperty("fontWeight", value)}
          >
            <SelectTrigger className="mt-2 bg-editor-panel border-border text-editor-panel-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Color */}
        <div>
          <Label className="text-editor-panel-foreground">Color</Label>
          <div className="mt-2 flex gap-2">
            <Input
              type="color"
              value={properties.fill || "#000000"}
              onChange={(e) => updateProperty("fill", e.target.value)}
              className="w-12 h-10 p-1 bg-editor-panel border-border"
            />
            <Input
              type="text"
              value={properties.fill || "#000000"}
              onChange={(e) => updateProperty("fill", e.target.value)}
              className="flex-1 bg-editor-panel border-border text-editor-panel-foreground"
            />
          </div>
        </div>

        {/* Opacity */}
        <div>
          <Label className="text-editor-panel-foreground">Opacity</Label>
          <div className="mt-2 space-y-2">
            <Slider
              value={[Math.round(((properties.opacity ?? 1) * 100))]}
              onValueChange={([value]) => updateProperty("opacity", value)}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-editor-panel-foreground">
              {Math.round((properties.opacity ?? 1) * 100)}%
            </div>
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <Label className="text-editor-panel-foreground">Text Alignment</Label>
          <div className="mt-2 flex gap-1">
            <Button
              variant={properties.textAlign === "left" ? "default" : "outline"}
              size="sm"
              onClick={() => updateProperty("textAlign", "left")}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={properties.textAlign === "center" ? "default" : "outline"}
              size="sm"
              onClick={() => updateProperty("textAlign", "center")}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={properties.textAlign === "right" ? "default" : "outline"}
              size="sm"
              onClick={() => updateProperty("textAlign", "right")}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};