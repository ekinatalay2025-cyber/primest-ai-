import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db | null> {
  if (!uri) {
    console.warn("MONGODB_URI tanımlı değil - veritabanı devre dışı");
    return null;
  }
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("primest-ai");
  return db;
}

export async function getDB(): Promise<Db | null> {
  return db ?? (await connectDB());
}
