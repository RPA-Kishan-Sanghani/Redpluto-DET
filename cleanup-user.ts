
import { db } from "./server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function cleanupUser() {
  try {
    console.log('Cleaning up user "kishansanghani" from database...');
    
    // Delete the user
    const result = await db
      .delete(users)
      .where(eq(users.username, 'kishansanghani'))
      .returning();
    
    if (result.length > 0) {
      console.log('Successfully deleted user:', result[0]);
      console.log('User cleanup completed!');
    } else {
      console.log('User "kishansanghani" not found in database');
    }
  } catch (error) {
    console.error('Error cleaning up user:', error);
  } finally {
    process.exit(0);
  }
}

cleanupUser();
