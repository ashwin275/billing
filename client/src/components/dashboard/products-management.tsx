// Products management component with full CRUD functionality
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, FieldPath, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package, Plus, Edit2, Trash2, AlertTriangle, DollarSign, 
  Calendar, Tag, BarChart3, ShoppingCart, X, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Store, User, MapPin, Info
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

// Form validation schema for products
const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  hsn: z.string().min(1, "HSN code is required"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  ourPrice: z.number().min(0, "Our price must be 0 or greater"),
  wholesaleRate: z.number().min(0, "Wholesale rate must be 0 or greater"),
  retailRate: z.number().min(0, "Retail rate must be 0 or greater"),
  cgst: z.number().min(0, "CGST must be 0 or greater").max(50, "CGST cannot exceed 50%"),
  sgst: z.number().min(0, "SGST must be 0 or greater").max(50, "SGST cannot exceed 50%"),
  category: z.string().min(2, "Category must be at least 2 characters"),
  imageUrl: z.string().url("Must be a valid URL"),
  expiry: z.string().min(1, "Expiry date is required"),
  barcode: z.string().min(1, "Barcode is required"),
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
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fetch all products
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: () => productsApi.getAllProducts(),
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
      hsn: "",
      description: "",
      quantity: 0,
      ourPrice: 0,
      wholesaleRate: 0,
      retailRate: 0,
      cgst: 9,
      sgst: 9,
      category: "",
      imageUrl: "https://example.com/product.jpg",
      expiry: "2025-12-31",
      barcode: "",
    },
  });

  // Form for editing products
  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // Add products mutation
  const addProductsMutation = useMutation({
    mutationFn: (products: ProductInput[]) => productsApi.addProducts(products),
    onSuccess: () => {
      toast({
        title: "Product added",
        description: "Product has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
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
      ...data,
      productNumber: `P${Date.now()}`, // Auto-generate product number
      hsn: data.hsn.toString(),
      taxRate: data.cgst + data.sgst, // Calculate tax rate from CGST + SGST
      shopId: shopId, // Use shopId from token
    };
    
    addProductsMutation.mutate([productInput]);
  };

  /**
   * Handle edit product form submission
   */
  const onEditProduct = (data: ProductFormData) => {
    if (!productToEdit) return;
    
    const productUpdate = {
      ...productToEdit,
      ...data,
      hsn: typeof data.hsn === 'string' ? parseInt(data.hsn) : data.hsn,
    };
    
    updateProductMutation.mutate({
      productId: productToEdit.productId,
      product: productUpdate,
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
   * Open edit dialog with product data
   */
  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    editForm.reset({
      name: product.name,
      hsn: product.hsn.toString(),
      description: product.description,
      quantity: product.quantity,
      ourPrice: product.ourPrice,
      wholesaleRate: product.wholesaleRate,
      retailRate: product.retailRate,
      cgst: product.cgst,
      sgst: product.sgst,
      category: product.category,
      imageUrl: product.imageUrl,
      expiry: product.expiry.split('T')[0], // Convert to date format
      barcode: product.barcode,
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  /**
   * Handle sorting
   */
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  /**
   * Get sort icon for column headers
   */
  const getSortIcon = (field: keyof Product) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Get unique categories for filter dropdown
  const categories = Array.isArray(products) ? 
    [...new Set(products.map(product => product.category))].sort() : [];

  // Filter and sort products
  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.hsn.toString().includes(searchTerm) ||
      product.barcode.includes(searchTerm);
    
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) : [];

  const sortedProducts = filteredProducts.sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === "asc" ? 1 : -1;
    if (bValue == null) return sortDirection === "asc" ? -1 : 1;

    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Pagination calculations
  const totalProducts = sortedProducts.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
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
                    <Label htmlFor="add-retailRate">Retail Rate</Label>
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
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="pl-10 w-full"
                />
              </div>
              
              {/* Category Filter */}
              <div className="w-full sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
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
              
              {/* Product Count */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Package className="h-4 w-4" />
                <span>{totalProducts} product{totalProducts !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("name")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Product Info
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("retailRate")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Pricing
                      {getSortIcon("retailRate")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("quantity")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Stock
                      {getSortIcon("quantity")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("category")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Category
                      {getSortIcon("category")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("expiry")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Expiry
                      {getSortIcon("expiry")}
                    </Button>
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
                        <span className="text-sm text-slate-500">{product.productNumber}</span>
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

                    {/* Pricing - Hidden on mobile */}
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{formatCurrency(product.retailRate)}</span>
                          <Badge variant="outline" className="text-xs">Retail</Badge>
                        </div>
                        <div className="text-xs text-slate-500">
                          Wholesale: {formatCurrency(product.wholesaleRate)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Purchase Price: {formatCurrency(product.ourPrice)}
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
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductToDelete(product)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
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

          {/* Pagination */}
          {totalProducts > 0 && (
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <div className="text-sm text-slate-700">
                Showing {startIndex + 1} to {Math.min(endIndex, totalProducts)} of {totalProducts} products
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditProduct)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  {...editForm.register("name")}
                  placeholder="Enter product name"
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-productNumber">Product Number</Label>
                <Input
                  id="edit-productNumber"
                  {...editForm.register("productNumber")}
                  placeholder="P1001"
                />
                {editForm.formState.errors.productNumber && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.productNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="edit-ourPrice">Our Price</Label>
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
                
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-retailRate">Retail Rate</Label>
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
                <Label htmlFor="edit-taxRate">Tax Rate (%)</Label>
                <Input
                  id="edit-taxRate"
                  type="number"
                  step="0.01"
                  {...editForm.register("taxRate", { valueAsNumber: true })}
                  placeholder="18.0"
                />
                {editForm.formState.errors.taxRate && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.taxRate.message}
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
                  placeholder="9.0"
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
                  placeholder="9.0"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-barcode">Barcode</Label>
                <Input
                  id="edit-barcode"
                  {...editForm.register("barcode")}
                  placeholder="8901234567890"
                />
                {editForm.formState.errors.barcode && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.barcode.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-shopId">Shop</Label>
                <Controller
                  control={editForm.control}
                  name="shopId"
                  render={({ field }: { field: ControllerRenderProps<ProductFormData, "shopId"> }) => (
                    <Select
                      onValueChange={(value: string) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(shops) ? shops.map((shop: any) => (
                          <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                            {shop.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  )}
                />
                {editForm.formState.errors.shopId && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.shopId.message}
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
    </div>
  );
}