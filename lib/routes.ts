import OnebusawaySDK from "onebusaway-sdk";

const client = new OnebusawaySDK({
    maxRetries: 3,
});

// Cache setup
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
let cache: { data: any; timestamp: number } | null = null;

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

export async function getFormattedRouteData() {
    // Check cache first
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        console.log("Returning cached data");
        return cache.data;
    }

    console.log("Cache miss - fetching fresh data");
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

    // Update cache
    cache = {
        data: formatted_routes,
        timestamp: Date.now(),
    };

    return formatted_routes;
}
