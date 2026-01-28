"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, FileSpreadsheet } from "lucide-react";

// Mock data
const mockCustomers = [
    { id: "1", customerName: "IIYAMA", plantCode: "2302", active: true },
    { id: "2", customerName: "GEODIS", plantCode: "2401", active: true },
    { id: "3", customerName: "EXAMPLE CORP", plantCode: "1105", active: false },
];

export default function CustomerManagementPage() {
    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Customer Management</h2>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button onClick={() => alert("Create customer functionality coming soon")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                </Button>
                <Button variant="outline" onClick={() => alert("Edit customer functionality coming soon")}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                </Button>
                <Button variant="destructive" onClick={() => confirm("Delete selected customer?")}>
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
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Plant Code</th>
                            <th className="p-3">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockCustomers.map(customer => (
                            <tr key={customer.id} className="border-b hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-medium">{customer.customerName}</td>
                                <td className="p-3 text-muted-foreground font-mono">{customer.plantCode}</td>
                                <td className="p-3">
                                    <Checkbox checked={customer.active} disabled />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
