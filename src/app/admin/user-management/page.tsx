"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, FileSpreadsheet } from "lucide-react";

// Mock data
const mockUsers = [
    { id: "1", username: "john.doe", active: true },
    { id: "2", username: "jane.smith", active: true },
    { id: "3", username: "admin", active: false },
];

export default function UserManagementPage() {
    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">User Management</h2>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button onClick={() => alert("Create user functionality coming soon")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                </Button>
                <Button variant="outline" onClick={() => alert("Edit user functionality coming soon")}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                </Button>
                <Button variant="destructive" onClick={() => confirm("Delete selected user?")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </Button>
                <Button variant="secondary" onClick={() => alert("Export to Excel functionality coming soon")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted uppercase font-bold text-xs">
                        <tr>
                            <th className="p-3">Username</th>
                            <th className="p-3">ID</th>
                            <th className="p-3">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockUsers.map(user => (
                            <tr key={user.id} className="border-b hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-medium">{user.username}</td>
                                <td className="p-3 text-muted-foreground">{user.id}</td>
                                <td className="p-3">
                                    <Checkbox checked={user.active} disabled />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
