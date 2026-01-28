"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2 } from "lucide-react";

// Mock data for Roles
const mockRoles = [
    { id: "1", roleName: "VIEWER", description: "Read-only access to dashboard" },
    { id: "2", roleName: "PLANNER", description: "Can manage orders and create groups" },
    { id: "3", roleName: "ADMIN", description: "Full system access" },
];

// Mock data for Flows
const mockFlows = [
    { id: "1", flowName: "Groupage", description: "Consolidated shipments for multiple customers" },
    { id: "2", flowName: "Direct", description: "Direct shipping to customer address" },
    { id: "3", flowName: "Parcel", description: "Small parcel shipments" },
    { id: "4", flowName: "Ex-works", description: "Customer pickup from warehouse" },
];

// Mock data for Rules
const mockRules = [
    {
        id: "1",
        ruleDescription: "Ship to customer-address must not be on the direct shipping type table",
        flow: "Groupage",
        customer: "IIYAMA",
        wmsCode: "I01"
    },
    {
        id: "2",
        ruleDescription: "Order must not exceed 3 loading meters",
        flow: "Direct",
        customer: "IIYAMA",
        wmsCode: "I02"
    },
    {
        id: "3",
        ruleDescription: "Order must not contain 105inch model",
        flow: "Parcel",
        customer: "IIYAMA",
        wmsCode: "I03"
    },
    {
        id: "4",
        ruleDescription: "Customer requires Ex-works documentation",
        flow: "Ex-works",
        customer: "IIYAMA",
        wmsCode: "I01"
    },
];

export default function MasterdataPage() {
    return (
        <div className="space-y-6 p-8">
            <h2 className="text-2xl font-bold">Masterdata</h2>

            <Tabs defaultValue="roles" className="w-full">
                <TabsList>
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                    <TabsTrigger value="flows">Flows</TabsTrigger>
                    <TabsTrigger value="rules">Rules</TabsTrigger>
                </TabsList>

                {/* Roles Tab */}
                <TabsContent value="roles" className="space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={() => alert("Create role functionality coming soon")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                        </Button>
                        <Button variant="outline" onClick={() => alert("Edit role functionality coming soon")}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                        <Button variant="destructive" onClick={() => confirm("Delete selected role?")}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-3">Role Name</th>
                                    <th className="p-3">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockRoles.map(role => (
                                    <tr key={role.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-medium">{role.roleName}</td>
                                        <td className="p-3 text-muted-foreground">{role.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* Flows Tab */}
                <TabsContent value="flows" className="space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={() => alert("Create flow functionality coming soon")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                        </Button>
                        <Button variant="outline" onClick={() => alert("Edit flow functionality coming soon")}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                        <Button variant="destructive" onClick={() => confirm("Delete selected flow?")}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-3">Flow Name</th>
                                    <th className="p-3">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockFlows.map(flow => (
                                    <tr key={flow.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-medium">{flow.flowName}</td>
                                        <td className="p-3 text-muted-foreground">{flow.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* Rules Tab */}
                <TabsContent value="rules" className="space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={() => alert("Create rule functionality coming soon")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                        </Button>
                        <Button variant="outline" onClick={() => alert("Edit rule functionality coming soon")}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                        <Button variant="destructive" onClick={() => confirm("Delete selected rule?")}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-3">Rule Description</th>
                                    <th className="p-3">Flow</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">WMS Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockRules.map(rule => (
                                    <tr key={rule.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="p-3">{rule.ruleDescription}</td>
                                        <td className="p-3 font-medium">{rule.flow}</td>
                                        <td className="p-3 font-medium">{rule.customer}</td>
                                        <td className="p-3 font-mono text-muted-foreground">{rule.wmsCode}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
