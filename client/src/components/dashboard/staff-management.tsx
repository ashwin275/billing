import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Trash2, Users, MapPin, Phone, Mail, ChevronUp, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAuthToken, decodeToken } from "@/lib/auth";
import { authApi } from "@/lib/api";

// Staff schema for form validation
const staffSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  place: z.string().min(1, "Place is required"),
  age: z.number().min(18, "Age must be at least 18").max(65, "Age must be under 65"),
  countryId: z.number().min(1, "Country is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type StaffFormData = z.infer<typeof staffSchema>;

interface Staff {
  userId: number;
  fullName: string;
  place: string;
  phone: string;
  email: string;
  country: string | null;
}

interface Country {
  countryId: number;
  countryCode: string;
  country: string;
}

interface Shop {
  shopId: number;
  name: string;
}

// Staff API functions
const staffApi = {
  async getAllStaffs(): Promise<Staff[]> {
    const token = getAuthToken();
    const response = await fetch("https://billing-backend.serins.in/api/users/shop/getstaff", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  async addStaff(staffData: StaffFormData): Promise<void> {
    // Get shop ID from token
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token found");
    
    const decoded = decodeToken(token);
    const shopId = decoded.shopId;
    
    if (!shopId) throw new Error("No shop ID found in token");
    
    // Prepare data for API
    const apiData = {
      fullName: staffData.fullName,
      place: staffData.place,
      age: staffData.age,
      countryId: staffData.countryId,
      phone: staffData.phone,
      email: staffData.email,
      password: staffData.password,
      shopsIds: [shopId]
    };
    
    const response = await fetch("https://billing-backend.serins.in/api/users/shop/staff", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(apiData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
  },
  
  async deleteStaff(userId: number): Promise<void> {
    // Mock implementation - in real app this would DELETE to /users/{userId}
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Mock: Deleting staff member with ID:", userId);
        resolve();
      }, 500);
    });
  }
};

export default function StaffManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Staff | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is owner
  const isOwner = () => {
    const token = getAuthToken();
    if (!token) return false;
    
    try {
      const decoded = decodeToken(token);
      return decoded.roleName === "ROLE_OWNER";
    } catch (error) {
      return false;
    }
  };

  // Redirect if not owner
  if (!isOwner()) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only shop owners can access staff management.</p>
        </div>
      </div>
    );
  }

  // Fetch staffs
  const { data: staffs = [], isLoading, error } = useQuery({
    queryKey: ["staff-management"],
    queryFn: () => staffApi.getAllStaffs(),
  });



  // Fetch countries for form
  const { data: countries = [] } = useQuery({
    queryKey: ["/country/all"],
    queryFn: () => authApi.getCountries(),
  });

  // No need to fetch shops since we get shop ID from token

  // Add staff form
  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      fullName: "",
      place: "",
      age: 18,
      countryId: 0,
      phone: "",
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: staffApi.addStaff,
    onSuccess: () => {
      toast({
        title: "Staff added successfully",
        description: "The staff member has been added to your team.",
      });
      queryClient.invalidateQueries({ queryKey: ["staff-management"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add staff",
        description: error?.detail || error?.message || "Failed to add staff member.",
        variant: "destructive",
      });
    },
  });



  // Filter and sort staff members
  const filteredAndSortedStaffs = staffs
    .filter((staff) => {
      const matchesSearch = staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           staff.phone.includes(searchTerm);
      return matchesSearch;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue.toString().localeCompare(bValue.toString());
      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Pagination calculations
  const totalStaffs = filteredAndSortedStaffs.length;
  const totalPages = Math.ceil(totalStaffs / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaffs = filteredAndSortedStaffs.slice(startIndex, endIndex);

  // Handle column sorting
  const handleSort = (column: keyof Staff) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const onSubmit = (data: StaffFormData) => {
    // Include confirmPassword in the data as expected by the API
    addStaffMutation.mutate(data);
  };



  // Helper function to get sort icon
  const getSortIcon = (column: keyof Staff) => {
    if (sortColumn !== column) {
      return <ChevronUp className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ChevronUp className="h-4 w-4 ml-1" /> 
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading staff members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-bold text-red-600 mb-2">Error Loading Staff</h2>
          <p className="text-gray-600">Failed to load staff data: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">Manage your team members and their access</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff account with access to your shop
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter age" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.countryId} value={country.countryId.toString()}>
                              {country.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Shop assignment is handled automatically from token */}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addStaffMutation.isPending}>
                    {addStaffMutation.isPending ? "Adding..." : "Add Staff"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({totalStaffs})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Staff Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("fullName")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Name
                      {getSortIcon("fullName")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("email")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Email
                      {getSortIcon("email")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("phone")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Phone
                      {getSortIcon("phone")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("place")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Place
                      {getSortIcon("place")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("country")}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Country
                      {getSortIcon("country")}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStaffs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No staff members found matching your search" : "No staff members found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStaffs.map((staff) => (
                    <TableRow key={staff.userId}>
                      <TableCell className="font-medium">{staff.fullName}</TableCell>
                      <TableCell>{staff.email}</TableCell>
                      <TableCell>{staff.phone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {staff.place}
                        </div>
                      </TableCell>
                      <TableCell>
                        {staff.country || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalStaffs > 0 && (
            <div className="flex items-center justify-between space-x-2 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalStaffs)} of {totalStaffs} staff members
              </div>
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}