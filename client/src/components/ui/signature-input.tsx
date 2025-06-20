import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Upload, Pen, Trash2, X } from 'lucide-react';

interface SignatureInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SignatureInput({ value, onChange, placeholder }: SignatureInputProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drawing functionality
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    onChange(dataURL);
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pen className="h-4 w-4" />
          Signature
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
            <TabsTrigger value="draw">Draw Signature</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-upload">Upload Signature Image</Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {value && (
              <div className="space-y-2">
                <Label>Preview:</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={value} 
                    alt="Signature preview" 
                    className="max-w-full max-h-24 object-contain"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onChange('')}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Signature
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="draw" className="space-y-4">
            <div className="space-y-2">
              <Label>Draw your signature below:</Label>
              <div className="border rounded-lg p-4 bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="border border-gray-300 rounded cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearCanvas}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button 
                  onClick={saveSignature}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Save Signature
                </Button>
              </div>
            </div>
            
            {value && activeTab === 'draw' && (
              <div className="space-y-2">
                <Label>Saved Signature:</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={value} 
                    alt="Signature preview" 
                    className="max-w-full max-h-24 object-contain"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}