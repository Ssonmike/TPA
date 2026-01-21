import { fetchLaneDataAction } from "../actions-data";
import LaneBoardClient from "./lane-board-client";

export const dynamic = 'force-dynamic';

export default async function GroupagePage() {
    const data = await fetchLaneDataAction();
    return <LaneBoardClient initialData={data} />;
}
