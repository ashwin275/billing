// Products management component with full CRUD functionality
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, FieldPath, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package, Plus, Edit2, Trash2, AlertTriangle, DollarSign, 
  Calendar, Tag, BarChart3, ShoppingCart, X, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Store, User, MapPin, Info, Hash, CheckCircle, XCircle, Loader2, FileText
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { productsApi, shopsApi, handleApiError } from "@/lib/api";
import { Product, ProductInput } from "@/types/api";
import { getAuthToken, decodeToken } from "@/lib/auth";
import HsnReportDialog from "@/components/ui/hsn-report-dialog";

// Form validation schema for products
const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  partNumber: z.string().optional(),
  hsn: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(0, "Quantity must be 0 or greater").optional(),
  ourPrice: z.number().min(0, "Purchase price must be 0 or greater").optional(),
  wholesaleRate: z.number().min(0, "Wholesale rate must be 0 or greater").optional(),
  retailRate: z.number().min(0, "Retail rate must be 0 or greater").optional(),
  cgst: z.number().min(0, "CGST must be 0 or greater").max(50, "CGST cannot exceed 50%").optional(),
  sgst: z.number().min(0, "SGST must be 0 or greater").max(50, "SGST cannot exceed 50%").optional(),
  category: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional(),
  expiry: z.string().optional(),
  barcode: z.string().optional(),
  location: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

/**
 * ProductsManagement component displays all products with CRUD operations
 * Includes add, edit, delete functionality with forms and confirmation dialogs
 */
