import { SalesOrder as PrismaSalesOrder } from "@prisma/client"

export type SalesOrderRow = Omit<PrismaSalesOrder, "weight" | "volumeM3" | "loadingMeters" | "height"> & {
    weight: number
    volumeM3: number
    loadingMeters: number | null
    height: number
}
