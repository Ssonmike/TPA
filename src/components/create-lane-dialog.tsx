"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createLane } from "@/app/admin/actions"

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    countries: z.string().min(2, "Enter at least one country code (e.g. DE,AT)"),
    lanePriority: z.coerce.number().min(1),
    isActive: z.boolean().default(true),
    maxLdm: z.coerce.number().min(0).default(13.6),
    maxPallets: z.coerce.number().min(0).default(33),
    maxWeightKg: z.coerce.number().min(0).optional(),
    description: z.string().optional(),
})

export function CreateLaneDialog() {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            countries: "",
            lanePriority: 100,
            isActive: true,
            maxLdm: 13.6,
            maxPallets: 33,
            maxWeightKg: 24000,
            description: ""
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            try {
                await createLane(values);
                setOpen(false);
                form.reset();
            } catch (error) {
                console.error(error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Lane
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Lane</DialogTitle>
                    <DialogDescription>
                        Define a new transport lane.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lane Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="DACH" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="countries"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Countries (CSV)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="DE,AT,CH" {...field} />
                                    </FormControl>
                                    <FormDescription>Comma separated codes.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="lanePriority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs">
                                        <div className="space-y-0.5">
                                            <FormLabel>Active</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="maxLdm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max LDM</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="maxPallets"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Pallets</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="maxWeightKg"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Weight (kg)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
