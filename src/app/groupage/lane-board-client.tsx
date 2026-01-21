"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchLaneDataAction } from "../actions-data"
import { LaneBoard } from "./lane-board"

import { CreateLaneDialog } from "@/components/create-lane-dialog"

export default function LaneBoardClient({ initialData }: { initialData: any[] }) {
    const { data } = useQuery({
        queryKey: ['lanes'],
        queryFn: () => fetchLaneDataAction(),
        initialData,
        refetchInterval: 10000
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Groupage Planning</h2>
                <div className="flex items-center space-x-2">
                    <CreateLaneDialog />
                </div>
            </div>

            <LaneBoard laneData={data} />
        </div>
    )
}
