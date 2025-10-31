import "server-only";
import { db } from "@/db";
import { restaurant, menuItem } from "@/db/schema";

/**
 * Seeds the database with test data on first application start.
 * This function is idempotent - it checks if data already exists before seeding.
 */
/**
 * Common opening hours patterns for restaurants
 */
const OPENING_HOURS = {
  fullWeek: {
    monday: "11:00-22:00",
    tuesday: "11:00-22:00",
    wednesday: "11:00-22:00",
    thursday: "11:00-22:00",
    friday: "11:00-23:00",
    saturday: "12:00-23:00",
    sunday: "12:00-21:00",
  },
  weekdaysOnly: {
    monday: "10:00-20:00",
    tuesday: "10:00-20:00",
    wednesday: "10:00-20:00",
    thursday: "10:00-20:00",
    friday: "10:00-20:00",
    saturday: "11:00-19:00",
    sunday: "closed",
  },
  breakfast: {
    monday: "08:00-18:00",
    tuesday: "08:00-18:00",
    wednesday: "08:00-18:00",
    thursday: "08:00-18:00",
    friday: "08:00-18:00",
    saturday: "09:00-15:00",
    sunday: "closed",
  },
};

/**
 * Seeds the database with test data on first application start.
 * This function is idempotent - it checks if data already exists before seeding.
 */
export async function seedTestData() {
  try {
    // Check if test data already exists by checking for any restaurants
    const existingRestaurants = await db
      .select({ id: restaurant.id })
      .from(restaurant)
      .limit(1);

    if (existingRestaurants.length > 0) {
      console.info("[seed] Test data already exists, skipping seed");
      return { success: true, alreadySeeded: true };
    }

    console.info("[seed] Starting test data seeding...");

    // Insert restaurants
    const [pastaLoft] = await db
      .insert(restaurant)
      .values({
        name: "Pasta Loft",
        location: "Innenstadt · Musterstraße 12",
        tag: "Frische Pasta",
        phoneNumber: "+49 123 456789",
        openingHours: JSON.stringify(OPENING_HOURS.fullWeek),
        rating: "4.7",
      })
      .returning();

    const [greenBowl] = await db
      .insert(restaurant)
      .values({
        name: "Green Bowl",
        location: "Campus Mitte · Kantinenhof",
        tag: "Bowls & Salate",
        phoneNumber: "+49 123 456790",
        openingHours: JSON.stringify(OPENING_HOURS.weekdaysOnly),
        rating: "4.5",
      })
      .returning();

    const [burgerWerk] = await db
      .insert(restaurant)
      .values({
        name: "Burger Werk",
        location: "Foodcourt · Werkstraße 8",
        tag: "Burger & Streetfood",
        phoneNumber: "+49 123 456791",
        openingHours: JSON.stringify(OPENING_HOURS.weekdaysOnly),
        rating: "4.3",
      })
      .returning();

    const [noonDeli] = await db
      .insert(restaurant)
      .values({
        name: "Noon Deli",
        location: "City Gate · Lobby West",
        tag: "Schnelle Mittagssnacks",
        phoneNumber: "+49 123 456792",
        openingHours: JSON.stringify(OPENING_HOURS.breakfast),
        rating: "4.1",
      })
      .returning();

    console.info("[seed] Restaurants created");

    // Insert menu items for Pasta Loft
    await db.insert(menuItem).values([
      {
        restaurantId: pastaLoft.id,
        dishName: "Trüffel Tagliatelle",
        type: "main_course",
        category: "pasta",
        price: "11.90",
        givesRefund: true,
      },
      {
        restaurantId: pastaLoft.id,
        dishName: "Ofenlasagne",
        type: "main_course",
        category: "pasta",
        price: "9.50",
        givesRefund: true,
      },
      {
        restaurantId: pastaLoft.id,
        dishName: "BOWL Bowl",
        type: "main_course",
        category: "bowl",
        price: "10.40",
        givesRefund: true,
      },
    ]);

    // Insert menu items for Green Bowl
    await db.insert(menuItem).values([
      {
        restaurantId: greenBowl.id,
        dishName: "Protein Power Bowl",
        type: "main_course",
        category: "bowl",
        price: "8.90",
        givesRefund: true,
      },
      {
        restaurantId: greenBowl.id,
        dishName: "Falafel Salad",
        type: "main_course",
        category: "salad",
        price: "7.80",
        givesRefund: true,
      },
      {
        restaurantId: greenBowl.id,
        dishName: "Seasonal Smoothie",
        type: "drink",
        category: "smoothie",
        price: "4.70",
        givesRefund: false,
      },
    ]);

    // Insert menu items for Burger Werk
    await db.insert(menuItem).values([
      {
        restaurantId: burgerWerk.id,
        dishName: "MarkenMate Signature Burger",
        type: "main_course",
        category: "burger",
        price: "10.90",
        givesRefund: true,
      },
      {
        restaurantId: burgerWerk.id,
        dishName: "Loaded Sweet Fries",
        type: "main_course",
        category: "sides",
        price: "5.20",
        givesRefund: false,
      },
      {
        restaurantId: burgerWerk.id,
        dishName: "Spicy Veggie Burger",
        type: "main_course",
        category: "burger",
        price: "9.30",
        givesRefund: true,
      },
    ]);

    // Insert menu items for Noon Deli
    await db.insert(menuItem).values([
      {
        restaurantId: noonDeli.id,
        dishName: "Ciabatta Caprese",
        type: "main_course",
        category: "sandwich",
        price: "6.40",
        givesRefund: false,
      },
      {
        restaurantId: noonDeli.id,
        dishName: "Tagesuppe",
        type: "main_course",
        category: "soup",
        price: "4.80",
        givesRefund: false,
      },
      {
        restaurantId: noonDeli.id,
        dishName: "Panna Cotta",
        type: "dessert",
        category: "dessert",
        price: "3.60",
        givesRefund: false,
      },
    ]);

    console.info("[seed] Menu items created");

    console.info("[seed] Test data seeding completed successfully");
    return { success: true, alreadySeeded: false };
  } catch (error) {
    console.error("[seed] Failed to seed test data:", error);
    return { success: false, error: String(error) };
  }
}
