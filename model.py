from pydantic import BaseModel
from typing import Literal


class User(BaseModel):
    username: str
    password: str


class Login(BaseModel):
    username: str
    password: str



class Customer(BaseModel):
    customer_id: str
    name: str
    mobile: str
    address: str






class Milk(BaseModel):
    customer_id: str
    date: str
    time: str
    shift: Literal["Morning", "Evening"]
    milk_type: Literal["Cow", "Buffalo"]
    liter: float
    fat: float
    snf: float
    rate: float
    total_amount: float



