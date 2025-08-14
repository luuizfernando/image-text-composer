import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas as FabricCanvas, IText as FabricIText } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { TextLayer } from "./ImageEditor";
import { toast } from "sonner";

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
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const CUSTOM_FONTS_STORAGE_KEY = "imageEditor.customFonts";

  type CustomFontEntry = { name: string; dataUrl: string };

  const FONT_OPTIONS = useMemo(() => {
    const base = new Set<string>(GOOGLE_FONTS);
    for (const f of customFonts) base.add(f);
    if (properties.fontFamily) base.add(properties.fontFamily);
    return Array.from(base);
  }, [customFonts, properties.fontFamily]);

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

  const registerFontFromDataUrl = async (name: string, dataUrl: string) => {
    const source = `url(${dataUrl})`;
    const fontFace = new FontFace(name, source);
    await fontFace.load();
    (document as any).fonts.add(fontFace);
  };

  const handleCustomFontUpload = async (file: File) => {
    try {
      const nameFromFile = file.name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, "").trim() || `CustomFont-${Date.now()}`;
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      await registerFontFromDataUrl(nameFromFile, dataUrl);

      setCustomFonts(prev => prev.includes(nameFromFile) ? prev : [...prev, nameFromFile]);

      // Persistir no localStorage
      const savedRaw = localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY);
      const saved: CustomFontEntry[] = savedRaw ? JSON.parse(savedRaw) : [];
      const withoutSameName = saved.filter(entry => entry.name !== nameFromFile);
      withoutSameName.push({ name: nameFromFile, dataUrl });
      localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(withoutSameName));

      // Se houver uma camada selecionada, já aplica a fonte
      updateProperty("fontFamily", nameFromFile);
      toast.success(`Fonte "${nameFromFile}" carregada`);
    } catch (error) {
      console.error("Erro ao carregar fonte:", error);
      toast.error("Falha ao carregar a fonte");
    }
  };

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY);
      if (!savedRaw) return;
      const saved: CustomFontEntry[] = JSON.parse(savedRaw);
      const names: string[] = [];
      const registerAll = async () => {
        for (const entry of saved) {
          try {
            await registerFontFromDataUrl(entry.name, entry.dataUrl);
            if (!names.includes(entry.name)) names.push(entry.name);
          } catch (e) {
            console.error("Falha ao registrar fonte persistida:", entry.name, e);
          }
        }
        setCustomFonts(prev => Array.from(new Set([...prev, ...names])));
      };
      registerAll();
    } catch (e) {
      console.error("Erro ao restaurar fontes customizadas:", e);
    }
  }, []);

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
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,application/font-woff,application/font-woff2"
              className="hidden"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) {
                  handleCustomFontUpload(file);
                  // Permitir reupload do mesmo arquivo
                  e.currentTarget.value = "";
                }
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              Upload fonte (TTF/OTF/WOFF)
            </Button>
          </div>
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