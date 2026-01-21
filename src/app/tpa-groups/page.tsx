import { fetchTPAGroups } from "../actions-data";
import TPAGroupsClient from "./page-client";

export const dynamic = 'force-dynamic';

export default async function TPAGroupsPage() {
    const groups = await fetchTPAGroups();
    return <TPAGroupsClient initialData={groups} />
}