export default function ProductsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isHsnReportDialogOpen, setIsHsnReportDialogOpen] = useState(false);
  const [selectedProductForReport, setSelectedProductForReport] = useState<Product | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Debounce search term for API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, itemsPerPage]);

  // Reset category filter when search is active
  useEffect(() => {
    if (debouncedSearchTerm) {
      setSelectedCategory("all");
    }
  }, [debouncedSearchTerm]);

  // Product number existence checking states
  const [addPartNumberStatus, setAddPartNumberStatus] = useState<{
    checking: boolean;
    exists: boolean | null;
    message: string;
  }>({ checking: false, exists: null, message: "" });
  
  const [editPartNumberStatus, setEditPartNumberStatus] = useState<{
    checking: boolean;
    exists: boolean | null;
    message: string;
  }>({ checking: false, exists: null, message: "" });

  // Fetch products with pagination and search
  const {
    data: productsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/products/paginated", currentPage, itemsPerPage, debouncedSearchTerm],
    queryFn: () => 
      debouncedSearchTerm.trim() 
        ? productsApi.searchProducts(debouncedSearchTerm, currentPage - 1, itemsPerPage)
        : productsApi.getPaginatedProducts(currentPage - 1, itemsPerPage), // Backend uses 0-based indexing
  });

  // Fetch all shops for dropdown
  const {
    data: shops,
  } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Form for adding products
  const addForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
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
      imageUrl: "https://example.com/product.jpg",
      expiry: "2025-12-31",
      barcode: "",
      location: "",
    },
  });

  // Form for editing products
  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // Get shopId from token for product existence checking
  const getShopId = useCallback(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = decodeToken(token);
        return decoded.shopId || 1;
      } catch (error) {
        console.warn('Failed to decode token:', error);
      }
    }
    return 1; // Default fallback
  }, []);

  // Debounced function to check product existence
  const checkProductExists = useCallback(async (
    productNumber: string, 
    isEdit: boolean = false,
    currentProductNumber?: string
  ) => {
    if (!productNumber.trim()) {
      const resetStatus = { checking: false, exists: null, message: "" };
      if (isEdit) {
        setEditPartNumberStatus(resetStatus);
      } else {
        setAddPartNumberStatus(resetStatus);
      }
      return;
    }

    // If editing and the product number hasn't changed, don't check
    if (isEdit && currentProductNumber && productNumber === currentProductNumber) {
      setEditPartNumberStatus({ checking: false, exists: null, message: "" });
      return;
    }

    const shopId = getShopId();
    
    // Set checking state
    const checkingStatus = { checking: true, exists: null, message: "Checking availability..." };
    if (isEdit) {
      setEditPartNumberStatus(checkingStatus);
    } else {
      setAddPartNumberStatus(checkingStatus);
    }

    try {
      const result = await productsApi.checkProductExists(productNumber, shopId);
      const status = {
        checking: false,
        exists: result.exists,
        message: result.exists 
          ? "Product number already exists" 
          : "Product number is available"
      };

      if (isEdit) {
        setEditPartNumberStatus(status);
      } else {
        setAddPartNumberStatus(status);
      }
    } catch (error) {
      const errorStatus = {
        checking: false,
        exists: null,
        message: "Error checking product number"
      };

      if (isEdit) {
        setEditPartNumberStatus(errorStatus);
      } else {
        setAddPartNumberStatus(errorStatus);
      }
    }
  }, [getShopId]);

  // Debounced version of checkProductExists
  const debouncedCheckProductExists = useCallback((
    productNumber: string, 
    isEdit: boolean = false,
    currentProductNumber?: string
  ) => {
    const timeoutId = setTimeout(() => {
      checkProductExists(productNumber, isEdit, currentProductNumber);
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [checkProductExists]);

  // Add products mutation
  const addProductsMutation = useMutation({
    mutationFn: (products: ProductInput[]) => productsApi.addProducts(products),
    onSuccess: () => {
      toast({
        title: "Product added",
        description: "Product has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
      queryClient.invalidateQueries({ 
        predicate: ({ queryKey }) => Array.isArray(queryKey) && queryKey[0] === "/api/products/paginated" 
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add product. Please try again.";
      
      // Handle the specific error format from backend
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
        title: "Failed to add product",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
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
        predicate: ({ queryKey }) => Array.isArray(queryKey) && queryKey[0] === "/api/products/paginated" 
      });
      setIsEditDialogOpen(false);
      setProductToEdit(null);
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

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => productsApi.deleteProduct(productId),
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
      queryClient.invalidateQueries({ 
        predicate: ({ queryKey }) => Array.isArray(queryKey) && queryKey[0] === "/api/products/paginated" 
      });
      setProductToDelete(null);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to delete product. Please try again.";
      
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
        title: "Failed to delete product",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  /**
   * Handle add product form submission
   */
  const onAddProduct = (data: ProductFormData) => {
    // Get shopId from JWT token
    const token = getAuthToken();
    let shopId = 1; // Default fallback
    
    if (token) {
      try {
        const decoded = decodeToken(token);
        shopId = decoded.shopId || 1;
      } catch (error) {
        console.warn('Failed to decode token:', error);
      }
    }

    const productInput: ProductInput = {
      name: data.name,
      productNumber: data.partNumber || `P${Date.now()}`, // Map partNumber to productNumber for API, auto-generate if empty
      hsn: data.hsn || "",
      description: data.description || "",
      quantity: data.quantity || 0,
      ourPrice: data.ourPrice || 0,
      purchasePrice: data.ourPrice || 0, // Map ourPrice to purchasePrice for API
      wholesaleRate: data.wholesaleRate || 0,
      retailRate: data.retailRate || 0,
      taxRate: (data.cgst || 0) + (data.sgst || 0), // Calculate tax rate from CGST + SGST
      cgst: data.cgst || 0,
      sgst: data.sgst || 0,
      category: data.category || "",
      imageUrl: data.imageUrl || "",
      expiry: data.expiry || "",
      barcode: data.barcode || "",
      location: data.location || "",
      shopId: shopId, // Use shopId from token
    };
    
    addProductsMutation.mutate([productInput]);
  };

  /**
   * Handle edit product form submission
   */
  const onEditProduct = (data: ProductFormData) => {
    if (!productToEdit) return;
    
    // Get shopId from JWT token
    const token = getAuthToken();
    let shopId = 1; // Default fallback
    
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
      productNumber: data.partNumber || productToEdit.productNumber, // Map partNumber to productNumber for API
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
      location: data.location || "",
      cgst: data.cgst || 0,
      sgst: data.sgst || 0,
      shopId: shopId // Add shopId from token
    };
    
    updateProductMutation.mutate({
      productId: productToEdit.productId,
      product: productUpdate as unknown as Product,
    });
  };

  /**
   * Handle delete product confirmation
   */
  const handleDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.productId);
    }
  };

  /**
   * Open HSN report dialog
   */
  const handleViewHsnReport = (product: Product) => {
    setSelectedProductForReport(product);
    setIsHsnReportDialogOpen(true);
  };

  /**
   * Open edit dialog with product data
   */
  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    editForm.reset({
      name: product.name || "",
      partNumber: product.productNumber || "", // Map productNumber to partNumber for UI
      hsn: product.hsn ? product.hsn.toString() : "",
      description: product.description || "",
      quantity: product.quantity || 0,
      ourPrice: product.purchasePrice || product.ourPrice || 0, // Map purchasePrice to ourPrice
      wholesaleRate: product.wholesaleRate || 0,
      retailRate: product.retailRate || 0,
      cgst: product.cgst || 0,
      sgst: product.sgst || 0,
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      expiry: product.expiry ? product.expiry.split('T')[0] : "", // Convert to date format with null safety
      barcode: product.barcode || "",
      location: product.location || "",
    });
    setIsEditDialogOpen(true);
  };

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return "N/A";
    }
  };

  // Extract products from paginated response - search is now done on backend
  const products = productsResponse?.content || [];
  const totalProducts = productsResponse?.totalElements || 0;
  const totalPages = productsResponse?.totalPages || 0;
  
  // Extract unique categories from all products
  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  
  // Apply only category filter on frontend (search is handled by backend)
  const currentProducts = selectedCategory === "all" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Products Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Products Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>Failed to load products. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Products Management</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Manage your product inventory and pricing</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              // Reset status when dialog closes
              setAddPartNumberStatus({ checking: false, exists: null, message: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" data-testid="button-add-product">
                <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Enter the product details to add it to your inventory.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addForm.handleSubmit(onAddProduct)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Product Name</Label>
                    <Input
                      id="add-name"
                      {...addForm.register("name")}
                      placeholder="Samsung Galaxy S24"
                    />
                    {addForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-partNumber">Part Number</Label>
                    <div className="relative">
                      <Input
                        id="add-partNumber"
                        {...addForm.register("partNumber")}
                        placeholder="SE-KO-0001"
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value.trim()) {
                            debouncedCheckProductExists(value, false);
                          }
                        }}
                      />
                      {addPartNumberStatus.checking && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!addPartNumberStatus.checking && addPartNumberStatus.exists !== null && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {addPartNumberStatus.exists ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {/* Status message */}
                    {addPartNumberStatus.message && (
                      <p className={`text-sm ${
                        addPartNumberStatus.exists === true 
                          ? 'text-red-600' 
                          : addPartNumberStatus.exists === false 
                            ? 'text-green-600' 
                            : 'text-muted-foreground'
                      }`}>
                        {addPartNumberStatus.message}
                      </p>
                    )}
                    {addForm.formState.errors.partNumber && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.partNumber.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-hsn">HSN Code</Label>
                    <Input
                      id="add-hsn"
                      {...addForm.register("hsn")}
                      placeholder="1234"
                    />
                    {addForm.formState.errors.hsn && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.hsn.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-category">Category</Label>
                    <Input
                      id="add-category"
                      {...addForm.register("category")}
                      placeholder="Electronics"
                    />
                    {addForm.formState.errors.category && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.category.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="add-description">Description</Label>
                  <Textarea
                    id="add-description"
                    {...addForm.register("description")}
                    placeholder="Product description"
                  />
                  {addForm.formState.errors.description && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.description.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-quantity">Quantity</Label>
                    <Input
                      id="add-quantity"
                      type="number"
                      {...addForm.register("quantity", { valueAsNumber: true })}
                      placeholder="50"
                    />
                    {addForm.formState.errors.quantity && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.quantity.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-ourPrice">Purchase Price</Label>
                    <Input
                      id="add-ourPrice"
                      type="number"
                      step="0.01"
                      {...addForm.register("ourPrice", { valueAsNumber: true })}
                      placeholder="80.00"
                    />
                    {addForm.formState.errors.ourPrice && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.ourPrice.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-wholesaleRate">Wholesale Rate</Label>
                    <Input
                      id="add-wholesaleRate"
                      type="number"
                      step="0.01"
                      {...addForm.register("wholesaleRate", { valueAsNumber: true })}
                      placeholder="90.00"
                    />
                    {addForm.formState.errors.wholesaleRate && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.wholesaleRate.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-retailRate">Sales Price</Label>
                    <Input
                      id="add-retailRate"
                      type="number"
                      step="0.01"
                      {...addForm.register("retailRate", { valueAsNumber: true })}
                      placeholder="120.00"
                    />
                    {addForm.formState.errors.retailRate && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.retailRate.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-cgst">CGST (%)</Label>
                    <Input
                      id="add-cgst"
                      type="number"
                      step="0.01"
                      {...addForm.register("cgst", { valueAsNumber: true })}
                      placeholder="9.00"
                    />
                    {addForm.formState.errors.cgst && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.cgst.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-sgst">SGST (%)</Label>
                    <Input
                      id="add-sgst"
                      type="number"
                      step="0.01"
                      {...addForm.register("sgst", { valueAsNumber: true })}
                      placeholder="9.00"
                    />
                    {addForm.formState.errors.sgst && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.sgst.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-imageUrl">Image URL</Label>
                    <Input
                      id="add-imageUrl"
                      {...addForm.register("imageUrl")}
                      placeholder="https://example.com/product.jpg"
                    />
                    {addForm.formState.errors.imageUrl && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.imageUrl.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-expiry">Expiry Date</Label>
                    <Input
                      id="add-expiry"
                      type="date"
                      {...addForm.register("expiry")}
                    />
                    {addForm.formState.errors.expiry && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.expiry.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-barcode">Barcode</Label>
                    <Input
                      id="add-barcode"
                      {...addForm.register("barcode")}
                      placeholder="1234567890123"
                    />
                    {addForm.formState.errors.barcode && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.barcode.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-location">Location</Label>
                    <Input
                      id="add-location"
                      data-testid="input-add-location"
                      {...addForm.register("location")}
                      placeholder="Warehouse A - Shelf 3"
                    />
                    {addForm.formState.errors.location && (
                      <p className="text-sm text-destructive">
                        {addForm.formState.errors.location.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addProductsMutation.isPending}>
                    {addProductsMutation.isPending ? (
                      <>
                        <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Statistics Badge */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
            {totalProducts} of {products?.length || 0} Total Products
          </Badge>
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>All Products</span>
            </CardTitle>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-products"
                  placeholder="Search products by name, part number, HSN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Filter - disabled during search since search is handled by backend */}
              <div className="w-full sm:w-[200px]">
                <Select 
                  value={selectedCategory} 
                  onValueChange={setSelectedCategory}
                  disabled={!!debouncedSearchTerm}
                >
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder={debouncedSearchTerm ? "Search active..." : "All Categories"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Product Count */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Package className="h-4 w-4" />
              <span>
                {debouncedSearchTerm ? (
                  <>
                    Found {totalProducts} result{totalProducts !== 1 ? 's' : ''} for "{debouncedSearchTerm}"
                    {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                  </>
                ) : (
                  <>
                    {totalProducts} product{totalProducts !== 1 ? 's' : ''}
                    {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                  </>
                )}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">
                    Product Info
                  </TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold">
                    Part Number
                  </TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">
                    Pricing
                  </TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">
                    Stock
                  </TableHead>
                  <TableHead className="font-semibold">
                    Category
                  </TableHead>
                  <TableHead className="hidden xl:table-cell font-semibold">
                    Expiry
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(currentProducts) && currentProducts.length > 0 ? currentProducts.map((product) => (
                  <TableRow key={product.productId}>
                    {/* Product Info */}
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-900">{product.name}</span>
                          {product.shop && (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                                  <Store className="h-3 w-3 text-blue-600" />
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2">
                                    <Store className="h-4 w-4 text-blue-600" />
                                    <h4 className="font-semibold text-slate-900">Shop Details</h4>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline" className="text-xs">
                                        {product.shop.name}
                                      </Badge>
                                      <Badge variant={product.shop.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                        {product.shop.status}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                      <MapPin className="h-3 w-3" />
                                      <span>{product.shop.place}</span>
                                    </div>
                                    
                                    {product.shop.owner && (
                                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <User className="h-3 w-3" />
                                        <span>{product.shop.owner.fullName}</span>
                                        <span className="text-xs text-slate-400">({product.shop.owner.place})</span>
                                      </div>
                                    )}
                                    
                                    {product.shop.owner?.email && (
                                      <div className="text-xs text-slate-500">
                                        {product.shop.owner.email}
                                      </div>
                                    )}
                                    
                                    {product.shop.owner?.phone && (
                                      <div className="text-xs text-slate-500">
                                        {product.shop.owner.phone}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">HSN: {product.hsn}</span>
                        <div className="md:hidden mt-2">
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatCurrency(product.retailRate)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <BarChart3 className={`h-3 w-3 ${product.quantity <= 5 ? 'text-red-500' : ''}`} />
                              <span className={product.quantity <= 5 ? 'text-red-600' : ''}>{product.quantity}</span>
                              {product.quantity <= 5 && (
                                <Badge variant="destructive" className="text-xs ml-1">
                                  Low
                                </Badge>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Part Number - Hidden on small screens */}
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center space-x-2">
                        <Hash className="h-3 w-3 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{product.productNumber}</span>
                      </div>
                    </TableCell>

                    {/* Pricing - Hidden on mobile */}
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{formatCurrency(product.retailRate)}</span>
                          <Badge variant="outline" className="text-xs">Retail</Badge>
                        </div>
                        <div className="text-xs text-slate-500">
                          Wholesale: {formatCurrency(product.wholesaleRate || 0)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Purchase Price: {formatCurrency(product.purchasePrice || 0)}
                        </div>
                      </div>
                    </TableCell>

                    {/* Stock - Hidden on tablet and mobile */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className={`h-4 w-4 ${product.quantity <= 5 ? 'text-red-500' : 'text-slate-400'}`} />
                        <span className={`font-medium ${product.quantity <= 5 ? 'text-red-600' : ''}`}>
                          {product.quantity}
                        </span>
                        <span className="text-sm text-slate-500">units</span>
                        {product.quantity <= 5 && (
                          <Badge variant="destructive" className="text-xs ml-2">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="secondary">
                        {product.category}
                      </Badge>
                    </TableCell>

                    {/* Expiry - Hidden on mobile/tablet/small desktop */}
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-sm">{formatDate(product.expiry)}</span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHsnReport(product)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`button-hsn-report-${product.productId}`}
                          title="View HSN Report"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`button-edit-${product.productId}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductToDelete(product)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${product.productId}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3 text-slate-500">
                        <Package className="h-12 w-12" />
                        <div className="space-y-1">
                          <h3 className="font-medium">No products found</h3>
                          <p className="text-sm">Add your first product to get started</p>
                        </div>
                        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination */}
          {totalProducts > 0 && (
            <div className="flex flex-col gap-4 px-4 py-4 border-t bg-white dark:bg-slate-950">
              {/* Results Info and Items Per Page */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {(productsResponse?.numberOfElements || 0) > 0 ? (
                    <>Showing {(productsResponse?.pageable?.offset || 0) + 1} to {(productsResponse?.pageable?.offset || 0) + (productsResponse?.numberOfElements || 0)} of {totalProducts} products</>
                  ) : (
                    <>No products to display</>
                  )}
                </div>
                
                {/* Items Per Page */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    const newItemsPerPage = parseInt(value);
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1); // Reset to first page when changing items per page
                  }}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-slate-600 dark:text-slate-400">per page</span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Direct Page Jump */}
                <div className="flex items-center gap-2 text-sm order-2 sm:order-1">
                  <span className="text-slate-600 dark:text-slate-400">Go to page:</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-slate-600 dark:text-slate-400">of {totalPages}</span>
                </div>

                {/* Pagination Buttons */}
                <div className="order-1 sm:order-2">
                  <Pagination>
                    <PaginationContent className="gap-1">
                      {/* First Page */}
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2"
                        >
                          First
                        </Button>
                      </PaginationItem>

                      {/* Previous */}
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors`}
                        />
                      </PaginationItem>

                      {/* Smart Page Numbers */}
                      {(() => {
                        const pages = [];
                        
                        if (totalPages <= 7) {
                          // Show all pages if total is 7 or less
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // Smart pagination for many pages
                          pages.push(1);
                          
                          if (currentPage > 4) {
                            pages.push('...');
                          }
                          
                          // Show pages around current page
                          for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                            if (!pages.includes(i)) {
                              pages.push(i);
                            }
                          }
                          
                          if (currentPage < totalPages - 3) {
                            pages.push('...');
                          }
                          
                          if (totalPages > 1) {
                            pages.push(totalPages);
                          }
                        }
                        
                        return pages.map((page, index) => (
                          <PaginationItem key={index}>
                            {page === '...' ? (
                              <span className="px-3 py-2 text-slate-500 dark:text-slate-400">...</span>
                            ) : (
                              <PaginationLink
                                onClick={() => setCurrentPage(page as number)}
                                isActive={currentPage === page}
                                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[40px] justify-center"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ));
                      })()}

                      {/* Next */}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors`}
                        />
                      </PaginationItem>

                      {/* Last Page */}
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-2"
                        >
                          Last
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </div>
          )}

          {products && products.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No products found</p>
              <p className="text-sm text-slate-400 mt-1">Add your first product to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          // Reset status when dialog closes
          setEditPartNumberStatus({ checking: false, exists: null, message: "" });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditProduct)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  {...editForm.register("name")}
                  placeholder="Samsung Galaxy S24"
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-partNumber">Part Number</Label>
                <div className="relative">
                  <Input
                    id="edit-partNumber"
                    {...editForm.register("partNumber")}
                    placeholder="SE-KO-0001"
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value.trim()) {
                        // Get the current product number for comparison
                        const currentProductNumber = productToEdit?.productNumber;
                        debouncedCheckProductExists(value, true, currentProductNumber);
                      }
                    }}
                  />
                  {editPartNumberStatus.checking && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!editPartNumberStatus.checking && editPartNumberStatus.exists !== null && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {editPartNumberStatus.exists ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {/* Status message */}
                {editPartNumberStatus.message && (
                  <p className={`text-sm ${
                    editPartNumberStatus.exists === true 
                      ? 'text-red-600' 
                      : editPartNumberStatus.exists === false 
                        ? 'text-green-600' 
                        : 'text-muted-foreground'
                  }`}>
                    {editPartNumberStatus.message}
                  </p>
                )}
                {editForm.formState.errors.partNumber && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.partNumber.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-hsn">HSN Code</Label>
                <Input
                  id="edit-hsn"
                  {...editForm.register("hsn")}
                  placeholder="1234"
                />
                {editForm.formState.errors.hsn && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.hsn.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  {...editForm.register("category")}
                  placeholder="Electronics"
                />
                {editForm.formState.errors.category && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.category.message}
                  </p>
                )}
              </div>
            </div>
                
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...editForm.register("description")}
                placeholder="Product description"
              />
              {editForm.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.description.message}
                </p>
              )}
            </div>
                
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  {...editForm.register("quantity", { valueAsNumber: true })}
                  placeholder="50"
                />
                {editForm.formState.errors.quantity && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.quantity.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-ourPrice">Purchase Price</Label>
                <Input
                  id="edit-ourPrice"
                  type="number"
                  step="0.01"
                  {...editForm.register("ourPrice", { valueAsNumber: true })}
                  placeholder="80.00"
                />
                {editForm.formState.errors.ourPrice && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.ourPrice.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-wholesaleRate">Wholesale Rate</Label>
                <Input
                  id="edit-wholesaleRate"
                  type="number"
                  step="0.01"
                  {...editForm.register("wholesaleRate", { valueAsNumber: true })}
                  placeholder="90.00"
                />
                {editForm.formState.errors.wholesaleRate && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.wholesaleRate.message}
                  </p>
                )}
              </div>
            </div>
                
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-retailRate">Sales Price</Label>
                <Input
                  id="edit-retailRate"
                  type="number"
                  step="0.01"
                  {...editForm.register("retailRate", { valueAsNumber: true })}
                  placeholder="120.00"
                />
                {editForm.formState.errors.retailRate && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.retailRate.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-cgst">CGST (%)</Label>
                <Input
                  id="edit-cgst"
                  type="number"
                  step="0.01"
                  {...editForm.register("cgst", { valueAsNumber: true })}
                  placeholder="9.00"
                />
                {editForm.formState.errors.cgst && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.cgst.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-sgst">SGST (%)</Label>
                <Input
                  id="edit-sgst"
                  type="number"
                  step="0.01"
                  {...editForm.register("sgst", { valueAsNumber: true })}
                  placeholder="9.00"
                />
                {editForm.formState.errors.sgst && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.sgst.message}
                  </p>
                )}
              </div>
            </div>
                
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  {...editForm.register("imageUrl")}
                  placeholder="https://example.com/product-image.jpg"
                />
                {editForm.formState.errors.imageUrl && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.imageUrl.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-expiry">Expiry Date</Label>
                <Input
                  id="edit-expiry"
                  type="date"
                  {...editForm.register("expiry")}
                />
                {editForm.formState.errors.expiry && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.expiry.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  data-testid="input-edit-location"
                  {...editForm.register("location")}
                  placeholder="Warehouse A - Shelf 3"
                />
                {editForm.formState.errors.location && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.location.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? (
                  <>
                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Update Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Delete Product</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{productToDelete?.name}</strong>? 
              This action cannot be undone and will permanently remove the product from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Product
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HSN Report Dialog */}
      {selectedProductForReport && (
        <HsnReportDialog
          open={isHsnReportDialogOpen}
          onOpenChange={setIsHsnReportDialogOpen}
          hsn={selectedProductForReport.hsn?.toString() || ""}
          productName={selectedProductForReport.name || ""}
        />
      )}
    </div>
  );
}