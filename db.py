from motor.motor_asyncio import AsyncIOMotorClient
import os

DEFAULT_MONGO_URL = "mongodb+srv://admin:admin@cluster.hmqekcb.mongodb.net/?appName=Cluster"
MONGO_URL = os.getenv("MONGO_URL", DEFAULT_MONGO_URL)

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=8000)

database = client["DAIRY_MANAGEMENT"]

user_collection = database["users"]
customer_collection = database["customers"]
milk_collection = database["milk_collection"]
