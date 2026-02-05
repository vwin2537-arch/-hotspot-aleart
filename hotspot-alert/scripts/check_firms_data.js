
const KANCHANABURI_BOUNDS = {
    minLat: 13.72614,
    maxLat: 15.66301,
    minLon: 98.18170,
    maxLon: 99.89221
};

async function fetchFIRMS() {
    const mapKey = '4d3298929ca9dd810386c66effe28c7b'; // Hardcoded from logs for testing
    const sensors = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];
    const days = 3;

    console.log("Fetching RAW data...");

    for (const sensor of sensors) {
        const bbox = `${KANCHANABURI_BOUNDS.minLon},${KANCHANABURI_BOUNDS.minLat},${KANCHANABURI_BOUNDS.maxLon},${KANCHANABURI_BOUNDS.maxLat}`;
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${sensor}/${bbox}/${days}`;

        try {
            const res = await fetch(url, { headers: { 'Accept': 'text/csv' } });
            const text = await res.text();

            console.log(`\n--- ${sensor} ---`);
            const lines = text.trim().split('\n');
            if (lines.length < 2) {
                console.log("No data found.");
                continue;
            }

            const header = lines[0];
            console.log(header);

            // Log first 10 lines
            for (let i = 1; i < Math.min(lines.length, 20); i++) {
                const row = lines[i];
                const cols = row.split(',');
                // Lat, Lon, ..., acq_date (5), acq_time (6)
                const date = cols[5];
                const time = cols[6];

                // Convert to Thai Time manually for check
                const year = parseInt(date.substring(0, 4));
                const month = parseInt(date.substring(5, 7)) - 1;
                const day = parseInt(date.substring(8, 10));
                const hour = parseInt(time.substring(0, 2));
                const minute = parseInt(time.substring(2, 4));

                const utcDate = new Date(Date.UTC(year, month, day, hour, minute));
                const thaiDate = utcDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });

                console.log(`[${i}] ${date} ${time} UTC -> Thai: ${thaiDate}`);
            }
        } catch (err) {
            console.error(err);
        }
    }
}

fetchFIRMS();
