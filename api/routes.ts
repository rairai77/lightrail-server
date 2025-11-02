import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getFormattedRouteData } from "../lib/routes";

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        console.log("Fetching route data...");
        const data = await getFormattedRouteData();
        console.log("Route data fetched successfully");
        return res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching routes:", error);
        return res.status(500).json({ error: "Failed to fetch route data" });
    }
}
