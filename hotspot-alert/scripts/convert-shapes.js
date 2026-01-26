const shapefile = require("shapefile");
const turf = require("@turf/turf");
const fs = require("fs");
const path = require("path");
const proj4 = require("proj4");

// Define Projections
// Source: Indian 1975 / UTM zone 47N (Common for Thai Govt Data) - EPSG:24047
proj4.defs("EPSG:24047", "+proj=utm +zone=47 +a=6377276.345 +b=6356075.41314024 +towgs84=210,814,289,0,0,0,0 +units=m +no_defs");
// Dest: WGS84 - EPSG:4326
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

// Configuration
const INPUT_SHP = path.join(__dirname, "../../001_Shap_พื้นที่อนุรักษ์/PRTC.shp");
const OUTPUT_JSON = path.join(__dirname, "../public/data/protected-areas.json"); // Save to public folder for frontend fetching
const KANCHANABURI_BOUNDS = [97.9, 13.5, 100.2, 16.0]; // Approx bounds to filter only Kanchanaburi

// Create directory if not exists
const outputDir = path.dirname(OUTPUT_JSON);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function convert() {
    console.log("Reading Shapefile...");
    const source = await shapefile.open(INPUT_SHP);

    const features = [];
    let processed = 0;

    // Helper to reproject recursively
    const reproject = (coords) => {
        if (typeof coords[0] === 'number') {
            return proj4("EPSG:24047", "EPSG:4326", coords);
        } else {
            return coords.map(reproject);
        }
    };

    while (true) {
        const result = await source.read();
        if (result.done) break;

        processed++;
        const feature = result.value;
        const props = feature.properties;

        // DEBUG: Print first feature to check coordinates and properties
        if (processed === 1) {
            console.log("Sample Feature Properties:", JSON.stringify(props, null, 2));
            // Assuming it's a Polygon or MultiPolygon, print first coordinate of first ring
            if (feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
                if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0] && feature.geometry.coordinates[0].length > 0) {
                    console.log("Sample Geometry (first point of first ring):", JSON.stringify(feature.geometry.coordinates[0][0], null, 2));
                } else if (feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates[0] && feature.geometry.coordinates[0][0] && feature.geometry.coordinates[0][0].length > 0) {
                    console.log("Sample Geometry (first point of first ring of first polygon):", JSON.stringify(feature.geometry.coordinates[0][0][0], null, 2));
                } else {
                    console.log("Sample Geometry (first coordinate):", JSON.stringify(feature.geometry.coordinates[0], null, 2));
                }
            } else {
                console.log("Sample Geometry: No coordinates found or invalid geometry structure.");
            }
        }

        // --- Custom Filtering Logic ---
        // Adjust this depending on your shapefile attributes
        // Usually 'province', 'prov_nam_t' etc.
        // For now, let's try to filter by Geometry overlap with Kanchanaburi

        try {
            // 1. Reproject Geometry (UTM -> Lat/Long)
            // (Only if it has geometry)
            if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry.coordinates = reproject(feature.geometry.coordinates);
            }

            // 2. Simplify geometry (tolerance 0.001 deg ~ 100m)
            const simplified = turf.simplify(feature, { tolerance: 0.002, highQuality: false });

            // 3. Check overlaps with Kanchanaburi
            const bbox = turf.bbox(simplified);
            const intersects = !(
                bbox[2] < KANCHANABURI_BOUNDS[0] ||
                bbox[0] > KANCHANABURI_BOUNDS[2] ||
                bbox[3] < KANCHANABURI_BOUNDS[1] ||
                bbox[1] > KANCHANABURI_BOUNDS[3]
            );

            if (intersects) {
                // Determine Name (Try Thai first)
                let name = props.NAME_TH || props.NAM_TH || props.NAME || "Unknown";

                // Fix encoding issues if possible (rough heuristic if needed, but node usually handles UTF8 well if source is UTF8)
                // If the source DBF is TIS-620, shapefile lib usually handles it if specified,
                // but default 'shapefile' lib assumes UTF-8 or Windows-1252.
                // We'll see. If names are garbled, we might need iconv.

                simplified.properties = {
                    name: name,
                    type: props.TYPE || "Protected Area"
                };
                features.push(simplified);
            }
        } catch (e) {
            console.error("Error processing feature:", e.message);
        }

        if (processed % 100 === 0) console.log(`Processed ${processed} features...`);
    }

    console.log(`\nFound ${features.length} features related to Kanchanaburi.`);

    const geojson = turf.featureCollection(features);

    console.log("Writing GeoJSON...");
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(geojson));
    console.log(`Saved to ${OUTPUT_JSON}`);
    console.log(`Size: ${(fs.statSync(OUTPUT_JSON).size / 1024 / 1024).toFixed(2)} MB`);
}

convert().catch(err => console.error(err));
