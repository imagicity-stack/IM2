from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "imagicity-secret-key-2024")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class ClientCreate(BaseModel):
    name: str
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    business_address: Optional[str] = None

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    business_address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    gst_type: str = "add"
    gst_percentage: float = 18.0

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    price: float
    gst_type: str
    gst_percentage: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class InvoiceItem(BaseModel):
    description: str
    quantity: float
    rate: float
    amount: float

class InvoiceCreate(BaseModel):
    client_id: str
    invoice_date: str
    due_date: str
    items: List[InvoiceItem]
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    total: float
    status: str = "pending"
    invoice_type: str = "invoice"
    is_recurring: bool = False
    notes: Optional[str] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client_id: str
    invoice_date: str
    due_date: str
    items: List[InvoiceItem]
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    total: float
    status: str
    invoice_type: str
    is_recurring: bool
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class ExpenseCreate(BaseModel):
    date: str
    description: str
    amount: float
    category: str

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    description: str
    amount: float
    category: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    invoice_prefix: str = "INV"
    invoice_counter: int = 1
    company_name: str = "IMAGICITY"
    company_gstin: str = "20JVPPK2424H1ZM"
    company_address: str = "Kolghatti, Near Black Water tank, reformatory school, hazaribagh, Jharkhand, 825301"
    bank_name: str = "Federal Bank"
    account_number: str = "25060200000912"
    ifsc_code: str = "FDRL0002506"
    upi_id: str = "biz.imagicit587@fbl"


# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Auth routes
@api_router.get("/")
async def root():
    return {"message": "Imagicity Invoice API", "status": "running"}

@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(email=user_data.email, name=user_data.name)
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create default settings
    settings = Settings(user_id=user.id)
    settings_dict = settings.model_dump()
    await db.settings.insert_one(settings_dict)
    
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user_doc)


# Client routes
@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, user_id: str = Depends(get_current_user)):
    client = Client(**client_data.model_dump(), user_id=user_id)
    client_dict = client.model_dump()
    client_dict['created_at'] = client_dict['created_at'].isoformat()
    await db.clients.insert_one(client_dict)
    return client

