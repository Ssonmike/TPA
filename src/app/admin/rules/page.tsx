import { prisma } from '@/lib/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AdminPage() {
    const rules = await prisma.countryRule.findMany();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Country Rules</h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Country</TableHead>
                                <TableHead>Max Height</TableHead>
                                <TableHead>Max Pallets</TableHead>
                                <TableHead>Restriction Code</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-bold">{r.country}</TableCell>
                                    <TableCell>{r.maxHeight ? Number(r.maxHeight) : '-'}</TableCell>
                                    <TableCell>{r.maxPallets || '-'}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.restrictionCode}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
