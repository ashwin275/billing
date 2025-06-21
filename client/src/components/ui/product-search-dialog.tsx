import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Filter } from "lucide-react";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get unique categories
  const categories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return uniqueCategories.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.hsn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const selectedProduct = Array.isArray(products) 
    ? products.find(p => p.productId === selectedProductId)
    : null;

  const handleSelect = (product: Product) => {
    onSelect(product);
    setOpen(false);
    setSearchTerm("");
    setSelectedCategory("all");
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or HSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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