@api_router.get("/clients", response_model=List[Client])
async def get_clients(user_id: str = Depends(get_current_user)):
    clients = await db.clients.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for client in clients:
        if isinstance(client.get('created_at'), str):
            client['created_at'] = datetime.fromisoformat(client['created_at'])
    return clients

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, user_id: str = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": user_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if isinstance(client.get('created_at'), str):
        client['created_at'] = datetime.fromisoformat(client['created_at'])
    return Client(**client)

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientCreate, user_id: str = Depends(get_current_user)):
    existing = await db.clients.find_one({"id": client_id, "user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_data.model_dump()
    await db.clients.update_one({"id": client_id, "user_id": user_id}, {"$set": update_data})
    
    updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if isinstance(updated_client.get('created_at'), str):
        updated_client['created_at'] = datetime.fromisoformat(updated_client['created_at'])
    return Client(**updated_client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user_id: str = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}


# Service routes
@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, user_id: str = Depends(get_current_user)):
    service = Service(**service_data.model_dump(), user_id=user_id)
    service_dict = service.model_dump()
    service_dict['created_at'] = service_dict['created_at'].isoformat()
    await db.services.insert_one(service_dict)
    return service

@api_router.get("/services", response_model=List[Service])
async def get_services(user_id: str = Depends(get_current_user)):
    services = await db.services.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for service in services:
        if isinstance(service.get('created_at'), str):
            service['created_at'] = datetime.fromisoformat(service['created_at'])
    return services

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str, user_id: str = Depends(get_current_user)):
    service = await db.services.find_one({"id": service_id, "user_id": user_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    return Service(**service)

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service_data: ServiceCreate, user_id: str = Depends(get_current_user)):
    existing = await db.services.find_one({"id": service_id, "user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = service_data.model_dump()
    await db.services.update_one({"id": service_id, "user_id": user_id}, {"$set": update_data})
    
    updated_service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if isinstance(updated_service.get('created_at'), str):
        updated_service['created_at'] = datetime.fromisoformat(updated_service['created_at'])
    return Service(**updated_service)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user_id: str = Depends(get_current_user)):
    result = await db.services.delete_one({"id": service_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}



# Invoice routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, user_id: str = Depends(get_current_user)):
    # Get settings to generate invoice number
    settings_doc = await db.settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings_doc:
        settings = Settings(user_id=user_id)
        settings_dict = settings.model_dump()
        await db.settings.insert_one(settings_dict)
        settings_doc = settings_dict
    
    invoice_number = f"{settings_doc['invoice_prefix']}-{settings_doc['invoice_counter']:04d}"
    
    invoice = Invoice(**invoice_data.model_dump(), invoice_number=invoice_number, user_id=user_id)
    invoice_dict = invoice.model_dump()
    invoice_dict['created_at'] = invoice_dict['created_at'].isoformat()
    
    await db.invoices.insert_one(invoice_dict)
    
    # Increment counter
    await db.settings.update_one(
        {"user_id": user_id},
        {"$inc": {"invoice_counter": 1}}
    )
    
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(user_id: str = Depends(get_current_user)):
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for invoice in invoices:
        if isinstance(invoice.get('created_at'), str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "user_id": user_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if isinstance(invoice.get('created_at'), str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return Invoice(**invoice)

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice_data: InvoiceCreate, user_id: str = Depends(get_current_user)):
    existing = await db.invoices.find_one({"id": invoice_id, "user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = invoice_data.model_dump()
    await db.invoices.update_one({"id": invoice_id, "user_id": user_id}, {"$set": update_data})
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if isinstance(updated_invoice.get('created_at'), str):
        updated_invoice['created_at'] = datetime.fromisoformat(updated_invoice['created_at'])
    return Invoice(**updated_invoice)

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


@api_router.post("/invoices/{invoice_id}/convert-to-invoice")
async def convert_quotation_to_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    """Convert a quotation to an invoice"""
    quotation = await db.invoices.find_one({"id": invoice_id, "user_id": user_id, "invoice_type": "quotation"}, {"_id": 0})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Get settings to generate new invoice number
    settings_doc = await db.settings.find_one({"user_id": user_id}, {"_id": 0})
    invoice_number = f"{settings_doc['invoice_prefix']}-{settings_doc['invoice_counter']:04d}"
    
    # Update quotation to invoice
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {"invoice_type": "invoice", "invoice_number": invoice_number}}
    )
    
    # Increment counter
    await db.settings.update_one(
        {"user_id": user_id},
        {"$inc": {"invoice_counter": 1}}
    )
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if isinstance(updated_invoice.get('created_at'), str):
        updated_invoice['created_at'] = datetime.fromisoformat(updated_invoice['created_at'])
    return Invoice(**updated_invoice)

async def send_email_smtp(to_email: str, subject: str, html_content: str):
    """Send email using Gmail SMTP"""
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        from_email = os.environ.get('SMTP_FROM_EMAIL')
        from_name = os.environ.get('SMTP_FROM_NAME', 'IMAGICITY')
        
        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = f"{from_name} <{from_email}>"
        message['To'] = to_email
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True,
        )
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.post("/invoices/{invoice_id}/send-email")
async def send_invoice_email(invoice_id: str, user_id: str = Depends(get_current_user)):
    """Send invoice via email"""
    invoice = await db.invoices.find_one({"id": invoice_id, "user_id": user_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    client = await db.clients.find_one({"id": invoice["client_id"]}, {"_id": 0})
    if not client or not client.get("email"):
        raise HTTPException(status_code=400, detail="Client email not found")
    
    settings = await db.settings.find_one({"user_id": user_id}, {"_id": 0})
    
    # Create email content
    invoice_type = invoice.get("invoice_type", "invoice").title()
    subject = f"{invoice_type} {invoice['invoice_number']} from IMAGICITY"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6; 
                color: #1f2937;
                background-color: #f3f4f6;
            }}
            .email-wrapper {{ 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
            }}
            .email-container {{ 
                max-width: 600px; 
                margin: 0 auto; 
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }}
            .header {{ 
                background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
                padding: 40px 30px;
                text-align: center;
                border-bottom: 4px solid #dc2626;
            }}
            .header img {{ 
                max-width: 200px; 
                height: auto; 
                margin-bottom: 20px;
            }}
            .header h2 {{
                font-size: 24px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 8px;
            }}
            .header .invoice-meta {{
                display: inline-block;
                background: #dc2626;
                color: #ffffff;
                padding: 8px 20px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }}
            .content {{ 
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                color: #111827;
                font-weight: 600;
                margin-bottom: 12px;
            }}
            .intro-text {{
                color: #6b7280;
                margin-bottom: 30px;
                font-size: 15px;
            }}
            .card {{ 
                background: #f9fafb;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
            }}
            .card-title {{
                font-size: 16px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #dc2626;
                display: inline-block;
            }}
            .info-row {{
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
            }}
            .info-row:last-child {{ border-bottom: none; }}
            .info-label {{ 
                color: #6b7280;
                font-size: 14px;
                font-weight: 500;
            }}
            .info-value {{ 
                color: #111827;
                font-weight: 600;
                font-size: 14px;
            }}
            .status-badge {{
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                background: #fef3c7;
                color: #92400e;
            }}
            .table-container {{
                overflow-x: auto;
                margin: 25px 0;
            }}
            table {{ 
                width: 100%; 
                border-collapse: separate;
                border-spacing: 0;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
            }}
            thead {{
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }}
            th {{ 
                padding: 16px 12px;
                text-align: left;
                color: #111827;
                font-weight: 700;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            td {{ 
                padding: 16px 12px;
                border-bottom: 1px solid #e5e7eb;
                background: #ffffff;
                font-size: 14px;
            }}
            tbody tr:last-child td {{ border-bottom: none; }}
            tbody tr:hover td {{ background: #f9fafb; }}
            .amount-col {{
                text-align: right;
                font-weight: 600;
                color: #111827;
            }}
            .total-section {{
                background: linear-gradient(135deg, #111827 0%, #374151 100%);
                padding: 25px;
                border-radius: 12px;
                margin: 25px 0;
                color: #ffffff;
            }}
            .total-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                font-size: 15px;
            }}
            .total-row.grand-total {{
                padding-top: 15px;
                margin-top: 15px;
                border-top: 2px solid rgba(255, 255, 255, 0.3);
                font-size: 24px;
                font-weight: 700;
            }}
            .total-row.grand-total .amount {{
                color: #fbbf24;
            }}
            .payment-card {{
                background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                color: #ffffff;
                padding: 25px;
                border-radius: 12px;
                margin: 25px 0;
            }}
            .payment-card h3 {{
                font-size: 18px;
                margin-bottom: 20px;
                font-weight: 700;
            }}
            .payment-detail {{
                background: rgba(255, 255, 255, 0.1);
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .payment-detail:last-child {{ margin-bottom: 0; }}
            .payment-label {{ 
                font-size: 13px;
                opacity: 0.9;
                font-weight: 500;
            }}
            .payment-value {{ 
                font-weight: 700;
                font-size: 15px;
                font-family: 'Courier New', monospace;
            }}
            .notes-section {{
                background: #fffbeb;
                border-left: 4px solid #f59e0b;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
            }}
            .notes-section strong {{
                color: #92400e;
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
            }}
            .cta-section {{
                text-align: center;
                padding: 30px 0;
            }}
            .cta-text {{
                font-size: 16px;
                color: #6b7280;
                margin-bottom: 8px;
            }}
            .footer {{ 
                background: #111827;
                color: #9ca3af;
                padding: 40px 30px;
                text-align: center;
            }}
            .footer img {{
                max-width: 150px;
                height: auto;
                margin-bottom: 20px;
                filter: brightness(0) invert(1);
            }}
            .footer-text {{
                font-size: 13px;
                margin: 8px 0;
                line-height: 1.8;
            }}
            .footer-divider {{
                width: 60px;
                height: 3px;
                background: #dc2626;
                margin: 20px auto;
                border-radius: 2px;
            }}
            @media only screen and (max-width: 600px) {{
                .email-wrapper {{ padding: 20px 10px; }}
                .content {{ padding: 25px 20px; }}
                .header {{ padding: 30px 20px; }}
                th, td {{ padding: 12px 8px; font-size: 12px; }}
                .total-row.grand-total {{ font-size: 20px; }}
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                <div class="header">
                    <img src="https://customer-assets.emergentagent.com/job_imagicity-manager/artifacts/8swu1bm6_SIDE%20ALLIGNED%20BLACK.png" alt="IMAGICITY">
                    <h2>{invoice_type}</h2>
                    <div class="invoice-meta">{invoice['invoice_number']}</div>
                </div>
                
                <div class="content">
                    <div class="greeting">Dear {client.get('business_name') or client.get('name')},</div>
                    <p class="intro-text">Thank you for your business! Please find the details of your {invoice_type.lower()} below.</p>
                    
                    <div class="card">
                        <div class="card-title">{invoice_type} Details</div>
                        <div class="info-row">
                            <span class="info-label">Invoice Number</span>
                            <span class="info-value">{invoice['invoice_number']}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Invoice Date</span>
                            <span class="info-value">{invoice['invoice_date']}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Due Date</span>
                            <span class="info-value">{invoice['due_date']}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status</span>
                            <span class="status-badge">{invoice['status']}</span>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th style="text-align: center; width: 60px;">Qty</th>
                                    <th style="text-align: right; width: 100px;">Rate</th>
                                    <th style="text-align: right; width: 110px;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {"".join([f"<tr><td style='color: #374151;'>{item['description']}</td><td style='text-align: center;'>{item['quantity']}</td><td class='amount-col'>₹{item['rate']:.2f}</td><td class='amount-col'>₹{item['amount']:.2f}</td></tr>" for item in invoice.get('items', [])])}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="total-section">
                        <div class="total-row">
                            <span>Subtotal</span>
                            <span class="amount">₹{invoice['subtotal']:.2f}</span>
                        </div>
                        <div class="total-row">
                            <span>IGST (18%)</span>
                            <span class="amount">₹{invoice['igst']:.2f}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>Total Amount</span>
                            <span class="amount">₹{invoice['total']:.2f}</span>
                        </div>
                    </div>
                    
                    <div class="payment-card">
                        <h3>💳 Payment Details</h3>
                        <div class="payment-detail">
                            <span class="payment-label">Bank Name</span>
                            <span class="payment-value">{settings.get('bank_name', 'N/A')}</span>
                        </div>
                        <div class="payment-detail">
                            <span class="payment-label">Account Number</span>
                            <span class="payment-value">{settings.get('account_number', 'N/A')}</span>
                        </div>
                        <div class="payment-detail">
                            <span class="payment-label">IFSC Code</span>
                            <span class="payment-value">{settings.get('ifsc_code', 'N/A')}</span>
                        </div>
                        <div class="payment-detail">
                            <span class="payment-label">UPI ID</span>
                            <span class="payment-value">{settings.get('upi_id', 'N/A')}</span>
                        </div>
                    </div>
                    
                    {f"<div class='notes-section'><strong>📝 Notes</strong><p style='color: #78350f; margin: 0;'>{invoice.get('notes')}</p></div>" if invoice.get('notes') else ""}
                    
                    <div class="cta-section">
                        <p class="cta-text">Thank you for choosing IMAGICITY! 🙏</p>
                    </div>
                </div>
                
                <div class="footer">
                    <img src="https://customer-assets.emergentagent.com/job_imagicity-manager/artifacts/8swu1bm6_SIDE%20ALLIGNED%20BLACK.png" alt="IMAGICITY">
                    <div class="footer-divider"></div>
                    <p class="footer-text">{settings.get('company_address', '')}</p>
                    <p class="footer-text">GSTIN: {settings.get('company_gstin', '')} | Email: connect@imagicity.in</p>
                    <p class="footer-text" style="margin-top: 20px; font-size: 11px; opacity: 0.7;">
                        This is an automated email. Please do not reply to this message.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send email
    await send_email_smtp(client['email'], subject, html_content)
    
    return {
        "message": f"Email sent successfully to {client['email']}",
        "recipient": client['email'],
        "invoice_number": invoice['invoice_number']
    }



# Expense routes
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, user_id: str = Depends(get_current_user)):
    expense = Expense(**expense_data.model_dump(), user_id=user_id)
    expense_dict = expense.model_dump()
    expense_dict['created_at'] = expense_dict['created_at'].isoformat()
    await db.expenses.insert_one(expense_dict)
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(user_id: str = Depends(get_current_user)):
    expenses = await db.expenses.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for expense in expenses:
        if isinstance(expense.get('created_at'), str):
            expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    return expenses

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user_id: str = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}


# Settings routes
@api_router.get("/settings", response_model=Settings)
async def get_settings(user_id: str = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        # Create default settings
        new_settings = Settings(user_id=user_id)
        settings_dict = new_settings.model_dump()
        await db.settings.insert_one(settings_dict)
        return new_settings
    return Settings(**settings)

@api_router.put("/settings")
async def update_settings(settings_data: dict, user_id: str = Depends(get_current_user)):
    await db.settings.update_one(
        {"user_id": user_id},
        {"$set": settings_data},
        upsert=True
    )
    return {"message": "Settings updated successfully"}


# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user_id: str = Depends(get_current_user)):
    # Get all invoices
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    total_revenue = sum(inv['total'] for inv in invoices if inv['status'] == 'paid')
    pending_amount = sum(inv['total'] for inv in invoices if inv['status'] == 'pending')
    overdue_amount = sum(inv['total'] for inv in invoices if inv['status'] == 'overdue')
    
    # Get expenses
    expenses = await db.expenses.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    total_expenses = sum(exp['amount'] for exp in expenses)
    
    # Get client count
    client_count = await db.clients.count_documents({"user_id": user_id})
    
    return {
        "total_revenue": total_revenue,
        "pending_amount": pending_amount,
        "overdue_amount": overdue_amount,
        "total_expenses": total_expenses,
        "client_count": client_count,
        "invoice_count": len(invoices)
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
