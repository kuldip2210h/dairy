from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from Router.customerrouter import Customer_Router
from Router.userrouter import User_Router
from Router.milkrouter import Milk_Router
from Router.hardwarerouter import Hardware_Router

app = FastAPI(
    title="Dairy Management System",
    description="દૂધ ડેરી મેનેજમેન્ટ સિસ્ટમ",
    version="1.0.0"
)

FRONTEND_DIR = Path(__file__).parent / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

app.include_router(Customer_Router)
app.include_router(User_Router)
app.include_router(Milk_Router)
app.include_router(Hardware_Router)

@app.get("/", include_in_schema=False)
async def home():
    return FileResponse(FRONTEND_DIR / "index.html")
