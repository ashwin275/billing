// Shops management component with full CRUD functionality
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Store, Plus, Edit2, Trash2, AlertTriangle, MapPin, 
  User, X, Search, ArrowUpDown, ArrowUp, ArrowDown
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
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";

import { shopsApi, handleApiError } from "@/lib/api";
import { getAuthToken, decodeToken } from "@/lib/auth";

// Form validation schema for shops
const shopSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters"),
  place: z.string().min(2, "Place must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  gstNo: z.string().min(1, "GST number is required"),
  status: z.enum(["CREATED", "ACTIVE", "INACTIVE"], { required_error: "Status is required" }),
  map: z.string().min(1, "Map URL is required"),
  userId: z.number().nullable().optional(),
});

type ShopFormData = z.infer<typeof shopSchema>;

interface Shop {
  shopId: number;
  name: string;
  place: string;
  status: string;
  map: string;
  ownerId: number | null;
  subscriptionPlanId: number | null;
  owner: {
    userId: number;
    fullName: string;
    place: string;
    email: string;
    phone: string;
    status: string;
  } | null;
  subscriptionPlan: {
    planId: number | null;
    planName: string;
    price: number | null;
    duration: string | null;
    features: string | null;
  } | null;
  shopSubscription: any | null;
}

/**
 * ShopsManagement component displays all shops with CRUD operations and pagination
 * Includes add, edit, delete functionality with forms and confirmation dialogs
 */
