import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Truck, Settings, Globe, Package, User, Building2, Database } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Administration</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/admin/lanes">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Lanes</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage</div>
                            <p className="text-xs text-muted-foreground">Routes, Priorities, Countries</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/rules">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Country Rules</CardTitle>
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Setup</div>
                            <p className="text-xs text-muted-foreground">Restrictions, Height, Weight</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/carriers">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Carriers</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Partners</div>
                            <p className="text-xs text-muted-foreground">Codes, Integrations</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/user-management">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">User Management</CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Users</div>
                            <p className="text-xs text-muted-foreground">Create, Edit, Export</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/customer-management">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Customer Management</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Customers</div>
                            <p className="text-xs text-muted-foreground">Plants, Codes, Status</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/masterdata">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Masterdata</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Config</div>
                            <p className="text-xs text-muted-foreground">Roles, Flows, Rules</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
