import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../src/firebase/admin";

async function exportData() {
    await mkdir("public/data", { recursive: true });

    // save public locations as json
    for (const name of ["schools", "libraries", "pantries"]) {
        const snapshot = await db.collection(name).get();

        const records = snapshot.docs.map(record => ({
            id: record.id,
            data: record.data()
        }));

        await writeFile(
            `public/data/${name}.json`,
            JSON.stringify(records)
        );

        console.log(`${name}: exported ${records.length} records`);
    }
}

exportData().catch(error => {
    console.error("export failed:", error);
    process.exitCode = 1;
});