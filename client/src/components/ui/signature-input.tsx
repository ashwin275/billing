import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, Pen, Save, RotateCcw } from 'lucide-react';

interface SignatureInputProps {
  value?: string;
  onChange: (signature: string) => void;
  placeholder?: string;
}

export function SignatureInput({ value, onChange, placeholder = "Add signature" }: SignatureInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('draw');

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');
    onChange(dataURL);
    setIsDialogOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const saveUploadedSignature = () => {
    if (!uploadedImage) return;
    onChange(uploadedImage);
    setIsDialogOpen(false);
  };

  const removeSignature = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label>Signature</Label>
      <div className="flex items-center space-x-2">
        {value ? (
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
            <img 
              src={value} 
              alt="Signature" 
              className="h-12 max-w-32 object-contain border rounded"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeSignature}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="w-full">
                <Pen className="h-4 w-4 mr-2" />
                {placeholder}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Signature</DialogTitle>
              </DialogHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                  <TabsTrigger value="upload">Upload Image</TabsTrigger>
                </TabsList>
                
                <TabsContent value="draw" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <Label className="text-sm text-gray-600 mb-2 block">
                      Draw your signature below
                    </Label>
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={200}
                      className="border border-gray-300 rounded cursor-crosshair w-full bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    <div className="flex justify-between mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearCanvas}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                      <Button
                        type="button"
                        onClick={saveDrawnSignature}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Signature
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <Label className="text-sm text-gray-600 mb-2 block">
                      Upload signature image
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="mb-3"
                    />
                    {uploadedImage && (
                      <div className="space-y-3">
                        <div className="p-3 border rounded bg-gray-50">
                          <Label className="text-sm font-medium mb-2 block">Preview:</Label>
                          <img 
                            src={uploadedImage} 
                            alt="Uploaded signature" 
                            className="h-20 max-w-full object-contain border rounded bg-white"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={saveUploadedSignature}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Use This Signature
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}