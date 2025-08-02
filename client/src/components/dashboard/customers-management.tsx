// Customers management component with CRUD functionality and pagination
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Trash2, Users, Mail, Phone, MapPin, Store, AlertTriangle, 
  Plus, X, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

import { customersApi, shopsApi, handleApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Customer, Shop, CustomerInput, CustomerUpdate } from "@/types/api";

// Form validation schema for customers
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  place: z.string().min(2, "Place must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  shopId: z.number().min(1, "Please select a shop"),
  customerType: z.string().min(1, "Please select a customer type"),
});

const customerUpdateSchema = z.object({
  customerId: z.number(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  place: z.string().min(2, "Place must be at least 2 characters"),
  phone: z.number().min(1000000000, "Phone number must be at least 10 digits"),
  customerType: z.string().min(1, "Please select a customer type"),
});

type CustomerFormData = z.infer<typeof customerSchema>;
type CustomerUpdateFormData = z.infer<typeof customerUpdateSchema>;

/**
 * CustomersManagement component displays all customers with CRUD operations and pagination
 * Includes add, edit, delete functionality with forms and confirmation dialogs
 */
export default function CustomersManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [sortField, setSortField] = useState<keyof Customer>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for adding customers
  const addForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      shopId: 0,
      customerType: "",
    },
  });

  // Form for editing customers
  const editForm = useForm<CustomerUpdateFormData>({
    resolver: zodResolver(customerUpdateSchema),
    defaultValues: {
      customerId: 0,
      name: "",
      place: "",
      phone: 0,
      customerType: "",
    },
  });

  // Fetch customers
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["/api/customer/all"],
    queryFn: () => customersApi.getAllCustomers(),
  });

  // Fetch shops for dropdown
  const { data: shops } = useQuery({
    queryKey: ["/api/shop/all"],
    queryFn: () => shopsApi.getAllShops(),
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerInput) => {
      const response = await customersApi.addCustomer(customerData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Customer added",
        description: "Customer has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/all"] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add customer. Please try again.";
      
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
        title: "Failed to add customer",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ customerId, customerData }: { customerId: number; customerData: CustomerUpdate }) =>
      customersApi.updateCustomer(customerId, customerData),
    onSuccess: () => {
      toast({
        title: "Customer updated",
        description: "Customer has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/all"] });
      setIsEditDialogOpen(false);
      setCustomerToEdit(null);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update customer. Please try again.";
      
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
        title: "Failed to update customer",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: number) => customersApi.deleteCustomer(customerId),
    onSuccess: () => {
      toast({
        title: "Customer deleted",
        description: "Customer has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/all"] });
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to delete customer. Please try again.";
      
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
        title: "Failed to delete customer",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  /**
   * Handle add customer form submission
   */
  const onAddCustomer = (data: CustomerFormData) => {
    const customerInput: CustomerInput = {
      name: data.name,
      place: data.place,
      phone: data.phone,
      shopId: data.shopId,
      customerType: data.customerType,
    };
    addCustomerMutation.mutate(customerInput);
  };

  /**
   * Handle edit customer form submission
   */
  const onEditCustomer = (data: CustomerUpdateFormData) => {
    if (!customerToEdit) return;

    const customerUpdate: CustomerUpdate = {
      customerId: data.customerId,
      name: data.name,
      place: data.place,
      phone: data.phone,
      customerType: data.customerType,
    };

    updateCustomerMutation.mutate({ 
      customerId: customerToEdit.customerId, 
      customerData: customerUpdate 
    });
  };

  /**
   * Handle delete customer confirmation
   */
  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    deleteCustomerMutation.mutate(customerToDelete.customerId);
  };

  /**
   * Open edit dialog with customer data
   */
  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    editForm.reset({
      customerId: customer.customerId,
      name: customer.name,
      place: customer.place,
      phone: typeof customer.phone === 'string' ? parseInt(customer.phone) : customer.phone,
      customerType: customer.customerType || "",
    });
    setIsEditDialogOpen(true);
  };

  /**
   * Handle sorting
   */
  const handleSort = (field: keyof Customer) => {
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
  const getSortIcon = (field: keyof Customer) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Filter customers based on search term and customer type
  const filteredCustomers = Array.isArray(customers) ? customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.place.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toString().includes(searchTerm);
    
    const matchesType = customerTypeFilter === "all" || 
      customer.customerType === customerTypeFilter;
    
    return matchesSearch && matchesType;
  }) : [];

  const sortedCustomers = filteredCustomers.sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

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
  const totalCustomers = sortedCustomers.length;
  const totalPages = Math.ceil(totalCustomers / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = sortedCustomers.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Customers Management</h1>
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
          <h1 className="text-2xl font-bold text-slate-900">Customers Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>Failed to load customers. Please try again.</p>
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Customers Management</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Manage customers and their information</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Add Customer</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Create a new customer account with shop assignment.
                </DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddCustomer)} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Place</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter place" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="shopId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a shop" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(shops) ? shops.map((shop) => (
                              <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                                {shop.name} - {shop.place}
                              </SelectItem>
                            )) : null}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="customerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CUSTOMER">Customer</SelectItem>
                            <SelectItem value="DEALER">Dealer</SelectItem>
                            <SelectItem value="CREDIT">Credit</SelectItem>
                            <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={addCustomerMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addCustomerMutation.isPending}>
                      {addCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Statistics Badges */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
            {totalCustomers} of {customers?.length || 0} Total
          </Badge>
          <Badge variant="default" className="text-xs sm:text-sm px-2 py-1 bg-blue-600">
            {Array.isArray(customers) ? customers.filter(customer => customer.shop?.status === 'ACTIVE').length : 0} Active Shop Customers
          </Badge>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>All Customers</span>
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, place, or phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full"
                />
              </div>
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="DEALER">Dealer</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                </SelectContent>
              </Select>
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
                      Customer Info
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
                      onClick={() => handleSort("phone")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Phone Number
                      {getSortIcon("phone")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("customerType")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Customer Type
                      {getSortIcon("customerType")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("loyaltyPoints")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Loyalty Points
                      {getSortIcon("loyaltyPoints")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("totalSpend")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Total Spend
                      {getSortIcon("totalSpend")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(currentCustomers) && currentCustomers.length > 0 ? currentCustomers.map((customer) => (
                  <TableRow key={customer.customerId}>
                    {/* Customer Info */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">{customer.name}</div>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center space-x-1 md:hidden">
                            <MapPin className="h-3 w-3" />
                            <span>{customer.place}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location - Hidden on mobile */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center space-x-1 text-slate-600">
                        <MapPin className="h-3 w-3" />
                        <span>{customer.place}</span>
                      </div>
                    </TableCell>

                    {/* Phone Number */}
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-slate-500" />
                        <span className="font-medium text-slate-900">{customer.phone}</span>
                      </div>
                    </TableCell>

                    {/* Customer Type - Hidden on smaller screens */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-slate-700">
                        {customer.customerType || 'N/A'}
                      </div>
                    </TableCell>

                    {/* Loyalty Points - Hidden on smaller screens */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-slate-700 font-medium">
                        {customer.loyaltyPoints ? `${customer.loyaltyPoints} pts` : 'N/A'}
                      </div>
                    </TableCell>

                    {/* Total Spend - Hidden on extra small screens */}
                    <TableCell className="hidden xl:table-cell">
                      <div className="text-slate-700 font-medium">
                        {customer.totalSpend !== null ? `₹${customer.totalSpend.toFixed(2)}` : 'N/A'}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomerToDelete(customer)}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3 text-slate-500">
                        <Users className="h-12 w-12" />
                        <div className="space-y-1">
                          <h3 className="font-medium">No customers found</h3>
                          <p className="text-sm">Add your first customer to get started</p>
                        </div>
                        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Customer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCustomers > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-white dark:bg-slate-950">
              <div className="text-sm text-slate-700 dark:text-slate-300 order-2 sm:order-1">
                Showing {startIndex + 1} to {Math.min(endIndex, totalCustomers)} of {totalCustomers} customers
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

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditCustomer)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter place" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Enter phone number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="DEALER">Dealer</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                        <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateCustomerMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomerMutation.isPending}>
                  {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer
              <strong> {customerToDelete?.name}</strong> and remove all their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}