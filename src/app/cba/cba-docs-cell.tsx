"use client"

import { Button } from "@/components/ui/button"
import { Mail, Paperclip, FileSpreadsheet } from "lucide-react"

interface DocsCellProps {
    order: any
}

export function DocsCell({ order }: DocsCellProps) {
    if (order.bookingType !== 'APT') return null

    const handleEmail = () => {
        const subject = `Appointment Request - TPA# ${order.tpaNumber || order.tpaGroupId || order.id} - ${order.consignee || 'Unknown'}`
        const body = `Estimado ${order.consignee || 'Cliente'},%0D%0A%0D%0ASolicitamos cita para la entrega de la referencia ${order.orderReferenceNumber}.%0D%0APor favor, confirmen disponibilidad para ${order.firstPickupDate ? new Date(order.firstPickupDate).toLocaleDateString() : 'Key Date'} a las [Hora].%0D%0A%0D%0ADetalles:%0D%0APeso: ${order.weight} kg%0D%0ABultos: ${order.cartonQuantity}%0D%0APaletas: ${order.pallets}%0D%0A%0D%0AAtentamente,%0D%0A${order.carrierName || 'Transportista'}`

        window.location.href = `mailto:?subject=${subject}&body=${body}`
    }

    const handlePackingList = () => {
        // Generate CSV content
        // Headers
        const headers = ["Order Ref", "Consignee", "City", "Country", "Weight (kg)", "Cartons", "Pallets"]
        const row = [
            order.orderReferenceNumber,
            order.consignee || "",
            order.shipToCity,
            order.shipToCountry,
            order.weight,
            order.cartonQuantity,
            order.pallets
        ]

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + row.join(",")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `packing_list_${order.orderReferenceNumber}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={handleEmail} title="Generate Email">
                <Mail className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={handlePackingList} title="Download Packing List">
                <Paperclip className="h-4 w-4" />
            </Button>
        </div>
    )
}
