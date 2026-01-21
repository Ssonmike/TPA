import { createHash } from 'crypto';

export class ShipToIdHelper {
    /**
     * Normalizes address components to uppercase and trimmed.
     */
    static normalize(value: string | null | undefined): string {
        return value ? value.trim().toUpperCase() : '';
    }

    /**
     * Generates a deterministic ShipToId based on address fields.
     * Format: SHIP-{COUNTRY}-{ZIP}-{HASH8}
     */
    static generateShipToId(country: string, zip: string, city: string, street: string, houseNo: string): string {
        const nCountry = this.normalize(country);
        const nZip = this.normalize(zip).replace(/\s+/g, ''); // Remove spaces from zip
        const nCity = this.normalize(city);
        const nStreet = this.normalize(street);
        const nHouse = this.normalize(houseNo);

        // Canonical Key: COUNTRY|ZIP|CITY|STREET|HOUSE
        const key = `${nCountry}|${nZip}|${nCity}|${nStreet}|${nHouse}`;

        // Hash
        const hash = createHash('sha256').update(key).digest('hex').substring(0, 8).toUpperCase();

        return `SHIP-${nCountry}-${nZip}-${hash}`;
    }
}
