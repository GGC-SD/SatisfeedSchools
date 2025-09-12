export async function fetchJSON<T>(path: string): Promise<T> {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to fetch ${path}`);
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}