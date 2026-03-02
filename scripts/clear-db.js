import db from "../src/db.js";

db.exec("DELETE FROM responses");
db.exec("DELETE FROM rounds");
console.log("[clear-db] Database cleared.");
