
from model import Customer
from db import customer_collection


async def add_customer(customer: Customer, owner_user_id: str):

    customer_data = customer.dict()
    customer_data["owner_user_id"] = owner_user_id

    existing_customer = await customer_collection.find_one({
        "customer_id": customer.customer_id,
        "owner_user_id": owner_user_id
    })

    if existing_customer:
        return {
            "msg": "Customer already exists"
        }

    result = await customer_collection.insert_one(
        customer_data
    )

    return {
        "msg": "Customer added successfully",
        "id": str(result.inserted_id)
    }


async def get_all_customers(owner_user_id: str):

    customers = []

    data = customer_collection.find({"owner_user_id": owner_user_id})

    async for customer in data:

        customer["_id"] = str(customer["_id"])

        customers.append(customer)

    return customers


async def get_customer(customer_id: str, owner_user_id: str):

    customer = await customer_collection.find_one({
        "customer_id": customer_id,
        "owner_user_id": owner_user_id
    })

    if not customer:
        return {
            "msg": "Customer not found"
        }

    customer["_id"] = str(customer["_id"])

    return customer


async def update_customer(
    customer_id: str,
    customer: Customer,
    owner_user_id: str
):

    result = await customer_collection.update_one(
        {
            "customer_id": customer_id,
            "owner_user_id": owner_user_id
        },
        {
            "$set": customer.dict()
        }
    )

    if result.matched_count == 0:

        return {
            "msg": "Customer not found"
        }

    return {
        "msg": "Customer updated successfully"
    }


async def delete_customer(customer_id: str, owner_user_id: str):

    result = await customer_collection.delete_one({
        "customer_id": customer_id,
        "owner_user_id": owner_user_id
    })

    if result.deleted_count == 0:

        return {
            "msg": "Customer not found"
        }

    return {
        "msg": "Customer deleted successfully"
    }
