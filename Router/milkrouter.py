
from fastapi import APIRouter, Depends

from model import Milk
from utils import get_current_user

from Controller.milk_controller import (
    add_milk,
    get_all_milk,
    get_milk_by_customer,
    update_milk,
    delete_milk,
    delete_all_milk
)


Milk_Router = APIRouter(
    prefix="/Milk",
    tags=["Milk"]
)


@Milk_Router.post("/Add")
async def Add(milk: Milk, current_user: dict = Depends(get_current_user)):

    return await add_milk(milk, current_user["user_id"])


@Milk_Router.get("/Get_All")
async def Get_All(current_user: dict = Depends(get_current_user)):

    return await get_all_milk(current_user["user_id"])


@Milk_Router.get("/Get_By_Customer/{customer_id}")
async def Get_By_Customer(customer_id: str, current_user: dict = Depends(get_current_user)):

    return await get_milk_by_customer(customer_id, current_user["user_id"])


@Milk_Router.put("/Update/{milk_id}")
async def Update(
    milk_id: str,
    milk: Milk,
    current_user: dict = Depends(get_current_user)
):

    return await update_milk(
        milk_id,
        milk,
        current_user["user_id"]
    )


@Milk_Router.delete("/Delete/{milk_id}")
async def Delete(milk_id: str, current_user: dict = Depends(get_current_user)):

    return await delete_milk(milk_id, current_user["user_id"])


@Milk_Router.delete("/Delete_All")
async def Delete_All(current_user: dict = Depends(get_current_user)):
    return await delete_all_milk(current_user["user_id"])

