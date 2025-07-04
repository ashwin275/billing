import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Filter, Plus, Minus, X } from "lucide-react";

type Product = import("@/types/api").Product;

interface SelectedProduct extends Product {
  quantity: number;
  discountAmount?: number;
}

interface ProductSearchDialogProps {
  products: Product[];
  onSelect: (products: SelectedProduct[]) => void;
  selectedProductId?: number;
  trigger?: React.ReactNode;
  saleType?: 'RETAIL' | 'WHOLESALE';
  existingItems?: SelectedProduct[];
}

export function ProductSearchDialog({ 
  products, 
  onSelect, 
  selectedProductId,
  trigger,
  saleType = 'RETAIL',
  existingItems = []
}: ProductSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>({});
  const [discountInputs, setDiscountInputs] = useState<Record<number, string>>({});

  // Get unique categories
  const categories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return uniqueCategories.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    return products.filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.productNumber && String(product.productNumber).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.partNumber && String(product.partNumber).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && String(product.barcode).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.hsn && String(product.hsn).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const totalAmount = useMemo(() => {
    return selectedProducts.reduce((total, product) => {
      const rate = saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
      const subtotal = rate * product.quantity;
      const discountAmount = product.discountAmount || 0;
      return total + (subtotal - discountAmount);
    }, 0);
  }, [selectedProducts, saleType]);

  const handleAddProduct = (product: Product) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === product.productId);
    if (existingIndex >= 0) {
      // Update quantity if already selected
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      setSelectedProducts(updated);
      setQuantityInputs(prev => ({ ...prev, [product.productId]: updated[existingIndex].quantity.toString() }));
    } else {
      // Add new product
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1, discountAmount: 0 }]);
      setQuantityInputs(prev => ({ ...prev, [product.productId]: '1' }));
      setDiscountInputs(prev => ({ ...prev, [product.productId]: '0' }));
    }
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
      setQuantityInputs(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      setDiscountInputs(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    } else {
      setSelectedProducts(selectedProducts.map(p => 
        p.productId === productId ? { ...p, quantity } : p
      ));
      setQuantityInputs(prev => ({ ...prev, [productId]: quantity.toString() }));
    }
  };

  const handleQuantityInputChange = (productId: number, value: string) => {
    setQuantityInputs(prev => ({ ...prev, [productId]: value }));
    
    if (value === '' || /^\d*$/.test(value)) {
      if (value !== '' && parseInt(value) > 0) {
        const qty = parseInt(value);
        setSelectedProducts(selectedProducts.map(p => 
          p.productId === productId ? { ...p, quantity: qty } : p
        ));
      }
    }
  };

  const handleQuantityInputBlur = (productId: number, value: string) => {
    if (value === '' || parseInt(value) < 1) {
      setQuantityInputs(prev => ({ ...prev, [productId]: '1' }));
      setSelectedProducts(selectedProducts.map(p => 
        p.productId === productId ? { ...p, quantity: 1 } : p
      ));
    }
  };

  const handleDiscountInputChange = (productId: number, value: string) => {
    setDiscountInputs(prev => ({ ...prev, [productId]: value }));
    
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const discountAmount = value === '' ? 0 : parseFloat(value) || 0;
      setSelectedProducts(selectedProducts.map(p => 
        p.productId === productId ? { ...p, discountAmount } : p
      ));
    }
  };

  const handleDiscountInputBlur = (productId: number, value: string) => {
    if (value === '') {
      setDiscountInputs(prev => ({ ...prev, [productId]: '0' }));
      setSelectedProducts(selectedProducts.map(p => 
        p.productId === productId ? { ...p, discountAmount: 0 } : p
      ));
    }
  };



  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  // Reset dialog state when closed, but persist selected products when opened
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm("");
      setSelectedCategory("all");
    } else {
      // Load existing items when dialog opens
      setSelectedProducts([...existingItems]);
    }
  };

  const handleDone = () => {
    onSelect(selectedProducts);
    setOpen(false);
  };

  const isProductSelected = (productId: number) => {
    return selectedProducts.some(p => p.productId === productId);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start border-dashed">
            <Package className="mr-2 h-4 w-4" />
            Add Items
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] h-[90vh] max-w-[1600px] flex flex-col" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle>Add Items</DialogTitle>
          <DialogDescription id="dialog-description">
            Search and select products to add to your invoice
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 flex-1 overflow-hidden mt-6">
          {/* Product Selection Side */}
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, product number, part number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Product Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Sales Price</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const selectedProduct = selectedProducts.find(p => p.productId === product.productId);
                    const rate = saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
                    
                    return (
                      <TableRow key={product.productId}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.productNumber}
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>₹{(product.purchasePrice || product.ourPrice || 0).toFixed(2)}</TableCell>
                        <TableCell>₹{(product.retailRate || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            (product.quantity || 0) <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {product.quantity || 0} PCS
                          </span>
                          {(product.quantity || 0) <= 5 && (
                            <div className="text-xs text-red-500 mt-1">Low Stock</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {selectedProduct ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={quantityInputs[product.productId] ?? selectedProduct.quantity.toString()}
                                onChange={(e) => {
                                  handleQuantityInputChange(product.productId, e.target.value);
                                }}
                                onBlur={(e) => {
                                  handleQuantityInputBlur(product.productId, e.target.value);
                                }}
                                className="w-16 h-8 text-center"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500">pcs</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {selectedProduct ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500"
                              onClick={() => handleRemoveProduct(product.productId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddProduct(product)}
                              className="text-blue-600"
                            >
                              + Add
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Selected Items Side */}
          {selectedProducts.length > 0 && (
            <div className="w-80 border-l pl-4 flex flex-col">
              <div className="font-medium mb-4">
                Show {selectedProducts.length} Items Selected
              </div>
              
              <div className="flex-1 overflow-auto space-y-3">
                {selectedProducts.map((product) => {
                  const rate = saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
                  const subtotal = rate * product.quantity;
                  const discountAmount = product.discountAmount || 0;
                  const finalTotal = subtotal - discountAmount;
                  
                  return (
                    <div key={product.productId} className="p-3 border rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.hsn} • ₹{rate} × {product.quantity}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveProduct(product.productId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={() => handleQuantityChange(product.productId, product.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="text"
                          className="w-12 h-6 text-center text-xs"
                          value={quantityInputs[product.productId] ?? product.quantity.toString()}
                          placeholder="1"
                          onChange={(e) => {
                            handleQuantityInputChange(product.productId, e.target.value);
                          }}
                          onBlur={(e) => {
                            handleQuantityInputBlur(product.productId, e.target.value);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={() => handleQuantityChange(product.productId, product.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">QTY</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Subtotal:</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Discount:</span>
                          <Input
                            type="text"
                            placeholder="0"
                            className="h-6 text-xs flex-1"
                            value={discountInputs[product.productId] ?? (product.discountAmount || 0).toString()}
                            onChange={(e) => handleDiscountInputChange(product.productId, e.target.value)}
                            onBlur={(e) => handleDiscountInputBlur(product.productId, e.target.value)}
                          />
                          <span className="text-xs">₹</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total:</span>
                          <span>₹{finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDone}
            disabled={selectedProducts.length === 0}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}