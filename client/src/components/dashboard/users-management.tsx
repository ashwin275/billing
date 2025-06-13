// Users management component with delete functionality
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserCheck, Mail, Phone, MapPin, Shield, AlertTriangle } from "lucide-react";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { usersApi, handleApiError } from "@/lib/api";
import { User } from "@/types/api";

/**
 * UsersManagement component displays all users and handles deletion
 * Fetches users from API and provides delete functionality with confirmation
 */
export default function UsersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch all users
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/users/all"],
    queryFn: () => usersApi.getAllUsers(),
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => usersApi.deleteUser(userId),
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been successfully deleted.",
      });
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: ["/api/users/all"] });
      setUserToDelete(null);
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: "Failed to delete user",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  /**
   * Handle delete user confirmation
   */
  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.userId);
    }
  };

  /**
   * Get role display name
   */
  const getRoleName = (user: User) => {
    if (user.roles && user.roles.length > 0) {
      return user.roles[0].roleName.replace("ROLE_", "");
    }
    return "User";
  };

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status: string) => {
    return status === "ACTIVE" ? "default" : "secondary";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Users Management</h1>
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
          <h1 className="text-2xl font-bold text-slate-900">Users Management</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>Failed to load users. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users Management</h1>
          <p className="text-slate-600 mt-1">Manage users and their permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-sm">
            {users?.length || 0} Total Users
          </Badge>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>All Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Info</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.userId}>
                    {/* User Info */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{user.fullName}</span>
                        <span className="text-sm text-slate-500">ID: {user.userId}</span>
                        <div className="md:hidden mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{user.phone}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact - Hidden on mobile */}
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location - Hidden on tablet and mobile */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="text-sm">{user.place}</span>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Shield className="h-3 w-3 text-slate-400" />
                        <Badge variant="outline">{getRoleName(user)}</Badge>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={getStatusVariant(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToDelete(user)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users && users.length === 0 && (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Delete User</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.fullName}</strong>? 
              This action cannot be undone and will permanently remove the user from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}