export default function ShopsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Shop>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Get user role for access control
  const getUserRole = () => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = decodeToken(token);
        console.log('Decoded token:', decoded);
        console.log('User role:', decoded.role);
        return decoded.role;
      } catch (error) {
        console.warn('Failed to decode token:', error);
      }
    }
    return null;
  };

  const userRole = getUserRole();
  const isAdmin = userRole === 'ROLE_ADMIN';
  const canEditDelete = isAdmin; // Only admins can edit/delete
  
  console.log('Current user role:', userRole);
  console.log('Is admin:', isAdmin);
  console.log('Can edit/delete:', canEditDelete);

  // Fetch all shops
  const {
    data: shops,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Form for adding shops
  const addForm = useForm<ShopFormData>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      gstNo: "",
      status: "CREATED",
      map: "",
      userId: null,
    },
  });

  // Form for editing shops
  const editForm = useForm<ShopFormData>({
    resolver: zodResolver(shopSchema),
  });

  // Add shop mutation
  const addShopMutation = useMutation({
    mutationFn: (shopData: ShopFormData) => shopsApi.addShop(shopData),
    onSuccess: () => {
      toast({
        title: "Shop added",
        description: "Shop has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/shop/all"] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add shop. Please try again.";
      
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
        title: "Failed to add shop",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update shop mutation
  const updateShopMutation = useMutation({
    mutationFn: ({ shopId, shopData }: { shopId: number; shopData: ShopFormData }) =>
      shopsApi.updateShop(shopId, { ...shopData, shopId }),
    onSuccess: () => {
      toast({
        title: "Shop updated",
        description: "Shop has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/shop/all"] });
      setIsEditDialogOpen(false);
      setShopToEdit(null);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update shop. Please try again.";
      
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
        title: "Failed to update shop",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete shop mutation
  const deleteShopMutation = useMutation({
    mutationFn: (shopId: number) => shopsApi.deleteShop(shopId),
    onSuccess: () => {
      toast({
        title: "Shop deleted",
        description: "Shop has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/shop/all"] });
      setShopToDelete(null);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to delete shop. Please try again.";
      
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
        title: "Failed to delete shop",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  /**
   * Handle add shop form submission
   */
  const onAddShop = (data: ShopFormData) => {
    addShopMutation.mutate(data);
  };

  /**
   * Handle edit shop form submission
   */
  const onEditShop = (data: ShopFormData) => {
    if (!shopToEdit) return;
    updateShopMutation.mutate({ shopId: shopToEdit.shopId, shopData: data });
  };

  /**
   * Handle delete shop confirmation
   */
  const handleDeleteShop = () => {
    if (!shopToDelete) return;
    deleteShopMutation.mutate(shopToDelete.shopId);
  };

  /**
   * Open edit dialog with shop data
   */
  const handleEditShop = (shop: Shop) => {
    setShopToEdit(shop);
    editForm.reset({
      name: shop.name,
      place: shop.place,
      status: shop.status as "CREATED" | "ACTIVE" | "INACTIVE",
      map: shop.map,
      userId: shop.ownerId,
    });
    setIsEditDialogOpen(true);
  };

  /**
   * Handle sorting
   */
  const handleSort = (field: keyof Shop) => {
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
  const getSortIcon = (field: keyof Shop) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Filter and sort shops
  const filteredShops = Array.isArray(shops) ? shops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.place.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.owner?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.subscriptionPlan?.planName.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const sortedShops = filteredShops.sort((a, b) => {
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
  const totalShops = sortedShops.length;
  const totalPages = Math.ceil(totalShops / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentShops = sortedShops.slice(startIndex, endIndex);

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "CREATED":
        return "secondary";
      case "INACTIVE":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shops Management</h1>
            <p className="text-slate-600 mt-1">Manage shops and their information</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading shops...</p>
              </div>
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
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shops Management</h1>
            <p className="text-slate-600 mt-1">Manage shops and their information</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Failed to load shops</p>
                <p className="text-sm text-slate-500">Please try refreshing the page</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Shops Management</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Manage shops and their information</p>
          </div>
          {canEditDelete && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Add Shop</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Store className="h-5 w-5" />
                  <span>Add New Shop</span>
                </DialogTitle>
                <DialogDescription>
                  Create a new shop entry with basic information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addForm.handleSubmit(onAddShop)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">Shop Name</Label>
                  <Input
                    id="add-name"
                    {...addForm.register("name")}
                    placeholder="Enter shop name"
                  />
                  {addForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="add-place">Place</Label>
                  <Input
                    id="add-place"
                    {...addForm.register("place")}
                    placeholder="Enter location"
                  />
                  {addForm.formState.errors.place && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.place.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-status">Status</Label>
                  <select
                    id="add-status"
                    {...addForm.register("status")}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="CREATED">Created</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  {addForm.formState.errors.status && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.status.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-map">Map URL</Label>
                  <Input
                    id="add-map"
                    {...addForm.register("map")}
                    placeholder="Enter map URL"
                  />
                  {addForm.formState.errors.map && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.map.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-phone">Phone</Label>
                  <Input
                    id="add-phone"
                    {...addForm.register("phone")}
                    placeholder="Enter phone number"
                  />
                  {addForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-gstNo">GST Number</Label>
                  <Input
                    id="add-gstNo"
                    {...addForm.register("gstNo")}
                    placeholder="Enter GST number"
                  />
                  {addForm.formState.errors.gstNo && (
                    <p className="text-sm text-destructive">
                      {addForm.formState.errors.gstNo.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={addShopMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addShopMutation.isPending}>
                    {addShopMutation.isPending ? "Adding..." : "Add Shop"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Shops Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center space-x-2">
              <Store className="h-5 w-5" />
              <span>All Shops</span>
            </CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      Shop Info
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("place")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Location
                      {getSortIcon("place")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("status")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Status
                      {getSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Owner</TableHead>
                  <TableHead className="hidden xl:table-cell">Subscription</TableHead>
                  {canEditDelete && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(currentShops) && currentShops.length > 0 ? currentShops.map((shop) => (
                  <TableRow 
                    key={shop.shopId}
                    className={shop.subscriptionPlan?.planName === 'LIFETIME' ? 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-200' : ''}
                  >
                    {/* Shop Info */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{shop.name}</span>
                        <span className="text-sm text-slate-500">ID: {shop.shopId}</span>
                        <div className="md:hidden mt-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span>{shop.place}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location - Hidden on mobile */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{shop.place}</span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={getStatusVariant(shop.status)}>
                        {shop.status}
                      </Badge>
                    </TableCell>

                    {/* Owner - Hidden on tablet and mobile */}
                    <TableCell className="hidden lg:table-cell">
                      {shop.owner ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{shop.owner.fullName}</span>
                          <span className="text-xs text-slate-500">{shop.owner.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No owner</span>
                      )}
                    </TableCell>

                    {/* Subscription - Hidden on mobile/tablet/small desktop */}
                    <TableCell className="hidden xl:table-cell">
                      {shop.subscriptionPlan ? (
                        <Badge 
                          variant={shop.subscriptionPlan.planName === 'LIFETIME' ? 'default' : 'outline'}
                          className={shop.subscriptionPlan.planName === 'LIFETIME' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-semibold shadow-md' : ''}
                        >
                          {shop.subscriptionPlan.planName}
                          {shop.subscriptionPlan.planName === 'LIFETIME' && (
                            <span className="ml-1">👑</span>
                          )}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">No plan</span>
                      )}
                    </TableCell>

                    {/* Actions - Only for Admin */}
                    {canEditDelete && (
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditShop(shop)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShopToDelete(shop)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={canEditDelete ? 5 : 4} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3 text-slate-500">
                        <Store className="h-12 w-12" />
                        <div className="space-y-1">
                          <h3 className="font-medium">No shops found</h3>
                          <p className="text-sm">Add your first shop to get started</p>
                        </div>
                        {canEditDelete && (
                          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Shop
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalShops > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-white dark:bg-slate-950">
              <div className="text-sm text-slate-700 dark:text-slate-300 order-2 sm:order-1">
                Showing {startIndex + 1} to {Math.min(endIndex, totalShops)} of {totalShops} shops
              </div>
              <div className="order-1 sm:order-2">
                <Pagination>
                  <PaginationContent className="gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors`}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[40px] justify-center"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"} transition-colors`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Shop Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit2 className="h-5 w-5" />
              <span>Edit Shop</span>
            </DialogTitle>
            <DialogDescription>
              Update shop information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditShop)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Shop Name</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
                placeholder="Enter shop name"
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-place">Place</Label>
              <Input
                id="edit-place"
                {...editForm.register("place")}
                placeholder="Enter location"
              />
              {editForm.formState.errors.place && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.place.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                {...editForm.register("status")}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value="CREATED">Created</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              {editForm.formState.errors.status && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-map">Map URL</Label>
              <Input
                id="edit-map"
                {...editForm.register("map")}
                placeholder="Enter map URL"
              />
              {editForm.formState.errors.map && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.map.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateShopMutation.isPending}>
                {updateShopMutation.isPending ? (
                  <>
                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Update Shop
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!shopToDelete} onOpenChange={() => setShopToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Delete Shop</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{shopToDelete?.name}</strong>? 
              This action cannot be undone and will permanently remove the shop from your system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShop}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteShopMutation.isPending}
            >
              {deleteShopMutation.isPending ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Shop
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}