import type { VercelRequest, VercelResponse } from "@vercel/node";
import OnebusawaySDK from "onebusaway-sdk";

const client = new OnebusawaySDK({
    maxRetries: 3,
});

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to process items in batches with delay
async function processBatch<T, R>(
    items: T[],
    batchSize: number,
    delayMs: number,
    processor: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
        if (i + batchSize < items.length) {
            await delay(delayMs);
        }
    }
    return results;
}

async function findSoundTransitLightRailRoutes() {
    try {
        const response = await client.routesForAgency.list("40");
        const routes = response.data.list;
        const lightRail = routes.filter((route) => {
            return route.type === 0;
        });
        return lightRail;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function getFormattedRouteData() {
    let routes = await findSoundTransitLightRailRoutes();
    let formatted_routes: Record<string, any> = {};

    if (routes) {
        for (const route of routes) {
            const response = await client.stopsForRoute.list(route.id, {
                includePolylines: false,
            });

            const stopGroupings = response.data.entry.stopGroupings as any;
            const allStops = response.data.references?.stops;
            const stopGroups = stopGroupings?.[0]?.stopGroups || [];

            const destinations = await Promise.all(
                stopGroups.map(async (group: any) => {
                    const stopsWithTimings = await processBatch(
                        group.stopIds,
                        5,
                        500,
                        async (stopId: string) => {
                            const stop = allStops?.find((s: any) => s.id === stopId);
                            if (!stop) return null;

                            let nextArrival = null;
                            try {
                                const arrivalsResponse = await client.arrivalAndDeparture.list(
                                    stopId,
                                    {
                                        minutesAfter: 60,
                                    }
                                );

                                if (arrivalsResponse?.data?.entry?.arrivalsAndDepartures) {
                                    const arrivals = arrivalsResponse.data.entry.arrivalsAndDepartures
                                        .filter((arrival: any) => arrival.routeId === route.id)
                                        .sort((a: any, b: any) => {
                                            const aTime = a.predictedArrivalTime || a.scheduledArrivalTime;
                                            const bTime = b.predictedArrivalTime || b.scheduledArrivalTime;
                                            return aTime - bTime;
                                        });

                                    if (arrivals.length > 0 && arrivals[0]) {
                                        const next = arrivals[0];
                                        nextArrival = next.predictedArrivalTime || next.scheduledArrivalTime;
                                    }
                                }
                            } catch (error) {
                                // Silently handle errors
                            }

                            return {
                                name: stop.name,
                                lat: stop.lat,
                                lon: stop.lon,
                                nextArrival: nextArrival,
                            };
                        }
                    );

                    return {
                        destination: group.name.name,
                        stops: stopsWithTimings.filter(Boolean),
                    };
                })
            );

            const routeName = route.shortName || route.longName || "Unknown";
            formatted_routes[route.id] = {
                routeName: routeName,
                destinations: destinations,
            };
        }
    }

    return formatted_routes;
}

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
