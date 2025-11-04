/**
 * Domain service for determining restaurant opening status
 */

export interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export class RestaurantOpeningService {
  /**
   * Check if a restaurant is currently open based on opening hours
   * @param openingHours - Opening hours object
   * @param currentTime - Current time to check (defaults to now)
   * @returns true if restaurant is open, false otherwise
   */
  static isOpen(
    openingHours: OpeningHours | null,
    currentTime: Date = new Date(),
  ): boolean {
    if (!openingHours) {
      return false;
    }

    const dayNames: Array<keyof OpeningHours> = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const todayHours = openingHours[dayNames[currentTime.getDay()]];

    if (!todayHours || todayHours === "closed") {
      return false;
    }

    // Simplified: if hours exist and not "closed", consider open
    // In production, parse time ranges and check current time
    // Example: "09:00-22:00" would require parsing and comparison
    return true;
  }

  /**
   * Parse opening hours from JSON string
   */
  static parseOpeningHours(json: string | null): OpeningHours | null {
    if (!json) {
      return null;
    }

    try {
      return JSON.parse(json) as OpeningHours;
    } catch {
      return null;
    }
  }
}
