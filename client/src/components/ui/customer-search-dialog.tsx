import React, { useState, useMemo } from 'react';
import { Search, User, MapPin, Phone, Check, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/types/api';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken, decodeToken } from "@/lib/auth";

// Customer edit form schema
const customerEditSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  place: z.string().min(1, "Place is required"),
  phone: z.string().min(1, "Phone number is required"),
  customerType: z.enum(["CASH", "CREDIT"], {
    required_error: "Customer type is required",
  }),
});

type CustomerEditFormData = z.infer<typeof customerEditSchema>;

interface CustomerSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomerSearchDialog: React.FC<CustomerSearchDialogProps> = ({
  open,
  onOpenChange,
  customers,
  selectedCustomer,
  onSelectCustomer,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // Edit customer form
  const editForm = useForm<CustomerEditFormData>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      name: "",
      place: "",
      phone: "",
      customerType: "CASH",
    },
  });

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.toString().includes(query) ||
      customer.place?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Reset pagination when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ customerId, customer }: { customerId: number; customer: any }) =>
      customersApi.updateCustomer(customerId, customer),
    onSuccess: () => {
      toast({
        title: "Customer updated",
        description: "Customer has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/all"] });
      setIsEditDialogOpen(false);
      setCustomerToEdit(null);
      editForm.reset();
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

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    editForm.reset({
      name: customer.name || "",
      place: customer.place || "",
      phone: customer.phone?.toString() || "",
      customerType: customer.customerType === "CREDIT" ? "CREDIT" : "CASH",
    });
    setIsEditDialogOpen(true);
  };

  // Handle edit customer form submission
  const onEditCustomer = async (data: CustomerEditFormData) => {
    if (!customerToEdit) return;
    
    const customerUpdate = {
      customerId: customerToEdit.customerId,
      name: data.name,
      place: data.place,
      phone: parseInt(data.phone),
      customerType: data.customerType,
    };
    
    updateCustomerMutation.mutate({
      customerId: customerToEdit.customerId,
      customer: customerUpdate,
    });
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    onOpenChange(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Customer
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {paginatedCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No customers found matching your search.' : 'No customers available.'}
            </div>
          ) : (
            paginatedCustomers.map((customer) => (
              <div
                key={customer.customerId}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                  selectedCustomer?.customerId === customer.customerId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      <Badge 
                        variant={customer.customerType === 'CREDIT' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {customer.customerType}
                      </Badge>
                      {selectedCustomer?.customerId === customer.customerId && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{customer.place}</span>
                      </div>
                    </div>

                    {customer.totalSpend && (
                      <div className="mt-2 text-xs text-gray-500">
                        Total Spend: ₹{customer.totalSpend.toFixed(2)}
                      </div>
                    )}
                  </div>
                  
                  {/* Edit Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditCustomer(customer);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
            {totalPages > 1 && ` • Showing ${paginatedCustomers.length} of ${filteredCustomers.length}`}
          </div>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
      
      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information below.
            </DialogDescription>
          </DialogHeader>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editForm.handleSubmit(onEditCustomer)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">Customer Name *</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
                placeholder="Enter customer name"
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-place">Place *</Label>
              <Input
                id="edit-place"
                {...editForm.register("place")}
                placeholder="Enter place"
              />
              {editForm.formState.errors.place && (
                <p className="text-sm text-red-600">
                  {editForm.formState.errors.place.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                {...editForm.register("phone")}
                placeholder="Enter phone number"
              />
              {editForm.formState.errors.phone && (
                <p className="text-sm text-red-600">
                  {editForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customerType">Customer Type *</Label>
              <Select
                value={editForm.watch("customerType")}
                onValueChange={(value) => editForm.setValue("customerType", value as "CASH" | "CREDIT")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
              {editForm.formState.errors.customerType && (
                <p className="text-sm text-red-600">
                  {editForm.formState.errors.customerType.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setCustomerToEdit(null);
                  editForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateCustomerMutation.isPending}
              >
                {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};