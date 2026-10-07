
from model import User, Login
from db import user_collection, customer_collection, milk_collection
from utils import create_token, hash_password, verify_password


async def register_user(user: User):

    existing_user = await user_collection.find_one({
        "username": user.username
    })

    if existing_user:
        return {
            "msg": "Username already exists"
        }

    user_data = {
        "username": user.username,
        "password": hash_password(user.password)
    }

    result = await user_collection.insert_one(user_data)

    return {
        "msg": "User registered successfully",
        "user_id": str(result.inserted_id)
    }


async def login_user(data: Login):

    user = await user_collection.find_one({"username": data.username})

    if not user or not verify_password(data.password, user.get("password", "")):
        return {
            "msg": "Invalid username or password"
        }

    # Old records have no owner field. Assign them once to the first-created
    # account so the existing dairy data remains available to its owner.
    first_user = await user_collection.find_one({}, sort=[("_id", 1)])
    if first_user:
        legacy_owner_id = str(first_user["_id"])
        await customer_collection.update_many(
            {"owner_user_id": {"$exists": False}},
            {"$set": {"owner_user_id": legacy_owner_id}}
        )
        await milk_collection.update_many(
            {"owner_user_id": {"$exists": False}},
            {"$set": {"owner_user_id": legacy_owner_id}}
        )

    token_data = {
        "user_id": str(user["_id"]),
        "username": user["username"]
    }

    token = create_token(token_data)

    return {
        "msg": "Login successful",
        "token": token,
        "user_id": str(user["_id"])
    }

