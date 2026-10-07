from fastapi import APIRouter, Depends

from model import Customer
from utils import get_current_user

from Controller.customer_controller import (
    add_customer,
    get_all_customers,
    get_customer,
    update_customer,
    delete_customer
)


Customer_Router = APIRouter(
    prefix="/Customer",
    tags=["Customer"]
)


@Customer_Router.post("/Add")
async def Add(customer: Customer, current_user: dict = Depends(get_current_user)):
    return await add_customer(customer, current_user["user_id"])


@Customer_Router.get("/Get_All")
async def Get_All(current_user: dict = Depends(get_current_user)):
    return await get_all_customers(current_user["user_id"])


@Customer_Router.get("/Get/{customer_id}")
async def Get(customer_id: str, current_user: dict = Depends(get_current_user)):
    return await get_customer(customer_id, current_user["user_id"])


@Customer_Router.put("/Update/{customer_id}")
async def Update(
    customer_id: str,
    customer: Customer,
    current_user: dict = Depends(get_current_user)
):
    return await update_customer(customer_id, customer, current_user["user_id"])


@Customer_Router.delete("/Delete/{customer_id}")
async def Delete(customer_id: str, current_user: dict = Depends(get_current_user)):
    return await delete_customer(customer_id, current_user["user_id"])
