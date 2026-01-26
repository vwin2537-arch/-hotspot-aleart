import { fromLatLon } from 'utm';

/**
 * Convert Latitude and Longitude to UTM string
 * Format: [Zone][Letter] [Easting] E [Northing] N
 * Example: 47P 543210 E 1567890 N
 */
export function getUTMString(lat: number, lon: number): string {
    try {
        const converted = fromLatLon(lat, lon);
        const easting = Math.round(converted.easting);
        const northing = Math.round(converted.northing);

        // Easting is usually 6 digits, Northing is 7 digits
        return `${converted.zoneNum}${converted.zoneLetter} ${easting} E ${northing} N`;
    } catch (error) {
        console.error('Error converting coordinates to UTM:', error);
        return 'N/A';
    }
}
