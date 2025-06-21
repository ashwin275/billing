import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";

interface Product {
  productId: number;
  name: string;
  hsn: string;
  stock: number;
  retailRate: number;
  wholesaleRate: number;
  category?: string;
}

interface ProductSearchDialogProps {
  products: Product[];
  onSelect: (product: Product) => void;
  selectedProductId?: number;
  trigger?: React.ReactNode;
}

export function ProductSearchDialog({ 
  products, 
  onSelect, 
  selectedProductId,
  trigger 
}: ProductSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = Array.isArray(products) 
    ? products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.hsn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const selectedProduct = Array.isArray(products) 
    ? products.find(p => p.productId === selectedProductId)
    : null;

  const handleSelect = (product: Product) => {
    onSelect(product);
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start border-dashed">
            <Package className="mr-2 h-4 w-4" />
            {selectedProduct ? selectedProduct.name : "Select Product"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, HSN, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-md">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No products found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredProducts.map((product) => (
                  <Button
                    key={product.productId}
                    variant="ghost"
                    className={`w-full justify-start h-auto p-3 ${
                      selectedProductId === product.productId 
                        ? "bg-primary/10 border border-primary/20" 
                        : ""
                    }`}
                    onClick={() => handleSelect(product)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.category && <span className="bg-gray-100 px-1 rounded text-xs mr-2">{product.category}</span>}
                        HSN: {product.hsn} • Stock: {product.stock} • ₹{product.retailRate}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}