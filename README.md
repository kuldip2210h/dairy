# MP RATHOD Dairy Management

FastAPI backend with a responsive green dashboard for customers and milk collection records.

## Run locally

1. Install Python dependencies: `pip install fastapi uvicorn motor pyjwt`
2. The app uses the MongoDB Atlas connection configured in `db.py` by default. You can override it with `MONGO_URL` (recommended after rotating the Atlas database password).
3. Set a private `JWT_SECRET_KEY` before deploying. For PowerShell:

   ```powershell
   $env:MONGO_URL = "mongodb+srv://<username>:<password>@<cluster>/<database>"
   $env:JWT_SECRET_KEY = "replace-with-a-long-random-value"
   uvicorn main:app --reload
   ```

4. Open `http://127.0.0.1:8000`. The API documentation is at `http://127.0.0.1:8000/docs`.

New account passwords are stored as salted hashes. Existing accounts that were saved with plaintext passwords can still sign in; register a replacement account and remove the old record when convenient.

Customer and milk records are private to the account that created them. Existing records without an owner are assigned to the first-created account the next time someone signs in; records created after this change are assigned to the signed-in account.
