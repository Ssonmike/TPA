import { fetchTruckGroups } from "../actions-data";
import TruckGroupsClient from "./page-client";

export const dynamic = 'force-dynamic';

export default async function TruckGroupsPage() {
    const trucks = await fetchTruckGroups();
    return <TruckGroupsClient initialData={trucks} />;
}
