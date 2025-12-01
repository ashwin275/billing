import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Package, Filter, Plus, Minus, X, Edit2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken, decodeToken } from "@/lib/auth";

type Product = import("@/types/api").Product;

interface SelectedProduct extends Product {
  quantity: number;
  discountAmount?: number;
}

const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  partNumber: z.string().optional(),
  hsn: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(0).optional(),
  ourPrice: z.number().min(0).optional(),
  wholesaleRate: z.number().min(0).optional(),
  retailRate: z.number().min(0).optional(),
  cgst: z.number().min(0).max(100).optional(),
  sgst: z.number().min(0).max(100).optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  expiry: z.string().optional(),
  barcode: z.string().optional(),
});

type ProductEditFormData = z.infer<typeof productEditSchema>;

interface ProductSearchDialogProps {
  products?: Product[];
  onSelect: (products: SelectedProduct[]) => void;
  selectedProductId?: number;
  trigger?: React.ReactNode;
  saleType?: 'RETAIL' | 'WHOLESALE';
  existingItems?: SelectedProduct[];
}

export function ProductSearchDialog({ 
  products: externalProducts, 
  onSelect, 
  selectedProductId,
  trigger,
  saleType = 'RETAIL',
  existingItems = []
}: ProductSearchDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>({});
  const [discountInputs, setDiscountInputs] = useState<Record<number, string>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, itemsPerPage]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setSelectedCategory("all");
    }
  }, [debouncedSearchTerm]);

  const {
    data: productsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/products/dialog/paginated", currentPage, itemsPerPage, debouncedSearchTerm],
    queryFn: () => 
      debouncedSearchTerm.trim() 
        ? productsApi.searchProducts(debouncedSearchTerm, currentPage - 1, itemsPerPage)
        : productsApi.getPaginatedProducts(currentPage - 1, itemsPerPage),
    enabled: open,
  });

  const products = productsResponse?.content || [];
  const totalProducts = productsResponse?.totalElements || 0;
  const totalPages = productsResponse?.totalPages || 0;

  const editForm = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      partNumber: "",
      hsn: "",
      description: "",
      quantity: 0,
      ourPrice: 0,
      wholesaleRate: 0,
      retailRate: 0,
      cgst: 0,
      sgst: 0,
      category: "",
      imageUrl: "",
      expiry: "",
      barcode: "",
    },
  });

  const categories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return uniqueCategories.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    if (selectedCategory === "all") {
      return products;
    }
    
    return products.filter(product => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const totalAmount = useMemo(() => {
    return selectedProducts.reduce((total, product) => {
      const rate = saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
      const subtotal = rate * product.quantity;
      const discountAmount = product.discountAmount || 0;
      return total + (subtotal - discountAmount);
    }, 0);
  }, [selectedProducts, saleType]);

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, product }: { productId: number; product: Product }) =>
      productsApi.updateProduct(productId, product),
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "Product has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
      queryClient.invalidateQueries({ 
        predicate: ({ queryKey }) => Array.isArray(queryKey) && (
          queryKey[0] === "/api/products/paginated" || 
          queryKey[0] === "/api/products/dialog/paginated"
        )
      });
      setIsEditDialogOpen(false);
      setProductToEdit(null);
      editForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update product. Please try again.";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.detail || errorData.title || errorMessage;
      } else if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.title) {
        errorMessage = error.title;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to update product",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    editForm.reset({
      name: product.name || "",
      partNumber: product.productNumber || "",
      hsn: product.hsn ? product.hsn.toString() : "",
      description: product.description || "",
      quantity: product.quantity || 0,
      ourPrice: product.purchasePrice || product.ourPrice || 0,
      wholesaleRate: product.wholesaleRate || 0,
      retailRate: product.retailRate || 0,
      cgst: product.cgst || 0,
      sgst: product.sgst || 0,
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      expiry: product.expiry ? product.expiry.split('T')[0] : "",
      barcode: product.barcode || "",
    });
    setIsEditDialogOpen(true);
  };

  const onEditProduct = async (data: ProductEditFormData) => {
    if (!productToEdit) return;
    
    const token = getAuthToken();
    let shopId = 1;
    
    if (token) {
      try {
        const decoded = decodeToken(token);
        shopId = decoded.shopId || 1;
      } catch (error) {
        console.warn('Failed to decode token for update product:', error);
      }
    }
    
    const productUpdate = {
      productId: productToEdit.productId,
      productNumber: data.partNumber || productToEdit.productNumber,
      hsn: typeof data.hsn === 'string' ? parseInt(data.hsn) : (data.hsn || 0),
      name: data.name,
      description: data.description || "",
      quantity: data.quantity || 0,
      purchasePrice: data.ourPrice || 0,
      wholesaleRate: data.wholesaleRate || 0,
      retailRate: data.retailRate || 0,
      taxRate: (data.cgst || 0) + (data.sgst || 0),
      category: data.category || "",
      imageUrl: data.imageUrl || "",
      expiry: data.expiry || "",
      barcode: data.barcode || "",
      cgst: data.cgst || 0,
      sgst: data.sgst || 0,
      shopId: shopId
    };
    
    updateProductMutation.mutate({
      productId: productToEdit.productId,
      product: productUpdate as unknown as Product,
    });
  };

  const handleAddProduct = (product: Product) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === product.productId);
    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      setSelectedProducts(updated);
      setQuantityInputs(prev => ({ ...prev, [product.productId]: updated[existingIndex].quantity.toString() }));
    } else {
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setSelectedCategory("all");
      setCurrentPage(1);
    } else {
      setSelectedProducts([...existingItems]);
      const initialQuantityInputs: Record<number, string> = {};
      const initialDiscountInputs: Record<number, string> = {};
      existingItems.forEach(item => {
        initialQuantityInputs[item.productId] = item.quantity.toString();
        initialDiscountInputs[item.productId] = (item.discountAmount || 0).toString();
      });
      setQuantityInputs(initialQuantityInputs);
      setDiscountInputs(initialDiscountInputs);
    }
  };

  const handleDone = () => {
    onSelect(selectedProducts);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedCategory("all");
    setCurrentPage(1);
    setOpen(false);
  };

  const isProductSelected = (productId: number) => {
    return selectedProducts.some(p => p.productId === productId);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="w-full justify-start border-dashed" data-testid="button-add-items">
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
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, product number, part number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-product-search"
                />
                {isLoading && (
                  <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" data-testid="select-category">
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
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                <SelectTrigger className="w-24" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-destructive">
                  <p>Failed to load products. Please try again.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Product Number</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Sales Price</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {debouncedSearchTerm ? `No products found for "${debouncedSearchTerm}"` : "No products available"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const selectedProduct = selectedProducts.find(p => p.productId === product.productId);
                        const rate = saleType === 'RETAIL' ? product.retailRate : product.wholesaleRate;
                        
                        return (
                          <TableRow key={product.productId} data-testid={`row-product-${product.productId}`}>
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
                                    data-testid={`input-quantity-${product.productId}`}
                                  />
                                  <span className="text-xs text-gray-500">pcs</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">-</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="flex gap-1">
                                {selectedProduct ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-500"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRemoveProduct(product.productId);
                                    }}
                                    data-testid={`button-remove-${product.productId}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAddProduct(product);
                                    }}
                                    className="text-blue-600"
                                    data-testid={`button-add-${product.productId}`}
                                  >
                                    + Add
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditProduct(product);
                                  }}
                                  title="Edit Product"
                                  data-testid={`button-edit-${product.productId}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            
            {!isLoading && !error && totalPages > 0 && (
              <div className="flex items-center justify-between px-2 py-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} products
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      typeof page === 'number' ? (
                        <Button
                          key={index}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handlePageChange(page)}
                          data-testid={`button-page-${page}`}
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={index} className="px-2 text-muted-foreground">...</span>
                      )
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

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
                    <div key={product.productId} className="p-3 border rounded-lg space-y-2" data-testid={`selected-product-${product.productId}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.hsn} | ₹{rate} x {product.quantity}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveProduct(product.productId);
                          }}
                          data-testid={`button-remove-selected-${product.productId}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleQuantityChange(product.productId, product.quantity - 1);
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="text"
                          className="w-12 h-6 text-center text-xs"
                          value={quantityInputs[product.productId] ?? product.quantity.toString()}
                          onChange={(e) => handleQuantityInputChange(product.productId, e.target.value)}
                          onBlur={(e) => handleQuantityInputBlur(product.productId, e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleQuantityChange(product.productId, product.quantity + 1);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Discount:</Label>
                        <Input
                          type="text"
                          className="w-16 h-6 text-xs"
                          value={discountInputs[product.productId] ?? (product.discountAmount || 0).toString()}
                          onChange={(e) => handleDiscountInputChange(product.productId, e.target.value)}
                          onBlur={(e) => handleDiscountInputBlur(product.productId, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="text-right text-sm font-medium">
                        ₹{finalTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t pt-4 mt-4 space-y-4">
                <div className="flex justify-between font-medium">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button className="w-full" onClick={handleDone} data-testid="button-done">
                  Done - Add {selectedProducts.length} Items
                </Button>
              </div>
            </div>
          )}
        </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditProduct)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  {...editForm.register("name")}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-partNumber">Part Number</Label>
                <Input
                  id="edit-partNumber"
                  {...editForm.register("partNumber")}
                  placeholder="Part number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-hsn">HSN Code</Label>
                <Input
                  id="edit-hsn"
                  {...editForm.register("hsn")}
                  placeholder="HSN code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  {...editForm.register("category")}
                  placeholder="Category"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  {...editForm.register("quantity", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ourPrice">Purchase Price</Label>
                <Input
                  id="edit-ourPrice"
                  type="number"
                  step="0.01"
                  {...editForm.register("ourPrice", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-wholesaleRate">Wholesale Rate</Label>
                <Input
                  id="edit-wholesaleRate"
                  type="number"
                  step="0.01"
                  {...editForm.register("wholesaleRate", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-retailRate">Retail Rate</Label>
                <Input
                  id="edit-retailRate"
                  type="number"
                  step="0.01"
                  {...editForm.register("retailRate", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cgst">CGST (%)</Label>
                <Input
                  id="edit-cgst"
                  type="number"
                  step="0.01"
                  {...editForm.register("cgst", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sgst">SGST (%)</Label>
                <Input
                  id="edit-sgst"
                  type="number"
                  step="0.01"
                  {...editForm.register("sgst", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-barcode">Barcode</Label>
                <Input
                  id="edit-barcode"
                  {...editForm.register("barcode")}
                  placeholder="Barcode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expiry">Expiry Date</Label>
                <Input
                  id="edit-expiry"
                  type="date"
                  {...editForm.register("expiry")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...editForm.register("description")}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Product"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
