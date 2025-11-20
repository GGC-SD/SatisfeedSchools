import type{ Coord, OverpassResponse, OverpassElement, OverpassNode, OverpassWay, OverpassRelation, LibraryDoc } from "./libraryTypes";

export function elementToLibraryDoc(
  element: OverpassElement,
  meta: OverpassResponse
): LibraryDoc | null{
  if (!element.id) return null;
  const tags = element.tags ?? {};


  //compute coordinates based on element type
  let coords: Coord | null = null;
  if (element.type ==='node') {
    const node = element as OverpassNode;
    coords = {lat: node.lat, lng: node.lon};
  }else{
    const center = (element as OverpassWay | OverpassRelation).center;
    if (center) {
      coords = {lat: center.lat, lng: center.lon};
    }
  }

  const name = tags['name']?? null;
  const address = tags['addr:housenumber'] + ' ' + tags['addr:street'];
  const city = tags['addr:city'] ?? null;
  const county = tags['addr:county'] ?? null;
  const zip = (tags['addr:postcode'])?.match(/^\d{5}/)?.[0] ?? null; //keeping first 5 digits of zip

  if (!coords || !name || !address || !city || !county || !zip) return null;


  return {
    OSMelementType: element.type,
    OSMid: element.id,
    name,
    phone: tags['phone'] ?? null,
    website: tags['website'] ?? null,
    hours: tags['hours'] ?? null,
    coords,
    address,
    city,
    county,
    state: tags['addr:state'] ?? null,
    zip,
  };
}

