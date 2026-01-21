'use client';

import { Button } from '@/components/ui/button';
import { Play, RotateCw, Upload, Truck, Package } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PipelineToolbar() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const runImport = async () => {
        setLoading(true);
        await fetch('/api/import', { method: 'POST' });
        router.refresh();
        setLoading(false);
    };

    const runPipeline = async () => {
        setLoading(true);
        await fetch('/api/pipeline/run', {
            method: 'POST',
            body: JSON.stringify({ action: 'full_run' })
        });
        router.refresh();
        setLoading(false);
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runImport} disabled={loading}>
                <Upload className="w-4 h-4 mr-2" />
                Import SAP Stub
            </Button>

            <Button variant="default" size="sm" onClick={runPipeline} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                <Play className="w-4 h-4 mr-2" />
                Calculate Pipeline
            </Button>

            <Button variant="ghost" size="icon" onClick={() => router.refresh()}>
                <RotateCw className="w-4 h-4" />
            </Button>
        </div>
    );
}
