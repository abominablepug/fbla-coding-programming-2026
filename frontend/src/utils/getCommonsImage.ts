// Resolve a location query into a Wikimedia Commons representative image URL.
export async function getCommonsImage(query: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "User-Agent": "Findr"
        }
      }
    );

    const searchData = await searchRes.json();
    if (!searchData?.length) return null;

    const { lat, lon } = searchData[0];

    const reverseRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );
    const reverseData = await reverseRes.json();

    const wikidataId = reverseData?.extratags?.wikidata;
    if (!wikidataId) return null;

    const wikiRes = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
    );
    const wikiData = await wikiRes.json();

    const entity = wikiData.entities[wikidataId];
    const imageClaim = entity?.claims?.P18?.[0];
    if (!imageClaim) return null;

    const fileName = imageClaim.mainsnak.datavalue.value;

    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
      fileName
    )}`;
  } catch (err) {
    console.error("Commons image error:", err);
    return null;
  }
}
