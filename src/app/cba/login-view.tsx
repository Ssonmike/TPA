"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Truck, ShieldCheck } from "lucide-react";

export function LoginView() {
    const router = useRouter();

    const carriers = ["KLG", "DSV", "DHL", "UPS", "RABEN"];

    const handleLogin = (carrier: string) => {
        // Force full navigation to ensure server component re-renders with new params
        window.location.href = `/cba?carrier=${carrier}`;
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
            <Card className="w-[400px] shadow-lg">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl font-bold">Carrier Portal Login</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                        {carriers.map(c => (
                            <Button
                                key={c}
                                variant="outline"
                                className="h-20 flex flex-col gap-2 hover:border-blue-500 hover:text-blue-600 transition-all"
                                onClick={() => handleLogin(c)}
                            >
                                <Truck className="h-6 w-6" />
                                <span className="font-bold">{c}</span>
                            </Button>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Internal</span>
                        </div>
                    </div>

                    <Button
                        variant="default"
                        className="w-full bg-slate-800 hover:bg-slate-900"
                        onClick={() => handleLogin('CT')}
                    >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Control Tower
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
