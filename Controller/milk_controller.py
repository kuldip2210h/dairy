
from model import Milk
from db import milk_collection


async def add_milk(milk: Milk, owner_user_id: str):

    milk_data = milk.dict()
    milk_data["owner_user_id"] = owner_user_id

    result = await milk_collection.insert_one(milk_data)

    return {
        "msg": "Milk entry added successfully",
        "id": str(result.inserted_id)
    }


async def get_all_milk(owner_user_id: str):

    milk_list = []

    data = milk_collection.find({"owner_user_id": owner_user_id})

    async for milk in data:

        milk["_id"] = str(milk["_id"])

        milk_list.append(milk)

    return milk_list


async def get_milk_by_customer(customer_id: str, owner_user_id: str):

    milk_list = []

    data = milk_collection.find({
        "customer_id": customer_id,
        "owner_user_id": owner_user_id
    })

    async for milk in data:

        milk["_id"] = str(milk["_id"])

        milk_list.append(milk)

    if not milk_list:
        return {
            "msg": "No milk records found"
        }

    return milk_list


async def update_milk(
    milk_id: str,
    milk: Milk,
    owner_user_id: str
):

    from bson import ObjectId

    try:
        object_id = ObjectId(milk_id)
    except:
        return {
            "msg": "Invalid milk ID"
        }

    result = await milk_collection.update_one(
        {
            "_id": object_id,
            "owner_user_id": owner_user_id
        },
        {
            "$set": milk.dict()
        }
    )

    if result.matched_count == 0:
        return {
            "msg": "Milk record not found"
        }

    return {
        "msg": "Milk record updated successfully"
    }


async def delete_milk(milk_id: str, owner_user_id: str):

    from bson import ObjectId

    try:
        object_id = ObjectId(milk_id)
    except:
        return {
            "msg": "Invalid milk ID"
        }

    result = await milk_collection.delete_one({
        "_id": object_id,
        "owner_user_id": owner_user_id
    })

    if result.deleted_count == 0:
        return {
            "msg": "Milk record not found"
        }

    return {
        "msg": "Milk record deleted successfully"
    }


async def delete_all_milk(owner_user_id: str):
    result = await milk_collection.delete_many({"owner_user_id": owner_user_id})
    return {
        "msg": "All of your milk records were deleted",
        "deleted_count": result.deleted_count
    }

