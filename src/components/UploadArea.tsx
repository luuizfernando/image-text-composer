import { useCallback } from "react";
import { Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadAreaProps {
  onImageUpload: (imageDataUrl: string) => void;
}

export const UploadArea = ({ onImageUpload }: UploadAreaProps) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  }, []);

  const handleFiles = (files: File[]) => {
    console.log("handleFiles called with files:", files);
    const file = files[0];
    if (!file) {
      console.log("No file found");
      return;
    }

    console.log("File type:", file.type, "File size:", file.size);

    if (!file.type.startsWith("image/png")) {
      console.log("File type validation failed:", file.type);
      toast.error("Please upload a PNG image only");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.log("File size validation failed:", file.size);
      toast.error("File size must be less than 10MB");
      return;
    }

    console.log("Starting file read...");
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log("FileReader onload triggered");
      if (e.target?.result) {
        console.log("Calling onImageUpload with result");
        onImageUpload(e.target.result as string);
      } else {
        console.log("No result from FileReader");
      }
    };
    reader.onerror = (e) => {
      console.error("FileReader error:", e);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Image className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-4xl font-bold mb-4">Image Editor</h1>
          <p className="text-xl text-muted-foreground">
            Upload a PNG image to start adding custom text overlays
          </p>
        </div>

        <div
          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-card"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Drop your PNG image here</h3>
          <p className="text-muted-foreground mb-6">
            Or click to browse your files
          </p>
          <Button variant="default" size="lg">
            Choose File
          </Button>
          <input
            id="file-input"
            type="file"
            accept=".png,image/png"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="text-center">
            <div className="font-semibold">Format Support</div>
            <div>PNG images only</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">File Size Limit</div>
            <div>Maximum 10MB</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">Auto-save</div>
            <div>Your work is saved automatically</div>
          </div>
        </div>
      </div>
    </div>
  );
};