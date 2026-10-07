
from fastapi import APIRouter

from model import User, Login

from Controller.auth_controller import (
    register_user,
    login_user
)


User_Router = APIRouter(
    prefix="/User",
    tags=["User"]
)


@User_Router.post("/Register")
async def Register(user: User):

    return await register_user(user)


@User_Router.post("/Login")
async def Login(data: Login):

    return await login_user(data)
