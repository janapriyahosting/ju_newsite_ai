import asyncio, os, uuid as _uuid, json, mimetypes
from fastapi import APIRouter, Depends, HTTPException, Query, Header, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional
from backend.app.core.database import get_db
from backend.app.models.home_loan_request import HomeLoanRequest
from backend.app.schemas.home_loan_request import HomeLoanRequestResponse
from backend.app.api.v1.routers.auth import get_current_customer
from backend.app.services.notification_engine import fire_notification_background

router = APIRouter(prefix="/home-loan-requests", tags=["home-loan-requests"])

MEDIA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../media"))
UPLOAD_DIR = os.path.join(MEDIA_ROOT, "home-loan-docs")
ALLOWED_DOC = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB per file


async def _save_file(file: UploadFile, subfolder: str) -> str:
    ct = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if ct not in ALLOWED_DOC:
        raise HTTPException(400, f"File type not allowed: {ct}")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    ext = os.path.splitext(file.filename or "file")[1].lower() or ".pdf"
    filename = f"{_uuid.uuid4().hex}{ext}"
    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, filename), "wb") as f:
        f.write(content)
    return f"/media/home-loan-docs/{subfolder}/{filename}"


@router.post("", response_model=HomeLoanRequestResponse, status_code=201)
async def create_home_loan_request(
    # Applicant details
    name: str = Form(...),
    phone: str = Form(...),
    email: Optional[str] = Form(None),
    pan: Optional[str] = Form(None),
    aadhar: Optional[str] = Form(None),
    dob: Optional[str] = Form(None),
    address_line1: Optional[str] = Form(None),
    address_line2: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    country: Optional[str] = Form("India"),
    # Applicant employment
    employment_type: Optional[str] = Form(None),
    gross_monthly_income: Optional[float] = Form(None),
    current_obligations: Optional[float] = Form(None),
    organisation: Optional[str] = Form(None),
    work_experience: Optional[str] = Form(None),
    # Co-applicant
    has_co_applicant: bool = Form(False),
    co_applicant: Optional[str] = Form(None),  # JSON string
    # Loan / Property context
    loan_amount: Optional[float] = Form(None),
    property_value: Optional[float] = Form(None),
    unit_id: Optional[str] = Form(None),
    unit_number: Optional[str] = Form(None),
    tower_name: Optional[str] = Form(None),
    project_name: Optional[str] = Form(None),
    # File uploads
    payslips: Optional[UploadFile] = File(None),
    form16: Optional[UploadFile] = File(None),
    co_payslips: Optional[UploadFile] = File(None),
    co_form16: Optional[UploadFile] = File(None),
    # Auth
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    # Resolve customer
    customer_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            customer = await get_current_customer(authorization=authorization, db=db)
            customer_id = customer.id
        except Exception:
            pass

    # Save uploaded files
    payslips_url = await _save_file(payslips, "payslips") if payslips and payslips.filename else None
    form16_url = await _save_file(form16, "form16") if form16 and form16.filename else None

    # Parse co-applicant JSON and save co-applicant files
    co_data = None
    if has_co_applicant and co_applicant:
        try:
            co_data = json.loads(co_applicant)
        except Exception:
            co_data = {}
        if co_payslips and co_payslips.filename:
            co_data["payslips_url"] = await _save_file(co_payslips, "co-payslips")
        if co_form16 and co_form16.filename:
            co_data["form16_url"] = await _save_file(co_form16, "co-form16")

    uid = None
    if unit_id:
        try:
            uid = UUID(unit_id)
        except Exception:
            pass

    req = HomeLoanRequest(
        customer_id=customer_id,
        unit_id=uid,
        name=name, phone=phone, email=email,
        pan=pan, aadhar=aadhar, dob=dob,
        address_line1=address_line1, address_line2=address_line2,
        city=city, pincode=pincode, state=state, country=country,
        employment_type=employment_type,
        gross_monthly_income=gross_monthly_income,
        current_obligations=current_obligations,
        organisation=organisation, work_experience=work_experience,
        payslips_url=payslips_url, form16_url=form16_url,
        has_co_applicant=has_co_applicant, co_applicant=co_data,
        loan_amount=loan_amount, property_value=property_value,
        unit_number=unit_number, tower_name=tower_name, project_name=project_name,
        status="new",
    )
    db.add(req)
    await db.flush()
    await db.refresh(req)

    asyncio.create_task(fire_notification_background(
        "home_loan_requested", {
            "customer_name": req.name or "",
            "customer_phone": req.phone or "",
            "customer_email": req.email or "",
            "loan_amount": str(req.loan_amount or ""),
            "employment_type": req.employment_type or "",
        },
        recipient_phone=req.phone, recipient_email=req.email,
    ))
    return req


@router.get("", response_model=list[HomeLoanRequestResponse])
async def list_my_home_loan_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_customer=Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    query = select(HomeLoanRequest).where(HomeLoanRequest.customer_id == current_customer.id)
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(HomeLoanRequest.created_at.desc()).offset(offset).limit(page_size)
    )
    return result.scalars().all()


@router.get("/{request_id}", response_model=HomeLoanRequestResponse)
async def get_home_loan_request(
    request_id: UUID,
    current_customer=Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HomeLoanRequest).where(
            HomeLoanRequest.id == request_id,
            HomeLoanRequest.customer_id == current_customer.id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Home loan request not found")
    return req
