import fetch from "node-fetch";
import { recordToSchoolDoc } from "../src/data/transform";

const STATE = "GA";
const URL = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-public-schools/records?where=state='${STATE}'&limit=5`;

(async () => {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json: any = await res.json();
  const rows = json.results ?? [];
  const docs = rows.map((r: any) => recordToSchoolDoc(r));
  console.dir(docs, { depth: null });
})();
