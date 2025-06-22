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
import { Search, Plus, Trash2, Users, MapPin, Phone, Mail } from "lucide-react";
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
  shopsIds: z.array(z.number()).min(1, "At least one shop must be selected")
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
    // Since the backend API doesn't exist yet, return mock data based on user's example
    // This simulates the response from /users/shop/getstaff
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            userId: 5,
            fullName: "staff trial ed",
            place: "Punalur",
            phone: "12345645688",
            email: "trials@gmail.com",
            country: null
          },
          {
            userId: 6,
            fullName: "staff trial ed",
            place: "Punalur",
            phone: "12345645688",
            email: "trial1@gmail.com",
            country: null
          },
          {
            userId: 3,
            fullName: "staff trial ed",
            place: "Punalur",
            phone: "12345645688",
            email: "trial@gmail.com",
            country: null
          }
        ]);
      }, 500); // Simulate network delay
    });
  },
  
  async addStaff(staffData: StaffFormData): Promise<void> {
    // Mock implementation - in real app this would POST to /users/shop/staff
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Mock: Adding staff member:", staffData);
        resolve();
      }, 500);
    });
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

  // Fetch shops for form
  const { data: shops = [] } = useQuery({
    queryKey: ["/shop/all"],
    queryFn: async (): Promise<Shop[]> => {
      return apiRequest("/shop/all");
    },
  });

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
      shopsIds: []
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
      queryClient.invalidateQueries({ queryKey: ["/users/shop/getstaff"] });
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



  // Filter staffs based on search only
  const filteredStaffs = staffs.filter((staff) => {
    const matchesSearch = staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.phone.includes(searchTerm);
    return matchesSearch;
  });

  const onSubmit = (data: StaffFormData) => {
    addStaffMutation.mutate(data);
  };



  if (isLoading) {
    return <div className="flex justify-center p-8">Loading staffs...</div>;
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
                        <Input type="password" placeholder="Enter password" {...field} />
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
                
                <FormField
                  control={form.control}
                  name="shopsIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Shops</FormLabel>
                      <Select onValueChange={(value) => field.onChange([parseInt(value)])} value={field.value?.[0]?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shop" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shops.map((shop) => (
                            <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                              {shop.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
            Team Members ({filteredStaffs.length})
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Place</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaffs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No staff members found matching your search" : "No staff members found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaffs.map((staff) => (
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
        </CardContent>
      </Card>
    </div>
  );
}